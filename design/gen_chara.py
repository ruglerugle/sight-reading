# 読譜トレーナーのキャラクター（八分音符の子）を表情・ポーズ別の SVG に書き出す
# 使い方: py design/gen_chara.py  → img/chara/*.svg と design/characters.html
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'img' / 'chara'
INK = '#1e1b3a'
BODY = '#6d5cf0'
SHADE = '#4334b5'
GOLD = '#ffb020'
CHEEK = '#ff9ec0'

HEAD = 'M100 104 C 136 98 162 112 162 136 C 162 166 132 192 96 194 C 62 196 40 180 40 158 C 40 128 66 108 100 104 Z'


def limb(d: str, end: tuple[float, float], r: float = 10, fist: bool = False) -> str:
    """縁取りつきの腕・脚と、先の手（丸）"""
    x, y = end
    hand = f'<circle cx="{x}" cy="{y}" r="{r}" fill="{BODY}" stroke="{INK}" stroke-width="3.5"/>'
    if fist:
        hand += f'<path d="M{x - 4} {y - 3} q4 3 8 0" stroke="{INK}" stroke-width="2" fill="none" stroke-linecap="round"/>'
    return (f'<path d="{d}" stroke="{INK}" stroke-width="15" stroke-linecap="round" fill="none"/>'
            f'<path d="{d}" stroke="{BODY}" stroke-width="9" stroke-linecap="round" fill="none"/>' + hand)


def foot(d: str, cx: float, cy: float, rot: float) -> str:
    return (f'<path d="{d}" stroke="{INK}" stroke-width="15" stroke-linecap="round" fill="none"/>'
            f'<path d="{d}" stroke="{BODY}" stroke-width="9" stroke-linecap="round" fill="none"/>'
            f'<ellipse cx="{cx}" cy="{cy}" rx="15" ry="9" fill="{BODY}" stroke="{INK}" stroke-width="3.5" transform="rotate({rot} {cx} {cy})"/>')


ARMS = {
    'down': limb('M48 164 q-14 10 -14 28', (34, 194)) + limb('M154 170 q12 8 14 24', (168, 196)),
    'wave': limb('M48 164 q-14 10 -14 28', (34, 194)) + limb('M156 160 q20 -6 24 -38', (180, 118)),
    'up': limb('M46 158 q-18 -12 -18 -46', (28, 110)) + limb('M156 158 q20 -12 22 -44', (178, 112)),
    'point': limb('M48 164 q-14 10 -14 28', (34, 194))
    + limb('M156 162 q16 -2 30 -12', (188, 148))
    + f'<path d="M194 144 l12 -6" stroke="{INK}" stroke-width="10" stroke-linecap="round"/><path d="M194 144 l12 -6" stroke="{BODY}" stroke-width="4.5" stroke-linecap="round"/>',
    'fists': limb('M50 168 q-8 16 10 24', (62, 190), fist=True) + limb('M150 172 q10 14 -6 22', (142, 192), fist=True),
}

EYES = {
    'dot': ''.join(f'<ellipse cx="{x}" cy="146" rx="5.5" ry="7.5" fill="{INK}"/><circle cx="{x + 2}" cy="143" r="2.2" fill="#fff"/>' for x in (80, 120)),
    'happy': ''.join(f'<path d="M{x - 8} 148 q8 -12 16 0" stroke="{INK}" stroke-width="4.5" stroke-linecap="round" fill="none"/>' for x in (80, 120)),
    'worried': ''.join(f'<ellipse cx="{x}" cy="148" rx="5" ry="6.5" fill="{INK}"/><circle cx="{x + 2}" cy="146" r="1.8" fill="#fff"/>' for x in (80, 120))
    + f'<path d="M70 134 l14 -5 M130 134 l-14 -5" stroke="{INK}" stroke-width="3.5" stroke-linecap="round"/>',
}

MOUTH = {
    'open': f'<path d="M89 162 q11 22 22 0 z" fill="#c8323a" stroke="{INK}" stroke-width="3.5" stroke-linejoin="round"/><path d="M94.5 170 q5.5 -5 11 0 q-5.5 4.5 -11 0z" fill="#ff8f9a"/>',
    'smile': f'<path d="M91 163 q9 9 18 0" stroke="{INK}" stroke-width="4" stroke-linecap="round" fill="none"/>',
    'wavy': f'<path d="M89 167 q4 -5 8 0 q4 5 8 0 q4 -5 8 0" stroke="{INK}" stroke-width="3.5" stroke-linecap="round" fill="none"/>',
}


def sparkle(x: float, y: float, s: float, color: str = GOLD) -> str:
    return (f'<path d="M{x} {y - s} Q{x + s * .2} {y - s * .2} {x + s} {y} Q{x + s * .2} {y + s * .2} {x} {y + s} '
            f'Q{x - s * .2} {y + s * .2} {x - s} {y} Q{x - s * .2} {y - s * .2} {x} {y - s}z" fill="{color}" stroke="{INK}" stroke-width="2.5" stroke-linejoin="round"/>')


def mini_note(x: float, y: float, color: str) -> str:
    """飾りの小さい四分音符"""
    return (f'<ellipse cx="{x}" cy="{y}" rx="7" ry="5.5" fill="{color}" stroke="{INK}" stroke-width="2.5" transform="rotate(-20 {x} {y})"/>'
            f'<path d="M{x + 6} {y - 2} v-20" stroke="{INK}" stroke-width="2.8" stroke-linecap="round"/>')


SWEAT = f'<path d="M168 112 c4 6 7 10 7 13 a7 7 0 0 1 -14 0 c0 -3 3 -7 7 -13z" fill="#9bd7ff" stroke="{INK}" stroke-width="2.5"/>'
CROWN = (f'<path d="M58 104 l6 -22 l10 12 l8 -16 l8 16 l10 -12 l4 22 z" fill="{GOLD}" stroke="{INK}" stroke-width="3.5" stroke-linejoin="round" transform="rotate(-14 80 96)"/>'
         f'<circle cx="80" cy="96" r="3.5" fill="#ff6b8a" stroke="{INK}" stroke-width="2" transform="rotate(-14 80 96)"/>')

POSES = {
    # 名前: (目, 口, 腕, 飾り, 説明)
    'hello': ('dot', 'open', 'wave', sparkle(28, 60, 10) + mini_note(206, 160, '#ffd36b'), 'あいさつ・はじめての方へ'),
    'happy': ('happy', 'open', 'down', sparkle(30, 70, 11) + sparkle(205, 150, 8, CHEEK), 'クリア（★1〜2）'),
    'celebrate': ('happy', 'open', 'up', sparkle(22, 160, 11) + sparkle(204, 170, 10, CHEEK) + sparkle(110, 40, 8)
                  + mini_note(36, 60, '#ffd36b') + mini_note(196, 60, '#9bd7ff'), '★3・全クリア'),
    'cheer': ('dot', 'smile', 'fists', sparkle(196, 136, 8), 'もう一度（クリアならず）'),
    'worried': ('worried', 'wavy', 'fists', SWEAT, '見つからない・エラー'),
    'guide': ('dot', 'smile', 'point', '', '案内・おすすめ'),
    'crown': ('happy', 'smile', 'wave', CROWN + sparkle(30, 150, 9) + sparkle(204, 90, 8), '有料版'),
}


def svg(eyes: str, mouth: str, arms: str, deco: str) -> str:
    stem = (f'<rect x="149" y="30" width="15" height="110" rx="7.5" fill="{BODY}" stroke="{INK}" stroke-width="5"/>'
            f'<path d="M160 32 C 172 56 204 64 198 104 C 192 84 180 76 162 72 Z" fill="{GOLD}" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>'
            f'<path d="M174 54 c8 6 14 14 16 24" stroke="#fff" stroke-width="3.5" stroke-linecap="round" fill="none" opacity=".7"/>')
    legs = foot('M84 188 q-4 10 -10 14', 70, 206, -12) + foot('M114 188 q4 10 10 14', 128, 206, 12)
    head = (f'<path d="{HEAD}" fill="{BODY}"/>'
            f'<g clip-path="url(#c)"><circle cx="150" cy="200" r="70" fill="{SHADE}" opacity=".5"/>'
            f'<ellipse cx="100" cy="164" rx="44" ry="26" fill="#ffffff" opacity=".18"/></g>'
            f'<path d="{HEAD}" fill="none" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>'
            f'<path d="M58 132 q8 -14 24 -20" stroke="#fff" stroke-width="6" stroke-linecap="round" fill="none" opacity=".7"/>')
    cheeks = ''.join(f'<ellipse cx="{x}" cy="162" rx="9" ry="5.5" fill="{CHEEK}" opacity=".9"/>' for x in (66, 134))
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 230 230"><defs>'
            '<filter id="w" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="7"/>'
            '<feDisplacementMap in="SourceGraphic" scale="2.6"/></filter>'
            f'<clipPath id="c"><path d="{HEAD}"/></clipPath></defs>'
            f'<g filter="url(#w)"><ellipse cx="100" cy="218" rx="40" ry="7" fill="{INK}" opacity=".12"/>'
            f'{stem}{legs}{arms}{head}{cheeks}{EYES[eyes]}{MOUTH[mouth]}{deco}</g></svg>')


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    cards = []
    for name, (eyes, mouth, arms, deco, note) in POSES.items():
        (OUT / f'{name}.svg').write_text(svg(eyes, mouth, ARMS[arms], deco), encoding='utf-8')
        cards.append(f'<figure><img src="../img/chara/{name}.svg" width="180" height="180" alt=""><figcaption><b>{name}</b><br>{note}</figcaption></figure>')
    (ROOT / 'design' / 'characters.html').write_text(
        '<!doctype html><meta charset="utf-8"><title>キャラクター一覧</title>'
        '<style>body{font-family:sans-serif;background:#f4f3fb;display:flex;flex-wrap:wrap;gap:16px;padding:16px}'
        'figure{background:#fff;border-radius:16px;margin:0;padding:12px;text-align:center}</style>' + ''.join(cards),
        encoding='utf-8')
    print(f'{len(POSES)} 枚を書き出しました: {OUT}')


if __name__ == '__main__':
    main()
