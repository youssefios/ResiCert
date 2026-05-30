// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runAssessment } from '../src/engine/index.js';
import { defaultProject } from '../src/engine/types.js';

const ids = (list) => new Set(list.map((s) => s.id));

test('single detached house: multi-residential schemes are not applicable', () => {
  const r = runAssessment({ ...defaultProject(), dwellingType: 'house', builtForm: 'detached', units: 1 });
  const app = ids(r.certifications.applicable);
  const na = ids(r.certifications.notApplicable);

  // Resi-applicable to any dwelling
  assert.ok(app.has('hqm'), 'HQM applies to any new home');
  assert.ok(app.has('passivhaus'), 'Passivhaus applies to any dwelling');
  assert.ok(app.has('breeam'), 'BREEAM applicable');

  // Multifamily-only schemes should be excluded for a single house
  assert.ok(na.has('well'), 'WELL not applicable to a single private home');
  assert.ok(na.has('fitwel'));
  assert.ok(na.has('wiredscore-home'));
  assert.ok(na.has('smartscore'));
});

test('apartment block: multifamily health/connectivity schemes become applicable', () => {
  const r = runAssessment({
    ...defaultProject(), dwellingType: 'flat', builtForm: 'apartment-block', units: 60,
  });
  const app = ids(r.certifications.applicable);
  assert.ok(app.has('well'));
  assert.ok(app.has('fitwel'));
  assert.ok(app.has('wiredscore-home'));
  assert.ok(app.has('smartscore'));
});

test('NABERS UK is never applicable to residential', () => {
  for (const builtForm of ['detached', 'apartment-block']) {
    const r = runAssessment({ ...defaultProject(), builtForm, units: builtForm === 'detached' ? 1 : 50 });
    assert.ok(ids(r.certifications.notApplicable).has('nabers-uk'));
  }
});

test('targeted schemes are flagged and pinned to the top', () => {
  const r = runAssessment({ ...defaultProject(), targetCertifications: ['passivhaus'] });
  const passivhaus = r.certifications.applicable.find((s) => s.id === 'passivhaus');
  assert.ok(passivhaus.targeted, 'targeted flag set');
  assert.equal(r.certifications.applicable[0].targeted, true, 'a targeted scheme sorts first');
});

test('readiness reflects design quality (Passivhaus needs airtightness)', () => {
  const leaky = runAssessment({ ...defaultProject(), airPermeability: 8, ventilationSystem: 'natural' });
  const tight = runAssessment({ ...defaultProject(), airPermeability: 0.6, ventilationSystem: 'mvhr', uWall: 0.12, uWindow: 0.8 });
  const score = (rep) => rep.certifications.applicable.find((s) => s.id === 'passivhaus').readiness.score;
  assert.ok(score(tight) > score(leaky), 'tighter, better fabric scores higher for Passivhaus');
});
