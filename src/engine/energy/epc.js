// @ts-check
/**
 * Indicative EPC (SAP) rating estimate.
 *
 * The statutory EPC rating is an energy-*cost* index (SAP 1–100 → bands A–G).
 * We approximate it from the modelled regulated energy by fuel and indicative
 * unit prices, then map to a band. If the project already carries a real SAP
 * score we trust that instead.
 */

import { epcBand, clamp, round } from '../util.js';
import { runEnergyModel } from './model.js';

/** Indicative energy unit costs, £/kWh (standing charges excluded). */
const UNIT_COST = { electricity: 0.27, gas: 0.07, other: 0.10 };

/**
 * @param {import('../types.js').Project} p
 * @param {ReturnType<typeof runEnergyModel>} [model]
 */
export function assessEpc(p, model = runEnergyModel(p)) {
  if (typeof p.sapEpcScore === 'number' && p.sapEpcScore > 0) {
    const score = clamp(p.sapEpcScore, 1, 100);
    return {
      source: /** @type {'declared'|'modelled'} */ ('declared'),
      score: round(score),
      band: epcBand(score),
      annualEnergyCostPerM2: null,
      note: 'Using the SAP/EPC score supplied with the project.',
    };
  }

  // Annual regulated energy cost per m².
  const cost = model.netElectricity * UNIT_COST.electricity
    + model.gas * UNIT_COST.gas
    - model.exported * 0.05; // small export credit
  const costPerM2 = cost / p.gia;

  // Map cost intensity to a SAP-like score. Calibrated so a typical gas
  // new-build (~£8–9/m²) lands low-B, an all-electric heat-pump + PV home
  // lands A, and a poor performer lands D/E.
  const score = clamp(Math.round(100 - costPerM2 * 6.0), 1, 100);

  return {
    source: /** @type {'declared'|'modelled'} */ ('modelled'),
    score,
    band: epcBand(score),
    annualEnergyCostPerM2: round(costPerM2, 2),
    note: 'Indicative only — not a substitute for an accredited SAP/EPC assessment.',
  };
}
