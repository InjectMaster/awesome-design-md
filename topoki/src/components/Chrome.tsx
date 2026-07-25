import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { TOKENS } from '../lib/market'
import { clockUTC, price as fmtPrice } from '../lib/format'
import { DEFAULT_CHAIN } from '../lib/chain'
import { cx } from '../lib/cx'
import { Caret, PixelRoofline, VRule } from './PixelArt'

/* --------------------------------------------------------------- backdrop --
   Four stacked layers: engineering grid, dot matrix, scanlines and an ember
   bloom that follows nothing at all. Fixed, so pages scroll over it.
   -------------------------------------------------------------------------*/

export function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="bg-grid absolute inset-0 opacity-60" />
      <div className="bg-matrix absolute inset-0 opacity-[0.14]" />
      <div className="bg-scanlines absolute inset-0" />
      <div
        className="absolute -top-56 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-[50%] opacity-[0.09] blur-[100px]"
        style={{ background: 'radial-gradient(closest-side, #ff3b0d, transparent)' }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_0%,transparent_45%,#050505_100%)]" />
      {/* the roofline sits above the vignette, otherwise it is swallowed by it */}
      <PixelRoofline className="absolute inset-x-0 bottom-9 opacity-80" />
    </div>
  )
}

/* ----------------------------------------------------------------- ticker --
   Continuous price tape under the header. Two identical halves scroll as
   one, so the loop is seamless.
   -------------------------------------------------------------------------*/

export function Ticker() {
  const items = useMemo(
    () =>
      TOKENS.map((t) => ({
        symbol: t.symbol,
        price: fmtPrice(t.price),
        change: t.change24h,
      })),
    [],
  )

  const strip = (
    <div className="flex shrink-0 items-center">
      {items.map((t) => (
        <span key={t.symbol} className="flex items-center gap-2 px-4 text-2xs">
          <span className="tracking-[0.16em] text-ash">{t.symbol}</span>
          <span className="tnum text-bone">{t.price}</span>
          <span
            className={cx(
              'tnum flex items-center gap-1',
              t.change >= 0 ? 'text-ember' : 'text-smoke',
            )}
          >
            <Caret dir={t.change >= 0 ? 'up' : 'down'} />
            {Math.abs(t.change).toFixed(2)}%
          </span>
          <span className="pl-2 text-dust">/</span>
        </span>
      ))}
    </div>
  )

  return (
    <div className="relative z-20 border-b border-line bg-ink/50">
      <div className="mask-fade-x flex overflow-hidden">
        <div className="animate-ticker flex min-w-full shrink-0 py-1.5">
          {strip}
          {strip}
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------- statusbar --
   The instrument panel. Block height advances at GIWA's ~1s cadence.
   -------------------------------------------------------------------------*/

const GENESIS_BLOCK = 12_480_915

export function StatusBar() {
  const [block, setBlock] = useState(GENESIS_BLOCK)
  const [clock, setClock] = useState(() => clockUTC())

  useEffect(() => {
    const id = setInterval(() => {
      setBlock((b) => b + 1)
      setClock(clockUTC())
    }, DEFAULT_CHAIN.blockTimeMs)
    return () => clearInterval(id)
  }, [])

  return (
    <footer className="sticky bottom-0 z-30 border-t border-line bg-void/90 backdrop-blur-md">
      <div className="mx-auto flex h-8 max-w-[1400px] items-center gap-4 overflow-x-auto px-4 text-2xs whitespace-nowrap sm:px-6">
        <span className="flex items-center gap-1.5 text-ash">
          <span className="size-1.5 bg-ember animate-ember-pulse" />
          <span className="tracking-[0.16em]">{DEFAULT_CHAIN.name.toUpperCase()}</span>
        </span>
        <Sep />
        <Field k="BLOCK" v={block.toLocaleString('en-US')} />
        <Sep />
        <Field k="GAS" v="0.0012 gwei" />
        <Sep />
        <Field k="PRECONF" v={`${DEFAULT_CHAIN.preconfMs}ms`} />
        <Sep />
        <span className="hidden sm:inline">
          <Field k="UTC" v={clock} />
        </span>
        <span className="ml-auto flex items-center gap-4">
          <Link to="/explore" className="text-smoke transition-colors hover:text-ember">
            MARKETS
          </Link>
          {DEFAULT_CHAIN.faucet && (
            <a
              href={DEFAULT_CHAIN.faucet}
              target="_blank"
              rel="noreferrer noopener"
              className="text-smoke transition-colors hover:text-ember"
            >
              FAUCET&nbsp;&gt;
            </a>
          )}
          <a
            href={DEFAULT_CHAIN.explorer}
            target="_blank"
            rel="noreferrer noopener"
            className="text-smoke transition-colors hover:text-ember"
          >
            EXPLORER&nbsp;&gt;
          </a>
          <span className="hidden text-dust sm:inline">v0.1.0 · DEMO DATA</span>
        </span>
      </div>
    </footer>
  )
}

function Field({ k, v }: { k: string; v: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="tracking-[0.16em] text-dust">{k}</span>
      <span className="tnum text-ash">{v}</span>
    </span>
  )
}

function Sep() {
  return <VRule />
}
