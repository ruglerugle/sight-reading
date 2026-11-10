# 読譜トレーナーのキャラクター（八分音符の子）を表情・ポーズ別の SVG に書き出す
# 使い方: py design/gen_chara.py  → img/chara/*.svg と design/characters.html
# かわいく見せるコツ：まるい頭、目は大きく低めに寄せる、口は小さく、手足は短い「ちょこん」
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'img' / 'chara'
INK = '#1e1b3a'
BODY = '#7564f5'
SHADE = '#4f3fd0'
GOLD = '#ffb020'
CHEEK = '#ff8fb8'

HEAD = '<ellipse cx="100" cy="154" rx="58" ry="49" transform="rotate(-8 100 154)"'


def limb(d: str, end: tuple[float, float], r: float = 8.5, fist: bool = False) -> str:
    """縁取りつきの短い腕と、先の手（丸）"""
    x, y = end
    hand = f'<circle cx="{x}" cy="{y}" r="{r}" fill="{BODY}" stroke="{INK}" stroke-width="3.5"/>'
    if fist:
        hand += f'<path d="M{x - 3.5} {y - 2} q3.5 3 7 0" stroke="{INK}" stroke-width="2" fill="none" stroke-linecap="round"/>'
    return (f'<path d="{d}" stroke="{INK}" stroke-width="14" stroke-linecap="round" fill="none"/>'
            f'<path d="{d}" stroke="{BODY}" stroke-width="8" stroke-linecap="round" fill="none"/>' + hand)


ARMS = {
    'down': limb('M50 170 q-8 6 -10 14', (40, 186)) + limb('M150 172 q8 6 10 14', (160, 188)),
    'wave': limb('M50 170 q-8 6 -10 14', (40, 186)) + limb('M154 162 q12 -6 16 -24', (172, 134)),
    'up': limb('M48 160 q-12 -8 -12 -26', (36, 130)) + limb('M154 160 q14 -8 16 -28', (172, 128)),
    'point': limb('M50 170 q-8 6 -10 14', (40, 186))
    + limb('M154 166 q10 -2 20 -8', (176, 156))
    + f'<path d="M182 152 l9 -5" stroke="{INK}" stroke-width="9" stroke-linecap="round"/><path d="M182 152 l9 -5" stroke="{BODY}" stroke-width="4" stroke-linecap="round"/>',
    'fists': limb('M54 174 q-4 10 8 14', (62, 188), fist=True) + limb('M146 174 q4 10 -8 14', (138, 188), fist=True),
}


def big_eye(x: float, y: float, rx: float = 7, ry: float = 9) -> str:
    return (f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{INK}"/>'
            f'<circle cx="{x + 2.2}" cy="{y - 3.2}" r="2.9" fill="#fff"/><circle cx="{x - 2.2}" cy="{y + 3.4}" r="1.3" fill="#fff"/>')


EYES = {
    'dot': big_eye(82, 152) + big_eye(118, 152),
    'happy': ''.join(f'<path d="M{x - 7} 155 q7 -11 14 0" stroke="{INK}" stroke-width="4.5" stroke-linecap="round" fill="none"/>' for x in (82, 118)),
    'worried': big_eye(82, 154, 6.5, 8) + big_eye(118, 154, 6.5, 8)
    + f'<path d="M73 140 l12 -4 M127 140 l-12 -4" stroke="{INK}" stroke-width="3.2" stroke-linecap="round"/>',
}

MOUTH = {
    'open': f'<path d="M94 165 q6 11 12 0 z" fill="#d93a4a" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>',
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
CROWN = (f'<g transform="rotate(-12 84 100)"><path d="M64 112 l4 -20 l9 11 l7 -15 l7 15 l9 -11 l4 20 z" fill="{GOLD}" stroke="{INK}" stroke-width="3.5" stroke-linejoin="round"/>'
         f'<circle cx="84" cy="106" r="3.2" fill="#ff6b8a" stroke="{INK}" stroke-width="2"/></g>')

POSES = {
    # 名前: (目, 口, 腕, 飾り, 説明)
    'hello': ('dot', 'open', 'wave', sparkle(40, 80, 9) + mini_note(204, 170, '#ffd36b'), 'あいさつ・はじめての方へ'),
    'happy': ('happy', 'open', 'down', sparkle(40, 90, 10) + sparkle(200, 150, 7, CHEEK), 'クリア（★1〜2）'),
    'celebrate': ('happy', 'open', 'up', sparkle(24, 170, 10) + sparkle(204, 176, 9, CHEEK) + sparkle(100, 60, 8)
                  + mini_note(40, 80, '#ffd36b'), '★3・全クリア'),
    'cheer': ('dot', 'smile', 'fists', sparkle(194, 140, 7), 'もう一度（クリアならず）'),
    'worried': ('worried', 'wavy', 'fists', SWEAT, '見つからない・エラー'),
    'guide': ('dot', 'smile', 'point', '', '案内・おすすめ'),
    'crown': ('happy', 'smile', 'wave', CROWN + sparkle(30, 160, 8) + sparkle(206, 100, 7), '有料版'),
}


def svg(eyes: str, mouth: str, arms: str, deco: str) -> str:
    stem = (f'<rect x="144" y="40" width="13" height="104" rx="6.5" fill="{BODY}" stroke="{INK}" stroke-width="4.5"/>'
            f'<path d="M153 42 C 164 62 192 68 188 104 C 182 86 170 80 155 76 Z" fill="{GOLD}" stroke="{INK}" stroke-width="4.5" stroke-linejoin="round"/>'
            f'<path d="M166 62 c7 5 12 12 14 21" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none" opacity=".7"/>')
    feet = ''.join(f'<ellipse cx="{x}" cy="202" rx="13" ry="8.5" fill="{BODY}" stroke="{INK}" stroke-width="3.5"/>' for x in (80, 120))
    head = (f'{HEAD} fill="{BODY}"/>'
            f'<g clip-path="url(#c)"><circle cx="160" cy="214" r="72" fill="{SHADE}" opacity=".45"/></g>'
            f'{HEAD} fill="none" stroke="{INK}" stroke-width="5"/>'
            f'<path d="M60 138 q7 -13 22 -19" stroke="#fff" stroke-width="6" stroke-linecap="round" fill="none" opacity=".75"/>'
            f'<circle cx="56" cy="152" r="3" fill="#fff" opacity=".75"/>')
    cheeks = ''.join(f'<ellipse cx="{x}" cy="166" rx="8.5" ry="5" fill="{CHEEK}" opacity=".85"/>' for x in (66, 134))
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="10 30 210 190"><defs>'
            '<filter id="w" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="7"/>'
            '<feDisplacementMap in="SourceGraphic" scale="2"/></filter>'
            f'<clipPath id="c">{HEAD}/></clipPath></defs>'
            f'<g filter="url(#w)"><ellipse cx="100" cy="212" rx="38" ry="6" fill="{INK}" opacity=".12"/>'
            f'{stem}{feet}{arms}{head}{cheeks}{EYES[eyes]}{MOUTH[mouth]}{deco}</g></svg>')


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
