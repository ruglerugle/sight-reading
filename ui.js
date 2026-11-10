'use strict';
// ---- 画面の構成：ホーム・練習・曲・記録の切り替え、ステージの道のり、曲の一覧、有料版の案内、はじめての方への案内 ----
// index.html の本体より先に読み込む。本体の関数（startStage・render など）は関数の中でだけ使う

const VIEWS = ['home', 'play', 'songs', 'records'];
const MAIN_LAST = 7; // 読む力の道は 1〜7、音程の道は 8〜10
const STAGE_DESC = {
  1: '1つの音符をすばやく読む', 2: '2つの音を左から順に', 3: '3つの音を先読みしながら', 4: '4つの音を止まらずに',
  5: '2つの音を同時に押さえる', 6: '三和音を同時に押さえる', 7: '形が変わる和音を読む',
  8: '前の音から2度・3度', 9: '前の音から4度・5度', 10: '前の音から6度〜オクターブ',
};
const IV_DOT = { 8: '2·3', 9: '4·5', 10: '6-8' };

const currentView = () => document.body.dataset.view;

const showView = (v) => {
  if (!VIEWS.includes(v)) return;
  const prev = currentView();
  // テンポの練習中に練習の画面を離れたら、メトロノームを止めてそのステップの最初に戻す
  if (prev === 'play' && v !== 'play' && songRun && songRun.tempo && songRun.state === 'play') {
    startSongStep(songRun.stepIdx);
  }
  document.body.dataset.view = v;
  document.querySelectorAll('.tabs button[data-tab]').forEach((b) => {
    if (b.dataset.tab === v) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
  if (v === 'play') {
    // 隠れているあいだは幅が測れないので、出してから描き直す
    render();
    syncKbScroll();
    updatePlayBar();
  }
  if (v === 'home') renderHome();
  if (v === 'songs') renderSongLib();
  if (v === 'records') { updateStats(); renderBadges(); }
  if (prev !== v) window.scrollTo(0, 0);
};

const startFromHome = (mode) => {
  startStage(mode);
  showView('play');
};

const openSong = (id) => {
  const song = songById(id);
  progress.song = { id: song.id, step: firstOpenStep(song) };
  if (progress.mode === 'song') {
    buildKeyboard();
    startSongStep(firstOpenStep(song));
  } else {
    startStage('song');
  }
  showView('play');
};

// ---- 練習の画面の上のバー（題名・進み具合・得点） ----
const updatePlayBar = () => {
  const title = $('playTitle');
  if (!title) return;
  let name = '';
  let pct = 0;
  let score = 0;
  let combo = 0;
  if (progress.mode === 'song' && songRun) {
    const r = songRun;
    name = `${r.song.title}　${r.stepIdx + 1}/${r.steps.length}`;
    pct = r.events.length ? (Math.min(r.pos, r.events.length) / r.events.length) * 100 : 0;
    score = r.score;
    combo = r.combo;
  } else if (progress.mode === 'free') {
    name = '自由練習';
    score = stageRun.score;
    combo = stageRun.combo;
    pct = 100;
  } else if (typeof progress.mode === 'number') {
    name = `${stageTitle(progress.mode)}${isIvStage(progress.mode) ? '' : `　${STAGES[progress.mode - 1].name}`}`;
    pct = (stageRun.done / STAGE_Q) * 100;
    score = stageRun.score;
    combo = stageRun.combo;
  }
  title.textContent = name;
  $('playProg').style.width = `${pct}%`;
  $('sheet').classList.toggle('song', progress.mode === 'song');
  $('playScore').textContent = String(score);
  $('playSub').innerHTML = combo >= 2 ? `<span class="combo">${combo} コンボ</span>` : '点';
  const lockedSong = progress.mode === 'song' && songRun && songRun.song.locked;
  $('unlockBtn').hidden = !(lockedSong && BILLING_ON && !account.paid);
};

// ---- ホーム ----
const mainNext = () => {
  for (let m = 1; m <= MAIN_LAST; m++) if (isUnlocked(m) && !stageCleared(m)) return m;
  return MAIN_LAST;
};
const songStars = (s) => {
  const n = songSteps(s).length;
  let got = 0;
  for (let i = 0; i < n; i++) got += starsOf(songKey(s.id, i));
  return { got, max: n * 3, done: songRecord(s.id).done.length, steps: n };
};
const allStars = () => STAGES.reduce((a, _, i) => a + starsOf(stageKey(i + 1)), 0) + songStarTotals().got;

const renderContinue = () => {
  const el = $('continueCard');
  if (progress.mode === 'song' && progress.song) {
    const song = currentSong();
    const steps = songSteps(song);
    const step = steps[Math.min(progress.song.step || 0, steps.length - 1)];
    const ss = songStars(song);
    el.innerHTML =
      `<span class="kicker">つづきから　♪ 曲</span><h2>${song.title}</h2>` +
      `<p>${step ? step.label : ''}</p>` +
      `<span class="stars-line">★ ${ss.got} / ${ss.max}</span>` +
      '<button type="button" class="big" data-continue="song">▶ 練習を続ける</button>' +
      '<img class="chara chara-hero" src="/img/chara/hello.svg?v=3" alt="" width="92" height="83">';
    return;
  }
  const m = typeof progress.mode === 'number' && isUnlocked(progress.mode) ? progress.mode : mainNext();
  const stars = starsOf(stageKey(m));
  el.innerHTML =
    `<span class="kicker">つづきから　${CLEF_NAME[settings.clef]}</span>` +
    `<h2>${stageTitle(m)}${isIvStage(m) ? '' : `　${STAGES[m - 1].name}`}</h2>` +
    `<p>${STAGE_DESC[m]}。20問・一発正解16問以上でクリア</p>` +
    `<span class="stars-line">${starText(stars)}</span>` +
    `<button type="button" class="big" data-continue="${m}">▶ ${stars ? 'もう一度挑戦' : 'スタート'}</button>` +
    `<img class="chara chara-hero" src="/img/chara/${stars ? 'happy' : 'guide'}.svg?v=3" alt="" width="92" height="83">`;
};

const renderPath = () => {
  const next = mainNext();
  const nextIv = [8, 9, 10].find((m) => isUnlocked(m) && !stageCleared(m));
  const node = (m) => {
    const locked = !isUnlocked(m);
    const stars = starsOf(stageKey(m));
    const done = stageCleared(m) || stars > 0;
    const isNext = !locked && !done && (m === next || m === nextIv);
    const cls = locked ? 'locked' : done ? 'done' : isNext ? 'next' : '';
    const dot = locked ? '🔒' : done ? '✓' : IV_DOT[m] || String(m);
    return `<button type="button" class="node ${cls}" data-stage="${m}"${locked ? ' disabled' : ''}>` +
      `<span class="dot"${IV_DOT[m] && !locked && !done ? ' style="font-size:1rem"' : ''}>${dot}</span>` +
      `<span><span class="nm">${isIvStage(m) ? STAGES[m - 1].name : `${m}. ${STAGES[m - 1].name}`}</span>` +
      `<span class="st${stars ? '' : ' none'}">${starText(stars)}</span>` +
      `<span class="sub">${locked ? (m === 8 ? '「4音」をクリアで開く' : 'ひとつ前をクリアで開く') : STAGE_DESC[m]}</span></span></button>`;
  };
  $('pathMain').innerHTML = [1, 2, 3, 4, 5, 6, 7].map(node).join('');
  $('pathIv').innerHTML = [8, 9, 10].map(node).join('');
  $('pathClef').textContent = `${CLEF_NAME[settings.clef]}の進み具合（⚙ で切り替え）`;
};

const renderToday = () => {
  if (!$('goalRing')) return;
  const d = daily();
  const sec = todaySec();
  const pct = Math.min(1, sec / d.goal);
  const R = 40;
  const C = 2 * Math.PI * R;
  $('goalRing').className = 'ring' + (pct >= 1 ? ' met' : '');
  $('goalRing').innerHTML =
    `<svg viewBox="0 0 92 92" aria-hidden="true"><circle class="track" cx="46" cy="46" r="${R}" fill="none" stroke-width="9"/>` +
    `<circle class="fill" cx="46" cy="46" r="${R}" fill="none" stroke-width="9" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}"/></svg>` +
    `<div><b>${Math.floor(sec / 60)}</b><small>/ ${Math.round(d.goal / 60)}分</small></div>`;
  $('goalText').textContent = pct >= 1 ? '達成しました 🎯 よくがんばりました' : `あと ${Math.max(1, Math.ceil((d.goal - sec) / 60))} 分で今日の目標`;
  const streak = streakDays();
  $('miniStreak').textContent = String(streak);
  $('miniStars').textContent = String(allStars());
  $('miniBadges').textContent = String(Object.keys(progress.badges || {}).length);
  const h = new Date().getHours();
  const greet = h < 11 ? 'おはようございます' : h < 18 ? 'こんにちは' : 'こんばんは';
  $('helloTitle').textContent = `${account.signedIn && account.name ? `${account.name}さん、` : ''}${greet}`;
  $('helloSub').textContent = streak > 0
    ? (sec >= STREAK_MIN_SEC ? `${streak}日連続で練習中。この調子です。` : `${streak}日連続で練習中。今日も1分弾いて記録を伸ばしましょう。`)
    : '毎日すこしずつが、楽譜を速く読めるようになる近道です。';
};

const renderHome = () => {
  if (!$('continueCard')) return;
  renderContinue();
  renderPath();
  renderToday();
  $('premiumBanner').hidden = !(BILLING_ON && !account.paid);
  const full = SONGS.filter((s) => !s.generated).length;
  $('premiumText').textContent = `有料版なら、${full}曲すべてを全フレーズ・全曲通し・テンポ100%まで練習できます。月480円、いつでも解約できます。`;
};

// ---- 曲の一覧 ----
// 難しさ（1〜5）：楽譜から決める。初見チャレンジはレベルそのまま
const songDifficulty = (song) => {
  if (song.generated) return Number(String(song.id).split('-').pop()) || 1;
  const c = compileSong(song);
  const rh = c.rh.filter((n) => !n.rest);
  const lh = c.lh.filter((n) => !n.rest);
  const midis = rh.flatMap((n) => n.keys.map((k) => stepToMidi(k.step, k.acc)));
  let d = 1;
  if ([...rh, ...lh].some((n) => n.beats < 1 || n.dots)) d++;
  if (lh.some((n) => n.keys.length > 1) || lh.length > song.lh.length * 2) d++;
  if (midis.length && Math.max(...midis) - Math.min(...midis) > 12) d++;
  if (song.swing || song.time !== '4/4' || (song.fullPhrases || song.phrases.length) >= 4) d++;
  return Math.min(5, d);
};
const COVERS = [
  ['#5b4bdb', '#9b8cff'], ['#0ea5a4', '#5eead4'], ['#e8590c', '#ffb46b'], ['#db2777', '#f9a8d4'],
  ['#2563eb', '#93c5fd'], ['#16a34a', '#86efac'], ['#7c3aed', '#c4b5fd'], ['#b45309', '#fcd34d'],
];
const JAZZ_COVERS = [['#1e1b4b', '#6366f1'], ['#0f172a', '#0ea5e9'], ['#3b0764', '#a855f7'], ['#1c1917', '#f59e0b'], ['#172554', '#22d3ee']];
const coverOf = (song, i) =>
  song.generated ? ['#f59e0b', '#fde68a', '✦'] : song.genre === 'jazz' ? [...JAZZ_COVERS[i % JAZZ_COVERS.length], '♫'] : [...COVERS[i % COVERS.length], '𝄞'];

const renderSongLib = () => {
  ensureSightSongs();
  const paid = account.paid;
  $('songLib').innerHTML = SONG_GENRES.map(([genre, label]) => {
    const list = SONGS.filter((s) => (s.genre || 'classic') === genre);
    if (!list.length) return '';
    const cards = list.map((s, i) => {
      const [c1, c2, glyph] = coverOf(s, i);
      const ss = songStars(s);
      const diff = songDifficulty(s);
      const tag = s.generated ? '<span class="tag free">今日の曲・無料</span>'
        : s.locked && !paid ? '<span class="tag lock">🔒 フレーズ1は無料</span>'
        : !paid ? '<span class="tag free">ぜんぶ無料</span>' : '';
      return `<button type="button" class="song-card" data-song="${s.id}">` +
        `<span class="cover" style="background:linear-gradient(135deg, ${c1}, ${c2})">${tag}<span class="glyph">${glyph}</span></span>` +
        `<span class="song-meta"><b>${s.title}</b><small>${s.composer}</small>` +
        `<span class="row"><span class="diff" title="難しさ ${diff}/5" aria-label="難しさ ${diff}/5">${[1, 2, 3, 4, 5].map((k) => `<i class="${k <= diff ? 'on' : ''}"></i>`).join('')}</span>` +
        `<span class="got">★ ${ss.got}/${ss.max}</span></span>` +
        `<span class="bar"><i style="width:${ss.steps ? (ss.done / ss.steps) * 100 : 0}%"></i></span></span></button>`;
    }).join('');
    return `<div class="section-title" id="genre-${genre}"><h2>${label}</h2><span>${list.length}曲</span></div><div class="song-grid">${cards}</div>`;
  }).join('');
};

// ---- 有料版の案内 ----
const openPaywall = (source) => {
  if (!BILLING_ON) return;
  if (account.paid) {
    toast('有料版をお使いです。すべての曲を練習できます');
    return;
  }
  const full = SONGS.filter((s) => !s.generated).length;
  const trial = SONGS.filter((s) => s.locked).length;
  $('payLead').textContent = source === 'song' || source === 'result'
    ? 'この曲の続きも、最後まで弾けるところまで練習できます。'
    : '好きな曲を、最後まで弾けるところまで。';
  $('payBenefits').innerHTML = [
    [`全${full}曲を最後まで`, `いまフレーズ1だけ試せる${trial}曲も、すべてのフレーズを練習できます`],
    ['1曲を仕上げるまでのステップ', '右手 → 左手 → 両手、フレーズをつなげる、全曲通し、テンポ60・80・100%'],
    ['練習の記録を端末どうしで同期', 'スマホとパソコンで、どこからでも続きから'],
    ['ステージ・初見チャレンジはそのまま', '無料で使える練習は、これまでどおりすべて使えます'],
  ].map(([b, s]) => `<li><span><b>${b}</b><small>${s}</small></span></li>`).join('');
  $('payDlg').showModal();
};

// ---- はじめての方への案内（3つの質問のあと、すぐ1問目へ） ----
const obShow = (i) => {
  document.querySelectorAll('#obDlg .ob-step').forEach((el) => { el.hidden = Number(el.dataset.ob) !== i; });
  document.querySelectorAll('#obDots i').forEach((d, k) => d.classList.toggle('on', k === i));
};
const finishOnboarding = (start) => {
  progress.onboarded = true;
  persist();
  if ($('obDlg').open) $('obDlg').close();
  if (start) {
    progress.mode = 1;
    onSettingsChanged();
    showView('play');
  }
};
const needsOnboarding = () =>
  !progress.onboarded && !Object.values(progress.clears || {}).some((n) => n > 0) &&
  !Object.keys(noteStats).length && !Object.keys(progress.best || {}).length;

// ---- 始める ----
const initUI = () => {
  document.addEventListener('click', (e) => {
    const t = e.target instanceof Element ? e.target : null;
    if (!t) return;
    const tab = t.closest('[data-tab]');
    if (tab) return showView(tab.dataset.tab);
    const go = t.closest('[data-goto-view]');
    if (go) {
      e.preventDefault();
      showView(go.dataset.gotoView);
      const sec = go.dataset.genre ? $(`genre-${go.dataset.genre}`) : null;
      if (sec) sec.scrollIntoView({ block: 'start' });
      return;
    }
    const cont = t.closest('[data-continue]');
    if (cont) {
      if (cont.dataset.continue !== 'song') return startFromHome(Number(cont.dataset.continue));
      if (progress.mode !== 'song') startStage('song');
      return showView('play');
    }
    const st = t.closest('button[data-stage]');
    if (st && !st.disabled) return startFromHome(Number(st.dataset.stage));
    const start = t.closest('[data-start]');
    if (start) return startFromHome(start.dataset.start);
    const sc = t.closest('[data-song]');
    if (sc) return openSong(sc.dataset.song);
    const pw = t.closest('[data-paywall]');
    if (pw) return openPaywall(pw.dataset.paywall);
    const close = t.closest('[data-close]');
    const dlg = close ? close.closest('dialog') : null;
    if (dlg) dlg.close();
  });
  // 外側（暗いところ）を押したら閉じる。はじめての方への案内とアカウントは閉じない
  document.querySelectorAll('dialog.sheet-dlg').forEach((dlg) => {
    dlg.addEventListener('click', (e) => {
      if (e.target === dlg && dlg.id !== 'obDlg' && dlg.id !== 'acctDlg') dlg.close();
    });
  });
  $('settingsBtn').addEventListener('click', () => $('settingsDlg').showModal());
  $('helpBtn').addEventListener('click', () => $('helpDlg').showModal());
  $('playClose').addEventListener('click', () => showView('home'));
  $('payBuy').addEventListener('click', () => {
    $('payDlg').close();
    buyPlan();
  });
  $('obDlg').addEventListener('click', (e) => {
    const b = e.target instanceof Element ? e.target.closest('.choice') : null;
    if (!b) return;
    if (b.dataset.ext) { settings.ext = Number(b.dataset.ext); obShow(1); }
    else if (b.dataset.clef) { settings.clef = b.dataset.clef; obShow(2); }
    else if (b.dataset.input) finishOnboarding(true);
  });
  $('obDlg').addEventListener('cancel', () => finishOnboarding(false));
  showView('home');
  if (needsOnboarding()) {
    obShow(0);
    $('obDlg').showModal();
  }
};
