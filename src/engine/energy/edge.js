// @ts-check
/**
 * EDGE-style resource-efficiency savings, adapted for the UK.
 *
 * IFC's EDGE certifies a building when it achieves ≥20% reduction in EACH of
 * energy, water and embodied energy (materials) versus a base case, with
 * higher tiers for deeper energy savings and zero carbon.
 *
 * ResiCert keeps the same three-pillar logic but defines UK base cases:
 *   - Energy:    regulated energy use intensity of a Part L 2013-era dwelling.
 *   - Water:     typical UK per-capita consumption (~150 L/p/day).
 *   - Materials: typical upfront embodied carbon for the structure type
 *                (RICS / LETI benchmarks).
 */

import { round, savingPct } from '../util.js';
import { runEnergyModel } from './model.js';

/** UK base-case regulated energy use intensity, kWh/m²/yr (Part L 2013-ish). */
const ENERGY_BASELINE_EUI = 130;

/** UK base-case water consumption, L/person/day. */
const WATER_BASELINE_LPD = 150;

/**
 * Upfront embodied-carbon base case (A1–A5), kgCO2e/m², by structure type.
 * Indicative, aligned with RICS/LETI ranges for housing.
 */
const EMBODIED_BASELINE = {
  masonry: 800, 'light-steel': 780, icf: 760,
  'timber-frame': 650, clt: 600,
};

/** EDGE-style tier thresholds. */
const TIER = {
  certified: 20, // ≥20% in all three pillars
  advanced: 40, // ≥40% energy
};

/**
 * @param {import('../types.js').Project} p
 * @param {ReturnType<typeof runEnergyModel>} [model]
 */
export function assessEdge(p, model = runEnergyModel(p)) {
  // --- Energy pillar -----------------------------------------------------
  const energySaving = savingPct(ENERGY_BASELINE_EUI, model.eui);

  // --- Water pillar ------------------------------------------------------
  let designWater = p.waterUseLpd;
  // Credit rainwater/greywater reuse as an effective demand reduction on the
  // mains-water side (indicative: ~12% and ~10% respectively, multiplicative).
  if (p.rainwaterHarvesting) designWater *= 0.88;
  if (p.greywaterReuse) designWater *= 0.90;
  const waterSaving = savingPct(WATER_BASELINE_LPD, designWater);

  // --- Materials / embodied-carbon pillar --------------------------------
  const embodiedBaseline = EMBODIED_BASELINE[p.primaryStructure] ?? 750;
  let embodied = p.embodiedCarbonA1A5;
  if (p.recycledContent) embodied *= 0.96;
  if (p.responsiblySourcedMaterials) embodied *= 0.99;
  const materialsSaving = savingPct(embodiedBaseline, embodied);

  const pillars = {
    energy: { saving: energySaving, baseline: ENERGY_BASELINE_EUI, design: model.eui, unit: 'kWh/m²·yr' },
    water: { saving: waterSaving, baseline: WATER_BASELINE_LPD, design: round(designWater, 1), unit: 'L/p·day' },
    materials: { saving: materialsSaving, baseline: embodiedBaseline, design: round(embodied), unit: 'kgCO₂e/m²' },
  };

  // --- Tier determination ------------------------------------------------
  const allCertified = energySaving >= TIER.certified
    && waterSaving >= TIER.certified
    && materialsSaving >= TIER.certified;
  const zeroCarbon = model.co2PerM2 <= 0; // net-zero regulated operational carbon
  const advanced = allCertified && energySaving >= TIER.advanced;

  /** @type {'none'|'certified'|'advanced'|'zero-carbon'} */
  let tier = 'none';
  if (zeroCarbon && allCertified) tier = 'zero-carbon';
  else if (advanced) tier = 'advanced';
  else if (allCertified) tier = 'certified';

  return {
    pillars,
    meetsAllPillars: allCertified,
    zeroCarbon,
    tier,
    thresholds: TIER,
  };
}
