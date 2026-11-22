'use strict';
// ブラウザを閉じて戻ったあと（AudioContext が 'interrupted' や 'suspended' のまま）でも、次の操作で音が戻ること
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync(require.resolve('../index.html'), 'utf8');
const audioSrc = html.slice(html.indexOf('let audio = null;'), html.indexOf('// at: 鳴らす時刻'));

const setup = () => {
  const clock = { t: 100000 };
  const made = [];
  const listeners = {};
  const node = () => ({ connect() { return this; }, disconnect() {} });
  function AudioContext() {
    const ctx = {
      state: 'running', resumes: 0, closed: false, destination: node(), currentTime: 0,
      createDynamicsCompressor: node, createGain: node, createPeriodicWave: () => ({}),
      resume() { this.resumes++; return Promise.resolve(); },
      close() { this.closed = true; this.state = 'closed'; return Promise.resolve(); },
    };
    made.push(ctx);
    return ctx;
  }
  const sandbox = vm.createContext({
    AudioContext, Date: { now: () => clock.t }, performance: { now: () => clock.t }, kbRange: [48, 84], navigator: {}, console: { warn() {} },
    document: { hidden: false, addEventListener(t, f) { (listeners[t] = listeners[t] || []).push(f); } },
    window: { addEventListener(t, f) { (listeners[t] = listeners[t] || []).push(f); } },
  });
  vm.runInContext(audioSrc + '\nthis.getAudio = getAudio;', sandbox);
  const fire = (t) => (listeners[t] || []).forEach((f) => f());
  return { sandbox, made, fire, listeners, clock };
};

test('every tap (not only the first) resumes an interrupted or suspended AudioContext', () => {
  const { sandbox, made, fire } = setup();
  fire('touchstart');
  assert.equal(made.length, 1);
  for (const state of ['interrupted', 'suspended']) {
    made[0].state = state;
    const before = made[0].resumes;
    fire('touchend');
    assert.equal(made[0].resumes, before + 1, `resumed from ${state}`);
    made[0].state = 'running';
    fire('touchend');
  }
  assert.equal(sandbox.getAudio().ctx, made[0]);
});

test('if the AudioContext stays stopped after one tap, the next tap makes a new one', () => {
  const { sandbox, made, fire, clock } = setup();
  fire('mousedown');
  made[0].state = 'interrupted';
  fire('touchstart'); // 1回目のタップ：再開を試す
  fire('touchend');   // 同じタップの続き：作り直さない
  fire('mousedown');
  assert.equal(made.length, 1);
  clock.t += 2000;
  fire('touchstart'); // 次のタップでもまだ止まったまま → 作り直す
  assert.equal(made.length, 2);
  assert.ok(made[0].closed);
  assert.equal(sandbox.getAudio().ctx, made[1]);
});

test('coming back to the page tries to resume, and a closed AudioContext is replaced', () => {
  const { sandbox, made, fire } = setup();
  fire('keydown');
  made[0].state = 'suspended';
  fire('visibilitychange');
  fire('pageshow');
  assert.equal(made[0].resumes, 2);
  made[0].state = 'closed';
  assert.notEqual(sandbox.getAudio().ctx, made[0]);
});

test('a "running" AudioContext whose clock is stuck (iPhone after reopening) is replaced on the next tap', () => {
  const { sandbox, made, fire, clock } = setup();
  fire('touchstart');           // 作って、時計を記録
  clock.t += 5000;              // 5秒たっても currentTime は 0 のまま（止まっている）
  fire('touchstart');
  assert.equal(made.length, 2, 'recreated');
  assert.ok(made[0].closed);
  assert.equal(sandbox.getAudio().ctx, made[1]);
});

test('a running AudioContext whose clock advances is kept', () => {
  const { sandbox, made, fire, clock } = setup();
  fire('touchstart');
  clock.t += 5000;
  made[0].currentTime += 5;     // 時計も5秒進んでいる
  fire('touchstart');
  fire('touchend');             // 同じタップの続き
  assert.equal(made.length, 1);
  assert.equal(sandbox.getAudio().ctx, made[0]);
});

test('the clock is recorded when the page is hidden, and checked on the first tap after coming back', () => {
  const { made, fire, clock, sandbox } = setup();
  fire('touchstart');
  clock.t += 60000;
  made[0].currentTime += 60;    // 使っている間は進んでいた
  sandbox.document.hidden = true;
  fire('visibilitychange');     // 隠れる：時計を記録
  clock.t += 600000;            // 10分後に戻る。そのあいだ時計は止まったまま
  sandbox.document.hidden = false;
  fire('visibilitychange');
  fire('touchstart');
  assert.equal(made.length, 2, 'recreated after coming back with a stuck clock');
});
