'use strict';
// ---- ゲームらしさ：点数・★・コンボ・判定の表示・クリアの演出・自己ベスト ----
// index.html の本体より先に読み込む。本体の定数（$・progress・persist・beep など）は関数の中でだけ使う

const PERFECT_RATIO = 0.4; // ステージ：1音あたりの時間が基準のこの割合以内なら Perfect
const TEMPO_PERFECT = 50;  // テンポ：このミリ秒以内のずれなら Perfect（TEMPO_WINDOW 以内は Good）

// 1問（曲は1イベント）の点数。first: 一発正解、speed: 0〜1（速いほど1）、combo: この問題を入れた連続の数
const questionScore = (first, speed, combo) =>
  first ? 100 + Math.round(50 * Math.min(1, Math.max(0, speed))) + Math.min(50, Math.max(0, combo - 1) * 5) : 30;

// ---- ★の基準 ----
// ステージ：★1＝クリア条件、★2＝一発正解18問以上・時間が基準の3/4以内、★3＝全問一発正解・時間が基準の半分以内
const stageStars = ({ clear, first, per, sec }) =>
  !clear ? 0 : first >= STAGE_Q && per <= sec * 0.5 ? 3 : first >= 18 && per <= sec * 0.75 ? 2 : 1;
// 曲（自分のペース）：★1＝許されるミスの回数以内、★2＝ミス1回以内、★3＝ノーミス
const paceStars = (misses, allowed) => (misses > allowed ? 0 : misses === 0 ? 3 : misses <= 1 ? 2 : 1);
// 曲（テンポ）：★1＝9割、★2＝95%、★3＝全部の音がちょうど
const tempoStars = (hits, total) => (hits >= total ? 3 : hits >= total * 0.95 ? 2 : hits >= Math.ceil(total * 0.9) ? 1 : 0);

// 次の★までの条件（ステージ）
const stageNextStar = (stars, sec, label) =>
  stars === 0 ? '' :
  stars === 1 ? `★2まで：一発正解18問以上・${label}平均${(sec * 0.75).toFixed(2)}秒以内` :
  stars === 2 ? `★3まで：全問一発正解・${label}平均${(sec * 0.5).toFixed(1)}秒以内` : '';

// ---- 自己ベスト ----
const stageKey = (mode) => `stage:${settings.clef}:${mode}`;
const songKey = (id, i) => `song:${id}:${i}`;
const bestOf = (key) => (progress.best && progress.best[key]) || null;
const starsOf = (key) => (bestOf(key) ? bestOf(key).stars : 0);
const saveBest = (key, score, stars) => {
  if (!progress.best) progress.best = {};
  const prev = progress.best[key] || null;
  progress.best[key] = { score: Math.max(score, prev ? prev.score : 0), stars: Math.max(stars, prev ? prev.stars : 0) };
  return { prev, newBest: score > 0 && (!prev || score > prev.score), newStars: stars > (prev ? prev.stars : 0) };
};
const starText = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);

// ---- 判定の表示（Perfect / Good / Miss とコンボ） ----
const popJudge = (label, cls, extra = '') => {
  const layer = $('judgeLayer');
  if (!layer) return;
  const el = document.createElement('div');
  el.className = `judge ${cls}`;
  el.innerHTML = `<b>${label}</b>${extra ? `<span>${extra}</span>` : ''}`;
  layer.replaceChildren(el);
  setTimeout(() => el.remove(), 900);
};
const comboText = (pts, combo) => `+${pts}${combo >= 2 ? `　${combo}コンボ` : ''}`;

// ---- クリアの演出 ----
const reducedMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const fanfare = (stars) => {
  try {
    const { ctx } = getAudio();
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime + 0.05;
    const seq = stars >= 3 ? [72, 76, 79, 84, 88] : stars === 2 ? [67, 72, 76, 79] : [64, 67, 72];
    seq.forEach((m, i) => beep(m, t + i * 0.1));
  } catch (e) {
    console.warn('クリアの音を鳴らせませんでした', e);
  }
};

const confetti = (amount = 110) => {
  if (reducedMotion()) return;
  const c = document.createElement('canvas');
  c.className = 'confetti';
  document.body.appendChild(c);
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;
  c.width = w * dpr;
  c.height = h * dpr;
  const g = c.getContext('2d');
  g.scale(dpr, dpr);
  const colors = ['#3b5b8c', '#2e8b57', '#d9a21b', '#c8433a', '#7a5ea8', '#f2b705'];
  const ps = Array.from({ length: amount }, () => ({
    x: w / 2 + (Math.random() - 0.5) * w * 0.5, y: h * 0.38,
    vx: (Math.random() - 0.5) * 10, vy: -Math.random() * 10 - 4,
    r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
    pw: 6 + Math.random() * 5, ph: 3 + Math.random() * 4, col: colors[Math.floor(Math.random() * colors.length)],
  }));
  const t0 = performance.now();
  const LIFE = 2200;
  const step = (t) => {
    const dt = t - t0;
    g.clearRect(0, 0, w, h);
    ps.forEach((p) => {
      p.vy += 0.25;
      p.x += p.vx;
      p.y += p.vy;
      p.r += p.vr;
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.r);
      g.globalAlpha = Math.max(0, 1 - dt / LIFE);
      g.fillStyle = p.col;
      g.fillRect(-p.pw / 2, -p.ph / 2, p.pw, p.ph);
      g.restore();
    });
    if (dt < LIFE) requestAnimationFrame(step);
    else c.remove();
  };
  requestAnimationFrame(step);
};

// ---- 結果画面 ----
// 上の部分（★・見出し・点数・自己ベスト）。lines は下に並べる説明の行
const resultHead = ({ title, stars, score, best, lines }) =>
  `<div class="stars" role="img" aria-label="★${stars}つ">${[1, 2, 3].map((i) =>
    `<span class="${i <= stars ? 'on' : ''}" style="--d:${0.15 + i * 0.25}s">★</span>`).join('')}</div>` +
  `<h2>${title}</h2>` +
  `<div class="score"><b data-count="${score}">${reducedMotion() ? score : 0}</b><small>点</small>` +
  (best.newBest ? '<em class="best">自己ベスト更新！</em>' : best.prev ? `<small class="prev">自己ベスト ${best.prev.score}点</small>` : '') +
  '</div>' +
  lines.filter(Boolean).map((l) => `<p>${l}</p>`).join('');

// 結果を出したあとに呼ぶ：点数を数え上げ、★があれば効果音と紙吹雪
const animateResult = (el, stars) => {
  const b = el.querySelector('[data-count]');
  if (b && !reducedMotion()) {
    const to = Number(b.dataset.count);
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / 900);
      b.textContent = String(Math.round(to * (1 - (1 - k) ** 3)));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    // タブが裏にあって描画が止まっていても、最後の点数は出しておく
    setTimeout(() => { b.textContent = String(to); }, 1000);
  }
  if (stars > 0) {
    fanfare(stars);
    confetti(stars >= 3 ? 180 : 110);
  }
};
