'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { create, clean, isTargetIntro, TARGET_SONG } = require('../analytics.js');

const env = (search, data = new Map(), sent = []) => ({ sent, data, search,
  storage: { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, v) },
  beacon: (u, b) => { sent.push([u, JSON.parse(b)]); return true; } });

// 本物の曲データ（songs.js）
const SONGS = (() => {
  const ctx = vm.createContext({});
  vm.runInContext(fs.readFileSync(require.resolve('../songs.js'), 'utf8') + '\nthis.SONGS = SONGS;', ctx);
  return ctx.SONGS;
})();
const song = (id) => SONGS.find((s) => s.id === id);
const pace = (range, hands = 'both') => ({ kind: 'pace', hands, range });

test('landing is sent once per visit, with only event and utm_campaign', () => {
  const e = env('?utm_campaign=yt1');
  const a = create(e);
  assert.equal(a.track('landing'), true);
  assert.equal(a.track('landing'), false);
  assert.deepEqual(e.sent, [['/api/event', { event: 'landing', utm_campaign: 'yt1' }]]);
});
test('utm_campaign is kept in sessionStorage for later events and later page loads', () => {
  const e = env('?utm_campaign=yt1');
  create(e);
  const later = create({ ...e, search: '' });
  later.track('song_start'); later.track('song_complete'); later.track('paywall_view');
  assert.deepEqual(e.sent.map(([, b]) => b.event), ['song_start', 'song_complete', 'paywall_view']);
  assert.ok(e.sent.every(([, b]) => b.utm_campaign === 'yt1' && Object.keys(b).length === 2));
});
test('nothing is sent without utm_campaign', () => {
  const e = env('');
  const a = create(e);
  for (const ev of ['landing', 'song_start', 'song_complete', 'paywall_view']) assert.equal(a.track(ev), false);
  assert.equal(a.trackSong('song_start', song(TARGET_SONG), pace([0, 8]), false), false);
  assert.equal(e.sent.length, 0);
});
test('unknown events and odd utm values are not sent', () => {
  assert.equal(create(env('?utm_campaign=a%20b%3Cx')).track('song_start'), false);
  assert.equal(clean('x'.repeat(100)), 'x'.repeat(64));
  assert.equal(create(env('?utm_campaign=yt')).track('other'), false);
});
test('failures never throw', () => {
  const bad = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); } };
  assert.doesNotThrow(() => create({ search: '?utm_campaign=a', storage: bad, beacon() { throw new Error('x'); } }).track('song_start'));
  assert.equal(create({ search: '?utm_campaign=a', storage: null }).track('song_start'), false);
});

test('target is the first 8 bars (first phrase) of hidamari-michi only', () => {
  const t = song(TARGET_SONG);
  assert.equal(t.title, 'ひだまりのかえりみち');
  assert.deepEqual([...t.phrases[0]], [0, 8]);
  for (const h of ['rh', 'lhs', 'bothS', 'lh', 'both']) assert.equal(isTargetIntro(t, pace([0, 8], h), false), true);
  assert.equal(isTargetIntro(t, pace([8, 16]), false), false, 'another section');
  assert.equal(isTargetIntro(t, pace([0, 16]), false), false, 'joined sections');
  assert.equal(isTargetIntro(t, { kind: 'tempo', pct: 80, range: [0, 8] }, false), false, 'tempo step');
  assert.equal(isTargetIntro(t, pace([0, 8]), true), false, 'practice mode');
  assert.equal(isTargetIntro({ ...t, locked: false }, pace([0, 8]), false), false, 'paid member (full song)');
  const sakura = song('sakura');
  assert.equal(sakura.title, 'さくらさくら');
  assert.equal(isTargetIntro(sakura, pace(sakura.phrases[0]), false), false, 'other trial song');
  for (const s of SONGS) if (s.id !== TARGET_SONG) assert.equal(isTargetIntro(s, pace(s.phrases[0]), false), false, s.id);
});

// song-mode.js の本物の trackSong を、未ログインの同じタブで続けて動かす（送信は外へ出さない模擬の記録）
test('same tab: target intro then another trial song → start/complete once each', () => {
  const src = fs.readFileSync(require.resolve('../song-mode.js'), 'utf8');
  const code = src.slice(src.indexOf('const trackSong = '), src.indexOf('const songNoteOn'));
  const data = new Map(); const sent = [];
  const load = (search) => {
    const ctx = vm.createContext({ Analytics: create(env(search, data, sent)), songRun: null });
    vm.runInContext(code + '\nthis.trackSong = trackSong;', ctx);
    return ctx;
  };
  const tab = load('?utm_campaign=yt-hidamari');
  tab.Analytics.track('landing');
  const play = (ctx, s, step, { complete = true, practice = false } = {}) => {
    ctx.songRun = { song: s, step, practice };
    ctx.trackSong('song_start'); ctx.trackSong('song_start'); // 2音目以降も同じ試行
    if (complete) ctx.trackSong('song_complete');
  };
  const t = song(TARGET_SONG);
  play(tab, t, pace([0, 8], 'rh'));   // 対象曲の冒頭8小節（右手）
  play(tab, t, pace([0, 8], 'both')); // 同じ冒頭をもう一度（両手）
  const sakura = song('sakura');
  play(tab, sakura, pace(sakura.phrases[0]));          // 別の試奏曲
  play(tab, t, pace([8, 16]));                         // 別の区切り
  play(tab, t, pace([0, 8]), { practice: true });      // 練習モード
  const again = load('');                              // 同じタブで再読み込み
  play(again, t, pace([0, 8]));
  play(again, sakura, pace(sakura.phrases[0]));
  assert.deepEqual(sent.map(([, b]) => b.event), ['landing', 'song_start', 'song_complete']);
  assert.ok(sent.every(([u, b]) => u === '/api/event' && b.utm_campaign === 'yt-hidamari' && Object.keys(b).length === 2));
});

test('wiring: start on a played key, complete at the last note, never from demo playback', () => {
  const sm = fs.readFileSync(require.resolve('../song-mode.js'), 'utf8');
  const ui = fs.readFileSync(require.resolve('../ui.js'), 'utf8');
  assert.equal(sm.match(/trackSong\('song_start'\)/g).length, 1);
  assert.equal(sm.match(/trackSong\('song_complete'\)/g).length, 1);
  const noteOn = sm.slice(sm.indexOf('const songNoteOn'), sm.indexOf('const songNoteOn') + 200);
  assert.match(noteOn, /trackSong\('song_start'\)/);
  const demo = sm.slice(sm.indexOf('const playSongDemo'), sm.indexOf('const followDemo'));
  assert.ok(demo.length > 0);
  assert.doesNotMatch(demo, /trackSong|Analytics/);
  assert.match(sm, /Analytics\.trackSong\(event, r\.song, r\.step, r\.practice\)/);
  assert.match(ui, /Analytics\.track\('paywall_view'\)/);
  assert.match(fs.readFileSync(require.resolve('../index.html'), 'utf8'), /<script src="analytics\.js\?v=2"><\/script>/);
});
