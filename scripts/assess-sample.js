// @ts-check
/**
 * CLI: run the engine over the bundled sample projects (or a JSON file) and
 * print a readable summary. Useful for a quick smoke test without the server.
 *
 *   node scripts/assess-sample.js                 # all samples
 *   node scripts/assess-sample.js btr-apartment-block
 *   node scripts/assess-sample.js ./my-project.json
 */

import { readFileSync } from 'node:fs';
import { runAssessment } from '../src/engine/index.js';
import { SAMPLE_PROJECTS, SAMPLE_KEYS } from '../src/data/sampleProjects.js';

const arg = process.argv[2];

/** @param {import('../src/engine/types.js').Project} project @param {string} key */
function printOne(project, key) {
  const r = runAssessment(project);
  const s = r.summary;
  console.log('\n' + '='.repeat(64));
  console.log(`> ${project.name}  [${key}]`);
  console.log('='.repeat(64));
  console.log(`  Award level        : ${s.level}`);
  console.log(`  Overall score      : ${s.overall}/100`);
  console.log(`  Regs compliant     : ${s.regulationsCompliant ? 'yes' : 'NO'}`);
  console.log(`  EPC (indicative)   : band ${s.epcBand} (${s.epcScore})`);
  console.log(`  EDGE tier          : ${s.edgeTier}`);
  console.log(`  Operational CO2    : ${s.co2PerM2} kgCO2/m2.yr   EUI ${s.euiKwhM2} kWh/m2.yr`);
  const e = r.energy.edge.pillars;
  console.log(`  EDGE savings       : energy ${e.energy.saving}% | water ${e.water.saving}% | materials ${e.materials.saving}%`);
  const fails = r.regulations.mandatoryFailures.map((f) => f.title);
  if (fails.length) console.log(`  Reg failures       : ${fails.join('; ')}`);
  const apps = r.certifications.applicable.map((c) => `${c.name} (${c.readiness?.score ?? 0}%${c.targeted ? ', targeted' : ''})`);
  console.log(`  Applicable schemes : ${apps.join(', ')}`);
  if (r.recommendations.length) {
    console.log('  Top recommendations:');
    for (const rec of r.recommendations.slice(0, 4)) {
      console.log(`    - [${rec.priority}] ${rec.area}: ${rec.action}`);
    }
  }
}

if (arg && arg.endsWith('.json')) {
  const project = JSON.parse(readFileSync(arg, 'utf8'));
  printOne(project, arg);
} else if (arg && SAMPLE_PROJECTS[arg]) {
  printOne(SAMPLE_PROJECTS[arg], arg);
} else if (arg) {
  console.error(`Unknown sample "${arg}". Available: ${SAMPLE_KEYS.join(', ')}`);
  process.exit(1);
} else {
  for (const key of SAMPLE_KEYS) printOne(SAMPLE_PROJECTS[key], key);
  console.log('\n' + '-'.repeat(64));
  console.log('Indicative pre-assessment only - see DISCLAIMER in the report output.');
}
