// @ts-check
/**
 * ResiCert domain model.
 *
 * This file is the single source of truth for the shape of a "Project" that
 * flows through the assessment engine, plus the small enumerations and the
 * default project factory used by the API, the UI and the tests.
 *
 * Everything here is plain data — no behaviour — so it can be imported by any
 * other module without creating cycles.
 */

/**
 * @typedef {('england'|'wales'|'scotland'|'northern-ireland')} Nation
 *   The four UK nations have *different* building standards. ResiCert encodes
 *   England's Approved Documents in detail and flags where Wales / Scotland
 *   (Technical Handbooks) / NI diverge.
 */

/**
 * @typedef {('london'|'south-east'|'south-west'|'east'|'east-midlands'|
 *   'west-midlands'|'yorkshire'|'north-west'|'north-east'|'wales'|'scotland'|
 *   'northern-ireland')} Region
 *   Used for overheating risk (Approved Document O), heating degree days and
 *   water-stress defaults.
 */

/**
 * @typedef {('house'|'flat'|'maisonette'|'bungalow')} DwellingType
 */

/**
 * @typedef {('detached'|'semi-detached'|'mid-terrace'|'end-terrace'|
 *   'apartment-block')} BuiltForm
 */

/**
 * @typedef {('new-build'|'major-refurbishment'|'change-of-use'|'extension')} ProjectType
 */

/**
 * @typedef {('gas-boiler'|'ashp'|'gshp'|'direct-electric'|'hydrogen-ready'|
 *   'heat-network'|'biomass')} HeatingSystem
 */

/**
 * @typedef {('mvhr'|'mev'|'dev'|'natural')} VentilationSystem
 *   mvhr = mechanical ventilation with heat recovery, mev = continuous
 *   mechanical extract, dev = decentralised/intermittent extract,
 *   natural = background ventilators + intermittent extract (Approved Doc F
 *   System 1).
 */

/**
 * @typedef {('masonry'|'timber-frame'|'clt'|'light-steel'|'icf')} StructureType
 */

/**
 * The canonical project input. Fields are grouped by theme. Numbers use SI /
 * UK-industry units noted inline. Almost everything has a sensible default via
 * {@link defaultProject} so the UI can submit partial data.
 *
 * @typedef {Object} Project
 * @property {string} name                       Project / scheme name.
 * @property {string} [reference]                Client or planning reference.
 *
 * // --- Context -----------------------------------------------------------
 * @property {Nation} nation
 * @property {Region} region
 * @property {DwellingType} dwellingType
 * @property {BuiltForm} builtForm
 * @property {ProjectType} projectType
 * @property {boolean} waterStressedArea         Triggers the tighter 110 L/p/d optional requirement.
 * @property {number} units                      Number of dwellings (1 = single home).
 * @property {number} storeys
 * @property {number} topStoreyHeightM           Height of top occupied storey (drives fire rules).
 * @property {number} bedrooms
 * @property {number} bedspaces                  Design occupancy (persons).
 * @property {number} gia                        Gross internal area, m² (per dwelling).
 *
 * // --- Fabric ------------------------------------------------------------
 * @property {number} uWall                      Wall U-value, W/m²K.
 * @property {number} uRoof                      Roof U-value, W/m²K.
 * @property {number} uFloor                     Floor U-value, W/m²K.
 * @property {number} uWindow                    Window U-value, W/m²K.
 * @property {number} airPermeability            m³/(h·m²) @ 50 Pa.
 * @property {number} thermalBridging            y-value, W/m²K.
 * @property {number} glazingRatio               Glazed area ÷ floor area (0–1).
 *
 * // --- Services ----------------------------------------------------------
 * @property {HeatingSystem} heatingSystem
 * @property {VentilationSystem} ventilationSystem
 * @property {number} waterUseLpd                Designed water use, litres/person/day.
 * @property {number} pvKwp                       Solar PV capacity, kWp.
 * @property {boolean} batteryStorage
 * @property {boolean} evChargePoint             Electric-vehicle charge point provided.
 * @property {boolean} gigabitInfrastructure     Physical infra for gigabit (Approved Doc R).
 * @property {boolean} gigabitConnection         Actual gigabit-capable connection provided.
 *
 * // --- Health, comfort & access -----------------------------------------
 * @property {boolean} crossVentilation
 * @property {boolean} solarShading
 * @property {number} daylightFactorAvg          Average daylight factor, %.
 * @property {boolean} accessibleM4_2            Meets M4(2) accessible & adaptable.
 * @property {boolean} wheelchairM4_3            Meets M4(3) wheelchair user.
 * @property {boolean} pas24SecureDoors          PAS 24 doors/windows (Approved Doc Q).
 * @property {number} separatingSoundDnTw        Airborne sound insulation of separating element, dB (flats).
 * @property {number} impactSoundLnTw            Impact sound of separating floor, dB (flats).
 *
 * // --- Materials & embodied carbon --------------------------------------
 * @property {StructureType} primaryStructure
 * @property {number} embodiedCarbonA1A5         Upfront embodied carbon, kgCO2e/m².
 * @property {boolean} responsiblySourcedMaterials
 * @property {boolean} recycledContent
 *
 * // --- Water & site ------------------------------------------------------
 * @property {boolean} suds                       Sustainable drainage system.
 * @property {boolean} rainwaterHarvesting
 * @property {boolean} greywaterReuse
 *
 * // --- Planning ----------------------------------------------------------
 * @property {number} biodiversityNetGainPct     % BNG delivered (statutory minimum 10).
 * @property {number} affordableHousingPct
 * @property {boolean} cycleStorage
 * @property {number} parkingSpaces
 *
 * // --- Optional measured / SAP outputs ----------------------------------
 * @property {number|null} sapEpcScore           SAP rating 1–100 (if a SAP calc exists).
 * @property {number|null} sapDER                Dwelling Emission Rate, kgCO2/m²/yr (if known).
 *
 * // --- Aspirations -------------------------------------------------------
 * @property {string[]} targetCertifications     Scheme ids the client wishes to pursue.
 */

/** @type {Nation[]} */
export const NATIONS = ['england', 'wales', 'scotland', 'northern-ireland'];

/** @type {Region[]} */
export const REGIONS = [
  'london', 'south-east', 'south-west', 'east', 'east-midlands',
  'west-midlands', 'yorkshire', 'north-west', 'north-east',
  'wales', 'scotland', 'northern-ireland',
];

/** @type {DwellingType[]} */
export const DWELLING_TYPES = ['house', 'flat', 'maisonette', 'bungalow'];

/** @type {BuiltForm[]} */
export const BUILT_FORMS = [
  'detached', 'semi-detached', 'mid-terrace', 'end-terrace', 'apartment-block',
];

/** @type {ProjectType[]} */
export const PROJECT_TYPES = ['new-build', 'major-refurbishment', 'change-of-use', 'extension'];

/** @type {HeatingSystem[]} */
export const HEATING_SYSTEMS = [
  'gas-boiler', 'ashp', 'gshp', 'direct-electric', 'hydrogen-ready', 'heat-network', 'biomass',
];

/** @type {VentilationSystem[]} */
export const VENTILATION_SYSTEMS = ['mvhr', 'mev', 'dev', 'natural'];

/** @type {StructureType[]} */
export const STRUCTURE_TYPES = ['masonry', 'timber-frame', 'clt', 'light-steel', 'icf'];

/**
 * A complete, valid baseline project (a fairly ordinary England new-build
 * house built to roughly current practice). The UI seeds the form with this,
 * the sample script and tests use it as a fixture.
 *
 * @returns {Project}
 */
export function defaultProject() {
  return {
    name: 'Untitled scheme',
    reference: '',

    nation: 'england',
    region: 'south-east',
    dwellingType: 'house',
    builtForm: 'semi-detached',
    projectType: 'new-build',
    waterStressedArea: false,
    units: 1,
    storeys: 2,
    topStoreyHeightM: 5,
    bedrooms: 3,
    bedspaces: 5,
    gia: 93,

    uWall: 0.18,
    uRoof: 0.13,
    uFloor: 0.13,
    uWindow: 1.4,
    airPermeability: 5,
    thermalBridging: 0.05,
    glazingRatio: 0.22,

    heatingSystem: 'gas-boiler',
    ventilationSystem: 'natural',
    waterUseLpd: 125,
    pvKwp: 0,
    batteryStorage: false,
    evChargePoint: true,
    gigabitInfrastructure: true,
    gigabitConnection: true,

    crossVentilation: true,
    solarShading: false,
    daylightFactorAvg: 1.8,
    accessibleM4_2: false,
    wheelchairM4_3: false,
    pas24SecureDoors: true,
    separatingSoundDnTw: 45,
    impactSoundLnTw: 62,

    primaryStructure: 'masonry',
    embodiedCarbonA1A5: 700,
    responsiblySourcedMaterials: true,
    recycledContent: false,

    suds: false,
    rainwaterHarvesting: false,
    greywaterReuse: false,

    biodiversityNetGainPct: 10,
    affordableHousingPct: 0,
    cycleStorage: true,
    parkingSpaces: 2,

    sapEpcScore: null,
    sapDER: null,

    targetCertifications: [],
  };
}

/**
 * Merge a partial, possibly-untrusted input over the defaults, coercing the
 * primitive types so the engine never trips over a string where it expects a
 * number. Unknown keys are dropped.
 *
 * @param {Partial<Project>|Record<string, unknown>} [input]
 * @returns {Project}
 */
export function normaliseProject(input = {}) {
  const base = defaultProject();
  /** @type {any} */
  const out = { ...base };
  for (const key of Object.keys(base)) {
    if (!(key in input)) continue;
    const def = /** @type {any} */ (base)[key];
    const raw = /** @type {any} */ (input)[key];
    if (raw === undefined || raw === null) {
      // Preserve explicit nulls only for the optional SAP fields.
      if (key === 'sapEpcScore' || key === 'sapDER') out[key] = null;
      continue;
    }
    if (typeof def === 'number') {
      const n = Number(raw);
      out[key] = Number.isFinite(n) ? n : def;
    } else if (typeof def === 'boolean') {
      out[key] = raw === true || raw === 'true' || raw === 'on' || raw === 1 || raw === '1';
    } else if (Array.isArray(def)) {
      out[key] = Array.isArray(raw) ? raw.map(String) : String(raw).split(',').map((s) => s.trim()).filter(Boolean);
    } else {
      out[key] = String(raw);
    }
  }
  return out;
}
