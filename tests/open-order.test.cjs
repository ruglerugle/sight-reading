'use strict';
// どの曲も、クリアの順番に関係なく選べて、曲を開くと両手（自分のペース）の段階から始まる
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('vm');

const src = fs.readFileSync(require.resolve('../song-mode.js'), 'utf8');
const code = src.slice(src.indexOf('const isStepUnlocked = '), src.indexOf('const songKbMidis'));
const make = (steps, done) => {
  const ctx = vm.createContext({ songSteps: () => steps, isStepDone: (_s, k) => done.has(k) });
  vm.runInContext(code + 'this.isStepUnlocked = isStepUnlocked; this.firstOpenStep = firstOpenStep;', ctx);
  return ctx;
};
const pace = (hands, range) => ({ kind: 'pace', hands, range });
const p1 = [0, 4], p2 = [4, 8];
const full = [
  pace('rh', p1), pace('lhs', p1), pace('bothS', p1), pace('lh', p1), pace('both', p1),   // フレーズ1
  pace('rh', p2), pace('lhs', p2), pace('bothS', p2), pace('lh', p2), pace('both', p2),   // フレーズ2
  pace('both', [0, 8]), pace('both', [0, 8.5]),                                            // つなげる・通し
  { kind: 'tempo', hands: 'both', range: [0, 8.5] },
];

test('every step of every song is selectable without clearing earlier ones', () => {
  const c = make(full, new Set());
  for (let i = 0; i < full.length; i++) assert.equal(c.isStepUnlocked({ id: 'merry' }, i), true);
});
test('opening a song starts at the first unfinished both-hands step', () => {
  const done = new Set();
  const c = make(full, done);
  assert.equal(c.firstOpenStep({ id: 'merry' }), 4);
  done.add(4);
  assert.equal(c.firstOpenStep({ id: 'merry' }), 9, 'next phrase, both hands');
  [9, 10, 11].forEach((k) => done.add(k));
  assert.equal(c.firstOpenStep({ id: 'merry' }), 4, 'all both-hands steps cleared: first both-hands step');
});
test('daily sight-reading songs keep starting at the first unfinished step', () => {
  const steps = [pace('both', [0, 8]), { kind: 'tempo', hands: 'both' }, { kind: 'tempo', hands: 'both' }];
  const done = new Set([0]);
  const c = make(steps, done);
  assert.equal(c.firstOpenStep({ id: 'sight-x', generated: true }), 1);
});

test('when the full both-hands step was dropped as identical, the simplified one is used', () => {
  // フレーズ1は左手が簡易と同じで「両手」が省かれている
  const steps = [pace('rh', p1), pace('lhs', p1), pace('bothS', p1), pace('rh', p2), pace('lhs', p2), pace('bothS', p2), pace('lh', p2), pace('both', p2)];
  const c = make(steps, new Set());
  assert.equal(c.firstOpenStep({ id: 'x' }), 2);
});
