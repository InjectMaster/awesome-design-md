/* =========================================================================
   ascii.ts — TOPOKI's drawing engine.
   Everything visual that is not a rectangle is made of characters.
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
   Braille cells pack 2×4 dots per character, so an 80×12 text block is a
   160×48 pixel plot. This is how TOPOKI draws price history.
   ------------------------------------------------------------------------ */

const BRAILLE_BASE = 0x2800
const DOT_BITS = [
  [0x01, 0x02, 0x04, 0x40], // left column, rows 0..3
  [0x08, 0x10, 0x20, 0x80], // right column, rows 0..3
]

/**
 * Plot a series into a block of braille characters.
 * @param values  the series, any length — it is resampled to fit
 * @param cols    width in characters
 * @param rows    height in characters
 */
export function brailleChart(values: number[], cols: number, rows: number): string[] {
  if (values.length === 0 || cols < 1 || rows < 1) return Array(rows).fill('')

  const w = cols * 2
  const h = rows * 4
  const cells = Array.from({ length: rows }, () => new Array(cols).fill(0))

  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1

  const yAt = (i: number) => {
    const t = (values.length - 1) * (i / Math.max(1, w - 1))
    const lo = Math.floor(t)
    const hi = Math.min(values.length - 1, lo + 1)
    const v = values[lo] + (values[hi] - values[lo]) * (t - lo)
    return Math.min(h - 1, Math.max(0, Math.round((1 - (v - min) / span) * (h - 1))))
  }

  let prev = yAt(0)
  for (let x = 0; x < w; x++) {
    const y = yAt(x)
    // connect the dots vertically so the line never breaks
    const from = Math.min(prev, y)
    const to = Math.max(prev, y)
    for (let yy = from; yy <= to; yy++) {
      cells[Math.floor(yy / 4)][Math.floor(x / 2)] |= DOT_BITS[x % 2][yy % 4]
    }
    prev = y
  }

  return cells.map((row) =>
    row.map((bits) => String.fromCharCode(BRAILLE_BASE + bits)).join(''),
  )
}

const BLOCKS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█']

/** One-line sparkline in block characters. Used in dense tables. */
export function sparkline(values: number[], width = 16): string {
  if (values.length === 0) return ''
  const step = values.length / width
  const bucket = Array.from({ length: width }, (_, i) => {
    const slice = values.slice(Math.floor(i * step), Math.max(Math.floor((i + 1) * step), Math.floor(i * step) + 1))
    return slice.reduce((a, b) => a + b, 0) / slice.length
  })
  const min = Math.min(...bucket)
  const max = Math.max(...bucket)
  const span = max - min || 1
  return bucket
    .map((v) => BLOCKS[Math.min(7, Math.floor(((v - min) / span) * 7.999))])
    .join('')
}

/** Horizontal meter: ███████░░░░░ */
export function meter(ratio: number, width = 12, on = '█', off = '░'): string {
  const filled = Math.max(0, Math.min(width, Math.round(ratio * width)))
  return on.repeat(filled) + off.repeat(width - filled)
}

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
