import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Badge,
  Button,
  Delta,
  Panel,
  Rule,
  Tab,
  Tabs,
  TokenMark,
} from '../components/primitives'
import { cx } from '../lib/cx'
import { AsciiChart, BarRow, Spark } from '../components/charts'
import { useWallet } from '../lib/wallet'
import { useHoldings, usePositions } from '../lib/portfolio'
import { portfolioSeries, recentTrades, token } from '../lib/market'
import { CAT_SIT, GIWA_PROVERB, meter } from '../lib/ascii'
import {
  ago,
  amount as fmtAmount,
  price as fmtPrice,
  truncAddress,
  usd,
} from '../lib/format'
import { addressUrl, DEFAULT_CHAIN } from '../lib/chain'

export function PortfolioPage() {
  const wallet = useWallet()
  const holdings = useHoldings()
  const positions = usePositions()
  const [view, setView] = useState('tokens')

  const series = useMemo(
    () => (holdings.length ? portfolioSeries(holdings) : []),
    [holdings],
  )

  if (!wallet.address) return <Disconnected />

  const total =
    holdings.reduce((a, h) => a + h.valueUsd, 0) +
    positions.reduce((a, p) => a + p.valueUsd, 0)
  const basis = holdings.reduce((a, h) => a + h.costBasis, 0)
  const pnl = total - basis - positions.reduce((a, p) => a + p.valueUsd, 0)
  const day = series.length > 25 ? ((series.at(-1)! - series.at(-25)!) / series.at(-25)!) * 100 : 0

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 px-4 py-6 sm:px-6">
      {/* ------------------------------------------------------------ head */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          title="Net worth"
          tone="raised"
          className="lg:col-span-2"
          actions={
            <a
              href={addressUrl(DEFAULT_CHAIN, wallet.address)}
              target="_blank"
              rel="noreferrer noopener"
              className="tnum text-2xs text-smoke transition-colors hover:text-ember"
            >
              {truncAddress(wallet.address, 8, 6)} ↗
            </a>
          }
        >
          <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
            <div>
              <div className="tnum text-4xl leading-none text-bone sm:text-5xl">
                {usd(total)}
              </div>
              <div className="mt-2 flex items-center gap-3">
                <Delta value={day} className="text-xs" />
                <span className="text-2xs text-smoke">24 hours</span>
              </div>
            </div>
            <div className="flex gap-6">
              <Mini label="Unrealised P&L" value={usd(pnl)} accent={pnl >= 0} />
              <Mini label="Positions" value={String(positions.length)} />
              <Mini label="Assets" value={String(holdings.length)} />
            </div>
          </div>

          <Rule className="my-4" />

          {series.length > 0 && (
            <AsciiChart series={series} rows={10} label="Portfolio · 168H" />
          )}
        </Panel>

        <Panel title="Allocation" tone="raised">
          <div className="space-y-0.5">
            {holdings.slice(0, 7).map((h) => (
              <BarRow
                key={h.symbol}
                label={h.symbol}
                ratio={h.valueUsd / (holdings[0]?.valueUsd || 1)}
                value={usd(h.valueUsd, { compact: true })}
              />
            ))}
          </div>
          <Rule className="my-4" label="lp" />
          <div className="space-y-0.5">
            {positions.map((p) => (
              <BarRow
                key={p.poolId}
                label={`${p.base}/${p.quote}`}
                ratio={p.valueUsd / (positions[0]?.valueUsd || 1)}
                value={usd(p.valueUsd, { compact: true })}
              />
            ))}
          </div>
        </Panel>
      </div>

      {/* --------------------------------------------------------- tables */}
      <Panel
        tone="raised"
        bodyClassName="p-0"
        title="Holdings"
        actions={
          <Tabs value={view} onChange={setView}>
            <Tab value="tokens">Tokens</Tab>
            <Tab value="positions">Liquidity</Tab>
            <Tab value="activity">Activity</Tab>
          </Tabs>
        }
      >
        {view === 'tokens' && <HoldingsTable />}
        {view === 'positions' && <Positions />}
        {view === 'activity' && <Activity address={wallet.address} />}
      </Panel>
    </div>
  )
}

function Mini({
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
      <div className="label mb-1.5">{label}</div>
      <div className={cx('tnum text-sm', accent ? 'text-ember' : 'text-bone')}>{value}</div>
    </div>
  )
}

/* ------------------------------------------------------------- holdings -- */

function HoldingsTable() {
  const holdings = useHoldings()
  const TH = 'label px-3 py-2 text-left font-normal whitespace-nowrap'

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-xs">
        <thead>
          <tr className="border-b border-line">
            <th className={TH}>Asset</th>
            <th className={cx(TH, 'text-right')}>Balance</th>
            <th className={cx(TH, 'text-right')}>Price</th>
            <th className={cx(TH, 'text-right')}>24H</th>
            <th className={cx(TH, 'text-right')}>Value</th>
            <th className={cx(TH, 'text-right')}>P&L</th>
            <th className={cx(TH, 'text-right')}>7D</th>
            <th className={cx(TH, 'text-right')}></th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((h) => {
            const t = token(h.symbol)
            const pnl = h.valueUsd - h.costBasis
            return (
              <tr
                key={h.symbol}
                className="group border-b border-line/70 transition-colors hover:bg-ink-2"
              >
                <td className="px-3 py-2.5">
                  <span className="flex items-center gap-2.5">
                    <TokenMark symbol={h.symbol} />
                    <span>
                      <span className="block text-bone">{h.symbol}</span>
                      <span className="block text-2xs text-smoke">{t.name}</span>
                    </span>
                  </span>
                </td>
                <td className="tnum px-3 py-2.5 text-right text-bone">
                  {fmtAmount(h.balance)}
                </td>
                <td className="tnum px-3 py-2.5 text-right text-ash">
                  {fmtPrice(t.price)}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <Delta value={t.change24h} />
                </td>
                <td className="tnum px-3 py-2.5 text-right text-bone">
                  {usd(h.valueUsd)}
                </td>
                <td
                  className={cx(
                    'tnum px-3 py-2.5 text-right',
                    pnl >= 0 ? 'text-ember' : 'text-smoke',
                  )}
                >
                  {pnl >= 0 ? '+' : '−'}
                  {usd(Math.abs(pnl)).slice(1)}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <Spark series={t.series} width={16} />
                </td>
                <td className="px-3 py-2.5 text-right">
                  <Link
                    to={`/swap?from=${h.symbol}&to=USDC`}
                    className="border border-line px-2 py-1 text-2xs tracking-[0.14em] text-smoke uppercase transition-colors hover:border-ember/60 hover:text-ember"
                  >
                    Trade
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ------------------------------------------------------------ positions -- */

function Positions() {
  const positions = usePositions()

  return (
    <div className="grid gap-px bg-line sm:grid-cols-2">
      {positions.map((p) => {
        const mid = token(p.base).price / token(p.quote).price
        const ratio = Math.max(0, Math.min(1, (mid - p.min) / (p.max - p.min)))
        return (
          <div key={p.poolId} className="bg-ink p-4">
            <div className="flex items-start justify-between">
              <span className="flex items-center gap-2.5">
                <span className="flex">
                  <TokenMark symbol={p.base} />
                  <TokenMark symbol={p.quote} />
                </span>
                <span>
                  <span className="block text-sm text-bone">
                    {p.base}
                    <span className="text-dust"> / </span>
                    {p.quote}
                  </span>
                  <span className="block text-2xs text-smoke">
                    {(p.feeBps / 100).toFixed(2)}% fee tier
                  </span>
                </span>
              </span>
              <Badge tone={p.inRange ? 'ember' : 'mute'}>
                {p.inRange ? 'in range' : 'out of range'}
              </Badge>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <Mini label="Value" value={usd(p.valueUsd)} />
              <Mini label="Fees" value={usd(p.uncollectedFees)} accent />
              <Mini label="Share" value={`${(p.share * 100).toFixed(3)}%`} />
            </div>

            <div className="mt-4">
              <div className="label mb-1.5">Range</div>
              <div className="ascii text-[11px] leading-none">
                <span className="text-line-2">{meter(ratio, 24, '─', '─')}</span>
              </div>
              <div className="relative -mt-[7px] h-3">
                <span
                  className="absolute text-ember"
                  style={{ left: `calc(${ratio * 100}% - 4px)` }}
                >
                  ◆
                </span>
              </div>
              <div className="tnum mt-1 flex justify-between text-2xs text-smoke">
                <span>{fmtAmount(p.min, 5)}</span>
                <span className="text-ember">{fmtAmount(mid, 5)}</span>
                <span>{fmtAmount(p.max, 5)}</span>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="quiet" block>
                Collect fees
              </Button>
              <Button size="sm" variant="outline" block>
                Manage
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------- activity -- */

function Activity({ address }: { address: string }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 6000)
    return () => clearInterval(id)
  }, [])

  const rows = useMemo(() => recentTrades(14, now), [now])

  return (
    <ul className="divide-y divide-line">
      {rows.map((t) => (
        <li key={t.hash} className="flex items-center gap-3 px-4 py-3 text-xs">
          <span
            className={cx(
              'flex size-7 shrink-0 items-center justify-center border text-2xs',
              t.kind === 'swap'
                ? 'border-ember/50 text-ember'
                : 'border-line-2 text-smoke',
            )}
          >
            {t.kind === 'swap' ? '⇅' : t.kind === 'add' ? '+' : '−'}
          </span>
          <span className="min-w-0">
            <span className="block text-bone">
              {t.kind === 'swap'
                ? `Swap ${t.from} → ${t.to}`
                : t.kind === 'add'
                  ? `Add ${t.from}/${t.to}`
                  : `Remove ${t.from}/${t.to}`}
            </span>
            <span className="tnum block text-2xs text-smoke">
              {fmtAmount(t.amountIn, 4)} {t.from} · {truncAddress(address, 6, 4)}
            </span>
          </span>
          <span className="tnum ml-auto text-right">
            <span className="block text-bone">{usd(t.valueUsd)}</span>
            <span className="block text-2xs text-dust">{ago(t.ts, now)} ago</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

/* --------------------------------------------------------- disconnected -- */

function Disconnected() {
  const wallet = useWallet()
  return (
    <div className="mx-auto flex max-w-[1400px] flex-col items-center px-4 py-20 text-center sm:py-28">
      <pre className="ascii text-[10px] leading-[1.05] text-ember sm:text-sm">
        {CAT_SIT.join('\n')}
      </pre>
      <h1 className="display mt-8 text-3xl sm:text-5xl">
        Nothing to show.
        <br />
        <span className="text-smoke">Yet.</span>
      </h1>
      <p className="mt-4 max-w-md text-xs leading-relaxed text-smoke">
        Connect a wallet to read balances, liquidity positions and activity on{' '}
        {DEFAULT_CHAIN.name}. TOPOKI never asks for a seed phrase and never moves funds
        without a signature.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button
          variant="primary"
          size="lg"
          onClick={() => (wallet.hasProvider ? wallet.connect() : wallet.connectDemo())}
        >
          {wallet.hasProvider ? 'Connect wallet' : 'Open demo account'}
        </Button>
        <Link to="/explore">
          <Button variant="outline" size="lg">
            Explore markets
          </Button>
        </Link>
      </div>

      <p className="kr mt-16 max-w-lg text-xs leading-relaxed text-dust">
        {GIWA_PROVERB}
      </p>
    </div>
  )
}
