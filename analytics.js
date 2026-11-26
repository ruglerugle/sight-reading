'use strict';
// 動画から来た人が「冒頭を練習し始めたか・最後まで行ったか」を、個人を特定しない件数で数える（受け口：POST /api/event）
// 送るのは出来事名と utm_campaign だけ。IP・メール・端末の ID・会員 ID は送らない。tests/analytics.test.cjs で確かめる
(function (root) {
  const EVENTS = ['landing', 'song_start', 'song_complete', 'paywall_view'];
  const KEY = 'utm_campaign';
  const LANDED = 'utm_landed';
  // 開始・完了を数えるのは、動画の対象曲「ひだまりのかえりみち」の冒頭8小節（最初の区切り）だけ
  const TARGET_SONG = 'hidamari-michi';
  // 1訪問（同じタブ）に1回だけ送る出来事と、送ったことを覚えておく sessionStorage の名前
  const ONCE = { landing: LANDED, song_start: 'utm_sent_start', song_complete: 'utm_sent_complete' };
  // song: 曲データ、step: 練習の段階 { kind, range }、practice: 練習モードか
  // 対象曲（お試し）の最初の区切りを、自分のペースで弾く段階（右手・左手・両手のどれでも）なら true
  const isTargetIntro = (song, step, practice) => {
    // 有料会員（曲の続きを受け取った後は locked が外れる）の練習は、無料の冒頭の件数に入れない
    if (!song || !step || practice || song.generated || !song.locked || song.id !== TARGET_SONG) return false;
    const first = song.phrases && song.phrases[0];
    return step.kind === 'pace' && !!first && !!step.range
      && step.range[0] === first[0] && step.range[1] === first[1];
  };
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
        if (typeof env.beacon !== 'function') return false;
        const once = ONCE[event];
        if (once) {
          if (get(once)) return false; // 1訪問に1回（再読み込みしても同じタブなら増えない）
          set(once, '1');
        }
        return !!env.beacon('/api/event', JSON.stringify({ event, utm_campaign: utm }));
      } catch (e) { return false; }
    };
    // 曲の練習から呼ぶ入口：対象曲の冒頭8小節のときだけ送る
    const trackSong = (event, song, step, practice) => {
      if (event !== 'song_start' && event !== 'song_complete') return false;
      if (!isTargetIntro(song, step, practice)) return false;
      return track(event);
    };
    return { track, trackSong, campaign };
  };
  const api = { EVENTS, TARGET_SONG, create, clean, isTargetIntro };
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
