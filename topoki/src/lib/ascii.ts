/* =========================================================================
   ascii.ts — TOPOKI's character art.
   The typed half of the art direction: the mascot, the wordmark's glyph table,
   the roofline and the copy that goes with them. Anything that has to hold a
   pixel grid is painted instead — see `lib/dither.ts`.
   ========================================================================= */

/* ---------------------------------------------------------------- mascot --
   TOPOKI is a kitten. 토포키 / 떡볶이 — Korean street food, one ember of
   gochujang. The mascot is drawn at three densities so it can sit in a
   32px navbar or fill a hero.
   ------------------------------------------------------------------------ */

/** 3-line mark. Used in the header and the favicon. */
export const CAT_MARK = [
  ' /\\_/\\ ',
  '( o.o )',
  ' > ^ < ',
]

/** Blink frame for CAT_MARK — swapped in every few seconds. */
export const CAT_MARK_BLINK = [
  ' /\\_/\\ ',
  '( -.- )',
  ' > ^ < ',
]

/** The one true mascot: a sitting kitten, 8 lines. */
export const CAT_SIT = [
  '   /\\     /\\   ',
  '  /  \\___/  \\  ',
  ' (   o   o   ) ',
  '  \\     ω    / ',
  '   \\   ---  /  ',
  '   |        |  ',
  '   |__    __|  ',
  '  (___)  (___) ',
]

/** Kitten asleep — shown on empty portfolio / no results. */
export const CAT_SLEEP = [
  '              z z',
  '    /\\_/\\   z    ',
  '   ( -.- )       ',
  '  o_(")(")       ',
]

/** Kitten alarmed — errors, rejected transactions. */
export const CAT_ALERT = [
  '   /\\_/\\   !!!   ',
  '  ( o_o )        ',
  '   > ! <         ',
]

/* ------------------------------------------------------------------ 기와 --
   A hanok roofline in characters. GIWA's own brand texture is an ASCII
   rendering of overlapping roof tiles; this is TOPOKI's, generated to any
   width so it can run edge to edge behind the interface.

   기와가 맞물려 지붕을 이루듯 — as roof tiles interlock to form a roof.
   ------------------------------------------------------------------------ */

export function roofline(cols: number): string[] {
  const n = Math.max(12, cols)
  const tiles = Math.ceil(n / 3)
  return [
    ' '.repeat(2) + '▁'.repeat(Math.max(0, n - 4)),
    '▄' + '█'.repeat(Math.max(0, n - 2)) + '▄',
    '╱‾╲'.repeat(tiles).slice(0, n),
    '│ │'.repeat(tiles).slice(0, n),
  ]
}

/** The line GIWA builds its whole brand on. */
export const GIWA_PROVERB = '기와가 맞물려 지붕을 이루듯, 작은 연결이 모여 큰 신뢰가 됩니다'

/* ------------------------------------------------------------- wordmark --
   A 5-row block face, assembled at runtime so columns can never drift.
   ------------------------------------------------------------------------ */

export const GLYPHS_5: Record<string, string[]> = {
  T: ['██████', '  ██  ', '  ██  ', '  ██  ', '  ██  '],
  O: [' ████ ', '██  ██', '██  ██', '██  ██', ' ████ '],
  P: ['█████ ', '██  ██', '█████ ', '██    ', '██    '],
  K: ['██  ██', '██ ██ ', '████  ', '██ ██ ', '██  ██'],
  I: ['██████', '  ██  ', '  ██  ', '  ██  ', '██████'],
  S: [' █████', '██    ', ' ████ ', '    ██', '█████ '],
  W: ['██  ██', '██  ██', '██ ██ ', '██████', '██  ██'],
  A: [' ████ ', '██  ██', '██████', '██  ██', '██  ██'],
  G: [' █████', '██    ', '██ ███', '██  ██', ' █████'],
  E: ['██████', '██    ', '█████ ', '██    ', '██████'],
  X: ['██  ██', ' ████ ', '  ██  ', ' ████ ', '██  ██'],
  D: ['█████ ', '██  ██', '██  ██', '██  ██', '█████ '],
  ' ': ['    ', '    ', '    ', '    ', '    '],
}

/** Render a word in the block face. Unknown characters become spaces. */
export function wordmark(word: string, gap = 1): string[] {
  const letters = word
    .toUpperCase()
    .split('')
    .map((c) => GLYPHS_5[c] ?? GLYPHS_5[' '])
  const spacer = ' '.repeat(gap)
  return Array.from({ length: 5 }, (_, row) =>
    letters.map((g) => g[row]).join(spacer),
  )
}

/* ---------------------------------------------------------------- charts --
   Nothing here plots any more. Price history, sparklines and meters were
   braille and block characters; the page face carries neither, so all three
   moved onto the dither engine — see `lib/dither.ts`, `DitherChart`,
   `PixelSpark` and `DitherBar`. What is left in this file is letter art,
   which any face can set.
   ------------------------------------------------------------------------ */

/* --------------------------------------------------------------- motion -- */

/** Latin-only spinner: Geist Pixel carries no braille. */
export const SPINNER = ['|', '/', '-', '\\']

/** Deterministic scramble used by the text-decode effect. */
const SCRAMBLE_POOL = '01!<>-_\\/[]{}=+*^?#$&%'
export function scramble(len: number, seed: number): string {
  let s = seed >>> 0
  let out = ''
  for (let i = 0; i < len; i++) {
    s = (s * 1664525 + 1013904223) >>> 0
    out += SCRAMBLE_POOL[s % SCRAMBLE_POOL.length]
  }
  return out
}

/* ------------------------------------------------------------- token art --
   No logo PNGs. Every token is a two-letter monogram in a hairline box,
   with a corner tick whose position is derived from the symbol — enough
   variation to tell tokens apart at a glance, none of the download weight.
   ------------------------------------------------------------------------ */

export function symbolHash(symbol: string): number {
  let h = 2166136261
  for (let i = 0; i < symbol.length; i++) {
    h ^= symbol.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

/** Two-character monogram: `WBTC` → `WB`, `gwETH` → `GW`. */
export function monogram(symbol: string): string {
  const clean = symbol.replace(/[^A-Za-z0-9]/g, '')
  return (clean.slice(0, 2) || '??').toUpperCase()
}
