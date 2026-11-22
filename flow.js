'use strict';
// 曲の楽譜を横に1段で流すときの位置の計算（画面に触れない計算だけ。tests/flow.test.cjs で確かめる）
(function (root) {
  const FOCUS = 1 / 3; // いま弾く位置を、画面の左から何分の1に置くか
  // 拍 → x。pts は [[拍, x], ...]（拍の昇順）。範囲の外は両端に止める
  const xAtBeat = (pts, beat) => {
    if (!pts.length) return 0;
    if (beat <= pts[0][0]) return pts[0][1];
    const last = pts[pts.length - 1];
    if (beat >= last[0]) return last[1];
    let i = pts.findIndex((p) => p[0] > beat);
    if (i < 0) i = pts.length - 1;
    const [t0, x0] = pts[i - 1];
    const [t1, x1] = pts[i];
    return t1 > t0 ? x0 + ((beat - t0) / (t1 - t0)) * (x1 - x0) : x1;
  };
  // いまの位置 x が、見える幅 viewW の左から FOCUS のところに来るための、楽譜の左へのずらし量。
  // 曲の頭ではずらさず（trackStart）、曲の終わりでは、最後の小節の右端が画面の右端より先へ行かない
  const flowOffset = (x, viewW, trackStart, trackEnd) => {
    const want = x - viewW * FOCUS;
    const max = Math.max(trackStart, trackEnd - viewW);
    return Math.min(Math.max(want, trackStart), max);
  };
  const api = { FOCUS, xAtBeat, flowOffset };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Flow = api;
})(typeof window !== 'undefined' ? window : globalThis);
