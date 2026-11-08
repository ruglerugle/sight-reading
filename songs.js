'use strict';
// ---- 曲の練習で使う楽譜 ----
// 作曲者の没後70年以上たった曲・作者不詳の伝承曲だけを使い、音符は手で打ち込んだもの（出版譜は使わない）。
// 書き方: 音名+♯(#)/♭(b)+オクターブ / 長さ（w 全・h 2分・q 4分・8 8分・16 16分、"." で付点、"~" で次の同じ音とタイ）
//   和音は "(c3 e3 g3)/h"、休符は "r/q"。小節ごとに1つの文字列。音は実際に鳴る高さで書く（調号で省略しない）
// key: 調号、time: 拍子、tempo: 4分音符の速さ、click: メトロノームを鳴らす間隔（4分=1）、pickup: 最初の小節が弱起
// phrases: 練習の区切り [開始小節, 終了小節)（0から数える）
const SONGS = [
  {
    id: 'twinkle',
    title: 'きらきら星',
    composer: 'フランス民謡',
    credit: 'モーツァルト『きらきら星変奏曲』の主題。左手は練習用の編曲',
    key: 'C', time: '4/4', tempo: 92,
    rh: [
      'c4/q c4/q g4/q g4/q', 'a4/q a4/q g4/h', 'f4/q f4/q e4/q e4/q', 'd4/q d4/q c4/h',
      'g4/q g4/q f4/q f4/q', 'e4/q e4/q d4/h', 'g4/q g4/q f4/q f4/q', 'e4/q e4/q d4/h',
      'c4/q c4/q g4/q g4/q', 'a4/q a4/q g4/h', 'f4/q f4/q e4/q e4/q', 'd4/q d4/q c4/h',
    ],
    lh: [
      'c3/q g3/q e3/q g3/q', 'f3/q a3/q e3/h', 'f3/q a3/q e3/q g3/q', 'g2/q b2/q c3/h',
      'c3/q g3/q b2/q g3/q', 'c3/q g3/q g2/h', 'c3/q g3/q b2/q g3/q', 'c3/q g3/q g2/h',
      'c3/q g3/q e3/q g3/q', 'f3/q a3/q e3/h', 'f3/q a3/q e3/q g3/q', 'g2/q b2/q c3/h',
    ],
    phrases: [[0, 4], [4, 8], [8, 12]],
  },
  {
    id: 'ode-to-joy',
    title: '歓喜の歌',
    composer: 'ベートーヴェン',
    credit: '交響曲第9番 第4楽章より。ハ長調に移調、左手は練習用の編曲',
    key: 'C', time: '4/4', tempo: 100,
    rh: [
      'e4/q e4/q f4/q g4/q', 'g4/q f4/q e4/q d4/q', 'c4/q c4/q d4/q e4/q', 'e4/q. d4/8 d4/h',
      'e4/q e4/q f4/q g4/q', 'g4/q f4/q e4/q d4/q', 'c4/q c4/q d4/q e4/q', 'd4/q. c4/8 c4/h',
      'd4/q d4/q e4/q c4/q', 'd4/q e4/8 f4/8 e4/q c4/q', 'd4/q e4/8 f4/8 e4/q d4/q', 'c4/q d4/q g3/h',
      'e4/q e4/q f4/q g4/q', 'g4/q f4/q e4/q d4/q', 'c4/q c4/q d4/q e4/q', 'd4/q. c4/8 c4/h',
    ],
    lh: [
      'c3/h g3/h', 'b2/h g2/h', 'c3/h g3/h', 'c3/h g2/h',
      'c3/h g3/h', 'b2/h g2/h', 'c3/h g3/h', 'g2/h c3/h',
      'g2/h c3/h', 'g2/h c3/h', 'g2/h b2/h', 'c3/h g2/h',
      'c3/h g3/h', 'b2/h g2/h', 'c3/h g3/h', 'g2/h c3/h',
    ],
    phrases: [[0, 4], [4, 8], [8, 12], [12, 16]],
  },
  {
    id: 'saints',
    title: '聖者の行進',
    composer: 'アメリカ民謡',
    credit: '黒人霊歌。左手は練習用の編曲',
    key: 'C', time: '4/4', tempo: 108,
    rh: [
      'r/q c4/q e4/q f4/q', 'g4/w', 'r/q c4/q e4/q f4/q', 'g4/w',
      'r/q c4/q e4/q f4/q', 'g4/h e4/h', 'c4/h e4/h', 'd4/w',
      'r/q e4/q e4/q d4/q', 'c4/h. c4/q', 'e4/h g4/q g4/q', 'f4/w',
      'r/q e4/q f4/q g4/q', 'e4/h c4/h', 'd4/w', 'c4/w',
    ],
    lh: [
      'c3/w', 'c3/h g2/h', 'c3/w', 'c3/h g2/h',
      'c3/w', 'c3/h e3/h', 'c3/h e3/h', 'g2/h d3/h',
      'g2/w', 'c3/h g2/h', 'c3/h bb2/h', 'f2/h a2/h',
      'c3/w', 'c3/h a2/h', 'g2/h b2/h', 'c3/w',
    ],
    phrases: [[0, 4], [4, 8], [8, 12], [12, 16]],
  },
  {
    id: 'brahms-lullaby',
    title: 'ブラームスの子守歌',
    composer: 'ブラームス',
    credit: '子守歌 Op.49-4。ハ長調に移調、左手は練習用の編曲',
    key: 'C', time: '3/4', tempo: 84, pickup: true,
    rh: [
      'e4/8 e4/8',
      'g4/q. e4/8 e4/q', 'g4/h e4/8 g4/8', 'c5/q b4/q. a4/8', 'a4/q g4/q d4/8 e4/8',
      'f4/q d4/q d4/8 e4/8', 'f4/h d4/8 f4/8', 'b4/8 a4/8 g4/q b4/q', 'c5/h c4/8 c4/8',
      'c5/h a4/8 f4/8', 'g4/h e4/8 c4/8', 'f4/q g4/q a4/q', 'g4/h c4/8 c4/8',
      'c5/h a4/8 f4/8', 'g4/h e4/8 c4/8', 'f4/q e4/8 d4/8 c4/8 d4/8', 'c4/h',
    ],
    lh: [
      'r/q',
      'c3/q (e3 g3)/q (e3 g3)/q', 'c3/q (e3 g3)/q (e3 g3)/q', 'g2/q (b2 f3)/q (b2 f3)/q', 'c3/q (e3 g3)/q (e3 g3)/q',
      'g2/q (b2 f3)/q (b2 f3)/q', 'g2/q (b2 f3)/q (b2 f3)/q', 'g2/q (b2 f3)/q (b2 f3)/q', 'c3/q (e3 g3)/q (e3 g3)/q',
      'f2/q (a2 c3)/q (a2 c3)/q', 'c3/q (e3 g3)/q (e3 g3)/q', 'f2/q (a2 c3)/q (a2 c3)/q', 'c3/q (e3 g3)/q (e3 g3)/q',
      'f2/q (a2 c3)/q (a2 c3)/q', 'c3/q (e3 g3)/q (e3 g3)/q', 'g2/q (b2 f3)/q (b2 f3)/q', 'c3/h',
    ],
    phrases: [[0, 5], [5, 9], [9, 13], [13, 17]],
  },
  {
    id: 'largo',
    title: '家路',
    composer: 'ドヴォルザーク',
    credit: '交響曲第9番『新世界より』第2楽章の主題。ハ長調に移調、左手は練習用の編曲',
    key: 'C', time: '4/4', tempo: 56,
    rh: [
      'e4/q. g4/8 g4/h', 'e4/q. d4/8 c4/h', 'd4/q e4/q g4/q e4/q', 'd4/w',
      'e4/q. g4/8 g4/h', 'e4/q. d4/8 c4/h', 'd4/q e4/q d4/q. c4/8', 'c4/w',
    ],
    lh: [
      '(c3 g3)/w', '(f2 c3)/h (c3 g3)/h', '(g2 d3)/h (c3 g3)/h', '(g2 d3)/w',
      '(c3 g3)/w', '(f2 c3)/h (c3 g3)/h', '(g2 d3)/w', '(c3 g3)/w',
    ],
    phrases: [[0, 4], [4, 8]],
  },
  {
    id: 'minuet-g',
    title: 'メヌエット ト長調',
    composer: 'ペツォールト',
    credit: '『アンナ・マグダレーナ・バッハの音楽帳』より（長くバッハ作とされてきた曲）',
    key: 'G', time: '3/4', tempo: 104,
    rh: [
      'd5/q g4/8 a4/8 b4/8 c5/8', 'd5/q g4/q g4/q', 'e5/q c5/8 d5/8 e5/8 f#5/8', 'g5/q g4/q g4/q',
      'c5/q d5/8 c5/8 b4/8 a4/8', 'b4/q c5/8 b4/8 a4/8 g4/8', 'f#4/q g4/8 a4/8 b4/8 g4/8', 'a4/h.',
      'd5/q g4/8 a4/8 b4/8 c5/8', 'd5/q g4/q g4/q', 'e5/q c5/8 d5/8 e5/8 f#5/8', 'g5/q g4/q g4/q',
      'c5/q d5/8 c5/8 b4/8 a4/8', 'b4/q c5/8 b4/8 a4/8 g4/8', 'a4/q b4/8 a4/8 g4/8 f#4/8', 'g4/h.',
    ],
    lh: [
      '(g3 b3 d4)/h a3/q', 'b3/h.', 'c4/h.', 'b3/h.',
      'a3/h.', 'g3/h.', 'd4/q b3/q g3/q', 'd4/q d3/8 c4/8 b3/8 a3/8',
      'b3/h a3/q', 'g3/q b3/q g3/q', 'c4/h.', 'b3/q c4/8 b3/8 a3/8 g3/8',
      'a3/h f#3/q', 'g3/h b3/q', 'c4/q d4/q d3/q', 'g3/h g2/q',
    ],
    phrases: [[0, 4], [4, 8], [8, 12], [12, 16]],
  },
  {
    id: 'fur-elise',
    title: 'エリーゼのために',
    composer: 'ベートーヴェン',
    credit: '冒頭の8小節',
    key: 'Am', time: '3/8', tempo: 40, click: 0.5, pickup: true,
    rh: [
      'e5/16 d#5/16',
      'e5/16 d#5/16 e5/16 b4/16 d5/16 c5/16', 'a4/8 r/16 c4/16 e4/16 a4/16', 'b4/8 r/16 e4/16 g#4/16 b4/16', 'c5/8 r/16 e4/16 e5/16 d#5/16',
      'e5/16 d#5/16 e5/16 b4/16 d5/16 c5/16', 'a4/8 r/16 c4/16 e4/16 a4/16', 'b4/8 r/16 e4/16 c5/16 b4/16', 'a4/q.',
    ],
    lh: [
      'r/8',
      'r/q.', 'a2/16 e3/16 a3/16 r/16 r/8', 'e2/16 e3/16 g#3/16 r/16 r/8', 'a2/16 e3/16 a3/16 r/16 r/8',
      'r/q.', 'a2/16 e3/16 a3/16 r/16 r/8', 'e2/16 e3/16 g#3/16 r/16 r/8', 'a2/16 e3/16 a3/16 r/16 r/8',
    ],
    phrases: [[0, 5], [5, 9]],
  },
  {
    id: 'gymnopedie',
    title: 'ジムノペディ第1番',
    composer: 'サティ',
    credit: '冒頭の12小節',
    key: 'D', time: '3/4', tempo: 66,
    rh: [
      'r/h.', 'r/h.', 'r/h.', 'r/h.',
      'r/q f#5/q a5/q', 'g5/q f#5/q c#5/q', 'b4/q c#5/q d5/q', 'a4/h.',
      'f#4/h.~', 'f#4/h.~', 'f#4/h.~', 'f#4/h.',
    ],
    lh: [
      'g2/q (b3 d4 f#4)/h', 'd2/q (a3 c#4 f#4)/h', 'g2/q (b3 d4 f#4)/h', 'd2/q (a3 c#4 f#4)/h',
      'g2/q (b3 d4 f#4)/h', 'd2/q (a3 c#4 f#4)/h', 'g2/q (b3 d4 f#4)/h', 'd2/q (a3 c#4 f#4)/h',
      'g2/q (b3 d4 f#4)/h', 'd2/q (a3 c#4 f#4)/h', 'g2/q (b3 d4 f#4)/h', 'd2/q (a3 c#4 f#4)/h',
    ],
    phrases: [[0, 4], [4, 8], [8, 12]],
  },
  {
    id: 'entertainer',
    title: 'ジ・エンターテイナー',
    composer: 'スコット・ジョプリン',
    credit: 'Aの部分の冒頭。左手は簡略な編曲',
    key: 'C', time: '2/4', tempo: 66, pickup: true,
    rh: [
      'd5/16 d#5/16',
      'e5/16 c6/8 e5/16 c6/8 e5/16 c6/16~', 'c6/q c6/16 d6/16 d#6/16 e6/16', 'c6/16 d6/16 e6/8 b5/16 d6/8 c6/16~', 'c6/q r/8 d5/16 d#5/16',
      'e5/16 c6/8 e5/16 c6/8 e5/16 c6/16~', 'c6/q a5/16 g5/16 f#5/16 a5/16', 'c6/16 e6/8 d6/16 c6/16 a5/16 d6/8~', 'd6/q r/q',
    ],
    lh: [
      'r/8',
      'c3/8 (e3 g3)/8 g2/8 (e3 g3)/8', 'c3/8 (e3 g3)/8 g2/8 (e3 g3)/8', 'g2/8 (f3 b3)/8 d3/8 (f3 b3)/8', 'c3/8 (e3 g3)/8 g2/8 (e3 g3)/8',
      'c3/8 (e3 g3)/8 g2/8 (e3 g3)/8', 'd3/8 (f#3 c4)/8 a2/8 (f#3 c4)/8', 'g2/8 (f3 b3)/8 d3/8 (f3 b3)/8', 'g2/q r/q',
    ],
    phrases: [[0, 5], [5, 9]],
  },

  // ---- ジャズ：定番の和音進行とリズムで書いたオリジナルの練習曲 ----
  // swing: 8分音符をはねて弾く（裏の8分を拍の2/3の位置に）。楽譜は普通の8分で書く
  {
    id: 'jazz-blues-c',
    genre: 'jazz',
    title: 'はじめてのブルース',
    composer: 'オリジナル練習曲',
    credit: '12小節ブルース（C7・F7・G7）。8分音符はスウィングではねて弾く。E♭・B♭がブルースらしい音',
    key: 'C', time: '4/4', tempo: 96, swing: true,
    rh: [
      'c4/8 e4/8 g4/8 a4/8 bb4/q a4/q', 'g4/h. r/q', 'c4/8 e4/8 g4/8 a4/8 bb4/q a4/q', 'g4/q e4/q c4/h',
      'f4/8 a4/8 c5/8 d5/8 eb5/q d5/q', 'c5/h. r/q', 'c4/8 e4/8 g4/8 a4/8 bb4/q a4/q', 'g4/h. r/q',
      'd5/q b4/q g4/q f4/q', 'eb5/q c5/q a4/q f4/q', 'e4/8 g4/8 bb4/8 g4/8 a4/q g4/q', 'c5/w',
    ],
    lh: [
      'c3/q g3/q a3/q g3/q', 'c3/q g3/q a3/q g3/q', 'c3/q g3/q a3/q g3/q', 'c3/q g3/q a3/q g3/q',
      'f2/q c3/q d3/q c3/q', 'f2/q c3/q d3/q c3/q', 'c3/q g3/q a3/q g3/q', 'c3/q g3/q a3/q g3/q',
      'g2/q d3/q e3/q d3/q', 'f2/q c3/q d3/q c3/q', 'c3/q g3/q a3/q g3/q', 'c3/w',
    ],
    phrases: [[0, 4], [4, 8], [8, 12]],
  },
  {
    id: 'jazz-swing-riff',
    genre: 'jazz',
    title: 'スウィング・リフ',
    composer: 'オリジナル練習曲',
    credit: 'ヘ長調の8小節。拍の前に食い込む「シンコペーション」（タイでつながる音）と、左手は2分音符のベース',
    key: 'F', time: '4/4', tempo: 112, swing: true,
    rh: [
      'f4/8 a4/8 c5/8 d5/8~ d5/h', 'r/q d5/8 c5/8 ab4/8 f4/8 r/q', 'f4/8 a4/8 c5/8 d5/8~ d5/h', 'r/q e5/8 d5/8 c5/8 bb4/8 g4/q',
      'f4/8 a4/8 c5/8 d5/8~ d5/h', 'r/q f5/8 d5/8 bb4/8 ab4/8 f4/q', 'g4/8 bb4/8 c5/8 e5/8~ e5/q c5/q', 'f5/h. r/q',
    ],
    lh: [
      'f2/h c3/h', 'bb2/h f2/h', 'f2/h a2/h', 'c3/h g2/h',
      'f2/h c3/h', 'bb2/h ab2/h', 'c3/h bb2/h', 'f2/w',
    ],
    phrases: [[0, 4], [4, 8]],
  },
  {
    id: 'jazz-ragtime',
    genre: 'jazz',
    title: 'ラグタイム・ステップ',
    composer: 'オリジナル練習曲',
    credit: 'ジャズの前身ラグタイムの型。右手は16分-8分-16分のシンコペーション、左手は低音と和音を交互に弾く（はねない）',
    key: 'C', time: '2/4', tempo: 80,
    rh: [
      'e5/16 g5/8 e5/16 c5/8 e5/8', 'g5/16 a5/8 g5/16 e5/q', 'd5/16 f5/8 d5/16 b4/8 d5/8', 'c5/q. r/8',
      'f5/16 a5/8 f5/16 c5/8 f5/8', 'e5/16 g5/8 e5/16 c5/q', 'd5/16 f5/8 b4/16 d5/8 g4/8', 'c5/q r/q',
    ],
    lh: [
      'c3/8 (e3 g3)/8 g2/8 (e3 g3)/8', 'c3/8 (e3 g3)/8 g2/8 (e3 g3)/8', 'g2/8 (f3 b3)/8 d3/8 (f3 b3)/8', 'c3/8 (e3 g3)/8 g2/8 (e3 g3)/8',
      'f2/8 (a2 c3)/8 c3/8 (a2 c3)/8', 'c3/8 (e3 g3)/8 g2/8 (e3 g3)/8', 'g2/8 (f3 b3)/8 d3/8 (f3 b3)/8', 'c3/q r/q',
    ],
    phrases: [[0, 4], [4, 8]],
  },
  {
    id: 'jazz-minor-blues',
    genre: 'jazz',
    title: 'マイナー・ブルース',
    composer: 'オリジナル練習曲',
    credit: 'イ短調の12小節ブルース（Am・Dm・E7）。8分音符はスウィング、左手は和音をなぞるベース',
    key: 'Am', time: '4/4', tempo: 100, swing: true,
    rh: [
      'a4/8 c5/8 e5/8 g5/8~ g5/q e5/q', 'd5/8 c5/8 a4/q r/h', 'a4/8 c5/8 e5/8 g5/8~ g5/q a5/q', 'g5/8 e5/8 c5/q r/h',
      'd5/8 f5/8 a5/8 c6/8~ c6/q a5/q', 'g5/8 f5/8 d5/q r/h', 'a4/8 c5/8 e5/8 g5/8~ g5/q e5/q', 'd5/8 c5/8 a4/q r/h',
      'g#4/8 b4/8 d5/8 e5/8~ e5/q d5/q', 'f5/8 e5/8 d5/q r/h', 'c5/8 b4/8 a4/q e5/q c5/q', 'a4/w',
    ],
    lh: [
      'a2/q c3/q e3/q c3/q', 'a2/q c3/q e3/q c3/q', 'a2/q c3/q e3/q c3/q', 'a2/q c3/q e3/q c3/q',
      'd3/q f3/q a3/q f3/q', 'd3/q f3/q a3/q f3/q', 'a2/q c3/q e3/q c3/q', 'a2/q c3/q e3/q c3/q',
      'e2/q g#2/q b2/q d3/q', 'd3/q f3/q a3/q f3/q', 'a2/q c3/q e3/q c3/q', 'a2/w',
    ],
    phrases: [[0, 4], [4, 8], [8, 12]],
  },
  {
    id: 'jazz-two-five-one',
    genre: 'jazz',
    title: 'ツー・ファイブ・ワン',
    composer: 'オリジナル練習曲',
    credit: 'ジャズの基本進行 Dm7→G7→Cmaj7。右手は8分音符で和音をなぞるフレーズ、左手はルートと7度だけの「シェル・ボイシング」',
    key: 'C', time: '4/4', tempo: 120, swing: true,
    rh: [
      'd5/8 f5/8 a5/8 c6/8 b5/8 a5/8 f5/8 d5/8', 'b4/8 d5/8 f5/8 a5/8 ab5/8 g5/8 f5/8 d5/8', 'e5/q. c5/8~ c5/h', 'r/q b4/8 c5/8 e5/8 g5/8 b5/q',
      'a5/8 f5/8 d5/8 f5/8 e5/8 d5/8 c5/8 a4/8', 'g4/8 b4/8 d5/8 f5/8 e5/8 d5/8 b4/8 g4/8', 'c5/8 e5/8 g5/8 b5/8~ b5/q a5/q', 'c6/w',
    ],
    lh: [
      '(d3 c4)/w', '(g2 f3)/w', '(c3 b3)/w', '(c3 b3)/w',
      '(d3 c4)/w', '(g2 f3)/w', '(c3 b3)/w', '(c3 a3)/w',
    ],
    phrases: [[0, 4], [4, 8]],
  },
];
