// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runAssessment, defaultProject } from '../src/engine/index.js';
import { normaliseProject } from '../src/engine/types.js';
import { runEnergyModel } from '../src/engine/energy/model.js';
import { SAMPLE_PROJECTS } from '../src/data/sampleProjects.js';

test('runAssessment returns the full report shape', () => {
  const r = runAssessment(defaultProject());
  for (const key of ['summary', 'score', 'energy', 'regulations', 'planning', 'certifications', 'recommendations', 'disclaimer']) {
    assert.ok(key in r, `report has ${key}`);
  }
  assert.equal(typeof r.summary.overall, 'number');
  assert.ok(r.summary.overall >= 0 && r.summary.overall <= 100);
});

test('normaliseProject coerces strings and booleans, drops unknown keys', () => {
  const p = normaliseProject({ gia: '120', evChargePoint: 'true', suds: 'on', nonsense: 1, bedrooms: '4' });
  assert.equal(p.gia, 120);
  assert.equal(p.evChargePoint, true);
  assert.equal(p.suds, true);
  assert.equal(p.bedrooms, 4);
  assert.ok(!('nonsense' in p));
});

test('a non-compliant scheme is "Not certifiable"', () => {
  const r = runAssessment(SAMPLE_PROJECTS['noncompliant-refurb']);
  assert.equal(r.summary.regulationsCompliant, false);
  assert.equal(r.summary.certifiable, false);
  assert.equal(r.score.level, 'Not certifiable');
  // Critical recommendations should be present and listed first.
  assert.ok(r.recommendations.some((x) => x.priority === 'critical'));
});

test('best-practice all-electric house is compliant and certifiable', () => {
  const r = runAssessment(SAMPLE_PROJECTS['best-practice-house']);
  assert.equal(r.summary.regulationsCompliant, true);
  assert.equal(r.summary.certifiable, true);
  assert.notEqual(r.score.level, 'Not certifiable');
});

test('better fabric & low-carbon heat lowers energy use and carbon', () => {
  const base = runEnergyModel(defaultProject());
  const good = runEnergyModel(SAMPLE_PROJECTS['passivhaus-house']);
  assert.ok(good.eui < base.eui, 'Passivhaus EUI below baseline');
  assert.ok(good.spaceHeatIntensity < base.spaceHeatIntensity, 'lower space-heat demand');
  assert.ok(good.co2PerM2 < base.co2PerM2, 'lower operational carbon');
});

test('EDGE pillars: deep-green scheme beats the 20% bar on all three', () => {
  const r = runAssessment(SAMPLE_PROJECTS['best-practice-house']);
  const e = r.energy.edge.pillars;
  assert.ok(e.energy.saving >= 20, `energy saving ${e.energy.saving}%`);
  assert.ok(e.water.saving >= 20, `water saving ${e.water.saving}%`);
  assert.ok(e.materials.saving >= 20, `materials saving ${e.materials.saving}%`);
  assert.equal(r.energy.edge.meetsAllPillars, true);
});

test('PV reduces operational carbon', () => {
  const noPv = runEnergyModel({ ...defaultProject(), heatingSystem: 'ashp', pvKwp: 0 });
  const pv = runEnergyModel({ ...defaultProject(), heatingSystem: 'ashp', pvKwp: 4 });
  assert.ok(pv.co2PerM2 < noPv.co2PerM2, 'PV lowers carbon');
});

test('Part L target-rate screening runs for new builds', () => {
  const r = runAssessment(defaultProject());
  assert.equal(typeof r.energy.partL.ter, 'number');
  assert.equal(typeof r.energy.partL.der, 'number');
  // gas baseline house: a Future Homes Standard readiness finding exists
  assert.ok(r.energy.partL.findings.some((f) => f.id === 'fhs'));
});

test('every sample project produces a coherent report without throwing', () => {
  for (const [key, project] of Object.entries(SAMPLE_PROJECTS)) {
    const r = runAssessment(project);
    assert.ok(r.summary.level, `${key} has a level`);
    assert.ok(Array.isArray(r.regulations.findings) && r.regulations.findings.length > 0, `${key} has findings`);
    assert.ok(r.certifications.applicable.length > 0, `${key} has applicable schemes`);
  }
});

test('overall score is monotonic: best-practice scores above baseline', () => {
  const base = runAssessment(SAMPLE_PROJECTS['baseline-house']).summary.overall;
  const best = runAssessment(SAMPLE_PROJECTS['best-practice-house']).summary.overall;
  assert.ok(best > base, `best ${best} should exceed baseline ${base}`);
});
