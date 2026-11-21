# バイエル Op.101 第61番：採譜記録

- 出典：Ferdinand Beyer, *Vorschule im Klavierspiel*, Op.101、Edition Peters / Adolf Ruthardt 校訂、版番号 8033。印刷ページ 44（PDF 44ページ目、ゼロ始まりでは43）下部の No.61。3段、5 + 5 + 6 小節。
- [Wikimedia Commons（歴史的版スキャン、パブリックドメイン表示）](https://commons.wikimedia.org/wiki/File:Vorschule_im_Klavierspiel,_Op.101_(IA_imslp-im-klavierspiel-op101-beyer-ferdinand).pdf)・[取得した原資料（Internet Archive）](https://archive.org/download/imslp-im-klavierspiel-op101-beyer-ferdinand/PMLP31149-F_Beyer-Op101.pdf)。取得ファイル SHA-1: `abf7b9c44703b2e994dad63e7b50ab01df4c1377`（Commonsの公開値に一致）。
- 全16小節、両手の音高・音価と最後の休符を手入力。ト音記号・ヘ音記号それぞれ固定。原譜は C 字の拍子記号で、アプリでは同じ4/4を数値表記。調号は原譜どおりなし。アプリの `key: 'C'` は無調号の描画指定。途中8小節後の線は複縦線で、繰り返し記号ではない。
- 音高・音価・反復の編曲／省略なし。dolce・legato、スラー、指番号、8小節後の複縦線と終止線は現行データで表現していない。原譜の速度は Allegro moderato（数値なし）；四分音符104は練習用設定。4小節ずつの練習区切りはアプリでの追加。
- 右手は冒頭の付点4分＋8分、終盤の G6 と四分休符まで確認。左手は第3・7・9・11・15小節の第3拍が C4（他の主要小節は B3）、第16小節は B3／D4／G3／四分休符。
- 第3番は教師パートのある連弾、第56番は左手がト音記号からヘ音記号へ移行するため、現在の形式でそのまま収録できる第61番を先行。次は同じ版の固定音部記号の独奏曲を優先して個別に照合。左手の音部記号が変わる曲や連弾曲は対応を追加してから、教師パートを省かず収録する。

曲データの正本は piano-billing の `src/songs-full.ts`。既存の `scripts/build-free.mjs` を変更せず再生成。


### 次の候補
1. 第65番（同版 p.48）: 上下固定音部記号の独奏。音階を左右で受け渡す練習。
2. 第66番（同版 p.49）: 6/8拍子の独奏。反復前後を譜面と再生で同じ順序に扱えることを先に確認。
3. 第56番・第12番などの音部記号対応、第3番・第63番などの教師パート対応は、その仕様とテストを別に整えてから追加する。
