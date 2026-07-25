import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react'
import { SPINNER, monogram, scramble, symbolHash } from '../lib/ascii'
import { cx } from '../lib/cx'
import { Caret as PixelCaret } from './PixelArt'
import { DitherButton } from './dither-kit/button'

/* ------------------------------------------------------------------ panel --
   Every surface in TOPOKI is a hairline box with corner ticks and an
   optional bracketed title welded into the top border.
   -------------------------------------------------------------------------*/

export function Panel({
  title,
  subtitle,
  actions,
  children,
  className,
  bodyClassName,
  tone = 'default',
}: {
  title?: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  children?: ReactNode
  className?: string
  bodyClassName?: string
  tone?: 'default' | 'raised' | 'flush'
}) {
  return (
    <section
      className={cx(
        // min-w-0 so a wide table inside can scroll instead of stretching
        // the grid track it sits in
        'corner-frame group/panel relative min-w-0 border border-line',
        'hover:before:border-ember/45 hover:after:border-ember/45',
        tone === 'raised' && 'bg-ink',
        tone === 'default' && 'bg-ink/60',
        tone === 'flush' && 'bg-transparent',
        className,
      )}
    >
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-3 py-2 sm:px-4">
          <div className="flex min-w-0 items-baseline gap-2">
            {title && (
              <h2 className="label truncate text-ash">
                <span className="text-dust">[</span>
                {title}
                <span className="text-dust">]</span>
              </h2>
            )}
            {subtitle && <span className="label truncate normal-case">{subtitle}</span>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
        </header>
      )}
      <div className={cx('relative', bodyClassName ?? 'p-3 sm:p-4')}>{children}</div>
    </section>
  )
}

/* ----------------------------------------------------------------- button -- */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'outline' | 'quiet'
  size?: 'sm' | 'md' | 'lg'
  block?: boolean
}

export function Button({
  variant = 'outline',
  size = 'md',
  block,
  className,
  children,
  ...rest
}: ButtonProps) {
  const shape = cx(
    'relative inline-flex items-center justify-center gap-2 font-medium uppercase tracking-[0.14em] whitespace-nowrap',
    size === 'sm' && 'h-7 px-2.5 text-2xs',
    size === 'md' && 'h-9 px-3.5 text-xs',
    size === 'lg' && 'h-13 px-5 text-sm',
    block && 'w-full',
  )

  // The primary action is dither-kit's button, configured on the ember seed —
  // its fill is the same ordered dither as the charts, and it densifies on
  // hover and again on press.
  if (variant === 'primary') {
    return (
      <DitherButton
        {...rest}
        color="ember"
        variant="gradient"
        bloom="low"
        className={cx(shape, 'text-void', className)}
      >
        {children}
      </DitherButton>
    )
  }

  return (
    <button
      {...rest}
      className={cx(
        'relative inline-flex items-center justify-center gap-2 border font-medium uppercase tracking-[0.14em] whitespace-nowrap',
        'transition-[color,background-color,border-color,box-shadow] duration-200 ease-[var(--ease-out-quint)]',
        'disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-line',
        size === 'sm' && 'h-7 px-2.5 text-2xs',
        size === 'md' && 'h-9 px-3.5 text-xs',
        size === 'lg' && 'h-13 px-5 text-sm',
        variant === 'outline' &&
          'border-line-2 bg-transparent text-bone hover:border-ember hover:text-ember',
        variant === 'ghost' &&
          'border-transparent bg-transparent text-ash hover:text-bone hover:border-line-2',
        variant === 'quiet' &&
          'border-line bg-ink-2 text-ash hover:text-bone hover:border-line-3',
        block && 'w-full',
        className,
      )}
    >
      {children}
    </button>
  )
}

/* ------------------------------------------------------------------ badge -- */

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode
  tone?: 'neutral' | 'ember' | 'mute' | 'alert'
  className?: string
}) {
  return (
    <span
      className={cx(
        'inline-flex h-5 items-center border px-1.5 text-2xs tracking-[0.14em] uppercase',
        tone === 'neutral' && 'border-line-2 text-ash',
        tone === 'mute' && 'border-line text-dust',
        tone === 'ember' && 'border-ember/50 bg-ember/10 text-ember',
        tone === 'alert' && 'border-alert/50 bg-alert/10 text-alert',
        className,
      )}
    >
      {children}
    </span>
  )
}

/* --------------------------------------------------------------- delta ---- */

export function Delta({
  value,
  className,
  showGlyph = true,
}: {
  value: number
  className?: string
  showGlyph?: boolean
}) {
  const up = value > 0
  const flat = Math.abs(value) < 0.005
  return (
    <span
      className={cx(
        'tnum inline-flex items-center gap-1 tabular-nums',
        flat ? 'text-smoke' : up ? 'text-bone' : 'text-smoke',
        className,
      )}
    >
      {showGlyph && (
        <PixelCaret
          dir={flat ? 'flat' : up ? 'up' : 'down'}
          className={cx(up && !flat && 'text-ember')}
        />
      )}
      {(up && !flat ? '+' : flat ? '' : '−') + Math.abs(value).toFixed(2) + '%'}
    </span>
  )
}

/* ------------------------------------------------------------------ stat -- */

export function Stat({
  label,
  value,
  sub,
  className,
}: {
  label: ReactNode
  value: ReactNode
  sub?: ReactNode
  className?: string
}) {
  return (
    <div className={cx('flex flex-col gap-1', className)}>
      <span className="label">{label}</span>
      <span className="tnum text-lg leading-none text-bone">{value}</span>
      {sub && <span className="text-2xs text-smoke">{sub}</span>}
    </div>
  )
}

/* --------------------------------------------------------------- spinner -- */

export function Spinner({ className }: { className?: string }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setI((n) => n + 1), 80)
    return () => clearInterval(id)
  }, [])
  return <span className={className}>{SPINNER[i % SPINNER.length]}</span>
}

export function Caret() {
  return <span className="animate-blink inline-block h-[1em] w-[0.5em] bg-ember align-text-bottom" />
}

/* ------------------------------------------------------------- scramble --
   Text decodes from noise on mount. Used for headings and figures that
   should feel like they arrived over a wire.
   -------------------------------------------------------------------------*/

export function Scramble({
  text,
  className,
  duration = 620,
  delay = 0,
}: {
  text: string
  className?: string
  duration?: number
  delay?: number
}) {
  const [out, setOut] = useState(() => scramble(text.length, text.length))
  const raf = useRef(0)

  useEffect(() => {
    let start = 0
    let stopped = false
    const tick = (t: number) => {
      if (!start) start = t
      const p = Math.max(0, (t - start - delay) / duration)
      if (p >= 1) return setOut(text)
      const solid = Math.floor(p * text.length)
      setOut(
        text.slice(0, solid) +
          scramble(text.length - solid, Math.floor(t / 40) + solid).slice(
            0,
            text.length - solid,
          ),
      )
      if (!stopped) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => {
      stopped = true
      cancelAnimationFrame(raf.current)
    }
  }, [text, duration, delay])

  return (
    <span className={className} aria-label={text}>
      {out}
    </span>
  )
}

/* ------------------------------------------------------------------ tabs -- */

const TabsCtx = createContext<{ value: string; set: (v: string) => void } | null>(null)

export function Tabs({
  value,
  onChange,
  children,
  className,
}: {
  value: string
  onChange: (v: string) => void
  children: ReactNode
  className?: string
}) {
  const ctx = useMemo(() => ({ value, set: onChange }), [value, onChange])
  return (
    <TabsCtx.Provider value={ctx}>
      <div className={cx('flex items-center gap-0', className)} role="tablist">
        {children}
      </div>
    </TabsCtx.Provider>
  )
}

export function Tab({ value, children }: { value: string; children: ReactNode }) {
  const ctx = useContext(TabsCtx)
  if (!ctx) throw new Error('Tab must be used inside Tabs')
  const active = ctx.value === value
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={() => ctx.set(value)}
      className={cx(
        'relative h-8 border-b px-3 text-2xs tracking-[0.18em] uppercase transition-colors duration-200',
        active
          ? 'border-ember text-bone'
          : 'border-line text-smoke hover:border-line-3 hover:text-ash',
      )}
    >
      {children}
    </button>
  )
}

/* ------------------------------------------------------------ token mark -- */

export function TokenMark({
  symbol,
  size = 'md',
}: {
  symbol: string
  size?: 'sm' | 'md' | 'lg'
}) {
  // one corner tick, position derived from the symbol — quiet variation
  const corner = symbolHash(symbol) % 4
  return (
    <span
      aria-hidden
      className={cx(
        'relative inline-grid shrink-0 place-items-center border border-line bg-ink-2 text-ash',
        'transition-colors duration-200 group-hover:border-line-3 group-hover:text-bone',
        size === 'sm' && 'size-5 text-[8px] tracking-tight',
        size === 'md' && 'size-7 text-[10px] tracking-tight',
        size === 'lg' && 'size-10 text-sm tracking-tight',
      )}
    >
      {monogram(symbol)}
      <span
        className={cx(
          'absolute size-1 bg-line-3',
          corner === 0 && 'top-0 left-0',
          corner === 1 && 'top-0 right-0',
          corner === 2 && 'right-0 bottom-0',
          corner === 3 && 'bottom-0 left-0',
        )}
      />
    </span>
  )
}

/* ------------------------------------------------------------- key/value -- */

export function Row({
  k,
  v,
  hint,
  tone,
}: {
  k: ReactNode
  v: ReactNode
  hint?: string
  tone?: 'default' | 'warn'
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-xs">
      <span className="flex items-center gap-1.5 text-smoke" title={hint}>
        {k}
        {hint && <span className="text-dust">ⓘ</span>}
      </span>
      <span className={cx('tnum text-right', tone === 'warn' ? 'text-ember' : 'text-bone')}>
        {v}
      </span>
    </div>
  )
}

/* ------------------------------------------------------------------ rule -- */

export function Rule({ label, className }: { label?: string; className?: string }) {
  return (
    <div className={cx('flex items-center gap-2', className)}>
      <span className="h-px flex-1 bg-line" />
      {label && <span className="label">{label}</span>}
      <span className="h-px flex-1 bg-line" />
    </div>
  )
}
