// @ts-check
/**
 * ResiCert assessment orchestrator.
 *
 * `runAssessment(input)` is the single entry point used by the HTTP API, the
 * CLI sample script and the tests. It normalises the input, runs each
 * assessment module, then produces the overall score, level and a flat list of
 * prioritised recommendations.
 */

import { normaliseProject } from './types.js';
import { runEnergyModel } from './energy/model.js';
import { assessEpc } from './energy/epc.js';
import { assessPartL } from './energy/partL.js';
import { assessEdge } from './energy/edge.js';
import { evaluateRegulations } from './regulations/evaluate.js';
import { assessPlanning } from './planning/policy.js';
import { assessCertifications } from './certifications/applicability.js';
import { scoreProject } from './scoring.js';

/**
 * @param {Partial<import('./types.js').Project>|Record<string, unknown>} input
 */
export function runAssessment(input) {
  const project = normaliseProject(input);

  // Energy model first — several modules consume it.
  const model = runEnergyModel(project);
  const epc = assessEpc(project, model);
  const partL = assessPartL(project, model);
  const edge = assessEdge(project, model);

  const regulations = evaluateRegulations(project);
  const planning = assessPlanning(project);

  const certifications = assessCertifications({
    project, model, epc, edge, regulationsCompliant: regulations.compliant,
  });

  const score = scoreProject({ project, model, epc, edge, regulations, planning });

  const recommendations = collectRecommendations({ regulations, partL, planning, edge, epc });

  return {
    generatedAt: new Date().toISOString(),
    project,
    summary: {
      level: score.level,
      overall: score.overall,
      certifiable: score.certifiable,
      regulationsCompliant: regulations.compliant,
      epcBand: epc.band,
      epcScore: epc.score,
      edgeTier: edge.tier,
      zeroCarbon: score.zeroCarbon,
      co2PerM2: model.co2PerM2,
      euiKwhM2: model.eui,
    },
    score,
    energy: { model, epc, partL, edge },
    regulations,
    planning,
    certifications,
    recommendations,
    disclaimer: DISCLAIMER,
  };
}

/**
 * Gather the highest-value actions: every failing regulation first (these
 * block certification), then warnings and efficiency gaps.
 */
function collectRecommendations(/** @type {any} */ { regulations, partL, planning, edge, epc }) {
  /** @type {{priority:'critical'|'high'|'medium', area:string, action:string}[]} */
  const recs = [];
  const push = (priority, area, f) => {
    if (f.recommendation) recs.push({ priority, area, action: f.recommendation });
  };

  for (const f of [...regulations.findings, ...partL.findings, ...planning.findings]) {
    if (f.status === 'fail') push('critical', f.title, f);
  }
  for (const f of [...regulations.findings, ...partL.findings, ...planning.findings]) {
    if (f.status === 'warning') push('high', f.title, f);
  }

  // Efficiency-pillar gaps (to reach the EDGE-style 20% bar).
  for (const [name, pillar] of Object.entries(edge.pillars)) {
    const pl = /** @type {any} */ (pillar);
    if (pl.saving < 20) {
      recs.push({
        priority: 'medium',
        area: `Efficiency — ${name}`,
        action: `Increase ${name} saving from ${pl.saving}% towards the 20% certification bar (baseline ${pl.baseline} ${pl.unit}, design ${pl.design} ${pl.unit}).`,
      });
    }
  }
  if (epc.score < 81) {
    recs.push({ priority: 'medium', area: 'Energy', action: `Lift the EPC from band ${epc.band} towards B/A via better fabric, a heat pump and/or PV.` });
  }

  // De-duplicate identical actions.
  const seen = new Set();
  return recs.filter((r) => {
    const k = r.action;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export const DISCLAIMER = [
  'ResiCert provides an INDICATIVE pre-assessment for early-stage design and',
  'education. It is not a SAP/EPC calculation, not Building Control approval,',
  'and not a substitute for accredited assessors (SAP, BREEAM, Passivhaus,',
  'fire, acoustics) or formal certification. Building Regulations and planning',
  'requirements differ across England, Wales, Scotland and Northern Ireland and',
  'change over time; always verify against the current local requirements.',
].join(' ');

export { normaliseProject, defaultProject } from './types.js';
