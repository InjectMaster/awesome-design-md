import { useEffect, useMemo, useRef, useState } from 'react'
import {
  pieSlices,
  polarX,
  polarY,
  sliceAtAngle,
  type PieSlice,
} from './dither-kit/polar'
import { BAYER, OFF_TIER, backingSize, bloomLayerStyle, clamp01 } from './dither-kit/dither-paint'
import { PALETTE, SERIES_COLORS, rgb } from './dither-kit/palette'
import { cx } from '../lib/cx'

/* =========================================================================
   DitherPie — the allocation donut.

   Slice geometry is dither-kit's `polar.ts` (pieSlices / sliceAtAngle) and the
   texture is its Bayer matrix, so a slice reads with exactly the pixel density
   of the area charts. Density falls off toward the inner radius, and each slice
   takes one hue from the kit's series palette — ember first, so the accent still
   leads. This ring is the single place in TOPOKI that carries more than one
   colour: a holdings breakdown has to name which slice is which, and density
   alone cannot do that past two or three assets.
   ========================================================================= */

export interface PieDatum {
  name: string
  value: number
}

export function DitherPie({
  data,
  size = 200,
  thickness = 0.42,
  bloom = { blur: 4, brightness: 1.2, opacity: 0.4, saturate: 1.3 },
  format = (n: number) => n.toLocaleString(),
  className,
  onHover,
}: {
  data: PieDatum[]
  size?: number
  /** ring thickness as a fraction of the radius — 1 is a full pie */
  thickness?: number
  bloom?: Parameters<typeof bloomLayerStyle>[0]
  format?: (n: number) => string
  className?: string
  onHover?: (index: number | null) => void
}) {
  const crisp = useRef<HTMLCanvasElement>(null)
  const glow = useRef<HTMLCanvasElement>(null)
  const [hover, setHover] = useState<number | null>(null)

  const slices = useMemo(
    () => pieSlices(data as unknown as Record<string, unknown>[], 'value', 'name'),
    [data],
  )
  const total = useMemo(() => data.reduce((a, d) => a + d.value, 0), [data])

  useEffect(() => {
    if (slices.length === 0) return
    const { cols, rows } = backingSize(size, size)
    const back = document.createElement('canvas')
    back.width = cols
    back.height = rows
    const ctx = back.getContext('2d')
    if (!ctx) return

    const cx0 = cols / 2
    const cy0 = rows / 2
    const rOuter = Math.min(cols, rows) / 2 - 1
    const rInner = rOuter * (1 - thickness)

    // One hue per asset, from the kit's series palette.

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const dx = x - cx0
        const dy = y - cy0
        const r = Math.hypot(dx, dy)
        if (r > rOuter || r < rInner) continue
        const idx = sliceAtAngle(slices, Math.atan2(dy, dx))
        if (idx < 0) continue

        // dense at the outer edge, thinning inward — the radial falloff
        const radial = (r - rInner) / Math.max(1, rOuter - rInner)
        const lift = hover === idx ? 0.22 : 0
        const density = 0.55 + 0.45 * radial + lift
        const lit = density > BAYER[y & 3][x & 3]
        const seed = PALETTE[SERIES_COLORS[idx % SERIES_COLORS.length]]
        const k = (0.35 + density * 0.65) * (hover === idx ? 1.2 : 1)
        ctx.fillStyle = rgb(seed.fill, 1, clamp01(lit ? k : k * OFF_TIER))
        ctx.fillRect(x, y, 1, 1)
      }
    }

    // hairline gaps on every slice boundary, so the ring reads as segments
    ctx.fillStyle = '#050505'
    for (const s of slices) {
      for (let r = rInner; r <= rOuter; r += 0.5) {
        ctx.fillRect(
          Math.round(polarX(cx0, r, s.start)),
          Math.round(polarY(cy0, r, s.start)),
          1,
          1,
        )
      }
    }

    for (const ref of [crisp, glow]) {
      const c = ref.current
      if (!c) continue
      c.width = cols
      c.height = rows
      const cctx = c.getContext('2d')
      if (!cctx) continue
      cctx.clearRect(0, 0, cols, rows)
      cctx.drawImage(back, 0, 0)
    }
  }, [slices, size, thickness, hover])

  const bloomStyle = bloomLayerStyle(bloom, true)
  const active = hover === null ? null : slices[hover]

  return (
    <div className={cx('flex items-center gap-5', className)}>
      <div
        className="relative shrink-0"
        style={{ width: size, height: size }}
        onPointerMove={(e) => {
          const el = e.currentTarget.getBoundingClientRect()
          const dx = e.clientX - el.left - size / 2
          const dy = e.clientY - el.top - size / 2
          const r = Math.hypot(dx, dy)
          const rOuter = size / 2
          const next =
            r > rOuter || r < rOuter * (1 - thickness)
              ? null
              : sliceAtAngle(slices, Math.atan2(dy, dx))
          const idx = next === null || next < 0 ? null : next
          setHover(idx)
          onHover?.(idx)
        }}
        onPointerLeave={() => {
          setHover(null)
          onHover?.(null)
        }}
      >
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
        {/* the hole carries the readout */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {active ? (
            <>
              <span className="text-xs text-bone">{active.name}</span>
              <span className="tnum text-2xs text-ember">
                {((active.value / (total || 1)) * 100).toFixed(1)}%
              </span>
              <span className="tnum text-2xs text-smoke">{format(active.value)}</span>
            </>
          ) : (
            <>
              <span className="label">Total</span>
              <span className="figure text-sm text-bone">{format(total)}</span>
            </>
          )}
        </div>
      </div>

      <PieLegend
        slices={slices}
        total={total}
        hover={hover}
        onHover={(i) => {
          setHover(i)
          onHover?.(i)
        }}
        format={format}
      />
    </div>
  )
}

function PieLegend({
  slices,
  total,
  hover,
  onHover,
  format,
}: {
  slices: PieSlice[]
  total: number
  hover: number | null
  onHover: (i: number | null) => void
  format: (n: number) => string
}) {
  return (
    <ul className="min-w-0 flex-1 space-y-1">
      {slices.map((s, i) => {
        const dimmed = hover !== null && hover !== i
        return (
          <li key={s.name}>
            <button
              onPointerEnter={() => onHover(i)}
              onPointerLeave={() => onHover(null)}
              className={cx(
                'flex w-full items-center gap-2 text-left text-2xs transition-opacity',
                dimmed && 'opacity-35',
              )}
            >
              <span
                aria-hidden
                className="size-2 shrink-0"
                style={{
                  backgroundColor: rgb(
                    PALETTE[SERIES_COLORS[i % SERIES_COLORS.length]].fill,
                  ),
                }}
              />
              <span className="min-w-0 truncate text-ash">{s.name}</span>
              <span className="tnum ml-auto shrink-0 text-smoke">
                {((s.value / (total || 1)) * 100).toFixed(1)}%
              </span>
              <span className="tnum w-16 shrink-0 text-right text-bone">
                {format(s.value)}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
