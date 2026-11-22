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
  // 楽譜の拡大率（viewBox の1単位 → 画面の px）。高さいっぱいに合わせると、縦長の画面や広い画面では
  // 拡大しすぎて先の音符が見えなくなる。そこで、流す部分に少なくとも MIN_VIEW 単位（約1.5小節）が入り、
  // かつ MAX_SCALE を超えない大きさに抑える。余った高さは上下の余白になる
  const MIN_VIEW = 260;
  const MAX_SCALE = 1.6;
  const flowScale = (staffW, viewH, H, fixedW) => {
    const byH = viewH > 0 ? viewH / H : MAX_SCALE;
    const byW = staffW > 0 ? staffW / (fixedW + MIN_VIEW) : MAX_SCALE;
    return Math.max(0.1, Math.min(byH, byW, MAX_SCALE));
  };
  // 流す部分の幅（viewBox の単位）。左に固定した部分の幅を引いた残り
  const flowViewW = (staffW, k, fixedW) => Math.max(1, staffW / k - fixedW);
  const api = { FOCUS, MIN_VIEW, MAX_SCALE, xAtBeat, flowOffset, flowScale, flowViewW };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Flow = api;
})(typeof window !== 'undefined' ? window : globalThis);
