import { useEffect, useRef, useState } from 'react'
import { BAYER, OFF_TIER, SEEDS, backingSize, rgb } from '../lib/dither'
import { cx } from '../lib/cx'

/**
 * A horizontal meter on the same Bayer engine as {@link DitherChart}: dense at
 * the base, dissolving toward the tip. Sharing the paint loop is the point —
 * a solid bar next to a dithered chart reads as two different systems.
 */
export function DitherBar({
  ratio,
  height = 12,
  tone = 'ember',
  className,
}: {
  /** 0–1 */
  ratio: number
  height?: number
  tone?: 'ember' | 'ash'
  className?: string
}) {
  const wrap = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [w, setW] = useState(0)

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const measure = () => setW(el.clientWidth)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const c = canvas.current
    if (!c || w === 0) return
    const { cols, rows } = backingSize(w, height)
    c.width = cols
    c.height = rows
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, cols, rows)

    const seed = SEEDS[tone]
    const filled = Math.max(1, Math.round(cols * Math.max(0, Math.min(1, ratio))))

    for (let x = 0; x < filled; x++) {
      // Density is constant down the column — a bar this short has no room for
      // the area chart's vertical falloff — and instead dissolves toward the
      // tip, so the bar ends in scatter rather than a hard edge.
      const density = 1 - (x / Math.max(1, filled - 1)) * 0.5
      for (let y = 0; y < rows; y++) {
        const lit = density > BAYER[y & 3][x & 3]
        ctx.fillStyle = rgb(seed.fill, 1, lit ? 0.95 : 0.95 * OFF_TIER)
        ctx.fillRect(x, y, 1, 1)
      }
    }
  }, [w, ratio, height, tone])

  return (
    <div ref={wrap} className={cx('relative w-full', className)} style={{ height }}>
      {/* the track: a hairline the bar dissolves into */}
      <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-line" />
      <canvas
        ref={canvas}
        aria-hidden
        className="absolute inset-0 h-full w-full"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  )
}
