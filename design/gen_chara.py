# 読譜トレーナーのキャラクター（八分音符の子）を表情・ポーズ別の SVG に書き出す
# 使い方: py design/gen_chara.py  → img/chara/*.svg と design/characters.html
# かわいく見せるコツ：まるい頭、目は大きく低めに寄せる、口は小さく、手足は短い「ちょこん」
# 線はゆらさず一定の太さ、影はくっきりしたセル塗り1段＋光。体は背景の紫と反対の黄色
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'img' / 'chara'
INK = '#3b2560'      # 線：真っ黒ではなく濃い紫
BODY = 'url(#gb)'    # 体：明るい黄色のグラデーション
BODY_FLAT = '#ffcf4d'
SHADE = '#f5a524'    # セル塗りの影
GOLD = '#ffcf4d'
FLAG = '#ff7aa2'     # 旗：コーラルピンク
FLAG_SHADE = '#e2557f'
CHEEK = 'url(#gc)'
EYE = 'url(#ge)'

HEAD = '<ellipse cx="100" cy="154" rx="58" ry="49" transform="rotate(-8 100 154)"'


def limb(d: str, end: tuple[float, float], r: float = 8.5, fist: bool = False) -> str:
    """縁取りつきの短い腕と、先の手（丸）"""
    x, y = end
    hand = f'<circle cx="{x}" cy="{y}" r="{r}" fill="{BODY_FLAT}" stroke="{INK}" stroke-width="3.5"/>'
    if fist:
        hand += f'<path d="M{x - 3.5} {y - 2} q3.5 3 7 0" stroke="{INK}" stroke-width="2" fill="none" stroke-linecap="round"/>'
    return (f'<path d="{d}" stroke="{INK}" stroke-width="14" stroke-linecap="round" fill="none"/>'
            f'<path d="{d}" stroke="{BODY_FLAT}" stroke-width="8" stroke-linecap="round" fill="none"/>' + hand)


ARMS = {
    'down': limb('M47 170 q-10 9 -15 22', (31, 194)) + limb('M151 172 q10 9 15 22', (167, 196)),
    'wave': limb('M47 170 q-10 9 -15 22', (31, 194)) + limb('M154 162 q12 -6 16 -24', (172, 134)),
    'up': limb('M48 160 q-12 -8 -12 -26', (36, 130)) + limb('M154 160 q14 -8 16 -28', (172, 128)),
    'point': limb('M47 170 q-10 9 -15 22', (31, 194))
    + limb('M154 166 q10 -2 20 -8', (176, 156))
    + f'<path d="M182 152 l9 -5" stroke="{INK}" stroke-width="9" stroke-linecap="round"/><path d="M182 152 l9 -5" stroke="{BODY_FLAT}" stroke-width="4" stroke-linecap="round"/>',
    'fists': limb('M54 174 q-4 10 8 14', (62, 188), fist=True) + limb('M146 174 q4 10 -8 14', (138, 188), fist=True),
}


def big_eye(x: float, y: float, rx: float = 7, ry: float = 9) -> str:
    # 下ほど紫が明るくなる瞳＋大小2つの光
    return (f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{EYE}"/>'
            f'<ellipse cx="{x + 2}" cy="{y - 3.4}" rx="3" ry="3.4" fill="#fff"/><circle cx="{x - 2.4}" cy="{y + 3.6}" r="1.4" fill="#fff" opacity=".9"/>')


EYES = {
    'dot': big_eye(82, 152) + big_eye(118, 152),
    'happy': ''.join(f'<path d="M{x - 7} 155 q7 -11 14 0" stroke="{INK}" stroke-width="4.5" stroke-linecap="round" fill="none"/>' for x in (82, 118)),
    'worried': big_eye(82, 154, 6.5, 8) + big_eye(118, 154, 6.5, 8)
    + f'<path d="M73 140 l12 -4 M127 140 l-12 -4" stroke="{INK}" stroke-width="3.2" stroke-linecap="round"/>',
}

MOUTH = {
    'open': f'<path d="M94 165 q6 11 12 0 z" fill="#c73a5a" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/><path d="M97 170.5 q3 -2.5 6 0 q-3 2.6 -6 0z" fill="#ff8fa8"/>',
    'smile': f'<path d="M95 166 q5 5 10 0" stroke="{INK}" stroke-width="3.5" stroke-linecap="round" fill="none"/>',
    'wavy': f'<path d="M92 168 q3 -4 6 0 q3 4 6 0 q3 -4 6 0" stroke="{INK}" stroke-width="3" stroke-linecap="round" fill="none"/>',
}


def sparkle(x: float, y: float, s: float, color: str = GOLD) -> str:
    return (f'<path d="M{x} {y - s} Q{x + s * .2} {y - s * .2} {x + s} {y} Q{x + s * .2} {y + s * .2} {x} {y + s} '
            f'Q{x - s * .2} {y + s * .2} {x - s} {y} Q{x - s * .2} {y - s * .2} {x} {y - s}z" fill="{color}" stroke="{INK}" stroke-width="2.5" stroke-linejoin="round"/>')


def mini_note(x: float, y: float, color: str) -> str:
    """飾りの小さい四分音符"""
    return (f'<ellipse cx="{x}" cy="{y}" rx="7" ry="5.5" fill="{color}" stroke="{INK}" stroke-width="2.5" transform="rotate(-20 {x} {y})"/>'
            f'<path d="M{x + 6} {y - 2} v-20" stroke="{INK}" stroke-width="2.8" stroke-linecap="round"/>')


SWEAT = f'<path d="M38 118 c4 6 7 10 7 13 a7 7 0 0 1 -14 0 c0 -3 3 -7 7 -13z" fill="#9bd7ff" stroke="{INK}" stroke-width="2.5"/>'
CROWN = (f'<g transform="rotate(-12 84 100)"><path d="M64 112 l4 -20 l9 11 l7 -15 l7 15 l9 -11 l4 20 z" fill="#fff2b3" stroke="{INK}" stroke-width="3.5" stroke-linejoin="round"/>'
         f'<circle cx="84" cy="106" r="3.2" fill="#ff6b8a" stroke="{INK}" stroke-width="2"/></g>')

POSES = {
    # 名前: (目, 口, 腕, 飾り, 説明)
    'hello': ('dot', 'open', 'wave', sparkle(40, 80, 9) + mini_note(204, 170, '#ffffff'), 'あいさつ・はじめての方へ'),
    'happy': ('happy', 'open', 'down', sparkle(40, 90, 10) + sparkle(200, 150, 7, FLAG), 'クリア（★1〜2）'),
    'celebrate': ('happy', 'open', 'up', sparkle(24, 170, 10) + sparkle(204, 176, 9, FLAG) + sparkle(100, 60, 8)
                  + mini_note(40, 80, '#ffffff'), '★3・全クリア'),
    'cheer': ('dot', 'smile', 'fists', sparkle(194, 140, 7), 'もう一度（クリアならず）'),
    'worried': ('worried', 'wavy', 'fists', SWEAT, '見つからない・エラー'),
    'guide': ('dot', 'smile', 'point', '', '案内・おすすめ'),
    'crown': ('happy', 'smile', 'wave', CROWN + sparkle(30, 160, 8) + sparkle(206, 100, 7), '有料版'),
}


def svg(eyes: str, mouth: str, arms: str, deco: str) -> str:
    defs = (
        '<linearGradient id="gb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe17a"/><stop offset="1" stop-color="#ffc23a"/></linearGradient>'
        '<linearGradient id="ge" x1="0" y1="0" x2="0" y2="1"><stop offset=".35" stop-color="#2a1a48"/><stop offset="1" stop-color="#7a5cff"/></linearGradient>'
        '<radialGradient id="gc"><stop offset="0" stop-color="#ff7a9a" stop-opacity=".85"/><stop offset="1" stop-color="#ff7a9a" stop-opacity="0"/></radialGradient>'
        f'<clipPath id="c">{HEAD}/></clipPath>'
        '<clipPath id="cs"><rect x="144" y="40" width="13" height="104" rx="6.5"/></clipPath>'
        '<clipPath id="cf"><path d="M153 42 C 164 62 192 68 188 104 C 182 86 170 80 155 76 Z"/></clipPath>'
    )
    stem = (f'<rect x="144" y="40" width="13" height="104" rx="6.5" fill="{BODY}"/>'
            f'<g clip-path="url(#cs)"><rect x="152" y="40" width="6" height="104" fill="{SHADE}" opacity=".7"/></g>'
            f'<rect x="144" y="40" width="13" height="104" rx="6.5" fill="none" stroke="{INK}" stroke-width="4.5"/>'
            f'<path d="M153 42 C 164 62 192 68 188 104 C 182 86 170 80 155 76 Z" fill="{FLAG}"/>'
            f'<g clip-path="url(#cf)"><path d="M150 66 C 170 72 184 82 190 104 L 150 104 Z" fill="{FLAG_SHADE}"/></g>'
            f'<path d="M153 42 C 164 62 192 68 188 104 C 182 86 170 80 155 76 Z" fill="none" stroke="{INK}" stroke-width="4.5" stroke-linejoin="round"/>'
            f'<path d="M163 58 c7 5 12 11 15 18" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none" opacity=".8"/>')
    feet = ''.join(f'<ellipse cx="{x}" cy="202" rx="13" ry="8.5" fill="{BODY_FLAT}" stroke="{INK}" stroke-width="3.5"/>'
                   f'<path d="M{x - 7} 206 q7 3 14 0" stroke="{SHADE}" stroke-width="3" stroke-linecap="round" fill="none"/>' for x in (80, 120))
    head = (f'{HEAD} fill="{BODY}"/>'
            # セル塗りの影：右下にくっきり1段
            f'<g clip-path="url(#c)"><path d="M168 120 C 160 176 120 200 60 204 L 180 220 Z" fill="{SHADE}" opacity=".75"/></g>'
            f'{HEAD} fill="none" stroke="{INK}" stroke-width="5"/>'
            f'<path d="M58 140 q6 -15 24 -22" stroke="#fff" stroke-width="6" stroke-linecap="round" fill="none"/>'
            f'<circle cx="54" cy="155" r="3.2" fill="#fff"/>')
    cheeks = ''.join(f'<ellipse cx="{x}" cy="166" rx="11" ry="7" fill="{CHEEK}"/>' for x in (66, 134))
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="10 30 210 190">'
            f'<defs>{defs}</defs>'
            f'<ellipse cx="100" cy="212" rx="38" ry="6" fill="#1e1b3a" opacity=".18"/>'
            f'{stem}{feet}{arms}{head}{cheeks}{EYES[eyes]}{MOUTH[mouth]}{deco}</svg>')


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    cards = []
    for name, (eyes, mouth, arms, deco, note) in POSES.items():
        (OUT / f'{name}.svg').write_text(svg(eyes, mouth, ARMS[arms], deco), encoding='utf-8')
        cards.append(f'<figure><img src="../img/chara/{name}.svg" width="160" alt=""><img src="../img/chara/{name}.svg" width="64" alt="">'
                     f'<figcaption><b>{name}</b><br>{note}</figcaption></figure>')
    (ROOT / 'design' / 'characters.html').write_text(
        '<!doctype html><meta charset="utf-8"><title>キャラクター一覧</title>'
        '<style>body{font-family:sans-serif;background:#f4f3fb;display:flex;flex-wrap:wrap;gap:16px;padding:16px}'
        'figure{background:#fff;border-radius:16px;margin:0;padding:12px;text-align:center}</style>' + ''.join(cards),
        encoding='utf-8')
    print(f'{len(POSES)} files -> {OUT}')


if __name__ == '__main__':
    main()
