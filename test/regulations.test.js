// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultProject } from '../src/engine/types.js';
import { evaluateRegulations } from '../src/engine/regulations/evaluate.js';

/** find a finding by id */
const byId = (res, id) => res.findings.find((f) => f.id === id);

test('a sensible default new-build is Building-Regs compliant', () => {
  const res = evaluateRegulations(defaultProject());
  assert.equal(res.compliant, true, 'no mandatory failures expected');
  assert.equal(res.mandatoryFailures.length, 0);
});

test('poor fabric fails Part L limiting values', () => {
  const p = { ...defaultProject(), uWall: 0.45, uWindow: 2.2, airPermeability: 12 };
  const res = evaluateRegulations(p);
  const f = byId(res, 'L-fabric');
  assert.equal(f.status, 'fail');
  assert.equal(res.compliant, false);
});

test('Part G2 water: 125 default, tighter 110 in water-stressed areas', () => {
  assert.equal(byId(evaluateRegulations({ ...defaultProject(), waterUseLpd: 124 }), 'G2-water').status, 'pass');
  assert.equal(byId(evaluateRegulations({ ...defaultProject(), waterUseLpd: 130 }), 'G2-water').status, 'fail');
  // 120 passes normally but fails the 110 limit when water-stressed
  assert.equal(byId(evaluateRegulations({ ...defaultProject(), waterUseLpd: 120 }), 'G2-water').status, 'pass');
  assert.equal(byId(evaluateRegulations({ ...defaultProject(), waterUseLpd: 120, waterStressedArea: true }), 'G2-water').status, 'fail');
});

test('Part S: parking without an EV charge point fails', () => {
  assert.equal(byId(evaluateRegulations({ ...defaultProject(), parkingSpaces: 2, evChargePoint: false }), 'S-ev').status, 'fail');
  assert.equal(byId(evaluateRegulations({ ...defaultProject(), parkingSpaces: 2, evChargePoint: true }), 'S-ev').status, 'pass');
  assert.equal(byId(evaluateRegulations({ ...defaultProject(), parkingSpaces: 0, evChargePoint: false }), 'S-ev').status, 'not-applicable');
});

test('Part O overheating: high glazing with no mitigation fails', () => {
  const p = { ...defaultProject(), region: 'london', glazingRatio: 0.4, solarShading: false, crossVentilation: false };
  assert.equal(byId(evaluateRegulations(p), 'O-overheat').status, 'fail');
});

test('gas boiler raises a Future-Homes warning but is still compliant', () => {
  const res = evaluateRegulations({ ...defaultProject(), heatingSystem: 'gas-boiler' });
  assert.equal(byId(res, 'L-heating').status, 'warning');
  assert.equal(res.compliant, true);
});

test('Part E applies to attached houses but not detached houses', () => {
  const detached = evaluateRegulations({ ...defaultProject(), dwellingType: 'house', builtForm: 'detached' });
  assert.equal(byId(detached, 'E-sound').status, 'not-applicable');

  const semi = evaluateRegulations({ ...defaultProject(), dwellingType: 'house', builtForm: 'semi-detached', separatingSoundDnTw: 40 });
  assert.equal(byId(semi, 'E-sound').status, 'fail', 'party wall below 45 dB should fail');
});

test('non-England projects raise a devolved-standards warning', () => {
  const res = evaluateRegulations({ ...defaultProject(), nation: 'scotland', region: 'scotland' });
  assert.equal(byId(res, 'nation-divergence').status, 'warning');
});
