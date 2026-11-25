'use strict';
// 動画から来た人が「冒頭を練習し始めたか・最後まで行ったか」を、個人を特定しない件数で数える（受け口：POST /api/event）
// 送るのは出来事名と utm_campaign だけ。IP・メール・端末の ID・会員 ID は送らない。tests/analytics.test.cjs で確かめる
(function (root) {
  const EVENTS = ['landing', 'song_start', 'song_complete', 'paywall_view'];
  const KEY = 'utm_campaign';
  const LANDED = 'utm_landed';
  const clean = (v) => {
    const s = String(v == null ? '' : v).trim().slice(0, 64);
    return /^[\w.\-]+$/.test(s) ? s : '';
  };
  // env: { search, storage, beacon }。どれが欠けても、何も送らないだけで止まらない
  const create = (env) => {
    const get = (k) => { try { return env.storage.getItem(k); } catch (e) { return null; } };
    const set = (k, v) => { try { env.storage.setItem(k, v); } catch (e) { /* 保存できなくても続ける */ } };
    const fromUrl = () => { try { return clean(new URLSearchParams(env.search || '').get('utm_campaign')); } catch (e) { return ''; } };
    const found = fromUrl();
    if (found) set(KEY, found);
    const campaign = () => found || clean(get(KEY));
    const track = (event) => {
      try {
        if (!EVENTS.includes(event)) return false;
        const utm = campaign();
        if (!utm) return false; // utm_campaign が無い訪問では何も送らない
        if (event === 'landing') {
          if (get(LANDED)) return false; // 1訪問に1回
          set(LANDED, '1');
        }
        if (typeof env.beacon !== 'function') return false;
        return !!env.beacon('/api/event', JSON.stringify({ event, utm_campaign: utm }));
      } catch (e) { return false; }
    };
    return { track, campaign };
  };
  const api = { EVENTS, create, clean };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else {
    let storage = null;
    try { storage = root.sessionStorage; } catch (e) { /* 使えない */ }
    const beacon = (u, b) => root.navigator && typeof root.navigator.sendBeacon === 'function' && root.navigator.sendBeacon(u, b);
    const inst = create({ search: root.location && root.location.search, storage, beacon });
    root.Analytics = Object.assign({}, api, inst);
    inst.track('landing');
  }
})(typeof window !== 'undefined' ? window : globalThis);
