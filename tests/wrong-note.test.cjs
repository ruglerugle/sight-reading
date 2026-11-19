'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function source(start, end) {
  const a = html.indexOf(start);
  const b = html.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a);
  return html.slice(a, b);
}
function node(tag) {
  return { tag, attrs: {}, children: [], setAttribute(k, v) { this.attrs[k] = String(v); },
    append(n) { this.children.push(n); }, replaceChildren() { this.children = []; } };
}
function setup() {
  const windowEvents = {}, docEvents = {};
  const layer = node('g');
  const targetDrawing = node('path');
  const staff = node('svg');
  staff.append(targetDrawing);
  staff.append(layer);
  const releases = [];
  const document = { hidden: false, createElementNS: (ns, tag) => node(tag),
    addEventListener(k, fn) { docEvents[k] = fn; } };
  const window = { addEventListener(k, fn) { windowEvents[k] = fn; } };
  const current = { notes: [{ step: 30, acc: 1, clef: 'treble' }, { step: 31, acc: 0, clef: 'treble' }], pos: 0 };
  const sandbox = { document, window, current, state: 'ask', layer, releases,
    CLEF_BOTTOM: { treble: 30 }, target: () => current.notes[current.pos] };
  vm.runInNewContext([
    'const heldInputs = new Map();',
    source('let wrongLayout = null;', 'const render = (colorQ)'),
    source('const pressInput = (id, midi', '// ---- PCキーボード ----'),
    source('const onMidiMessage = (e, device)', 'const initMidi ='),
    'const noteOff = n => releases.push(n);',
    "const handleNote = (midi, p) => showWrong(p, { step: midi === 98 ? 49 : 30 + midi - 64, acc: 0 }, 'treble');",
    'wrongLayout = { layer, staves: { treble: { getYForLine: n => 26 + n * 10 } }, anchors: [120, 205], H: 92 };',
    'this.api = { pressInput, releaseInput, onMidiMessage, drawWrong };',
  ].join('\n'), sandbox);
  return { ...sandbox.api, windowEvents, docEvents, layer, current, releases, document, targetDrawing, staff };
}
const notes = a => a.layer.children.map(n => Number(n.attrs['data-wrong-note']));

test('wrong notes align to the active target, preserve the target DOM, and release individually', () => {
  const a = setup();
  a.pressInput('pointer:5', 64);
  a.pressInput('pc:KeyE', 65);
  assert.deepEqual(notes(a), [64, 65]);
  assert.deepEqual(a.layer.children.map(x => x.attrs['data-note-x']), ['120', '120']);
  assert.equal(a.layer.children[0].children.find(x => x.tag === 'text').textContent, '♮');
  a.windowEvents.pointercancel({ pointerId: 5 });
  assert.deepEqual(notes(a), [65]);
  assert.equal(a.staff.children[0], a.targetDrawing);
  a.current.pos = 1;
  a.drawWrong();
  assert.deepEqual(notes(a), []);
  a.pressInput('pointer:6', 98);
  assert.equal(a.layer.children[0].attrs['data-note-x'], '205');
  assert.ok(a.layer.children[0].children.some(x => x.tag === 'text' && x.textContent.includes('oct')));
  a.windowEvents.lostpointercapture({ pointerId: 6 });
  assert.deepEqual(notes(a), []);
  assert.deepEqual(a.releases, []); // screen / PC chord-entry semantics unchanged
});

test('separate MIDI channels/ports can hold the same wrong pitch; zero-velocity and all-notes-off release it', () => {
  const a = setup();
  const play = (status, note, vel, device) => a.onMidiMessage({ data: [status, note, vel] }, device);
  play(0x90, 64, 90, 'keys-a');
  play(0x91, 64, 90, 'keys-b');
  assert.deepEqual(notes(a), [64]);
  play(0x90, 64, 0, 'keys-a');
  assert.deepEqual(notes(a), [64]);
  assert.deepEqual(a.releases, []);
  play(0xb0, 123, 0, 'keys-b'); // wrong channel does not release channel 2
  assert.deepEqual(notes(a), [64]);
  play(0xb1, 123, 0, 'keys-b');
  assert.deepEqual(notes(a), []);
  assert.deepEqual(a.releases, [64]);
});

test('blur and backgrounding clear overlays even if an up event never arrives', () => {
  const a = setup();
  a.pressInput('pc:KeyE', 64);
  a.pressInput('pointer:5', 65);
  a.windowEvents.blur();
  assert.deepEqual(notes(a), []);
  a.pressInput('pointer:6', 66);
  a.document.hidden = true;
  a.docEvents.visibilitychange();
  assert.deepEqual(notes(a), []);
});
