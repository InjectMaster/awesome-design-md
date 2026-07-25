import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Badge,
  Button,
  Delta,
  Panel,
  Row,
  Rule,
  Spinner,
  TokenMark,
} from '../components/primitives'
import { cx } from '../lib/cx'
import { Spark } from '../components/charts'
import { DitherChart } from '../components/DitherChart'
import { DitherBar } from '../components/DitherBar'
import { Modal } from '../components/Modal'
import { TokenSelect } from '../components/TokenSelect'
import { useWallet } from '../lib/wallet'
import { useBalances } from '../lib/portfolio'
import {
  TOKENS,
  findPool,
  quote as getQuote,
  recentTrades,
  token,
  type Quote,
} from '../lib/market'
import { ago, amount as fmtAmount, truncAddress, usd } from '../lib/format'
import { DEFAULT_CHAIN, txUrl } from '../lib/chain'

const SLIPPAGE_PRESETS = [10, 50, 100]

/** Accept a symbol from the URL only if it is a token we actually list. */
function resolveSymbol(raw: string | null, fallback: string): string {
  if (!raw) return fallback
  const hit = TOKENS.find((t) => t.symbol.toLowerCase() === raw.toLowerCase())
  return hit?.symbol ?? fallback
}

export function SwapPage() {
  const wallet = useWallet()
  const balances = useBalances()
  const [params, setParams] = useSearchParams()

  const [from, setFrom] = useState(() => resolveSymbol(params.get('from'), 'ETH'))
  const [to, setTo] = useState(() => resolveSymbol(params.get('to'), 'GIWA'))
  const [input, setInput] = useState('1')
  const [slippage, setSlippage] = useState(50)
  const [deadline, setDeadline] = useState(20)
  const [picking, setPicking] = useState<null | 'from' | 'to'>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [inverted, setInverted] = useState(false)
  const [flipping, setFlipping] = useState(false)

  const amountIn = Number.parseFloat(input) || 0
  const q = useMemo(
    () => getQuote(from, to, amountIn, slippage),
    [from, to, amountIn, slippage],
  )

  const balance = balances[from] ?? 0
  const insufficient = wallet.address !== null && amountIn > balance
  const tokenFrom = token(from)
  const tokenTo = token(to)
  const pool = findPool(from, to)
  const pairSeries = useMemo(
    () => tokenFrom.series.map((v, i) => v / tokenTo.series[i]),
    [tokenFrom, tokenTo],
  )

  // keep the URL shareable: /swap?from=ETH&to=GIWA
  useEffect(() => {
    setParams({ from, to }, { replace: true })
  }, [from, to, setParams])

  const flip = () => {
    setFlipping(true)
    setFrom(to)
    setTo(from)
    setInput(q.ok && q.amountOut ? String(Number(q.amountOut.toPrecision(6))) : input)
    setTimeout(() => setFlipping(false), 320)
  }

  const cta = (() => {
    if (!wallet.address) return { label: 'Connect wallet', disabled: false, action: 'connect' as const }
    if (wallet.wrongNetwork) return { label: 'Switch to GIWA', disabled: false, action: 'switch' as const }
    if (!(amountIn > 0)) return { label: 'Enter an amount', disabled: true, action: 'none' as const }
    if (!q.ok) return { label: q.reason ?? 'Unavailable', disabled: true, action: 'none' as const }
    if (insufficient) return { label: `Insufficient ${from}`, disabled: true, action: 'none' as const }
    if (q.priceImpact > 15)
      return { label: 'Swap anyway', disabled: false, action: 'swap' as const }
    return { label: 'Swap', disabled: false, action: 'swap' as const }
  })()

  const onCta = () => {
    if (cta.action === 'connect')
      return wallet.hasProvider ? void wallet.connect() : wallet.connectDemo()
    if (cta.action === 'switch') return void wallet.switchToGiwa()
    if (cta.action === 'swap') setConfirming(true)
  }

  return (
    <div className="mx-auto grid max-w-[1400px] gap-4 px-4 py-6 sm:px-6 lg:grid-cols-12 lg:gap-5">
      {/* ------------------------------------------------------- swap card */}
      <div className="lg:col-span-5 xl:col-span-4">
        <Panel
          title="Swap"
          tone="raised"
          bodyClassName="p-3 sm:p-4"
          actions={
            <>
              <button
                onClick={() => setSettingsOpen(true)}
                className="flex h-6 items-center gap-1.5 border border-line px-2 text-2xs text-smoke transition-colors hover:border-ember/60 hover:text-ember"
                title="Transaction settings"
              >
                <span className="tnum">{(slippage / 100).toFixed(2)}%</span>
                <span className="tracking-tighter">[=]</span>
              </button>
            </>
          }
        >
          <div className="relative">
            <Field
              label="You pay"
              symbol={from}
              value={input}
              onValue={setInput}
              usdValue={amountIn * tokenFrom.price}
              balance={balance}
              onMax={() =>
                setInput(String(from === 'ETH' ? Math.max(0, balance - 0.002) : balance))
              }
              onPick={() => setPicking('from')}
              autoFocus
            />

            {/* flip control sits on the seam between the two fields */}
            <div className="relative z-10 flex h-0 items-center justify-center">
              <button
                onClick={flip}
                aria-label="Swap direction"
                className={cx(
                  'flex size-9 items-center justify-center border border-line-2 bg-ink text-ash',
                  'transition-[transform,color,border-color] duration-300 ease-[var(--ease-out-quint)]',
                  'hover:border-ember hover:text-ember',
                  flipping && 'rotate-180 text-ember',
                )}
              >
                <span className="text-[13px] leading-none">v^</span>
              </button>
            </div>

            <Field
              label="You receive"
              symbol={to}
              value={q.ok ? fmtAmount(q.amountOut, 6) : ''}
              usdValue={q.ok ? q.amountOut * tokenTo.price : 0}
              balance={balances[to] ?? 0}
              onPick={() => setPicking('to')}
              readOnly
            />
          </div>

          {/* quote detail */}
          <div className="mt-3 border border-line bg-ink-2/60 px-3 py-2">
            <button
              onClick={() => setInverted((v) => !v)}
              className="flex w-full items-center justify-between text-xs text-ash"
            >
              <span className="flex items-center gap-2 text-smoke">
                <span className="text-ember">~</span> Rate
              </span>
              <span className="tnum text-bone">
                {inverted
                  ? `1 ${to} = ${fmtAmount(1 / (q.rate || 1), 6)} ${from}`
                  : `1 ${from} = ${fmtAmount(q.rate || 0, 6)} ${to}`}
              </span>
            </button>

            {q.ok && (
              <div className="mt-2 space-y-0 border-t border-line pt-2">
                <Row
                  k="Price impact"
                  tone={q.priceImpact > 3 ? 'warn' : 'default'}
                  v={
                    <span className="flex items-center gap-2">
                      <DitherBar
                        ratio={Math.min(1, q.priceImpact / 10)}
                        height={8}
                        className="w-12"
                      />
                      {q.priceImpact.toFixed(2)}%
                    </span>
                  }
                />
                <Row k="Minimum received" v={`${fmtAmount(q.minReceived, 6)} ${to}`} />
                <Row k="Liquidity fee" v={usd(q.feeUsd)} />
                <Row k="Network fee" v="~$0.003" />
                <Row
                  k="Route"
                  v={
                    <span className="text-2xs tracking-[0.1em] text-ash">
                      {q.route.length === 1
                        ? `direct · ${q.route[0].pool.feeBps / 100}%`
                        : `${q.route.length} hops`}
                    </span>
                  }
                />
              </div>
            )}
          </div>

          {q.ok && q.route.length > 0 && <RouteDiagram quote={q} />}

          {q.ok && q.priceImpact > 5 && (
            <div className="bg-hatch mt-3 flex items-start gap-2 border border-ember/40 p-2.5 text-2xs text-ember">
              <span>!</span>
              <span>
                High price impact ({q.priceImpact.toFixed(2)}%). This trade moves the pool
                against you — consider splitting it.
              </span>
            </div>
          )}

          <Button
            variant="primary"
            size="lg"
            block
            className="mt-3"
            disabled={cta.disabled}
            onClick={onCta}
          >
            {cta.label}
          </Button>

          {!wallet.address && (
            <p className="mt-2 text-center text-2xs text-dust">
              Quotes are simulated against demo liquidity.
            </p>
          )}
        </Panel>
      </div>

      {/* -------------------------------------------------- market column */}
      <div className="space-y-4 lg:col-span-7 xl:col-span-8">
        <Panel
          title={`${from} / ${to}`}
          tone="default"
          actions={
            <div className="flex items-center gap-2">
              <Badge tone="mute">{pool ? `${pool.feeBps / 100}% fee` : 'routed'}</Badge>
              <Badge tone="neutral">7D</Badge>
            </div>
          }
        >
          <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="label mb-1">Mid price</div>
              <div className="tnum flex items-baseline gap-3">
                <span className="figure text-2xl text-bone sm:text-3xl">
                  {fmtAmount(tokenFrom.price / tokenTo.price, 6)}
                </span>
                <span className="text-xs text-smoke">
                  {to} per {from}
                </span>
              </div>
            </div>
            <div className="flex gap-6">
              <div>
                <div className="label mb-1">{from} 24H</div>
                <Delta value={tokenFrom.change24h} />
              </div>
              <div>
                <div className="label mb-1">{to} 24H</div>
                <Delta value={tokenTo.change24h} />
              </div>
            </div>
          </div>

          <DitherChart
            series={pairSeries}
            height={168}
            bloom="low"
            label={`${from}/${to} · 168H`}
            format={(n) => fmtAmount(n, 6)}
          />
        </Panel>

        <div className="grid gap-4 sm:grid-cols-2">
          <PoolCard from={from} to={to} />
          <TradesCard from={from} to={to} />
        </div>
      </div>

      {/* ----------------------------------------------------------- modals */}
      <TokenSelect
        open={picking !== null}
        onClose={() => setPicking(null)}
        exclude={picking === 'from' ? to : from}
        balances={balances}
        onPick={(s) => (picking === 'from' ? setFrom(s) : setTo(s))}
      />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        slippage={slippage}
        setSlippage={setSlippage}
        deadline={deadline}
        setDeadline={setDeadline}
      />

      <ConfirmModal
        open={confirming}
        onClose={() => setConfirming(false)}
        quote={q}
        from={from}
        to={to}
        slippage={slippage}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ field -- */

function Field({
  label,
  symbol,
  value,
  onValue,
  usdValue,
  balance,
  onMax,
  onPick,
  readOnly,
  autoFocus,
}: {
  label: string
  symbol: string
  value: string
  onValue?: (v: string) => void
  usdValue: number
  balance: number
  onMax?: () => void
  onPick: () => void
  readOnly?: boolean
  autoFocus?: boolean
}) {
  return (
    <div
      className={cx(
        'corner-frame border border-line bg-ink-2/60 px-3 py-3 transition-colors duration-200',
        'focus-within:border-line-3 hover:border-line-2',
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="label">{label}</span>
        <span className="flex items-center gap-2 text-2xs text-smoke">
          <span className="tnum">
            {balance > 0 ? `${fmtAmount(balance)} ${symbol}` : '—'}
          </span>
          {onMax && balance > 0 && (
            <button
              onClick={onMax}
              className="border border-line px-1.5 py-0.5 text-2xs tracking-[0.12em] text-ember uppercase transition-colors hover:border-ember/60"
            >
              max
            </button>
          )}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <input
          inputMode="decimal"
          autoFocus={autoFocus}
          readOnly={readOnly}
          value={value}
          onChange={(e) => {
            const v = e.target.value
            if (/^\d*[.,]?\d*$/.test(v)) onValue?.(v.replace(',', '.'))
          }}
          placeholder="0"
          className={cx(
            'figure w-full min-w-0 bg-transparent text-2xl outline-none sm:text-[28px]',
            readOnly ? 'text-ash' : 'text-bone',
          )}
        />
        <button
          onClick={onPick}
          className="group flex h-10 shrink-0 items-center gap-2 border border-line-2 bg-ink px-2.5 transition-colors duration-200 hover:border-ember/60"
        >
          <TokenMark symbol={symbol} />
          <span className="text-sm tracking-[0.08em] text-bone">{symbol}</span>
          <span className="text-dust transition-colors group-hover:text-ember">v</span>
        </button>
      </div>

      <div className="tnum mt-1 text-2xs text-dust">
        {usdValue > 0 ? usd(usdValue) : '$0.00'}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ route --
   The route is drawn as a wire diagram in box characters.
   -------------------------------------------------------------------------*/

function RouteDiagram({ quote }: { quote: Quote }) {
  const nodes = [quote.route[0].from, ...quote.route.map((h) => h.to)]
  return (
    <div className="mt-3 overflow-x-auto border border-line bg-ink-2/40 px-3 py-3">
      <div className="label mb-2">Route</div>
      <div className="flex items-center gap-1 whitespace-nowrap">
        {nodes.map((n, i) => (
          <span key={n + i} className="flex items-center gap-1">
            <span className="flex items-center gap-1.5 border border-line-2 bg-ink px-2 py-1">
              <TokenMark symbol={n} size="sm" />
              <span className="text-2xs text-bone">{n}</span>
            </span>
            {i < quote.route.length && (
              <span className="flex flex-col items-center px-1">
                <span className="text-2xs text-dust">
                  {quote.route[i].pool.feeBps / 100}%
                </span>
                <span className="text-ember">--&gt;</span>
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------- side cards -- */

function PoolCard({ from, to }: { from: string; to: string }) {
  const pool = findPool(from, to)
  if (!pool) {
    return (
      <Panel title="Pool">
        <p className="text-xs text-smoke">
          No direct pool. This pair is routed through a hub asset.
        </p>
      </Panel>
    )
  }
  // reserves implied by a 50/50 split of the pool's TVL
  const half = pool.tvl / 2
  const reserves: [string, number][] = [
    [pool.base, half / token(pool.base).price],
    [pool.quote, half / token(pool.quote).price],
  ]

  return (
    <Panel title="Pool" actions={<Spark series={pool.series} />}>
      <div className="grid grid-cols-2 gap-y-3">
        <Metric label="TVL" value={usd(pool.tvl, { compact: true })} />
        <Metric label="Volume 24H" value={usd(pool.volume24h, { compact: true })} />
        <Metric label="Fees 24H" value={usd(pool.fees24h, { compact: true })} />
        <Metric label="APR" value={`${pool.apr.toFixed(2)}%`} accent />
      </div>

      <Rule className="my-3" label="reserves" />

      <div className="space-y-1.5">
        {reserves.map(([sym, qty]) => (
          <div key={sym} className="flex items-baseline gap-3 text-xs">
            <span className="w-14 shrink-0 text-ash">{sym}</span>
            <span className="h-px flex-1 translate-y-[-3px] bg-line" />
            <span className="tnum text-smoke">{fmtAmount(qty, 2)}</span>
          </div>
        ))}
      </div>
    </Panel>
  )
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div>
      <div className="label mb-1">{label}</div>
      <div className={cx('tnum text-sm', accent ? 'text-ember' : 'text-bone')}>{value}</div>
    </div>
  )
}

function TradesCard({ from, to }: { from: string; to: string }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000)
    return () => clearInterval(id)
  }, [])

  const trades = useMemo(
    () =>
      recentTrades(60, now)
        .filter(
          (t) =>
            (t.from === from && t.to === to) || (t.from === to && t.to === from),
        )
        .slice(0, 6),
    [from, to, now],
  )

  return (
    <Panel title="Recent trades" bodyClassName="p-0">
      {trades.length === 0 ? (
        <p className="p-4 text-xs text-smoke">No trades on this pair yet.</p>
      ) : (
        <ul className="divide-y divide-line">
          {trades.map((t) => (
            <li
              key={t.hash}
              className="grid grid-cols-[3rem_1fr_auto_2.5rem] items-center gap-2 px-3 py-2 text-2xs"
            >
              <span className={cx(t.from === from ? 'text-ember' : 'text-ash')}>
                {t.from === from ? 'BUY' : 'SELL'}
              </span>
              <span className="tnum truncate text-bone">
                {fmtAmount(t.amountIn, 4)} <span className="text-dust">{t.from}</span>
              </span>
              <span className="tnum text-right text-smoke">
                {usd(t.valueUsd, { compact: true })}
              </span>
              <span className="tnum text-right text-dust">{ago(t.ts, now)}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

/* ---------------------------------------------------------------- settings -- */

function SettingsModal({
  open,
  onClose,
  slippage,
  setSlippage,
  deadline,
  setDeadline,
}: {
  open: boolean
  onClose: () => void
  slippage: number
  setSlippage: (n: number) => void
  deadline: number
  setDeadline: (n: number) => void
}) {
  return (
    <Modal open={open} onClose={onClose} title="Transaction settings" width="max-w-sm">
      <div className="space-y-5 p-4">
        <div>
          <div className="label mb-2">Max slippage</div>
          <div className="flex gap-1.5">
            {SLIPPAGE_PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => setSlippage(p)}
                className={cx(
                  'tnum h-9 flex-1 border text-xs transition-colors',
                  slippage === p
                    ? 'border-ember bg-ember/10 text-ember'
                    : 'border-line text-ash hover:border-line-3',
                )}
              >
                {(p / 100).toFixed(2)}%
              </button>
            ))}
            <div className="flex h-9 flex-1 items-center border border-line px-2 focus-within:border-ember/60">
              <input
                inputMode="decimal"
                value={(slippage / 100).toString()}
                onChange={(e) => {
                  const v = Number.parseFloat(e.target.value)
                  if (!Number.isNaN(v)) setSlippage(Math.min(5000, Math.round(v * 100)))
                }}
                className="tnum w-full bg-transparent text-xs outline-none"
              />
              <span className="text-dust">%</span>
            </div>
          </div>
          {slippage > 300 && (
            <p className="mt-2 text-2xs text-ember">
              High slippage tolerance — your trade may be front-run.
            </p>
          )}
        </div>

        <div>
          <div className="label mb-2">Deadline</div>
          <div className="flex h-9 items-center border border-line px-3 focus-within:border-ember/60">
            <input
              inputMode="numeric"
              value={deadline}
              onChange={(e) => setDeadline(Math.max(1, Number(e.target.value) || 1))}
              className="tnum w-full bg-transparent text-xs outline-none"
            />
            <span className="text-2xs text-dust">minutes</span>
          </div>
        </div>

        <Rule label="expert" />

        <label className="flex cursor-pointer items-center justify-between text-xs text-ash">
          <span>
            Simulate before signing
            <span className="block text-2xs text-dust">
              Dry-run every swap against the router
            </span>
          </span>
          <span className="border border-ember/60 bg-ember/10 px-2 py-1 text-2xs text-ember">
            ON
          </span>
        </label>
      </div>
    </Modal>
  )
}

/* ----------------------------------------------------------------- confirm -- */

type Phase = 'review' | 'signing' | 'pending' | 'done' | 'rejected'

function ConfirmModal({
  open,
  onClose,
  quote,
  from,
  to,
  slippage,
}: {
  open: boolean
  onClose: () => void
  quote: Quote
  from: string
  to: string
  slippage: number
}) {
  const [phase, setPhase] = useState<Phase>('review')
  const timers = useRef<number[]>([])
  const hash = useMemo(
    () => '0x' + Array.from({ length: 64 }, (_, i) => ((i * 7919) % 16).toString(16)).join(''),
    [],
  )

  useEffect(() => {
    if (open) setPhase('review')
    return () => {
      timers.current.forEach(clearTimeout)
      timers.current = []
    }
  }, [open])

  const submit = () => {
    setPhase('signing')
    timers.current.push(
      window.setTimeout(() => setPhase('pending'), 1100),
      window.setTimeout(() => setPhase('done'), 2400),
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={phase === 'review' ? 'Confirm swap' : 'Transaction'}
      width="max-w-md"
    >
      {phase === 'review' ? (
        <div className="p-4">
          <div className="border border-line bg-ink-2 p-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <TokenMark symbol={from} size="lg" />
                <span>
                  <span className="tnum block text-lg text-bone">
                    {fmtAmount(quote.amountIn, 6)}
                  </span>
                  <span className="block text-2xs text-smoke">{from}</span>
                </span>
              </span>
              <span className="text-ember">--&gt;</span>
              <span className="flex items-center gap-2">
                <span className="text-right">
                  <span className="tnum block text-lg text-bone">
                    {fmtAmount(quote.amountOut, 6)}
                  </span>
                  <span className="block text-2xs text-smoke">{to}</span>
                </span>
                <TokenMark symbol={to} size="lg" />
              </span>
            </div>
          </div>

          <div className="mt-3">
            <Row k="Rate" v={`1 ${from} = ${fmtAmount(quote.rate, 6)} ${to}`} />
            <Row k="Price impact" v={`${quote.priceImpact.toFixed(2)}%`} />
            <Row
              k="Minimum received"
              v={`${fmtAmount(quote.minReceived, 6)} ${to}`}
              hint={`After ${(slippage / 100).toFixed(2)}% slippage`}
            />
            <Row k="Liquidity fee" v={usd(quote.feeUsd)} />
            <Row k="Network" v={DEFAULT_CHAIN.name} />
          </div>

          <Button variant="primary" size="lg" block className="mt-4" onClick={submit}>
            Confirm swap
          </Button>
          <p className="mt-2 text-center text-2xs text-dust">
            Demo build — nothing is broadcast to the network.
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center p-8 text-center">
          <pre className="ascii text-xs text-ember">
            {phase === 'done'
              ? [' /\\_/\\ ', '( ^.^ )', ' > ♥ < '].join('\n')
              : [' /\\_/\\ ', '( o.o )', ' > ~ < '].join('\n')}
          </pre>

          <div className="mt-6 flex items-center gap-2 text-sm">
            {phase !== 'done' && <Spinner className="text-ember" />}
            <span className="text-bone">
              {phase === 'signing' && 'Waiting for signature…'}
              {phase === 'pending' && 'Pending on GIWA…'}
              {phase === 'done' && 'Swap complete'}
            </span>
          </div>

          <div className="mt-6 w-full">
            <Steps phase={phase} />
          </div>

          <p className="tnum mt-6 text-2xs break-all text-dust">
            {truncAddress(hash, 18, 12)}
          </p>

          {phase === 'done' && (
            <div className="mt-4 flex w-full gap-2">
              <Button
                block
                variant="outline"
                onClick={() => window.open(txUrl(DEFAULT_CHAIN, hash), '_blank')}
              >
                Explorer &gt;
              </Button>
              <Button block variant="primary" onClick={onClose}>
                Done
              </Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

function Steps({ phase }: { phase: Phase }) {
  const order: Phase[] = ['signing', 'pending', 'done']
  const idx = order.indexOf(phase)
  const labels = ['Sign', 'Broadcast', 'Confirmed']
  return (
    <div className="flex items-center">
      {labels.map((l, i) => (
        <div key={l} className="flex flex-1 items-center">
          <div className="flex flex-col items-center gap-1.5">
            <span
              className={cx(
                'flex size-5 items-center justify-center border text-2xs',
                i <= idx ? 'border-ember text-ember' : 'border-line text-dust',
              )}
            >
              {i < idx ? '✓' : i + 1}
            </span>
            <span className={cx('text-2xs', i <= idx ? 'text-ash' : 'text-dust')}>{l}</span>
          </div>
          {i < labels.length - 1 && (
            <span
              className={cx(
                'mx-1 mb-5 h-px flex-1',
                i < idx ? 'bg-ember' : 'bg-line',
              )}
            />
          )}
        </div>
      ))}
    </div>
  )
}
