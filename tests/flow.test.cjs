'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { FOCUS, xAtBeat, flowOffset } = require('../flow.js');

const pts = [[0, 10], [1, 50], [2, 90], [4, 200]];
test('xAtBeat interpolates between note positions and clamps to the ends', () => {
  assert.equal(xAtBeat(pts, 0), 10);
  assert.equal(xAtBeat(pts, 0.5), 30);
  assert.equal(xAtBeat(pts, 3), 145);
  assert.equal(xAtBeat(pts, -2), 10);
  assert.equal(xAtBeat(pts, 9), 200);
  assert.equal(xAtBeat([], 1), 0);
});
test('xAtBeat is monotonic with repeated beats (bar line + first note)', () => {
  const p = [[0, 5], [0, 40], [2, 100]];
  let prev = -Infinity;
  for (let b = 0; b <= 2; b += 0.25) { const x = xAtBeat(p, b); assert.ok(x >= prev); prev = x; }
});
test('flowOffset puts the cursor a third from the left, without leaving the track', () => {
  assert.equal(FOCUS, 1 / 3);
  assert.equal(flowOffset(600, 900, 0, 5000), 300);
  assert.equal(flowOffset(100, 900, 0, 5000), 0);
  assert.equal(flowOffset(4990, 900, 0, 5000), 4100);
  assert.equal(flowOffset(50, 900, 0, 500), 0);
});
test('flowOffset follows the cursor continuously', () => {
  let prev = flowOffset(0, 800, 0, 3000);
  for (let x = 0; x <= 3000; x += 10) { const o = flowOffset(x, 800, 0, 3000); assert.ok(o >= prev); assert.ok(o - prev <= 10 + 1e-9); prev = o; }
});
