/* =========================================================================
   dither.ts — ordered-dither painting primitives.

   Vendored from dither-kit by ripgrim (MIT) — https://tripwire.sh/dither-kit
   which in turn credits Evil Charts by legions-developer for the aesthetic.
   dither-kit ships as a shadcn registry of ~24 composable chart components
   with their own token system; TOPOKI only needs the paint engine, so the
   Bayer loop, the bloom layer and the easings are kept here verbatim in
   behaviour and the chart around them is TOPOKI's own.

   The one rule the engine is built on: vary opacity, never shade. Every
   pixel is the series' single colour at a different alpha, so a fill reads
   correctly whatever sits behind it.
   ========================================================================= */

export type Rgb = [number, number, number]
export type Seed = { fill: Rgb }

/** TOPOKI runs a two-seed palette: the ember, and silence. */
export const SEEDS: Record<'ember' | 'ash', Seed> = {
  ember: { fill: [255, 59, 13] },
  ash: { fill: [107, 107, 102] },
}

export const rgb = ([r, g, b]: Rgb, k = 1, a = 1) =>
  `rgba(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)},${a})`

/** 4×4 ordered (Bayer) matrix, normalised to 0–1 thresholds. */
export const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((row) => row.map((v) => (v + 0.5) / 16))

/** CSS px per dither cell — chunky enough to read as pixels. */
export const CELL = 2
export const MAX_COLS = 520
export const MAX_ROWS = 200
/** Top outline opacity: just under solid, so it reads as a soft edge. */
export const BORDER_ALPHA = 0.72
/** Alpha of an "off" cell relative to an "on" one. */
export const OFF_TIER = 0.4

export type Variant = 'gradient' | 'solid' | 'dotted' | 'hatched'

export type PaintOpts = {
  variant: Variant
  /** 0–1 hover lift */
  intensity: number
  /** selection dim multiplier */
  dim: number
  /** raise the threshold to thin the scatter out */
  sparse?: number
}

export const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t)

/**
 * Fill one backing-canvas column from `top` down to `floor` with the ordered
 * dither — solid at the floor, dissolving upward so the fill fades out toward
 * the value line — then cap it with a soft border outline.
 */
export function paintColumn(
  octx: CanvasRenderingContext2D,
  x: number,
  top: number,
  floor: number,
  seed: Seed,
  { variant, intensity, dim, sparse = 0 }: PaintOpts,
) {
  const t = Math.round(top)
  const f = Math.round(floor)
  const depth = f - t

  if (depth <= 0) {
    octx.fillStyle = rgb(seed.fill, 1, BORDER_ALPHA * dim)
    octx.fillRect(x, t, 1, 1)
    return
  }

  const bias = (variant === 'dotted' ? 0.12 : 0) - sparse

  for (let y = t; y < f; y++) {
    // inverted falloff: 0 at the top line, 1 at the floor
    const density = (y - t) / depth
    if (variant === 'hatched' && ((x + y) & 3) >= 2) continue
    const lit =
      variant === 'solid' ||
      density > BAYER[y & 3][x & 3] - 0.1 * intensity - bias
    if (variant === 'dotted' && !lit) continue
    const k = (0.3 + density * 0.7) * (1 + 0.22 * intensity)
    octx.fillStyle = rgb(seed.fill, 1, clamp01((lit ? k : k * OFF_TIER) * dim))
    octx.fillRect(x, y, 1, 1)
  }

  // the shape's edge, now that the fill fades out here
  octx.fillStyle = rgb(seed.fill, 1, BORDER_ALPHA * dim)
  octx.fillRect(x, t, 1, 1)
  if (depth > 1) {
    octx.fillStyle = rgb(seed.fill, 1, BORDER_ALPHA * 0.5 * dim)
    octx.fillRect(x, t + 1, 1, 1)
  }
}

/** Linear-resample a per-index fraction array to `cols` columns. */
export function resample(src: number[], cols: number): number[] {
  const out = new Array<number>(cols)
  const last = Math.max(src.length - 1, 1)
  for (let c = 0; c < cols; c++) {
    const t = (c / Math.max(cols - 1, 1)) * last
    const i = Math.floor(t)
    const f = t - i
    const a = src[i] ?? 0
    const b = src[Math.min(i + 1, src.length - 1)] ?? a
    out[c] = a + (b - a) * f
  }
  return out
}

/** Backing-canvas resolution for a plot rect — low-res, scaled up pixelated. */
export function backingSize(width: number, height: number) {
  return {
    cols: Math.min(MAX_COLS, Math.max(8, Math.round(width / CELL))),
    rows: Math.min(MAX_ROWS, Math.max(8, Math.round(height / CELL))),
  }
}

/* ----------------------------------------------------------------- bloom --
   A blurred copy of the rendered canvas, composited additively so the glow
   carries the fill's own colour instead of washing toward white.
   ------------------------------------------------------------------------ */

export type BloomLevel = 'off' | 'low' | 'high' | 'aura'
export type BloomConfig = {
  blur: number
  brightness: number
  opacity: number
  saturate?: number
  blend?: 'plus-lighter' | 'screen' | 'lighten'
}
export type BloomInput = BloomLevel | BloomConfig

const PRESET: Record<Exclude<BloomLevel, 'off'>, BloomConfig> = {
  low: { blur: 3, brightness: 1.35, opacity: 0.7, saturate: 1.4 },
  high: { blur: 5, brightness: 1.5, opacity: 0.78, saturate: 1.5 },
  aura: { blur: 15, brightness: 2.9, opacity: 0.1, saturate: 3 },
}

export function bloomLayerStyle(input: BloomInput, active: boolean) {
  if (!active || input === 'off') return null
  const cfg = typeof input === 'string' ? PRESET[input] : input
  return {
    filter: `blur(${cfg.blur}px) brightness(${cfg.brightness}) saturate(${cfg.saturate ?? 1})`,
    opacity: cfg.opacity,
    mixBlendMode: cfg.blend ?? ('plus-lighter' as const),
    imageRendering: 'auto' as const,
  }
}

/* ---------------------------------------------------------------- easing -- */

export const easeOutCubic = (t: number) => 1 - (1 - t) ** 3

export function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
}
