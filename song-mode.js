'use strict';
// ---- 曲の練習 ----
// index.html の本体より先に読み込む。本体の定数（$, settings, beep など）は関数の中でだけ使う

const SONG_DUR = { w: 4, h: 2, q: 1, 8: 0.5, 16: 0.25 };
// 小節の長さ（拍）→ 小節いっぱいの音符・休符の書き方
const BEATS_TO_DUR = [[4, 'w', 0], [3, 'h', 1], [2, 'h', 0], [1.5, 'q', 1], [1, 'q', 0], [0.75, '8', 1], [0.5, '8', 0], [0.25, '16', 0]];
// 調号でついている変化記号（音名番号 → ♯1 / ♭-1）
const KEY_ACC = { C: {}, Am: {}, G: { 3: 1 }, D: { 3: 1, 0: 1 }, F: { 6: -1 } };
const TEMPO_WINDOW = 150; // テンポの判定：このミリ秒以内のずれならちょうど
const SONG_W = 360;       // 曲の譜面の幅（viewBox）

const SONG_GENRES = [['sight', '初見チャレンジ（毎日かわる・自動作曲）'], ['classic', 'クラシック・民謡'], ['jazz', 'ジャズ（オリジナル練習曲）']];
const HAND_SETS = { rh: ['rh'], lhs: ['lhs'], bothS: ['rh', 'lhs'], lh: ['lh'], both: ['rh', 'lh'] };
const HAND_LABEL = { rh: '右手', lhs: '左手（簡易）', bothS: '両手（簡易）', lh: '左手', both: '両手' };

const parsePitch = (s) => {
  const m = /^([a-g])(#|b)?(\d)$/.exec(s);
  if (!m) throw new Error(`音の書き方が違います: ${s}`);
  return { step: Number(m[3]) * 7 + LETTERS.indexOf(m[1]), acc: m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0 };
};

const parseToken = (tok) => {
  const m = /^(\(([^)]+)\)|r|[a-g][#b]?\d)\/(w|h|q|8|16)(\.?)(~?)$/.exec(tok);
  if (!m) throw new Error(`音符の書き方が違います: ${tok}`);
  const rest = m[1] === 'r';
  const keys = rest ? [] : (m[2] ? m[2].trim().split(/\s+/) : [m[1]]).map(parsePitch).sort((a, b) => a.step - b.step);
  const dots = m[4] ? 1 : 0;
  return { keys, rest, dur: m[3], dots, beats: SONG_DUR[m[3]] * (dots ? 1.5 : 1), tie: m[5] === '~' };
};

// 実際に鳴らす拍の位置：スウィングの曲は、拍の裏の8分音符を拍の2/3の位置にずらす
const playBeat = (song, t) => {
  if (!song.swing) return t;
  const beat = Math.floor(t + 1e-9);
  return Math.abs(t - beat - 0.5) < 1e-6 ? beat + 2 / 3 : t;
};

const sameKeys = (a, b) => a.length === b.length && a.every((k, i) => k.step === b[i].step && k.acc === b[i].acc);

const compiledSongs = new Map();
const compileSong = (song) => {
  if (compiledSongs.has(song.id)) return compiledSongs.get(song.id);
  const parseHand = (hand, measures) => {
    let t = 0;
    const out = [];
    measures.forEach((ms, measure) => {
      // 和音 "(c3 e3)/h" は中に空白があるので、かっこごと1つに数える
      ms.match(/\([^)]*\)\S*|\S+/g).forEach((tok) => {
        const n = { ...parseToken(tok), hand, measure, t };
        t += n.beats;
        out.push(n);
      });
    });
    // タイでつながった後ろの音は弾き直さない
    out.forEach((n, i) => { n.cont = i > 0 && out[i - 1].tie && !n.rest && sameKeys(out[i - 1].keys, n.keys); });
    return out;
  };
  if (song.rh.length !== song.lh.length) throw new Error(`${song.title}: 右手と左手の小節の数が違います`);
  const rh = parseHand('rh', song.rh);
  const lh = parseHand('lh', song.lh);
  const lenOf = (notes, mi) => notes.filter((n) => n.measure === mi).reduce((a, n) => a + n.beats, 0);
  const lens = song.rh.map((_, mi) => lenOf(rh, mi));
  lens.forEach((len, mi) => {
    if (Math.abs(len - lenOf(lh, mi)) > 1e-6) throw new Error(`${song.title} ${mi + 1}小節目: 右手と左手の長さが違います`);
  });
  const starts = lens.map((_, mi) => lens.slice(0, mi).reduce((a, b) => a + b, 0));
  // 簡易の左手：各小節で最初に鳴る左手の一番低い音を、小節いっぱいのばす
  const lhs = lens.map((len, measure) => {
    const first = lh.find((n) => n.measure === measure && !n.rest);
    const [, dur, dots] = BEATS_TO_DUR.find(([b]) => Math.abs(b - len) < 1e-6) || [len, 'q', 0];
    return { keys: first ? [first.keys[0]] : [], rest: !first, dur, dots, beats: len, tie: false, cont: false, hand: 'lhs', measure, t: starts[measure] };
  });
  const c = { song, rh, lh, lhs, lens, starts };
  compiledSongs.set(song.id, c);
  return c;
};

// 同じ時刻に弾き始める音をまとめて、弾く順番の「イベント」にする
const buildEvents = (c, hands, [a, b]) => {
  const map = new Map();
  HAND_SETS[hands].flatMap((h) => c[h])
    .filter((n) => n.measure >= a && n.measure < b && !n.rest && !n.cont)
    .forEach((n) => {
      const k = n.t.toFixed(4);
      if (!map.has(k)) map.set(k, { t: n.t, notes: [] });
      map.get(k).notes.push(n);
    });
  return [...map.values()]
    .sort((x, y) => x.t - y.t)
    .map((e) => ({ ...e, keys: e.notes.flatMap((n) => n.keys.map((k) => ({ ...k, midi: stepToMidi(k.step, k.acc), note: n }))).sort((x, y) => x.midi - y.midi) }));
};
const eventsSig = (evs) => evs.map((e) => `${e.t}:${e.keys.map((k) => k.midi).join(',')}`).join('|');

// 練習のステップ：フレーズごとに 右手→左手（簡易）→両手（簡易）→左手→両手、つなげる、通し、テンポ
const songStepsCache = new Map();
const songSteps = (song) => {
  if (songStepsCache.has(song.id)) return songStepsCache.get(song.id);
  // 初見チャレンジは、初見で通して弾く → テンポ80% → 100%
  if (song.generated) {
    const all = [0, song.rh.length];
    const st = [
      { kind: 'pace', hands: 'both', range: all, label: '初見で通して弾く（自分のペース）' },
      { kind: 'tempo', pct: 80, hands: 'both', range: all, label: 'テンポ80%（メトロノームに合わせる）' },
      { kind: 'tempo', pct: 100, hands: 'both', range: all, label: 'テンポ100%（メトロノームに合わせる）' },
    ];
    songStepsCache.set(song.id, st);
    return st;
  }
  const c = compileSong(song);
  const ph = song.phrases;
  const steps = [];
  ph.forEach(([a, b], i) => {
    const seen = new Set();
    ['rh', 'lhs', 'bothS', 'lh', 'both'].forEach((h) => {
      // 前のステップと弾く音がまったく同じなら省く（簡易と本来の伴奏が同じ、右手が休みだけ など）
      const sig = eventsSig(buildEvents(c, h, [a, b]));
      if (seen.has(sig)) return;
      seen.add(sig);
      steps.push({ kind: 'pace', hands: h, range: [a, b], label: `フレーズ${i + 1}：${HAND_LABEL[h]}` });
    });
  });
  // お試しの曲（有料版の前）は最初のフレーズだけ。つなげる・通し・テンポは完全版で
  if (!song.locked) {
    for (let i = 0; i < ph.length - 1; i++) {
      steps.push({ kind: 'pace', hands: 'both', range: [ph[i][0], ph[i + 1][1]], label: `フレーズ${i + 1}と${i + 2}をつなげる` });
    }
    const all = [0, song.rh.length];
    steps.push({ kind: 'pace', hands: 'both', range: all, label: '全曲通し（自分のペース）' });
    [60, 80, 100].forEach((pct) => steps.push({ kind: 'tempo', pct, hands: 'both', range: all, label: `テンポ${pct}%（メトロノームに合わせる）` }));
  }
  // 弾く音がないステップ（右手が休みだけのフレーズなど）は省く
  const out = steps.filter((s) => buildEvents(c, s.hands, s.range).length > 0);
  songStepsCache.set(song.id, out);
  return out;
};

// ---- 記録 ----
// 有料の続きのフレーズの書き方（「フレーズ2」「フレーズ2〜4」）
const restPhrases = (song) => (song.fullPhrases > 2 ? `フレーズ2〜${song.fullPhrases}` : 'フレーズ2');

// 曲の★の合計（いま使えるステップだけを数える）
const songStarTotals = () => SONGS.reduce((acc, s) => {
  const n = songSteps(s).length;
  for (let i = 0; i < n; i++) acc.got += starsOf(songKey(s.id, i));
  acc.max += n * 3;
  return acc;
}, { got: 0, max: 0 });

const songById = (id) => SONGS.find((s) => s.id === id) || SONGS[0];
const currentSong = () => songById(progress.song && progress.song.id);
const songRecord = (id) => {
  if (!progress.songs) progress.songs = {};
  if (!progress.songs[id]) progress.songs[id] = { done: [] };
  return progress.songs[id];
};
const isStepDone = (song, i) => songRecord(song.id).done.includes(i);
const isStepUnlocked = (song, i) => i === 0 || isStepDone(song, i - 1) || isStepDone(song, i);
const firstOpenStep = (song) => {
  const steps = songSteps(song);
  const i = steps.findIndex((_, k) => !isStepDone(song, k));
  return i < 0 ? 0 : i;
};
const songKbMidis = () => {
  const c = compileSong(currentSong());
  return [...c.rh, ...c.lh].flatMap((n) => n.keys.map((k) => stepToMidi(k.step, k.acc)));
};

// ---- 状態 ----
let songRun = null; // { song, c, steps, stepIdx, step, events, evOf, pos, pressed, misses, eventMisses, allowed, state, viewMeasure, tempo }
let songNodes = []; // 鳴らしている音（止めるときに切り離す）
let songDemoTimer = 0;

const stopSongAudio = () => {
  songNodes.forEach((g) => g.disconnect());
  songNodes = [];
  clearTimeout(songDemoTimer);
};

const songClick = (at, accent) => {
  const { ctx, out } = getAudio();
  const osc = ctx.createOscillator();
  osc.type = 'square';
  osc.frequency.value = accent ? 1600 : 1000;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(accent ? 0.25 : 0.15, at + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.04);
  osc.connect(g).connect(out);
  osc.start(at);
  osc.stop(at + 0.05);
  songNodes.push(g);
};

// ---- 描画 ----
const phraseOf = (song, measure) => Math.max(0, song.phrases.findIndex(([a, b]) => measure >= a && measure < b));
const measureAt = (c, beat) => {
  let m = 0;
  c.starts.forEach((s, i) => { if (beat >= s - 1e-6) m = i; });
  return m;
};

const noteColor = (n) => {
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const r = songRun;
  const idx = r.evOf.get(n);
  if (idx === undefined) return null;
  if (r.tempo) {
    const xs = r.tempo.byNote.get(n) || [];
    if (xs.some((x) => x.miss)) return css('--ng');
    if (xs.length && xs.every((x) => x.hit)) {
      if (xs.every((x) => x.perfect)) return '#c98a00';
      const off = xs.find((x) => !x.perfect)?.offset ?? 0;
      return off < 0 ? '#2f6fb8' : '#d9701c';
    }
  } else if (idx < r.pos) {
    return css('--ok');
  }
  return idx === r.pos && r.state === 'play' ? css('--accent') : null;
};

const renderSong = () => {
  const el = $('staff');
  el.innerHTML = '';
  if (!songRun) return;
  const { c, step } = songRun;
  const song = c.song;
  const [pa, pb] = song.phrases[phraseOf(song, songRun.viewMeasure)];
  const a = Math.max(pa, step.range[0]);
  const b = Math.min(pb, step.range[1]);
  const shown = HAND_SETS[step.hands];
  const upper = shown.includes('rh') ? 'rh' : null;
  const lower = shown.find((h) => h !== 'rh') || null;
  const both = upper && lower;
  // 譜表の位置：上に加線3本ぶん、2段のあいだに加線の余白
  const SYS_H = both ? 240 : 115;
  const systems = [];
  for (let m = a; m < b; m += 2) systems.push([...Array(Math.min(2, b - m)).keys()].map((k) => m + k));
  const H = systems.length * SYS_H;
  const renderer = new VF.Renderer(el, VF.Renderer.Backends.SVG);
  renderer.resize(SONG_W, H);
  const ctx = renderer.getContext();
  const keyAcc = KEY_ACC[song.key] || {};
  const cursorMap = []; // 段ごと { y0, y1, pts: [[拍, x], ...] }

  const ticksFor = (hand, measure, clef, sn) => {
    const notes = c[hand].filter((n) => n.measure === measure);
    const state = new Map(); // 小節の中でついた臨時記号
    return notes.map((n) => {
      const keys = n.rest ? [clef === 'treble' ? 'b/4' : 'd/3'] : n.keys.map((k) => vfKey(k.step, k.acc));
      const t = new VF.StaveNote({ clef, keys, duration: `${n.dur}${n.dots ? 'd' : ''}${n.rest ? 'r' : ''}` });
      if (n.dots) VF.Dot.buildAndAttach([t], { all: true });
      const color = n.rest ? null : noteColor(n);
      n.keys.forEach((k, i) => {
        const id = `${k.step}`;
        const cur = state.has(id) ? state.get(id) : keyAcc[k.step % 7] || 0;
        if (k.acc !== cur && !n.cont) {
          const acc = new VF.Accidental(k.acc === 1 ? '#' : k.acc === -1 ? 'b' : 'n');
          if (color) acc.setStyle({ fillStyle: color, strokeStyle: color });
          t.addModifier(acc, i);
        }
        state.set(id, k.acc);
      });
      if (color) {
        t.setStyle({ fillStyle: color, strokeStyle: color });
        t.setLedgerLineStyle({ fillStyle: color, strokeStyle: color });
      }
      sn.set(n, t);
      return t;
    });
  };

  systems.forEach((ms, si) => {
    const y = si * SYS_H;
    const firstOfPage = si === 0;
    const decorate = (stave, clef, isFirst) => {
      if (!isFirst) return stave;
      stave.addClef(clef).addKeySignature(song.key);
      if (firstOfPage) stave.addTimeSignature(song.time);
      return stave;
    };
    // 1小節目は音部記号などのぶん広くする
    const probe = decorate(new VF.Stave(0, 0, 200), upper ? 'treble' : 'bass', true);
    const extra = probe.getNoteStartX() - probe.getX();
    const inner = (SONG_W - 12 - extra) / ms.length;
    let x = 4;
    const sn = new Map(); // 音符データ → 描いた音符（タイ用）
    const pts = [];
    ms.forEach((measure, k) => {
      const w = inner + (k === 0 ? extra : 0);
      const staves = [];
      if (upper) staves.push({ hand: upper, clef: 'treble', stave: decorate(new VF.Stave(x, y, w), 'treble', k === 0) });
      if (lower) staves.push({ hand: lower, clef: 'bass', stave: decorate(new VF.Stave(x, y + (both ? 110 : 0), w), 'bass', k === 0) });
      // 上下の段で音符の書き始めをそろえる
      const sx = Math.max(...staves.map((s) => s.stave.getNoteStartX()));
      staves.forEach((s) => { s.stave.setNoteStartX(sx); s.stave.setContext(ctx).draw(); });
      if (both && k === 0) {
        new VF.StaveConnector(staves[0].stave, staves[1].stave).setType('brace').setContext(ctx).draw();
        new VF.StaveConnector(staves[0].stave, staves[1].stave).setType('singleLeft').setContext(ctx).draw();
      }
      if (both) new VF.StaveConnector(staves[0].stave, staves[1].stave).setType('singleRight').setContext(ctx).draw();
      const voices = staves.map((s) => {
        const ticks = ticksFor(s.hand, measure, s.clef, sn);
        const voice = new VF.Voice({ num_beats: 4, beat_value: 4 }).setMode(VF.Voice.Mode.SOFT);
        voice.addTickables(ticks);
        const beams = VF.Beam.generateBeams(ticks, { groups: VF.Beam.getDefaultBeamGroups(song.time) });
        return { ...s, voice, beams };
      });
      const fmt = new VF.Formatter();
      voices.forEach(({ voice }) => fmt.joinVoices([voice]));
      fmt.format(voices.map((v) => v.voice), Math.max(40, voices[0].stave.getNoteEndX() - sx - 12));
      voices.forEach(({ voice, stave, beams }) => {
        voice.draw(ctx, stave);
        beams.forEach((bm) => bm.setContext(ctx).draw());
      });
      // 小節の頭・音符・小節の終わりの位置
      pts.push([c.starts[measure], sx - 6]);
      staves.forEach((s) => c[s.hand].forEach((n) => {
        if (n.measure === measure && sn.has(n)) pts.push([n.t, sn.get(n).getAbsoluteX() + 6]);
      }));
      pts.push([c.starts[measure] + c.lens[measure], x + w - 4]);
      x += w;
    });
    pts.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
    cursorMap.push({ y0: y + 22, y1: y + (both ? 110 : 0) + 98, pts });
    // タイ（段をまたぐときは、段の端までと段の頭からに分けて描く）
    [upper, lower].filter(Boolean).forEach((hand) => {
      const ns = c[hand];
      ns.forEach((n, i) => {
        const next = ns[i + 1];
        if (!n.tie || !next || !next.cont || (!sn.has(n) && !sn.has(next))) return;
        const idx = n.keys.map((_, j) => j);
        new VF.StaveTie({ first_note: sn.get(n) || null, last_note: sn.get(next) || null, first_indices: idx, last_indices: idx }).setContext(ctx).draw();
      });
    });
  });

  const svg = el.querySelector('svg');
  svg.setAttribute('viewBox', `0 0 ${SONG_W} ${H}`);
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  svg.style.width = '100%';
  svg.style.height = 'auto';
  songRun.cursorMap = cursorMap;
  const cur = document.createElement('div');
  cur.id = 'songCursor';
  cur.className = 'song-cursor';
  cur.hidden = true;
  el.appendChild(cur);
};

// テンポ練習：いまの拍の位置に縦線を出す（拍は書かれた楽譜の拍。スウィングのずれは気にしない）
const placeCursor = (beat) => {
  const el = document.getElementById('songCursor');
  const r = songRun;
  if (!el || !r || !r.cursorMap) return;
  const sys = r.cursorMap.find((s) => s.pts.length && beat >= s.pts[0][0] - 1e-6 && beat <= s.pts[s.pts.length - 1][0] + 1e-6);
  if (!sys) {
    el.hidden = true;
    return;
  }
  const { pts } = sys;
  let i = pts.findIndex((p) => p[0] > beat);
  if (i < 0) i = pts.length - 1;
  if (i === 0) i = 1;
  const [t0, x0] = pts[i - 1];
  const [t1, x1] = pts[i];
  const xv = t1 > t0 ? x0 + ((beat - t0) / (t1 - t0)) * (x1 - x0) : x1;
  const svg = $('staff').querySelector('svg');
  const k = svg ? svg.clientWidth / SONG_W : 1;
  el.hidden = false;
  el.style.left = `${xv * k}px`;
  el.style.top = `${sys.y0 * k}px`;
  el.style.height = `${(sys.y1 - sys.y0) * k}px`;
};

// ---- 画面の表示 ----
const updateSongInfo = () => {
  const r = songRun;
  if (!r) return;
  if (r.tempo) {
    const T = r.tempo;
    $('stageInfo').innerHTML =
      `${r.step.label}　♩=${Math.round(T.bpm)}<br>ちょうど <b>${T.hits}</b> / ${T.expected.length}音（${T.need}音以上でクリア）　ずれ・ちがう音 <b>${T.misses + T.wrong}</b>`;
    updatePlayBar();
    return;
  }
  if (r.step.kind === 'tempo') {
    const bpm = Math.round((r.song.tempo * r.step.pct) / 100);
    $('stageInfo').innerHTML = `${r.step.label}　♩=${bpm}${r.song.swing ? '（8分音符はスウィング）' : ''}<br>音の${Math.round(TEMPO_WINDOW / 10) / 100}秒以内のずれまでを「ちょうど」とし、9割でクリア`;
    updatePlayBar();
    return;
  }
  $('stageInfo').innerHTML =
    `${r.step.label}　<b>${Math.min(r.pos, r.events.length)} / ${r.events.length}</b>　ミス <b>${r.misses}</b>（${r.allowed}回まででクリア）`;
  updatePlayBar();
};

const songHint = () => {
  const r = songRun;
  if (!r || r.tempo || r.pos >= r.events.length) return;
  showName(settings.hint || r.eventMisses >= 2 ? namesOf(r.events[r.pos].keys) : '');
};

const syncSongSelects = () => {
  const song = currentSong();
  const option = (s) => {
    const n = songSteps(s).length;
    let got = 0;
    for (let i = 0; i < n; i++) got += starsOf(songKey(s.id, i));
    return `<option value="${s.id}">${s.title}（${s.composer}）${s.locked ? '　お試し' : ''}${got ? `　★${got}/${n * 3}` : ''}</option>`;
  };
  $('songSel').innerHTML = SONG_GENRES.map(([genre, label]) =>
    `<optgroup label="${label}">${SONGS.filter((s) => (s.genre || 'classic') === genre).map(option).join('')}</optgroup>`
  ).join('');
  $('songSel').value = song.id;
  $('stepSel').innerHTML = songSteps(song).map((s, i) => {
    const mark = isStepDone(song, i) ? `${starText(starsOf(songKey(song.id, i)))} ` : isStepUnlocked(song, i) ? '' : '🔒 ';
    return `<option value="${i}"${isStepUnlocked(song, i) ? '' : ' disabled'}>${i + 1}. ${mark}${s.label}</option>`;
  }).join('') + (song.locked
    ? `<option disabled>🔒 ${restPhrases(song)}・つなげる・通し・テンポ（有料版）</option>`
    : '');
  $('stepSel').value = String(songRun ? songRun.stepIdx : 0);
  $('songCredit').textContent = `${song.composer}　${song.credit}`;
};

// ---- 練習モード（速さ・フレーズの繰り返し・正しく弾くまで待つ）と、早い・遅いの帯 ----
const practiceOf = () => ({ speed: 100, loop: false, from: 0, to: 0, wait: false, ...(settings.practice || {}) });
let practiceUI = null;
let pmeterObj = null;
const pmeter = {
  get o() { if (!pmeterObj) pmeterObj = Timing.meter($('tmeter'), { good: TEMPO_WINDOW, perfect: TEMPO_PERFECT }); return pmeterObj; },
  push(dt) { this.o.push(dt); },
  reset() { this.o.reset(); },
  setRange(g, p) { this.o.setRange(g, p); },
};
// 結果に出す「平均のずれ」の行
const timingLine = (offs) => {
  const st = Timing.stats(offs);
  return st.n ? `平均のずれ <b>${Timing.signed(st.mean)}</b>（${Timing.tendency(st.mean)}）${st.sd !== null ? `・ばらつき ±${Math.round(st.sd)}ms` : ''}` : '';
};
const renderPracticeBar = (step, inStep) => {
  const el = $('practiceBar');
  el.hidden = step.kind !== 'tempo';
  if (el.hidden) return;
  const pr = practiceOf();
  const last = Math.max(0, inStep.length - 1);
  pr.from = Math.min(pr.from, last);
  pr.to = Math.min(Math.max(pr.to, pr.from), last);
  settings.practice = pr;
  const opts = {
    state: pr, waitLabel: '正しく弾くまで待つ',
    ranges: inStep.map(({ i }, k) => ({ value: k, label: `フレーズ${i + 1}` })),
    note: (st) => (st.wait ? '待つ：テンポなしで、楽譜の音を正しく弾くと先へ進みます'
      : st.speed < 100 || st.loop ? `テンポ ${Math.round((step.pct * st.speed) / 100)}%${st.loop ? '・止めるまで繰り返す' : ''}。練習モードの回はクリアの記録には入りません` : ''),
    onChange: (st) => { settings.practice = st; persist(); if (songRun) startSongStep(songRun.stepIdx); },
  };
  if (!practiceUI) practiceUI = Timing.practiceBar(el, opts);
  else { practiceUI.update(opts); practiceUI.set(pr); }
};
// 繰り返しを止めて、それまでの結果を出す
const stopLoop = () => {
  const r = songRun;
  if (!r || !r.tempo) return;
  const T = r.tempo;
  const hits = r.lapHits + T.hits;
  const total = r.lapTotal + T.expected.filter((x) => x.hit || x.miss).length;
  const offs = [...r.offsets, ...T.expected.filter((x) => x.hit).map((x) => x.offset)];
  finishSongStep(0, [
    `${r.laps}回くり返して、ちょうど <b>${hits}</b> / ${total}音`,
    timingLine(offs),
  ]);
};

// ---- ステップの開始・終了 ----
const startSongStep = (idx) => {
  stopSongAudio();
  const song = currentSong();
  const steps = songSteps(song);
  const stepIdx = Math.min(Math.max(0, idx), steps.length - 1);
  const step = steps[stepIdx];
  const c = compileSong(song);
  // 練習モード（テンポの段階だけ）：フレーズの繰り返し・正しく弾くまで待つ・速さ
  const pr = step.kind === 'tempo' ? practiceOf() : null;
  const inStep = song.phrases.map((ph, i) => ({ ph, i })).filter(({ ph }) => ph[0] >= step.range[0] && ph[1] <= step.range[1]);
  let loopRange = null;
  if (pr && pr.loop && inStep.length) {
    const from = inStep[Math.min(pr.from, inStep.length - 1)];
    const to = inStep[Math.min(Math.max(pr.to, pr.from), inStep.length - 1)];
    loopRange = [from.ph[0], to.ph[1]];
  }
  const events = buildEvents(c, step.hands, loopRange || step.range);
  const evOf = new Map();
  events.forEach((e, i) => e.notes.forEach((n) => evOf.set(n, i)));
  const onePhrase = song.phrases.some(([a, b]) => a === step.range[0] && b === step.range[1]);
  songRun = {
    song, c, steps, stepIdx, step, events, evOf,
    pos: 0, pressed: new Set(), misses: 0, eventMisses: 0, score: 0, combo: 0, maxCombo: 0,
    allowed: onePhrase ? 2 : Math.max(2, Math.ceil(events.length * 0.05)),
    state: step.kind === 'tempo' ? 'ready' : 'play',
    viewMeasure: events[0].notes[0].measure,
    tempo: null,
    loopRange, waitMode: !!pr?.wait, practice: !!pr && (pr.wait || pr.loop || pr.speed < 100),
    laps: 0, offsets: [], lapHits: 0, lapTotal: 0,
  };
  if (songRun.waitMode) songRun.state = 'play';
  renderPracticeBar(step, inStep);
  progress.song = { id: song.id, step: stepIdx };
  persist();
  $('result').hidden = true;
  $('staff').hidden = false;
  $('startBtn').hidden = step.kind !== 'tempo' || songRun.waitMode;
  $('startBtn').textContent = 'スタート';
  $('lapLine').textContent = '';
  $('tmeter').hidden = step.kind !== 'tempo' || songRun.waitMode;
  pmeter.reset();
  clearHints();
  showName('');
  setFeedback('', step.kind === 'tempo' && !songRun.waitMode
    ? `「スタート」を押すと、1小節ぶんカウントしてから始まります${loopRange ? '（止めるまで繰り返します）' : ''}`
    : '楽譜の音を順に弾いてください（同時に鳴らす音は、全部押せば次へ進みます）');
  renderSong();
  updateSongInfo();
  syncSongSelects();
  songHint();
  showKey(events[0].keys[events[0].keys.length - 1].midi);
};

// stars: 0〜3（0 は失敗）、lines: 結果の説明の行
const finishSongStep = (stars, lines) => {
  const r = songRun;
  const clear = stars > 0;
  r.state = 'result';
  stopSongAudio();
  clearHints();
  showName('');
  setFeedback('', '');
  if (!r.practice && clear && !isStepDone(r.song, r.stepIdx)) songRecord(r.song.id).done.push(r.stepIdx);
  const best = r.practice ? false : saveBest(songKey(r.song.id, r.stepIdx), r.score, stars);
  if (r.practice) lines = [...lines, '<span class="next-star">練習モードの回なので、クリアの記録には入りません</span>'];
  persist();
  const last = r.stepIdx === r.steps.length - 1;
  const next = r.steps[r.stepIdx + 1];
  const el = $('result');
  el.className = 'result ' + (clear ? 'clear' : 'fail');
  el.innerHTML =
    resultHead({
      title: r.practice ? '練習の結果' : clear ? (last ? (r.song.locked ? 'お試しの範囲をクリア！' : 'この曲をマスターしました！') : 'クリア！') : 'もう一度',
      stars,
      clear,
      score: r.score,
      best,
      lines: [r.step.label, ...lines, `最大コンボ <b>${r.maxCombo}</b>`],
    }) +
    '<div class="controls">' +
    (clear && !last ? `<button type="button" data-step="${r.stepIdx + 1}">次へ（${next.label}）</button>` : '') +
    `<button type="button" class="${clear && !last ? 'ghost' : ''}" data-step="${r.stepIdx}">もう一度</button>` +
    '</div>' +
    (clear && last && r.song.locked && BILLING_ON
      ? '<div class="cta"><b>お試しはここまで</b>' +
        `<span>このあと：${restPhrases(r.song)}、つなげる、全曲通し、テンポ60〜100%</span>` +
        `<button type="button" class="gold" data-plan-cta="buy">有料版について見る</button></div>`
      : '');
  el.hidden = false;
  $('staff').hidden = true;
  $('startBtn').hidden = true;
  syncSongSelects();
  renderStageBar();
  animateResult(el, stars);
  if (!r.practice) checkBadges({
    clear,
    songClear: clear,
    combo: r.maxCombo,
    songMaster: clear && last && !r.song.locked,
    tempo3: r.step.kind === 'tempo' && r.step.pct === 100 && stars === 3,
  });
};

// ---- 自分のペースで弾く ----
const paceNoteOn = (midi) => {
  const r = songRun;
  const ev = r.events[r.pos];
  if (!ev.keys.some((k) => matches(midi, k))) {
    r.misses++;
    r.eventMisses++;
    flashKey(midi, 'ng');
    const sp = midiToSpelling(midi, ev.keys.some((k) => k.acc === -1));
    setFeedback('ng', `× 弾いた音は ${noteLabel(sp.step, sp.acc, settings.naming)}`);
    if (r.eventMisses >= 2) {
      ev.keys.forEach((k) => flashKey(k.midi, 'hint', 0));
      showKey(ev.keys[0].midi);
    }
    songHint();
    updateSongInfo();
    return;
  }
  r.pressed.add(midi);
  flashKey(midi, 'ok');
  if (!ev.keys.every((k) => [...r.pressed].some((m) => matches(m, k)))) return;
  // このイベントの音を全部弾けた（自分のペースなので速さの点はなく、まちがえずに続けるとコンボ）
  const first = r.eventMisses === 0;
  r.combo = first ? r.combo + 1 : 0;
  r.maxCombo = Math.max(r.maxCombo, r.combo);
  const pts = questionScore(first, 0, r.combo);
  r.score += pts;
  if (first) popJudge('Good', 'good', comboText(pts, r.combo));
  else popJudge('OK', 'ok', `+${pts}`);
  r.pos++;
  r.pressed.clear();
  r.eventMisses = 0;
  clearHints();
  setFeedback('', '');
  if (r.pos >= r.events.length && r.waitMode && r.loopRange) {
    r.laps += 1;
    $('lapLine').textContent = `${r.laps}回目：ミス ${r.misses - (r.lapMiss || 0)}回`;
    r.lapMiss = r.misses;
    r.pos = 0;
    r.viewMeasure = r.events[0].notes[0].measure;
    renderSong();
    updateSongInfo();
    songHint();
    return;
  }
  if (r.pos >= r.events.length) {
    renderSong();
    const stars = paceStars(r.misses, r.allowed);
    finishSongStep(stars, [
      `ミス <b>${r.misses}</b>回（${r.allowed}回まで）${stars ? '<span class="pass">○ 達成</span>' : '<span class="miss">× あと少し</span>'}`,
      stars && stars < 3 ? `<span class="next-star">${stars === 1 ? '★2まで：ミス1回以内' : '★3まで：ノーミス'}</span>` : '',
    ]);
    return;
  }
  const nx = r.events[r.pos];
  r.viewMeasure = nx.notes[0].measure;
  renderSong();
  updateSongInfo();
  songHint();
  showKey(nx.keys[nx.keys.length - 1].midi);
};

// ---- テンポに合わせて弾く ----
const startTempo = () => {
  const r = songRun;
  if (!r || r.step.kind !== 'tempo') return;
  stopSongAudio();
  const { c, song } = r;
  const { ctx } = getAudio();
  if (ctx.state === 'suspended') ctx.resume();
  const bpm = (song.tempo * r.step.pct * practiceOf().speed) / 10000;
  const spb = 60 / bpm;
  pmeter.setRange(TEMPO_WINDOW, TEMPO_PERFECT);
  const clickBeat = song.click || 1;
  const down = c.starts[song.pickup ? 1 : 0]; // 最初の強拍
  const mLen = c.lens[song.pickup ? 1 : 0];
  const first = down - mLen;                  // カウントは1小節前から
  const lastT = r.events[r.events.length - 1].t;
  const lead = 0.3; // 秒
  const audio0 = ctx.currentTime + lead - first * spb; // 拍0の時刻
  const perf0 = performance.now() + (lead - first * spb) * 1000;
  for (let b = first; b <= lastT + 1e-6; b += clickBeat) {
    const rel = (((b - down) % mLen) + mLen) % mLen;
    songClick(audio0 + b * spb, rel < 1e-6 || mLen - rel < 1e-6);
  }
  const expected = r.events.flatMap((e) => e.keys.map((k) => ({ ...k, at: perf0 + playBeat(song, e.t) * spb * 1000, hit: false, miss: false })));
  const byNote = new Map();
  expected.forEach((x) => { if (!byNote.has(x.note)) byNote.set(x.note, []); byNote.get(x.note).push(x); });
  r.tempo = {
    bpm, spb, perf0, expected, byNote, hits: 0, perfect: 0, misses: 0, wrong: 0,
    need: Math.ceil(expected.length * 0.9),
    endAt: perf0 + (lastT + 1) * spb * 1000, sig: '',
  };
  r.pos = 0;
  r.state = 'play';
  $('startBtn').hidden = !r.loopRange;
  $('startBtn').textContent = '■ 止める';
  setFeedback('', 'カウントのあとに弾き始めてください');
  requestAnimationFrame(tempoTick);
  // タブが裏に回って描画が止まっても、終わりの判定だけは時間どおりに行う
  songDemoTimer = setTimeout(tempoTick, r.tempo.endAt - performance.now() + 50);
};

const tempoTick = () => {
  const r = songRun;
  if (!r || !r.tempo || r.state !== 'play') return;
  const T = r.tempo;
  const now = performance.now();
  T.expected.forEach((x) => {
    if (!x.hit && !x.miss && now > x.at + TEMPO_WINDOW) { x.miss = true; T.misses++; r.combo = 0; }
  });
  const ms = T.spb * 1000;
  const cur = r.events.findIndex((e) => T.perf0 + playBeat(r.song, e.t) * ms + TEMPO_WINDOW >= now);
  r.pos = cur < 0 ? r.events.length : cur;
  // 1拍先を見て、次のフレーズに切り替える
  const beat = (now - T.perf0) / ms;
  r.viewMeasure = Math.min(Math.max(measureAt(r.c, beat + 1), r.step.range[0]), r.step.range[1] - 1);
  const sig = `${phraseOf(r.song, r.viewMeasure)}|${r.pos}|${T.hits}|${T.misses}|${T.wrong}`;
  if (sig !== T.sig) {
    T.sig = sig;
    renderSong();
    updateSongInfo();
  }
  placeCursor(beat);
  if (now < T.endAt) {
    requestAnimationFrame(tempoTick);
    return;
  }
  if (r.loopRange) {
    // 繰り返し：その回の結果を出して、カウントからもう一度
    r.laps += 1;
    r.lapHits += T.hits;
    r.lapTotal += T.expected.length;
    r.offsets.push(...T.expected.filter((x) => x.hit).map((x) => x.offset));
    const st = Timing.stats(T.expected.filter((x) => x.hit).map((x) => x.offset));
    $('lapLine').textContent = `${r.laps}回目：ちょうど ${T.hits} / ${T.expected.length}音${st.n ? `・平均のずれ ${Timing.signed(st.mean)}（${Timing.tendency(st.mean)}）` : ''}`;
    startTempo();
    return;
  }
  const stars = tempoStars(T.hits, T.expected.length);
  const total = T.expected.length;
  finishSongStep(stars, [
    `ちょうど <b>${T.hits}</b> / ${total}音（${T.need}音以上）${stars ? '<span class="pass">○ 達成</span>' : '<span class="miss">× あと少し</span>'}`,
    `Perfect ${T.perfect}音・Good ${T.hits - T.perfect}音、ずれた・弾かなかった ${T.misses}音、ちがう音 ${T.wrong}回`,
    timingLine(T.expected.filter((x) => x.hit).map((x) => x.offset)),
    stars && stars < 3 ? `<span class="next-star">${stars === 1 ? `★2まで：${Math.ceil(total * 0.95)}音以上ちょうど` : '★3まで：全部の音をちょうど'}</span>` : '',
  ]);
};

const tempoNoteOn = (midi) => {
  const r = songRun;
  const T = r.tempo;
  if (!T) return;
  const now = performance.now() - (settings.latency || 0);
  let best = null;
  T.expected.forEach((x) => {
    if (x.hit || x.miss || !matches(midi, x) || Math.abs(now - x.at) > TEMPO_WINDOW) return;
    if (!best || Math.abs(now - x.at) < Math.abs(now - best.at)) best = x;
  });
  if (best) {
    // ずれが ±50ms 以内なら Perfect（100点）、±150ms 以内なら Good（60点）。続けるとコンボ
    const dt = Math.round(now - best.at);
    const perfect = Math.abs(dt) <= TEMPO_PERFECT;
    best.hit = true;
    best.perfect = perfect;
    best.offset = dt;
    pmeter.push(dt);
    T.hits++;
    if (perfect) T.perfect++;
    r.combo++;
    r.maxCombo = Math.max(r.maxCombo, r.combo);
    const pts = (perfect ? 100 : 60) + Math.min(50, Math.max(0, r.combo - 1) * 5);
    r.score += pts;
    flashKey(midi, 'ok');
    const lag = Timing.label(dt);
    popJudge(perfect ? 'Perfect' : 'Good', perfect ? 'perfect' : 'good', `${lag}　${comboText(pts, r.combo)}`);
    setFeedback('ok', `○ ${lag}`);
  } else {
    T.wrong++;
    r.combo = 0;
    flashKey(midi, 'ng');
    popJudge('Miss', 'miss');
    setFeedback('ng', '× ずれ・ちがう音');
  }
};

const songNoteOn = (midi) => {
  const r = songRun;
  if (!r || r.state !== 'play') return;
  if (r.step.kind === 'tempo' && !r.waitMode) tempoNoteOn(midi);
  else paceNoteOn(midi);
};

// ---- お手本 ----
const playSongDemo = () => {
  const r = songRun;
  if (!r) return;
  if (r.tempo && r.state === 'play') return; // テンポの練習中は鳴らさない
  stopSongAudio();
  const { ctx } = getAudio();
  if (ctx.state === 'suspended') ctx.resume();
  const pct = r.step.kind === 'tempo' ? r.step.pct : 80;
  const spb = 60 / ((r.song.tempo * pct) / 100);
  const t0 = r.events[0].t;
  const base = ctx.currentTime + 0.2;
  r.events.forEach((e) => e.keys.forEach((k) => {
    const g = beep(k.midi, base + (playBeat(r.song, e.t) - t0) * spb);
    if (g) songNodes.push(g);
  }));
};

// ---- 曲モードに入る・出る ----
const enterSong = () => {
  ensureSightSongs();
  $('songPanel').hidden = false;
  $('skipBtn').hidden = true;
  const song = currentSong();
  const saved = progress.song && progress.song.id === song.id ? progress.song.step : null;
  if (!progress.song) progress.song = { id: song.id, step: 0 };
  startSongStep(saved !== null && isStepUnlocked(song, saved) ? saved : firstOpenStep(song));
};

const exitSong = () => {
  stopSongAudio();
  songRun = null;
  $('songPanel').hidden = true;
  $('startBtn').hidden = true;
};

const initSongUI = () => {
  $('songSel').addEventListener('change', (e) => {
    progress.song = { id: e.target.value, step: 0 };
    buildKeyboard();
    startSongStep(firstOpenStep(currentSong()));
  });
  $('stepSel').addEventListener('change', (e) => startSongStep(Number(e.target.value)));
  $('startBtn').addEventListener('click', () => (songRun?.loopRange && songRun.tempo && songRun.state === 'play' ? stopLoop() : startTempo()));
  $('demoBtn').addEventListener('click', playSongDemo);
  $('retryBtn').addEventListener('click', () => { if (songRun) startSongStep(songRun.stepIdx); });
  $('result').addEventListener('click', (e) => {
    const b = e.target instanceof Element ? e.target.closest('button[data-step]') : null;
    if (b) startSongStep(Number(b.dataset.step));
    if (e.target instanceof Element && e.target.closest('button[data-plan-cta]')) openPaywall('result');
  });
};

// ---- 初見チャレンジ：毎日かわる自動作曲の練習曲（Lv1〜4） ----
// 同じ日・同じレベルなら、どの端末でも同じ曲になる（日付から乱数の種を作る）
const SIGHT_LEVELS = [
  { lv: 1, desc: '右手だけ・ドから5つの音・4分と2分音符', bars: 4, keys: ['C'], lo: 0, hi: 4, both: false, tempo: 72,
    steps: [[1, 75], [2, 18], [0, 7]], rhythms: [['q', 'q', 'q', 'q'], ['h', 'q', 'q'], ['q', 'q', 'h'], ['h', 'h']] },
  { lv: 2, desc: '右手だけ・1オクターブ・8分音符と3度の跳躍', bars: 4, keys: ['C', 'G'], lo: 0, hi: 7, both: false, tempo: 80,
    steps: [[1, 55], [2, 30], [3, 10], [0, 5]], rhythms: [['q', 'q', 'q', 'q'], ['h', 'q', 'q'], ['q', 'q', 'h'], ['q', '8', '8', 'q', 'q'], ['8', '8', 'q', 'h'], ['q.', '8', 'q', 'q']] },
  { lv: 3, desc: '両手・左手は和音の根音（I・IV・V）', bars: 4, keys: ['C', 'G', 'F'], lo: 0, hi: 7, both: true, tempo: 72,
    steps: [[1, 55], [2, 30], [3, 10], [0, 5]], rhythms: [['q', 'q', 'q', 'q'], ['h', 'q', 'q'], ['q', 'q', 'h'], ['q', '8', '8', 'q', 'q'], ['q.', '8', 'q', 'q']] },
  { lv: 4, desc: '両手・8小節・付点のリズムと4度・5度の跳躍', bars: 8, keys: ['C', 'G', 'F', 'D'], lo: -2, hi: 9, both: true, tempo: 84,
    steps: [[1, 50], [2, 28], [3, 12], [4, 6], [0, 4]], rhythms: [['q', 'q', 'q', 'q'], ['q', '8', '8', 'q', 'q'], ['q.', '8', 'q', 'q'], ['q.', '8', 'q.', '8'], ['8', '8', '8', '8', 'q', 'q'], ['h', 'q', 'q']] },
];
const KEY_TONIC = { C: 0, G: 4, F: 3, D: 1 }; // 主音の音名番号
const PROGRESSIONS = { 4: [0, 3, 4, 0], 8: [0, 3, 4, 0, 5, 3, 4, 0] }; // 小節ごとの和音（主音からの度数）

const seededRandom = (text) => {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const pickWeighted = (rand, list) => {
  const total = list.reduce((a, [, w]) => a + w, 0);
  let x = rand() * total;
  for (const [v, w] of list) {
    x -= w;
    if (x <= 0) return v;
  }
  return list[list.length - 1][0];
};

const generateSightSong = (L, day) => {
  const rand = seededRandom(`${day}|${L.lv}`);
  const key = L.keys[Math.floor(rand() * L.keys.length)];
  const tonic = 28 + KEY_TONIC[key]; // 4オクターブ目の主音（step）
  const acc = (step) => (KEY_ACC[key] || {})[step % 7] || 0;
  const tok = (step, dur) => `${LETTERS[step % 7]}${acc(step) === 1 ? '#' : acc(step) === -1 ? 'b' : ''}${Math.floor(step / 7)}/${dur}`;
  const lo = tonic + L.lo;
  const hi = tonic + L.hi;
  const prog = PROGRESSIONS[L.bars];
  // 和音の構成音（主音からの度数）に近いほうへ寄せる
  const nearestChordTone = (step, degree) => {
    let best = step;
    let dist = 99;
    for (let s = lo; s <= hi; s++) {
      const d = (((s - tonic - degree) % 7) + 7) % 7;
      if ((d === 0 || d === 2 || d === 4) && Math.abs(s - step) < dist) { best = s; dist = Math.abs(s - step); }
    }
    return best;
  };
  let cur = tonic + (L.lv === 1 ? 0 : [0, 2, 4][Math.floor(rand() * 3)]);
  const rh = [];
  for (let m = 0; m < L.bars; m++) {
    const last = m === L.bars - 1;
    const rhythm = last ? (L.lv === 1 ? ['w'] : ['h', 'h']) : L.rhythms[Math.floor(rand() * L.rhythms.length)];
    const notes = rhythm.map((dur, i) => {
      if (last && i === rhythm.length - 1) {
        cur = tonic; // 最後は主音で終わる
      } else if (last) {
        cur = [tonic + 1, tonic + 4, tonic - 1].filter((s) => s >= lo && s <= hi)[0] ?? tonic + 1;
      } else if (!(m === 0 && i === 0)) {
        const step = pickWeighted(rand, L.steps) * (rand() < 0.5 ? -1 : 1);
        let next = cur + step;
        if (next < lo || next > hi) next = cur - step; // はみ出すなら反対へ
        cur = Math.min(hi, Math.max(lo, next));
        if (L.both && i === 0) cur = nearestChordTone(cur, prog[m]); // 小節の頭は和音の音に
      }
      return tok(cur, dur);
    });
    rh.push(notes.join(' '));
  }
  // 左手：Lv1・2は休み、Lv3は根音の全音符、Lv4は根音と5度の2分音符
  // 根音は ソ2〜ファ3（ヘ音記号の譜表の中）に置く。5度上でもド4まで
  const bassRoot = (degree) => {
    let s = tonic - 7 + degree;
    while (s > 24) s -= 7;
    while (s < 18) s += 7;
    return s;
  };
  const lh = prog.map((degree) => {
    if (!L.both) return 'r/w';
    const root = bassRoot(degree);
    return L.lv === 3 ? tok(root, 'w') : `${tok(root, 'h')} ${tok(root + 4, 'h')}`;
  });
  const [, mm, dd] = day.split('-');
  return {
    id: `sight-${day}-${L.lv}`,
    genre: 'sight',
    generated: true,
    sightLevel: L.lv,
    title: `初見チャレンジ Lv${L.lv}`,
    composer: `${Number(mm)}月${Number(dd)}日の曲`,
    credit: `${L.desc}。毎日0時に新しい曲になります（自動作曲）。はじめて見る楽譜を止まらずに読むのが初見の練習です`,
    key, time: '4/4', tempo: L.tempo,
    rh, lh,
    phrases: L.bars === 4 ? [[0, 4]] : [[0, 4], [4, 8]],
  };
};

// 今日の初見チャレンジを曲の一覧の先頭に置く（日付が変わっていたら入れ替える）
const ensureSightSongs = () => {
  const day = dayKey();
  if (SONGS.some((s) => s.id === `sight-${day}-1`)) return;
  for (let i = SONGS.length - 1; i >= 0; i--) if (SONGS[i].generated) SONGS.splice(i, 1);
  SONGS.unshift(...SIGHT_LEVELS.map((L) => generateSightSong(L, day)));
};
