import { useEffect, useMemo, useRef, useState } from 'react'
import {
  SEEDS,
  backingSize,
  bloomLayerStyle,
  easeOutCubic,
  paintColumn,
  prefersReducedMotion,
  resample,
  rgb,
  type BloomInput,
  type Variant,
} from '../lib/dither'
import { price as fmtPrice } from '../lib/format'

/* =========================================================================
   DitherChart — the price surface.

   A low-resolution backing canvas painted column by column with an ordered
   Bayer dither, then scaled up `pixelated` so every cell stays a hard pixel.
   A second canvas holds a blurred additive copy for the ember bloom. The
   paint engine is dither-kit's (see lib/dither.ts); the chrome around it —
   hairline guides, scrub readout, the LO/HI footer — is TOPOKI's.
   ========================================================================= */

/**
 * The fill is deliberately held well below full strength. TOPOKI budgets at
 * most three ember elements per viewport, and a chart that goes solid at the
 * floor spends all three on its own: at ~0.6 the dither reads as texture over
 * the black ground instead of a slab of orange.
 */
const FILL_STRENGTH = 0.6
/** Thins the scatter a little so individual cells stay legible. */
const SPARSE = 0.05

export function DitherChart({
  series,
  height = 132,
  tone = 'ember',
  variant = 'gradient',
  bloom = { blur: 4, brightness: 1.15, opacity: 0.42, saturate: 1.25 },
  animate = true,
  interactive = true,
  label,
  format = fmtPrice,
  className,
}: {
  series: number[]
  /** plot height in CSS px */
  height?: number
  tone?: 'ember' | 'ash'
  variant?: Variant
  bloom?: BloomInput
  animate?: boolean
  interactive?: boolean
  label?: string
  format?: (n: number) => string
  className?: string
}) {
  const wrap = useRef<HTMLDivElement>(null)
  const crisp = useRef<HTMLCanvasElement>(null)
  const glow = useRef<HTMLCanvasElement>(null)
  const [box, setBox] = useState({ w: 0, h: height })
  const [hover, setHover] = useState<number | null>(null)
  const [reveal, setReveal] = useState(animate ? 0 : 1)

  const min = useMemo(() => Math.min(...series), [series])
  const max = useMemo(() => Math.max(...series), [series])

  /* --- measure ---------------------------------------------------------- */
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const measure = () => setBox({ w: el.clientWidth, h: height })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [height])

  /* --- entrance sweep --------------------------------------------------- */
  useEffect(() => {
    if (!animate || prefersReducedMotion()) return setReveal(1)
    let raf = 0
    let start = 0
    const tick = (t: number) => {
      if (!start) start = t
      const p = Math.min(1, (t - start) / 760)
      setReveal(easeOutCubic(p))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [animate, series])

  /* --- paint ------------------------------------------------------------ */
  useEffect(() => {
    if (box.w === 0 || series.length === 0) return
    const { cols, rows } = backingSize(box.w, box.h)
    const seed = SEEDS[tone]
    const span = max - min || 1

    // one backing canvas, blitted to the crisp layer and the bloom layer
    const back = document.createElement('canvas')
    back.width = cols
    back.height = rows
    const octx = back.getContext('2d')
    if (!octx) return

    const fractions = resample(
      series.map((v) => (v - min) / span),
      cols,
    )
    const upTo = Math.round(cols * reveal)

    for (let x = 0; x < upTo; x++) {
      // 6% headroom so the outline never clips against the top edge
      const top = (1 - fractions[x] * 0.94) * (rows - 1)
      paintColumn(octx, x, top, rows, seed, {
        variant,
        intensity: hover === null ? 0 : 1,
        dim: FILL_STRENGTH,
        sparse: SPARSE,
      })
    }

    // scrub crosshair, drawn into the same backing buffer so it dithers too
    if (hover !== null) {
      octx.fillStyle = rgb(seed.fill, 1, 0.85)
      octx.fillRect(Math.min(cols - 1, hover), 0, 1, rows)
    }

    for (const ref of [crisp, glow]) {
      const c = ref.current
      if (!c) continue
      c.width = cols
      c.height = rows
      const ctx = c.getContext('2d')
      if (!ctx) continue
      ctx.clearRect(0, 0, cols, rows)
      ctx.drawImage(back, 0, 0)
    }
  }, [box, series, min, max, tone, variant, reveal, hover])

  const bloomStyle = bloomLayerStyle(bloom, true)

  const cols = box.w ? backingSize(box.w, box.h).cols : 1
  const hoverValue =
    hover === null
      ? null
      : series[
          Math.min(
            series.length - 1,
            Math.round((hover / Math.max(1, cols - 1)) * (series.length - 1)),
          )
        ]

  return (
    <div className={className}>
      <div
        ref={wrap}
        className="relative w-full overflow-hidden"
        style={{ height }}
        onPointerMove={(e) => {
          if (!interactive || !wrap.current) return
          const r = wrap.current.getBoundingClientRect()
          setHover(Math.round(((e.clientX - r.left) / r.width) * (cols - 1)))
        }}
        onPointerLeave={() => setHover(null)}
      >
        {/* hairline guides sit behind the fill */}
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="h-px w-full bg-line/70" />
          ))}
        </div>

        <canvas
          ref={crisp}
          aria-hidden
          className="absolute inset-0 h-full w-full"
          style={{ imageRendering: 'pixelated' }}
        />
        {bloomStyle && (
          <canvas
            ref={glow}
            aria-hidden
            className="pointer-events-none absolute inset-0 h-full w-full"
            style={bloomStyle}
          />
        )}
      </div>

      <div className="mt-1.5 flex items-center justify-between">
        <span className="label">{label ?? '7D'}</span>
        <span className="tnum text-2xs text-smoke">
          {hoverValue !== null ? (
            <span className="text-ember">{format(hoverValue)}</span>
          ) : (
            <>
              <span className="text-dust">LO</span> {format(min)}{' '}
              <span className="text-dust">HI</span> {format(max)}
            </>
          )}
        </span>
      </div>
    </div>
  )
}
