const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function harness() {
  let id = 0; const timers = new Map(); const elements = [];
  const make = (tag) => {
    const handlers = {};
    const el = { tag, children: [], dataset: {}, className: '', hidden: false,
      appendChild(child) { this.children.push(child); },
      addEventListener(type, fn) { handlers[type] = fn; },
      after(sibling) { this.next = sibling; },
      remove() { this.removed = true; },
      click() { handlers.click?.(); },
    };
    elements.push(el); return el;
  };
  const context = vm.createContext({
    document: { createElement: make, head: make('head') }, console,
    setTimeout(fn, delay) { const n = ++id; timers.set(n, { fn, delay }); return n; },
    clearTimeout(n) { timers.delete(n); },
  });
  vm.runInContext(fs.readFileSync(require.resolve('../demo.js'), 'utf8') + '\nglobalThis.demo = Demo;', context);
  const buses = [];
  const ctx = { currentTime: 0, state: 'running', resumes: 0,
    resume() { this.resumes++; this.state = 'running'; return Promise.resolve(); },
    createGain() {
      const bus = { connected: false, disconnected: false, fades: [],
        gain: { setTargetAtTime(...args) { bus.fades.push(args); } },
        connect() { this.connected = true; }, disconnect() { this.disconnected = true; },
      };
      buses.push(bus); return bus;
    },
  };
  const run = (timerId) => { const t = timers.get(timerId); assert.ok(t, 'timer exists'); timers.delete(timerId); t.fn(); };
  return { demo: context.demo, make, ctx, buses, timers, run };
}

test('pause cancels scheduled work once; resume uses a fresh bus and correct elapsed offset; stop restores UI', () => {
  const h = harness(), btn = h.make('button'), calls = [], cancels = [], live = new Set(); let ends = 0;
  const schedule = (bus, start, from) => {
    const job = { bus, start, from }; calls.push(job); live.add(job);
    return () => { cancels.push(job); live.delete(job); };
  };
  h.demo.play(btn, { ctx: h.ctx, out: {}, len: 10, schedule, onEnd: () => ends++ });
  assert.equal(btn.hidden, true); assert.equal(h.demo.active, true);
  assert.equal(calls[0].start, .06); assert.equal(calls[0].from, 0);
  const [pause, stop] = btn.next.children;
  h.ctx.currentTime = 2.06; pause.click();
  assert.equal(pause.textContent, '再開'); assert.equal(cancels.length, 1); assert.equal(live.size, 0);
  assert.equal(h.buses[0].fades.length, 1); assert.equal(h.buses[0].disconnected, false);
  assert.equal([...h.timers.values()].filter(t => t.delay > 80).length, 0, 'natural-end timer canceled');
  const fade = [...h.timers.keys()][0]; h.run(fade); assert.equal(h.buses[0].disconnected, true);
  h.ctx.currentTime = 7; pause.click();
  assert.equal(calls.length, 2); assert.equal(calls[1].from, 2); assert.equal(calls[1].start, 7.06);
  assert.notEqual(calls[1].bus, calls[0].bus); assert.equal(live.size, 1);
  stop.click(); assert.equal(live.size, 0); assert.equal(cancels.length, 2); assert.equal(ends, 1);
  assert.equal(btn.hidden, false); assert.equal(h.demo.active, false); assert.equal(btn.next.removed, true);
  h.demo.stop(); assert.equal(cancels.length, 2); assert.equal(ends, 1);
});

test('rapid replacement cancels the old job and only new completion remains active', () => {
  const h = harness(), a = h.make('button'), b = h.make('button'); let oldCancel = 0, newCancel = 0;
  h.demo.play(a, { ctx: h.ctx, out: {}, len: 100, schedule: () => () => oldCancel++ });
  h.demo.play(b, { ctx: h.ctx, out: {}, len: 4, schedule: () => () => newCancel++ });
  assert.equal(oldCancel, 1); assert.equal(a.hidden, false); assert.equal(b.hidden, true);
  assert.equal([...h.timers.values()].filter(t => t.delay > 80).length, 1);
  const end = [...h.timers].find(([, t]) => t.delay > 80)[0]; h.run(end);
  assert.equal(newCancel, 1); assert.equal(b.hidden, false); assert.equal(h.demo.active, false);
});

test('natural completion invokes cleanup before onEnd, and old schedule callers need no cleanup return', () => {
  const h = harness(), btn = h.make('button'), order = [];
  h.demo.play(btn, { ctx: h.ctx, out: {}, len: 5, schedule: () => () => order.push('cleanup'), onEnd: () => order.push('end') });
  const end = [...h.timers].find(([, t]) => t.delay > 80)[0]; h.run(end);
  assert.deepEqual(order, ['cleanup', 'end']); assert.equal(h.buses[0].fades.length, 1);
  h.ctx.state = 'suspended';
  h.demo.play(btn, { ctx: h.ctx, out: {}, len: 2, schedule: () => undefined });
  assert.equal(h.ctx.resumes, 1); assert.doesNotThrow(() => h.demo.stop());
});

test('stop while paused never resurrects a job or invokes its cleanup twice', () => {
  const h = harness(), btn = h.make('button'); let jobs = 0, canceled = 0;
  h.demo.play(btn, { ctx: h.ctx, out: {}, len: 8, schedule: () => { jobs++; return () => canceled++; } });
  btn.next.children[0].click(); btn.next.children[1].click();
  assert.equal(jobs, 1); assert.equal(canceled, 1); assert.equal(h.demo.active, false);
  for (const id of [...h.timers.keys()]) h.run(id);
  assert.equal(jobs, 1); assert.equal(canceled, 1);
});
