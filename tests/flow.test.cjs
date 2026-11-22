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

const { flowScale, flowViewW, MIN_VIEW, MAX_SCALE } = require('../flow.js');
test('flowScale never zooms so far that less than MIN_VIEW units of music fit', () => {
  // [楽譜の枠の幅, 高さ]：PC 2種・iPhone 縦横・Android 縦（測った値の目安）
  for (const [w, h] of [[852, 413], [852, 365], [342, 321], [808, 161], [364, 392]]) {
    for (const H of [116, 224]) {
      const k = flowScale(w, h, H, 97);
      assert.ok(k <= MAX_SCALE + 1e-9);
      assert.ok(H * k <= h + 1e-9, 'fits the height');
      assert.ok(flowViewW(w, k, 97) >= MIN_VIEW - 1e-9, `at least ${MIN_VIEW} units visible for ${w}x${h}`);
    }
  }
});
test('while playing to the last note, the next note is always inside the visible area', () => {
  // 8小節・4/4、1拍ごとに音符（小節の頭の余白 34、1拍 38）
  const pts = [];
  let x = 0;
  for (let m = 0; m < 8; m++) {
    pts.push([m * 4, x + 20]);
    for (let b = 0; b < 4; b++) pts.push([m * 4 + b, x + 34 + b * 38]);
    x += 34 + 4 * 38;
  }
  const trackEnd = x;
  for (const [w, h] of [[852, 413], [342, 321], [808, 161]]) {
    const k = flowScale(w, h, 116, 97);
    const viewW = flowViewW(w, k, 97);
    for (let beat = 0; beat < 32; beat++) {
      const off = flowOffset(xAtBeat(pts, beat), viewW, 0, trackEnd);
      const cur = xAtBeat(pts, beat) - off;
      const next = xAtBeat(pts, beat + 1) - off;
      assert.ok(cur >= 0 && cur <= viewW, `current note visible at beat ${beat}`);
      assert.ok(next >= 0 && next <= viewW, `next note visible at beat ${beat}`);
    }
  }
});

const { smoothPts } = require('../flow.js');
test('crossing a bar line does not jump: one position per beat, the rightmost', () => {
  // 小節の終わり（x=180）・次の小節の頭（x=200）・最初の音（x=215）が同じ拍 4 にある
  const raw = [[0, 20], [0, 35], [2, 110], [4, 180], [4, 200], [4, 215], [6, 290]];
  const p = smoothPts(raw);
  assert.deepEqual(p.map((q) => q[0]), [0, 2, 4, 6]);
  assert.equal(xAtBeat(p, 4), 215);
  // 拍 2 から 4 のあいだは同じ速さで進み、拍 4 の前後で位置が飛ばない
  const step = (b) => xAtBeat(p, b + 0.01) - xAtBeat(p, b);
  assert.ok(Math.abs(step(3.98) - step(3)) < 1e-6);
  assert.ok(Math.abs(xAtBeat(p, 4.0001) - xAtBeat(p, 3.9999)) < 0.05);
});
