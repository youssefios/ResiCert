// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clamp, round, savingPct, epcBand, weightedAverage, rollUp, finding, tally } from '../src/engine/util.js';

test('clamp bounds values', () => {
  assert.equal(clamp(5, 0, 10), 5);
  assert.equal(clamp(-3, 0, 10), 0);
  assert.equal(clamp(99, 0, 10), 10);
});

test('round to decimal places', () => {
  assert.equal(round(1.2345, 2), 1.23);
  assert.equal(round(1.005, 2), 1.01);
  assert.equal(round(10 / 3, 1), 3.3);
});

test('savingPct computes improvement vs baseline', () => {
  assert.equal(savingPct(150, 120), 20);
  assert.equal(savingPct(100, 60), 40);
  assert.equal(savingPct(0, 50), 0, 'non-positive baseline -> 0');
  assert.equal(savingPct(100, 150), -50, 'worse than baseline is negative');
});

test('epcBand maps SAP scores to A–G boundaries', () => {
  assert.equal(epcBand(95), 'A');
  assert.equal(epcBand(85), 'B');
  assert.equal(epcBand(69), 'C');
  assert.equal(epcBand(55), 'D');
  assert.equal(epcBand(39), 'E');
  assert.equal(epcBand(21), 'F');
  assert.equal(epcBand(10), 'G');
});

test('weightedAverage ignores zero-weight parts', () => {
  assert.equal(weightedAverage([{ value: 100, weight: 1 }, { value: 0, weight: 1 }]), 50);
  assert.equal(weightedAverage([{ value: 80, weight: 0 }, { value: 40, weight: 2 }]), 40);
  assert.equal(weightedAverage([]), 0);
});

test('rollUp prioritises fail > warning > pass and ignores info/n-a', () => {
  const f = (status) => finding('x', 'x', status, '');
  assert.equal(rollUp([f('pass'), f('warning'), f('fail')]), 'fail');
  assert.equal(rollUp([f('pass'), f('warning')]), 'warning');
  assert.equal(rollUp([f('pass'), f('info'), f('not-applicable')]), 'pass');
});

test('tally counts each status', () => {
  const f = (status) => finding('x', 'x', status, '');
  const t = tally([f('pass'), f('pass'), f('fail'), f('info')]);
  assert.equal(t.pass, 2);
  assert.equal(t.fail, 1);
  assert.equal(t.info, 1);
  assert.equal(t.warning, 0);
});
