// @ts-check
/**
 * Roll the individual assessments up into a single ResiCert score (0–100) and
 * an award level.
 *
 * Two gates apply before any award:
 *   1. Building Regulations compliance — a non-compliant scheme cannot be
 *      certified (you can't put a sustainability badge on something that fails
 *      the law). It is reported as "Not certifiable" until resolved.
 *   2. The EDGE-style efficiency bar — at least 20% saving in each of energy,
 *      water and materials — must be met to move beyond "Compliant".
 *
 * Award levels: Not certifiable → Compliant → Certified → Silver → Gold →
 * Platinum, with a Zero Carbon distinction for net-zero regulated operational
 * carbon.
 */

import { clamp, round, weightedAverage } from './util.js';

/**
 * @param {Object} parts
 * @param {import('./types.js').Project} parts.project
 * @param {ReturnType<import('./energy/model.js').runEnergyModel>} parts.model
 * @param {{score:number, band:string}} parts.epc
 * @param {ReturnType<import('./energy/edge.js').assessEdge>} parts.edge
 * @param {{compliant:boolean}} parts.regulations
 * @param {{ndssMinimum:number}} parts.planning
 */
export function scoreProject({ project: p, model, epc, edge, regulations, planning }) {
  // --- Sub-scores (each 0–100) -------------------------------------------
  const energyScore = clamp(epc.score, 0, 100);
  const waterScore = clamp(edge.pillars.water.saving * 2.5, 0, 100);
  const materialsScore = clamp(edge.pillars.materials.saving * 2.5, 0, 100);

  const healthChecks = [
    p.daylightFactorAvg >= 1.5,
    p.ventilationSystem !== 'natural',
    p.solarShading || p.crossVentilation,
    p.separatingSoundDnTw >= 45,
    p.pas24SecureDoors,
    p.accessibleM4_2 || p.wheelchairM4_3,
  ];
  const healthScore = pctTrue(healthChecks);

  const placeChecks = [
    p.biodiversityNetGainPct >= 10,
    p.biodiversityNetGainPct >= 20,
    p.suds,
    p.gia >= planning.ndssMinimum,
    p.cycleStorage,
  ];
  const placeScore = pctTrue(placeChecks);

  const connectivityChecks = [
    p.gigabitConnection,
    p.gigabitInfrastructure,
    p.evChargePoint,
    p.pvKwp > 0 || p.batteryStorage,
  ];
  const connectivityScore = pctTrue(connectivityChecks);

  const breakdown = {
    energy: round(energyScore),
    water: round(waterScore),
    materials: round(materialsScore),
    health: round(healthScore),
    place: round(placeScore),
    connectivity: round(connectivityScore),
  };

  const overall = round(weightedAverage([
    { value: energyScore, weight: 30 },
    { value: waterScore, weight: 15 },
    { value: materialsScore, weight: 15 },
    { value: healthScore, weight: 15 },
    { value: placeScore, weight: 15 },
    { value: connectivityScore, weight: 10 },
  ]));

  // --- Award level (gated) -----------------------------------------------
  let level;
  let certifiable = true;
  if (!regulations.compliant) {
    level = 'Not certifiable';
    certifiable = false;
  } else if (!edge.meetsAllPillars) {
    level = 'Compliant (not yet certified)';
  } else if (overall >= 90) {
    level = edge.zeroCarbon ? 'Platinum — Zero Carbon' : 'Platinum';
  } else if (overall >= 78) {
    level = edge.zeroCarbon ? 'Gold — Zero Carbon' : 'Gold';
  } else if (overall >= 65) {
    level = 'Silver';
  } else {
    level = 'Certified';
  }

  return {
    overall,
    breakdown,
    weights: { energy: 30, water: 15, materials: 15, health: 15, place: 15, connectivity: 10 },
    level,
    certifiable,
    zeroCarbon: edge.zeroCarbon,
  };
}

/** Percentage of truthy entries in a boolean array. @param {boolean[]} arr */
function pctTrue(arr) {
  if (!arr.length) return 0;
  return (arr.filter(Boolean).length / arr.length) * 100;
}
