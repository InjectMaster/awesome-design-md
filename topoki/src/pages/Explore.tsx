import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
import { Spark } from '../components/charts'
import { DitherChart } from '../components/DitherChart'
import { Modal } from '../components/Modal'
import {
  POOLS,
  STATS,
  TOKENS,
  poolsFor,
  recentTrades,
  token,
  type Pool,
  type Token,
} from '../lib/market'
import {
  ago,
  amount as fmtAmount,
  compact,
  price as fmtPrice,
  truncAddress,
  usd,
} from '../lib/format'
import { addressUrl, DEFAULT_CHAIN, txUrl } from '../lib/chain'
import { CAT_SLEEP } from '../lib/ascii'

type View = 'tokens' | 'pools' | 'transactions'
type Filter = 'all' | 'eco' | 'stable' | 'meme'

export function ExplorePage() {
  const [view, setView] = useState<View>('tokens')
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [detail, setDetail] = useState<string | null>(null)
  const search = useRef<HTMLInputElement>(null)

  // `/` jumps to the search field, the way it does in a terminal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement
      const typing = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
      if (e.key === '/' && !typing) {
        e.preventDefault()
        search.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 px-4 py-6 sm:px-6">
      <GlobalStats />

      <Panel
        tone="raised"
        bodyClassName="p-0"
        title="Explore"
        subtitle={`${STATS.tokens} tokens · ${STATS.pools} pools`}
        actions={
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 border border-line bg-ink-2 px-2 focus-within:border-ember/60 sm:flex">
              <span className="text-dust">/</span>
              <input
                ref={search}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && e.currentTarget.blur()}
                placeholder="search"
                aria-label="Search tokens, pools and transactions"
                className="h-7 w-40 bg-transparent text-xs outline-none"
              />
            </div>
          </div>
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 sm:px-4">
          <Tabs value={view} onChange={(v) => setView(v as View)}>
            <Tab value="tokens">Tokens</Tab>
            <Tab value="pools">Pools</Tab>
            <Tab value="transactions">Transactions</Tab>
          </Tabs>

          {view === 'tokens' && (
            <div className="flex items-center gap-1 py-1.5">
              {(['all', 'eco', 'stable', 'meme'] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cx(
                    'border px-2 py-1 text-2xs tracking-[0.14em] uppercase transition-colors',
                    filter === f
                      ? 'border-ember/60 bg-ember/10 text-ember'
                      : 'border-line text-smoke hover:border-line-3 hover:text-ash',
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="sm:hidden">
          <div className="flex items-center gap-2 border-b border-line px-3">
            <span className="text-dust">/</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="search"
              className="h-10 w-full bg-transparent text-xs outline-none"
            />
          </div>
        </div>

        {view === 'tokens' && (
          <TokensTable query={q} filter={filter} onOpen={setDetail} />
        )}
        {view === 'pools' && <PoolsTable query={q} />}
        {view === 'transactions' && <TxTable query={q} />}
      </Panel>

      <TokenDetail symbol={detail} onClose={() => setDetail(null)} />
    </div>
  )
}

/* ----------------------------------------------------------- global stats -- */

function GlobalStats() {
  const tvlSeries = useMemo(
    () =>
      POOLS[0].series.map((_, i) =>
        POOLS.reduce((sum, p) => sum + p.series[i], 0),
      ),
    [],
  )

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Panel title="Protocol" className="lg:col-span-2" tone="raised">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <BigStat label="TVL" value={usd(STATS.tvl, { compact: true })} delta={2.41} />
          <BigStat
            label="Volume 24H"
            value={usd(STATS.volume24h, { compact: true })}
            delta={-4.12}
          />
          <BigStat
            label="Fees 24H"
            value={usd(STATS.fees24h, { compact: true })}
            delta={1.08}
          />
          <BigStat label="Pools" value={String(STATS.pools)} />
        </div>
        <Rule className="my-4" />
        <DitherChart
          series={tvlSeries}
          height={116}
          bloom="low"
          label="TVL · 168H"
          format={(n) => usd(n, { compact: true })}
        />
      </Panel>

      <Panel title="Network" tone="raised">
        <dl className="space-y-3">
          <NetRow k="Chain" v={DEFAULT_CHAIN.name} />
          <NetRow k="Chain ID" v={String(DEFAULT_CHAIN.chainId)} />
          <NetRow k="Block time" v="1.0s" />
          <NetRow k="Stack" v="OP Stack" />
          <NetRow k="Gas token" v={DEFAULT_CHAIN.currency.symbol} />
          <NetRow k="Settlement" v="Ethereum" />
        </dl>
        <a
          href={DEFAULT_CHAIN.explorer}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-4 flex items-center justify-between border border-line bg-ink-2 px-3 py-2 text-xs text-ash transition-colors hover:border-ember/60 hover:text-ember"
        >
          {DEFAULT_CHAIN.explorerName}
          <span>↗</span>
        </a>
      </Panel>
    </div>
  )
}

function BigStat({
  label,
  value,
  delta,
}: {
  label: string
  value: string
  delta?: number
}) {
  return (
    <div>
      <div className="label mb-1.5">{label}</div>
      <div className="tnum text-xl leading-none text-bone">{value}</div>
      {delta !== undefined && <Delta value={delta} className="mt-1.5 text-2xs" />}
    </div>
  )
}

function NetRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <dt className="text-smoke">{k}</dt>
      <dd className="tnum text-bone">{v}</dd>
    </div>
  )
}

/* ---------------------------------------------------------------- tables -- */

const TH =
  'label sticky top-0 z-10 bg-ink px-3 py-2 text-left font-normal whitespace-nowrap'

function SortHead({
  children,
  active,
  dir,
  onClick,
  align = 'right',
}: {
  children: React.ReactNode
  active: boolean
  dir: 1 | -1
  onClick: () => void
  align?: 'left' | 'right'
}) {
  return (
    <th className={cx(TH, align === 'right' && 'text-right')}>
      <button
        onClick={onClick}
        className={cx(
          'inline-flex items-center gap-1 transition-colors hover:text-ash',
          active && 'text-ember',
        )}
      >
        {children}
        <span className={cx('text-[8px]', !active && 'text-dust')}>
          {active ? (dir === 1 ? '▲' : '▼') : '·'}
        </span>
      </button>
    </th>
  )
}

function TokensTable({
  query,
  filter,
  onOpen,
}: {
  query: string
  filter: Filter
  onOpen: (s: string) => void
}) {
  const [sort, setSort] = useState<keyof Token>('tvl')
  const [dir, setDir] = useState<1 | -1>(-1)

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return TOKENS.filter((t) => {
      if (filter !== 'all' && !t.tags.includes(filter)) return false
      if (!needle) return true
      return (
        t.symbol.toLowerCase().includes(needle) || t.name.toLowerCase().includes(needle)
      )
    }).sort((a, b) => {
      const va = a[sort]
      const vb = b[sort]
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir
      return String(va).localeCompare(String(vb)) * dir
    })
  }, [query, filter, sort, dir])

  const head = (key: keyof Token, label: string) => (
    <SortHead
      active={sort === key}
      dir={dir}
      onClick={() => {
        if (sort === key) setDir((d) => (d === 1 ? -1 : 1))
        else {
          setSort(key)
          setDir(-1)
        }
      }}
    >
      {label}
    </SortHead>
  )

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] border-collapse text-xs">
        <thead>
          <tr className="border-b border-line">
            <th className={cx(TH, 'w-10')}>#</th>
            <th className={cx(TH, 'text-left')}>Token</th>
            {head('price', 'Price')}
            {head('change24h', '24H')}
            {head('change7d', '7D')}
            {head('volume24h', 'Volume 24H')}
            {head('tvl', 'TVL')}
            {head('fdv', 'FDV')}
            <th className={cx(TH, 'text-right')}>7D chart</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t, i) => (
            <tr
              key={t.symbol}
              onClick={() => onOpen(t.symbol)}
              className="group cursor-pointer border-b border-line/70 transition-colors hover:bg-ink-2"
            >
              <td className="tnum px-3 py-2.5 text-dust">
                {String(i + 1).padStart(2, '0')}
              </td>
              <td className="px-3 py-2.5">
                <span className="flex items-center gap-2.5">
                  <TokenMark symbol={t.symbol} />
                  <span>
                    <span className="block text-bone">{t.symbol}</span>
                    <span className="block text-2xs text-smoke">{t.name}</span>
                  </span>
                  {t.tags.includes('meme') && <Badge tone="mute">meme</Badge>}
                </span>
              </td>
              <td className="tnum px-3 py-2.5 text-right text-bone">{fmtPrice(t.price)}</td>
              <td className="px-3 py-2.5 text-right">
                <Delta value={t.change24h} />
              </td>
              <td className="px-3 py-2.5 text-right">
                <Delta value={t.change7d} />
              </td>
              <td className="tnum px-3 py-2.5 text-right text-ash">
                {usd(t.volume24h, { compact: true })}
              </td>
              <td className="tnum px-3 py-2.5 text-right text-ash">
                {usd(t.tvl, { compact: true })}
              </td>
              <td className="tnum px-3 py-2.5 text-right text-smoke">
                {usd(t.fdv, { compact: true })}
              </td>
              <td className="px-3 py-2.5 text-right">
                <Spark series={t.series} width={20} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <Empty />}
    </div>
  )
}

function PoolsTable({ query }: { query: string }) {
  const [sort, setSort] = useState<keyof Pool>('tvl')
  const [dir, setDir] = useState<1 | -1>(-1)
  const navigate = useNavigate()

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return POOLS.filter((p) =>
      needle ? p.id.toLowerCase().includes(needle) : true,
    ).sort((a, b) => {
      const va = a[sort]
      const vb = b[sort]
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir
      return String(va).localeCompare(String(vb)) * dir
    })
  }, [query, sort, dir])

  const head = (key: keyof Pool, label: string) => (
    <SortHead
      active={sort === key}
      dir={dir}
      onClick={() => {
        if (sort === key) setDir((d) => (d === 1 ? -1 : 1))
        else {
          setSort(key)
          setDir(-1)
        }
      }}
    >
      {label}
    </SortHead>
  )

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-xs">
        <thead>
          <tr className="border-b border-line">
            <th className={cx(TH, 'w-10')}>#</th>
            <th className={cx(TH, 'text-left')}>Pool</th>
            <th className={cx(TH, 'text-right')}>Fee</th>
            {head('tvl', 'TVL')}
            {head('volume24h', 'Volume 24H')}
            {head('fees24h', 'Fees 24H')}
            {head('apr', 'APR')}
            <th className={cx(TH, 'text-right')}>7D</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p, i) => (
            <tr
              key={p.id}
              onClick={() => navigate(`/swap?from=${p.base}&to=${p.quote}`)}
              className="group cursor-pointer border-b border-line/70 transition-colors hover:bg-ink-2"
            >
              <td className="tnum px-3 py-2.5 text-dust">
                {String(i + 1).padStart(2, '0')}
              </td>
              <td className="px-3 py-2.5">
                <span className="flex items-center gap-2.5">
                  <span className="flex">
                    <TokenMark symbol={p.base} size="sm" />
                    <TokenMark symbol={p.quote} size="sm" />
                  </span>
                  <span className="text-bone">
                    {p.base}
                    <span className="text-dust"> / </span>
                    {p.quote}
                  </span>
                </span>
              </td>
              <td className="tnum px-3 py-2.5 text-right text-smoke">
                {(p.feeBps / 100).toFixed(2)}%
              </td>
              <td className="tnum px-3 py-2.5 text-right text-bone">
                {usd(p.tvl, { compact: true })}
              </td>
              <td className="tnum px-3 py-2.5 text-right text-ash">
                {usd(p.volume24h, { compact: true })}
              </td>
              <td className="tnum px-3 py-2.5 text-right text-ash">
                {usd(p.fees24h, { compact: true })}
              </td>
              <td className="tnum px-3 py-2.5 text-right text-ember">
                {p.apr.toFixed(2)}%
              </td>
              <td className="px-3 py-2.5 text-right">
                <Spark series={p.series} width={16} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <Empty />}
    </div>
  )
}

function TxTable({ query }: { query: string }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 4000)
    return () => clearInterval(id)
  }, [])

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return recentTrades(40, now).filter((t) =>
      needle
        ? t.from.toLowerCase().includes(needle) ||
          t.to.toLowerCase().includes(needle) ||
          t.account.toLowerCase().includes(needle)
        : true,
    )
  }, [query, now])

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-xs">
        <thead>
          <tr className="border-b border-line">
            <th className={cx(TH, 'text-left')}>Type</th>
            <th className={cx(TH, 'text-left')}>Detail</th>
            <th className={cx(TH, 'text-right')}>Value</th>
            <th className={cx(TH, 'text-right')}>Account</th>
            <th className={cx(TH, 'text-right')}>Tx</th>
            <th className={cx(TH, 'text-right')}>Time</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr
              key={t.hash}
              className="border-b border-line/70 transition-colors hover:bg-ink-2"
            >
              <td className="px-3 py-2.5">
                <span
                  className={cx(
                    'text-2xs tracking-[0.14em] uppercase',
                    t.kind === 'swap'
                      ? 'text-ember'
                      : t.kind === 'add'
                        ? 'text-bone'
                        : 'text-smoke',
                  )}
                >
                  {t.kind}
                </span>
              </td>
              <td className="px-3 py-2.5 text-ash">
                <span className="tnum">
                  {fmtAmount(t.amountIn, 4)} <span className="text-bone">{t.from}</span>
                  {/* a swap moves value across; liquidity moves both sides at once */}
                  <span className="px-1.5 text-dust">{t.kind === 'swap' ? '→' : '+'}</span>
                  {fmtAmount(t.amountOut, 4)} <span className="text-bone">{t.to}</span>
                </span>
              </td>
              <td className="tnum px-3 py-2.5 text-right text-bone">
                {usd(t.valueUsd, { compact: true })}
              </td>
              <td className="tnum px-3 py-2.5 text-right">
                <a
                  href={addressUrl(DEFAULT_CHAIN, t.account)}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-smoke transition-colors hover:text-ember"
                >
                  {truncAddress(t.account)}
                </a>
              </td>
              <td className="tnum px-3 py-2.5 text-right">
                <a
                  href={txUrl(DEFAULT_CHAIN, t.hash)}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-dust transition-colors hover:text-ember"
                >
                  {truncAddress(t.hash, 8, 4)} ↗
                </a>
              </td>
              <td className="tnum px-3 py-2.5 text-right text-smoke">
                {ago(t.ts, now)} ago
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <Empty />}
    </div>
  )
}

function Empty() {
  return (
    <div className="flex flex-col items-center gap-3 py-14">
      <pre className="ascii text-xs text-dust">{CAT_SLEEP.join('\n')}</pre>
      <p className="text-xs text-smoke">Nothing here. Try another search.</p>
    </div>
  )
}

/* ----------------------------------------------------------- token detail -- */

function TokenDetail({ symbol, onClose }: { symbol: string | null; onClose: () => void }) {
  const t = symbol ? token(symbol) : null
  const pools = symbol ? poolsFor(symbol).slice(0, 5) : []

  return (
    <Modal
      open={Boolean(t)}
      onClose={onClose}
      title={t ? `${t.symbol} · ${t.name}` : ''}
      width="max-w-3xl"
    >
      {t && (
        <div className="space-y-4 p-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-center gap-3">
              <TokenMark symbol={t.symbol} size="lg" />
              <div>
                <div className="tnum text-3xl leading-none text-bone">
                  {fmtPrice(t.price)}
                </div>
                <Delta value={t.change24h} className="mt-1.5 text-xs" />
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {t.tags.map((tag) => (
                <Badge key={tag} tone={tag === 'eco' ? 'ember' : 'neutral'}>
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          <DitherChart series={t.series} height={148} bloom="high" label={`${t.symbol} · 168H`} />

          <div className="grid grid-cols-2 gap-4 border-y border-line py-4 sm:grid-cols-4">
            <BigStat label="TVL" value={usd(t.tvl, { compact: true })} />
            <BigStat label="Volume 24H" value={usd(t.volume24h, { compact: true })} />
            <BigStat label="FDV" value={usd(t.fdv, { compact: true })} />
            <BigStat label="Holders" value={compact(t.holders, 1)} />
          </div>

          <div>
            <div className="label mb-2">Top pools</div>
            <ul className="divide-y divide-line border border-line">
              {pools.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-xs"
                >
                  <span className="text-bone">
                    {p.base}
                    <span className="text-dust"> / </span>
                    {p.quote}
                  </span>
                  <Badge tone="mute">{(p.feeBps / 100).toFixed(2)}%</Badge>
                  <span className="tnum ml-auto text-ash">
                    {usd(p.tvl, { compact: true })}
                  </span>
                  <span className="tnum w-16 text-right text-ember">
                    {p.apr.toFixed(1)}%
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link to={`/swap?from=USDC&to=${t.symbol}`} onClick={onClose}>
              <Button variant="primary">Trade {t.symbol}</Button>
            </Link>
            <a
              href={addressUrl(DEFAULT_CHAIN, t.address)}
              target="_blank"
              rel="noreferrer noopener"
              className="tnum border border-line px-3 py-2 text-2xs text-smoke transition-colors hover:border-ember/60 hover:text-ember"
            >
              {truncAddress(t.address, 10, 8)} ↗
            </a>
          </div>
        </div>
      )}
    </Modal>
  )
}

