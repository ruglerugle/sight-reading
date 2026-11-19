'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

const catalog = read('songs.js');
const renderer = read('song-mode.js');
const from = renderer.indexOf('const SONG_DUR =');
const to = renderer.indexOf('// ---- 記録 ----');
const data = JSON.parse(vm.runInNewContext(
  catalog + '\n' + renderer.slice(from, to) + '\n' +
  'const s = SONGS.find(s => s.id === "beyer-op101-no61"); JSON.stringify({ song:s, compiled:compileSong(s), stages:songSteps(s), layout:songSystemPositions([[12,13],[14,15]],compileSong(s).rh,240), leftOnlyLayout:songSystemPositions([[12,13],[14,15]],[],115), genres:SONG_GENRES, catalog:SONGS.map(s => s.id) });',
  { LETTERS: 'cdefgab'.split(''), stepToMidi: (step, acc) => (Math.floor(step / 7) + 1) * 12 + [0, 2, 4, 5, 7, 9, 11][step % 7] + acc },
));

test('Beyer No.61 is discoverable as a complete piece and does not displace the three Burgmüller entries', () => {
  assert.equal(data.song.genre, 'beyer');
  assert.equal(data.song.title, 'バイエル 第61番');
  assert.ok(data.genres.some(([genre]) => genre === data.song.genre));
  assert.ok(data.genres.some(([genre, name]) => genre === 'etude' && name.includes('ブルグミュラー')));
  for (const id of ['burgmuller-candeur', 'burgmuller-arabesque', 'burgmuller-pastorale']) assert.ok(data.catalog.includes(id));
  assert.equal(data.song.locked, undefined);
  assert.deepEqual(data.song.phrases, [[0,4], [4,8], [8,12], [12,16]]);
  assert.equal(data.stages.length, 27);
});

test('No.61 compiles as 16 complete common-time measures with the original high ending and rest', () => {
  const { song, compiled } = data;
  assert.equal(song.key, 'C'); // Empty key signature, not a claim about G-centred harmony.
  assert.equal(song.time, '4/4');
  assert.deepEqual(compiled.lens, Array(16).fill(4));
  for (const hand of ['rh', 'lh']) {
    const last = compiled[hand].at(-1);
    assert.equal(last.rest, true); assert.equal(last.t, 63); assert.equal(last.beats, 1);
    assert.equal(compiled[hand].at(-2).t, 62);
  }
  assert.equal(compiled.rh.at(-2).keys[0].step, 46); // G6.
  assert.equal(compiled.lh.at(-2).keys[0].step, 25); // G3.
  assert.equal(compiled.rh[0].dots, 1);
  assert.equal(compiled.rh[0].beats, 1.5);
});


test('only the staff system with the high G6 gets headroom', () => {
  assert.deepEqual(data.layout, { ys: [0, 252], height: 492 });
  assert.deepEqual(data.leftOnlyLayout, { ys: [0, 115], height: 230 });
});
