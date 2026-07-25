import { useEffect, useRef, useState } from 'react'
import { cx } from '../lib/cx'
import { GLYPHS_5 } from '../lib/ascii'
import { SEEDS, rgb } from '../lib/dither'
import { backingSize, paintColumn, resample } from './dither-kit/dither-paint'
import { PALETTE } from './dither-kit/palette'

/* =========================================================================
   PixelArt — character art that does not depend on the font.

   Geist Pixel is proportional and has no block or braille glyphs, so nothing
   here may rely on a monospaced grid:

   - AsciiArt gives each character its own fixed-width cell, so letter art
     (the mascot) lines up in any face.
   - The wordmark and the roofline are painted on canvas from the same bitmaps
     they used to be typed from, one rect per pixel.
   ========================================================================= */

/** Letter art on an emulated grid: one fixed cell per character. */
export function AsciiArt({
  lines,
  className,
  advance = 0.62,
}: {
  lines: string[]
  className?: string
  /** cell width as a fraction of the font size */
  advance?: number
}) {
  return (
    <div aria-hidden className={cx('select-none leading-[1.08]', className)}>
      {lines.map((line, y) => (
        <div key={y} className="flex whitespace-pre">
          {line.split('').map((ch, x) => (
            <span
              key={x}
              className="inline-block shrink-0 text-center"
              style={{ width: `${advance}em` }}
            >
              {ch === ' ' ? ' ' : ch}
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}

/* --------------------------------------------------------------- wordmark -- */

/**
 * The block wordmark, painted. Each `█` in the 5-row bitmap becomes one square,
 * so it is a real pixel logo rather than a line of block characters that a
 * proportional face would tear apart.
 */
export function PixelWordmark({
  text = 'TOPOKI',
  scale = 3,
  gap = 1,
  tone = 'bone',
  className,
}: {
  text?: string
  /** device pixels per bitmap pixel */
  scale?: number
  gap?: number
  tone?: 'bone' | 'ember'
  className?: string
}) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const c = ref.current
    if (!c) return
    const rows = bitmapOf(text, gap)
    const w = Math.max(...rows.map((r) => r.length))
    const h = rows.length
    c.width = w * scale
    c.height = h * scale
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, c.width, c.height)
    ctx.fillStyle = tone === 'ember' ? rgb(SEEDS.ember.fill) : '#f5f5f0'
    rows.forEach((row, y) =>
      row.split('').forEach((ch, x) => {
        if (ch === '█') ctx.fillRect(x * scale, y * scale, scale, scale)
      }),
    )
  }, [text, scale, gap, tone])

  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={text}
      className={cx('block h-auto', className)}
      style={{ imageRendering: 'pixelated' }}
    />
  )
}

function bitmapOf(word: string, gap: number): string[] {
  const letters = word
    .toUpperCase()
    .split('')
    .map((ch) => GLYPHS_5[ch] ?? GLYPHS_5[' '])
  const spacer = ' '.repeat(gap)
  return Array.from({ length: 5 }, (_, row) =>
    letters.map((g) => g[row]).join(spacer),
  )
}

/* --------------------------------------------------------------- roofline -- */

/**
 * 기와 — the hanok roofline, painted. Four bands: an eave shadow, the ridge,
 * the interlocking tiles, and the rafters below them.
 */
export function PixelRoofline({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [w, setW] = useState(0)

  useEffect(() => {
    const measure = () => setW(window.innerWidth)
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  useEffect(() => {
    const c = ref.current
    if (!c || w === 0) return
    const px = 3 // device pixels per roof pixel
    const tile = 8 // tile pitch, in roof pixels
    const cols = Math.ceil(w / px)
    const rows = 14
    c.width = cols
    c.height = rows
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, cols, rows)

    const line = '#3c3c39'
    const faint = '#2a2a28'

    // ridge
    ctx.fillStyle = line
    ctx.fillRect(0, 3, cols, 2)
    ctx.fillStyle = faint
    ctx.fillRect(0, 2, cols, 1)

    // interlocking tiles: an arc per pitch, drawn as a stepped pixel curve
    for (let x = 0; x < cols; x++) {
      const phase = (x % tile) / tile
      const lift = Math.round(Math.sin(phase * Math.PI) * 3)
      ctx.fillStyle = lift > 1 ? line : faint
      ctx.fillRect(x, 8 - lift, 1, 1 + lift)
    }

    // rafters
    ctx.fillStyle = faint
    for (let x = 0; x < cols; x += tile) ctx.fillRect(x, 10, 1, 4)

    setSize(c, cols * px, rows * px)
  }, [w])

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={cx('block w-full', className)}
      style={{ imageRendering: 'pixelated' }}
    />
  )
}

function setSize(c: HTMLCanvasElement, w: number, h: number) {
  c.style.width = `${w}px`
  c.style.height = `${h}px`
}

/* -------------------------------------------------------------- sparkline --
   A table-row sparkline on the dither engine — replaces the braille one, which
   needed glyphs the page face does not have.
   ------------------------------------------------------------------------ */

export function PixelSpark({
  series,
  width = 92,
  height = 22,
  className,
}: {
  series: number[]
  width?: number
  height?: number
  className?: string
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const up = series.length > 1 && series[series.length - 1] >= series[0]

  useEffect(() => {
    const c = ref.current
    if (!c || series.length === 0) return
    const { cols, rows } = backingSize(width, height)
    c.width = cols
    c.height = rows
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, cols, rows)

    const min = Math.min(...series)
    const max = Math.max(...series)
    const span = max - min || 1
    const seed = up ? PALETTE.ember : PALETTE.grey

    // same ordered-dither column fill as the big charts, just two cells tall
    const fractions = resample(
      series.map((v) => (v - min) / span),
      cols,
    )
    for (let x = 0; x < cols; x++) {
      paintColumn(ctx, x, (1 - fractions[x] * 0.9) * (rows - 1), rows, seed, {
        variant: 'gradient',
        intensity: 0,
        dim: 0.9,
        stacked: false,
      })
    }
  }, [series, width, height, up])

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={cx('inline-block align-middle', className)}
      style={{ width, height, imageRendering: 'pixelated' }}
    />
  )
}

/* ----------------------------------------------------------------- glyphs --
   Small marks the page face does not carry, drawn in CSS instead.
   ------------------------------------------------------------------------ */

/** Up/down triangle, in borders rather than ▲ / ▼. */
export function Caret({
  dir,
  className,
}: {
  dir: 'up' | 'down' | 'flat'
  className?: string
}) {
  if (dir === 'flat') {
    return <span className={cx('inline-block size-1 bg-current', className)} />
  }
  return (
    <span
      aria-hidden
      className={cx('inline-block size-0 border-x-[3px] border-x-transparent', className)}
      style={
        dir === 'up'
          ? { borderBottom: '4px solid currentColor' }
          : { borderTop: '4px solid currentColor' }
      }
    />
  )
}

/** A vertical hairline, in place of `│`. */
export function VRule({ className }: { className?: string }) {
  return <span className={cx('inline-block h-3 w-px bg-line-2 align-middle', className)} />
}
