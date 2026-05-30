// @ts-check
/**
 * A transparent, simplified single-zone energy model for a dwelling.
 *
 * ⚠️ This is an *indicative* steady-state model for early-design screening and
 * for ResiCert's EDGE-style percentage savings. It is NOT a SAP 10 / Home
 * Energy Model calculation and must not be used for an EPC, Part L compliance
 * submission or for marketing energy figures. Every assumption is stated in
 * code so the numbers are explainable.
 *
 * Method: estimate exposed element areas from the floor area, storeys and
 * built form; compute a heat-loss coefficient (fabric + ventilation); apply
 * heating degree days to get space-heat demand; add domestic hot water,
 * lighting and auxiliary; convert to delivered energy via the heat-generator
 * efficiency/SCOP; subtract on-site PV; then derive CO2 and primary energy
 * using SAP 10.2 factors.
 */

import { clamp, round } from '../util.js';

/** Heating degree days (base 15.5 °C) — indicative regional values. */
const HEATING_DEGREE_DAYS = {
  london: 2030, 'south-east': 2100, 'south-west': 2050, east: 2200,
  'east-midlands': 2300, 'west-midlands': 2300, yorkshire: 2400,
  'north-west': 2350, 'north-east': 2450, wales: 2250, scotland: 2650,
  'northern-ireland': 2400,
};

/** Annual specific PV yield (kWh per kWp) — indicative, south-facing. */
const PV_YIELD = {
  london: 950, 'south-east': 980, 'south-west': 1000, east: 970,
  'east-midlands': 920, 'west-midlands': 910, yorkshire: 880,
  'north-west': 870, 'north-east': 860, wales: 900, scotland: 820,
  'northern-ireland': 850,
};

/** Fraction of the wall perimeter that is exposed (rest is party/adjoining). */
const EXPOSURE_FACTOR = {
  detached: 1.0, 'semi-detached': 0.75, 'end-terrace': 0.7,
  'mid-terrace': 0.55, 'apartment-block': 0.5,
};

/** SAP 10.2 emission factors, kgCO2e per kWh delivered. */
const CO2_FACTOR = { electricity: 0.136, gas: 0.210, biomass: 0.029, 'heat-network': 0.150 };
/** SAP 10.2 primary-energy factors, kWh primary per kWh delivered. */
const PE_FACTOR = { electricity: 1.501, gas: 1.130, biomass: 1.100, 'heat-network': 1.300 };

/** Seasonal efficiency / SCOP of the heat generator. */
const HEAT_EFFICIENCY = {
  'gas-boiler': 0.90, ashp: 3.0, gshp: 3.8, 'direct-electric': 1.0,
  'hydrogen-ready': 0.90, 'heat-network': 1.0, biomass: 0.85,
};

/** Which fuel a heating system draws on (for CO2 / primary energy). */
const HEAT_FUEL = {
  'gas-boiler': 'gas', ashp: 'electricity', gshp: 'electricity',
  'direct-electric': 'electricity', 'hydrogen-ready': 'gas',
  'heat-network': 'heat-network', biomass: 'biomass',
};

/** Mechanical ventilation heat-recovery efficiency by system. */
const MVHR_RECOVERY = { mvhr: 0.88, mev: 0, dev: 0, natural: 0 };

const STOREY_HEIGHT = 2.4; // m, internal floor-to-ceiling

/**
 * @param {import('../types.js').Project} p
 */
export function estimateAreas(p) {
  const footprint = p.gia / Math.max(1, p.storeys);
  const side = Math.sqrt(Math.max(1, footprint));
  const perimeter = 4 * side;
  const exposure = EXPOSURE_FACTOR[p.builtForm] ?? 0.8;
  const grossWall = perimeter * STOREY_HEIGHT * p.storeys * exposure;
  const glazing = clamp(p.glazingRatio, 0, 0.9) * p.gia;
  const wall = Math.max(0, grossWall - glazing);
  // In an apartment block, roof and ground floor are mostly shared, so only a
  // fraction is exposed per dwelling.
  const sharedDeck = p.builtForm === 'apartment-block' ? 0.4 : 1.0;
  const roof = footprint * sharedDeck;
  const floor = footprint * sharedDeck;
  const totalExposed = wall + glazing + roof + floor;
  return { footprint, wall, glazing, roof, floor, totalExposed };
}

/**
 * Run the full model.
 * @param {import('../types.js').Project} p
 */
export function runEnergyModel(p) {
  const A = estimateAreas(p);
  const hdd = HEATING_DEGREE_DAYS[p.region] ?? 2300;

  // --- Heat-loss coefficient (W/K) ---------------------------------------
  const fabricHLC = p.uWall * A.wall + p.uWindow * A.glazing + p.uRoof * A.roof
    + p.uFloor * A.floor + p.thermalBridging * A.totalExposed;

  // Ventilation + infiltration. Infiltration ACH ≈ q50 / 20 (rule of thumb).
  const volume = p.gia * STOREY_HEIGHT;
  const infiltrationAch = p.airPermeability / 20;
  // Designed purge/whole-dwelling ventilation, ~0.5 ACH, reduced by MVHR recovery.
  const recovery = MVHR_RECOVERY[p.ventilationSystem] ?? 0;
  const designedVentAch = 0.5 * (1 - recovery);
  const ventAch = infiltrationAch + designedVentAch;
  const ventHLC = 0.33 * ventAch * volume; // 0.33 Wh/(m³·K)

  const hlc = fabricHLC + ventHLC;

  // --- Space-heat demand (kWh/yr) ----------------------------------------
  // Gross degree-day demand, then a utilisation factor to credit internal &
  // solar gains (better fabric → gains meet more of the load → lower factor).
  const grossSpaceHeat = (hlc * hdd * 24) / 1000;
  const gainsUtilisation = clamp(0.78 - p.glazingRatio * 0.1, 0.6, 0.85);
  const spaceHeatDemand = grossSpaceHeat * gainsUtilisation;

  // --- Domestic hot water (kWh/yr) ---------------------------------------
  // ~1.1 kWh/person/day useful, with distribution losses.
  const dhwDemand = p.bedspaces * 1.1 * 365 * 1.15;

  // Delivered heating energy via generator efficiency/SCOP.
  const heatEff = HEAT_EFFICIENCY[p.heatingSystem] ?? 1;
  const heatFuel = HEAT_FUEL[p.heatingSystem] ?? 'electricity';
  const deliveredHeat = (spaceHeatDemand + dhwDemand) / heatEff;

  // --- Lighting & auxiliary (electricity, kWh/yr) ------------------------
  const lightingAux = 9 * p.gia ** 0.5 * 5 + p.gia * 4; // small, area-related

  // --- On-site PV generation (kWh/yr) ------------------------------------
  const pvGen = p.pvKwp * (PV_YIELD[p.region] ?? 900);

  // --- Energy by fuel ----------------------------------------------------
  let elec = lightingAux;
  let gas = 0;
  let other = 0;
  if (heatFuel === 'electricity') elec += deliveredHeat;
  else if (heatFuel === 'gas') gas += deliveredHeat;
  else other += deliveredHeat;

  // Net electricity after self-consumed PV (assume ~60% self-consumption,
  // remainder exported and credited at the grid factor).
  const selfUse = Math.min(elec, pvGen * 0.6);
  const exported = Math.max(0, pvGen - selfUse);
  const netElec = Math.max(0, elec - selfUse);

  // --- CO2 (kgCO2e/yr) and primary energy (kWh/yr) -----------------------
  const otherFuel = heatFuel === 'electricity' || heatFuel === 'gas' ? 'electricity' : heatFuel;
  const co2 = netElec * CO2_FACTOR.electricity
    + gas * CO2_FACTOR.gas
    + other * (CO2_FACTOR[otherFuel] ?? CO2_FACTOR.electricity)
    - exported * CO2_FACTOR.electricity;
  const primary = netElec * PE_FACTOR.electricity
    + gas * PE_FACTOR.gas
    + other * (PE_FACTOR[otherFuel] ?? PE_FACTOR.electricity)
    - exported * PE_FACTOR.electricity;

  const regulatedDelivered = deliveredHeat + lightingAux; // exclude unregulated appliances
  const eui = regulatedDelivered / p.gia; // kWh/m²/yr (regulated)
  const co2PerM2 = co2 / p.gia;
  const primaryPerM2 = primary / p.gia;

  return {
    areas: A,
    hlc: round(hlc, 1),
    spaceHeatDemand: round(spaceHeatDemand),
    dhwDemand: round(dhwDemand),
    deliveredHeat: round(deliveredHeat),
    lightingAux: round(lightingAux),
    pvGeneration: round(pvGen),
    netElectricity: round(netElec),
    gas: round(gas),
    exported: round(exported),
    co2PerYear: round(co2),
    co2PerM2: round(co2PerM2, 1),
    primaryPerM2: round(primaryPerM2),
    eui: round(eui, 1),
    spaceHeatIntensity: round(spaceHeatDemand / p.gia, 1),
    fuel: heatFuel,
  };
}
