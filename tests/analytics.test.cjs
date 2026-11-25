'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { create, clean } = require('../analytics.js');

const env = (search) => {
  const data = new Map(); const sent = [];
  return { sent, data, search,
    storage: { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, v) },
    beacon: (u, b) => { sent.push([u, JSON.parse(b)]); return true; } };
};

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

test('wiring: song start/complete and paywall call Analytics', () => {
  const sm = fs.readFileSync(require.resolve('../song-mode.js'), 'utf8');
  const ui = fs.readFileSync(require.resolve('../ui.js'), 'utf8');
  assert.match(sm, /trackSong\('song_start'\)/);
  assert.match(sm, /trackSong\('song_complete'\)/);
  assert.match(ui, /Analytics\.track\('paywall_view'\)/);
  assert.match(fs.readFileSync(require.resolve('../index.html'), 'utf8'), /<script src="analytics\.js\?v=1"><\/script>/);
});
