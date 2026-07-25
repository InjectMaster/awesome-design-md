import { useEffect, useMemo, useRef, useState } from 'react'
import { brailleChart, sparkline } from '../lib/ascii'
import { cx } from '../lib/cx'
import { price as fmtPrice } from '../lib/format'
import { DitherBar } from './DitherBar'

/* -------------------------------------------------------------- sparkline --
   A single line of block characters. Cheap enough for every table row.
   -------------------------------------------------------------------------*/

export function Spark({
  series,
  width = 18,
  className,
  variant = 'braille',
}: {
  series: number[]
  width?: number
  className?: string
  /** `braille` reads as a hairline plot, `blocks` as a bar histogram */
  variant?: 'braille' | 'blocks'
}) {
  const s = useMemo(
    () =>
      variant === 'braille'
        ? brailleChart(series, width, 1).join('')
        : sparkline(series, width),
    [series, width, variant],
  )
  const up = series[series.length - 1] >= series[0]
  return (
    <span
      aria-hidden
      className={cx(
        'ascii-grid text-[13px] leading-none',
        up ? 'text-ember/90' : 'text-smoke',
        className,
      )}
    >
      {s}
    </span>
  )
}

/* ------------------------------------------------------------ braille plot --
   The hero chart. Braille cells give 2×4 dots per character, so this is a
   real plot that happens to be made of text — selectable, zoomable, and
   perfectly aligned to the monospace grid.
   -------------------------------------------------------------------------*/

export function AsciiChart({
  series,
  cols = 96,
  rows = 12,
  label,
  className,
  interactive = true,
}: {
  series: number[]
  cols?: number
  rows?: number
  label?: string
  className?: string
  interactive?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState(cols)
  const [hover, setHover] = useState<number | null>(null)

  // resample the character grid to the container so the plot always fills it
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const chW = parseFloat(getComputedStyle(el).fontSize) * 0.6
      setFit(Math.max(24, Math.min(cols, Math.floor(el.clientWidth / chW))))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [cols])

  const lines = useMemo(() => brailleChart(series, fit, rows), [series, fit, rows])
  const min = useMemo(() => Math.min(...series), [series])
  const max = useMemo(() => Math.max(...series), [series])

  const hoverValue =
    hover === null ? null : series[Math.min(series.length - 1, Math.round((hover / Math.max(1, fit - 1)) * (series.length - 1)))]

  return (
    <div className={cx('relative', className)}>
      <div
        ref={ref}
        className="ascii relative overflow-hidden text-ember/90 text-[10px] leading-[1.15] sm:text-[11px]"
        onMouseMove={(e) => {
          if (!interactive || !ref.current) return
          const r = ref.current.getBoundingClientRect()
          setHover(Math.round(((e.clientX - r.left) / r.width) * (fit - 1)))
        }}
        onMouseLeave={() => setHover(null)}
      >
        {/* horizontal guides sit behind the plot */}
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="h-px w-full bg-line/70" />
          ))}
        </div>
        {lines.map((l, i) => (
          <div key={i} className="relative whitespace-pre">
            {l}
          </div>
        ))}
        {hover !== null && interactive && (
          <div
            className="pointer-events-none absolute top-0 bottom-0 w-px bg-ember/60"
            style={{ left: `${(hover / Math.max(1, fit - 1)) * 100}%` }}
          />
        )}
      </div>

      <div className="mt-1.5 flex items-center justify-between">
        <span className="label">{label ?? '7D'}</span>
        <span className="tnum text-2xs text-smoke">
          {hoverValue !== null ? (
            <span className="text-ember">{fmtPrice(hoverValue)}</span>
          ) : (
            <>
              <span className="text-dust">LO</span> {fmtPrice(min)}{' '}
              <span className="text-dust">HI</span> {fmtPrice(max)}
            </>
          )}
        </span>
      </div>
    </div>
  )
}

/* --------------------------------------------------------------- bar rows --
   Allocation bars made of block characters.
   -------------------------------------------------------------------------*/

export function BarRow({
  label,
  ratio,
  value,
}: {
  label: string
  ratio: number
  value: string
}) {
  return (
    <div className="flex items-center gap-3 py-1 text-xs">
      <span className="w-16 shrink-0 truncate text-ash">{label}</span>
      <DitherBar ratio={ratio} className="max-w-[168px] flex-1" />
      <span className="tnum shrink-0 text-smoke">{value}</span>
    </div>
  )
}
