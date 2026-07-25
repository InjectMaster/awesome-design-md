/* =========================================================================
   market.ts — the demo market.

   TOPOKI ships as a front-end reference implementation: there is no indexer
   and no router contract behind it yet. Every price, pool and transaction
   below is generated deterministically from a seed, so the UI is stable
   across reloads and reviewable without a node. Swap out this module for
   real RPC / subgraph calls and nothing in the views has to change.
   ========================================================================= */

export type Tag = 'native' | 'stable' | 'blue' | 'eco' | 'meme' | 'lst'

export interface Token {
  symbol: string
  name: string
  address: string
  decimals: number
  tags: Tag[]
  /** anchor price in USD — the series oscillates around it */
  price: number
  change24h: number
  change7d: number
  volume24h: number
  tvl: number
  fdv: number
  holders: number
  /** 168 hourly closes, oldest first */
  series: number[]
  balance: number
}

export interface Pool {
  id: string
  base: string
  quote: string
  feeBps: number
  tvl: number
  volume24h: number
  fees24h: number
  apr: number
  series: number[]
}

export type TxKind = 'swap' | 'add' | 'remove'

export interface Trade {
  hash: string
  kind: TxKind
  from: string
  to: string
  amountIn: number
  amountOut: number
  valueUsd: number
  ts: number
  account: string
}

/* --------------------------------------------------------- deterministic -- */

export function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hashSeed(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function hexAddress(seed: string): string {
  const rnd = mulberry32(hashSeed(seed))
  let out = '0x'
  for (let i = 0; i < 40; i++) out += Math.floor(rnd() * 16).toString(16)
  return out
}

/** Geometric random walk with mild mean reversion, clamped to sane bounds. */
function walk(seed: string, points: number, anchor: number, vol: number): number[] {
  const rnd = mulberry32(hashSeed(seed))
  const out: number[] = []
  let v = anchor * (0.9 + rnd() * 0.2)
  const drift = (rnd() - 0.45) * vol * 0.35
  for (let i = 0; i < points; i++) {
    const shock = (rnd() - 0.5) * 2 * vol
    const pull = (anchor - v) / anchor / 22
    v = v * (1 + shock + drift / points + pull)
    v = Math.max(anchor * 0.45, Math.min(anchor * 1.9, v))
    out.push(v)
  }
  return out
}

/* ---------------------------------------------------------------- tokens -- */

interface Seed {
  symbol: string
  name: string
  decimals: number
  tags: Tag[]
  price: number
  vol: number
  tvl: number
  supply: number
}

const SEEDS: Seed[] = [
  { symbol: 'ETH', name: 'Ether', decimals: 18, tags: ['native', 'blue'], price: 3184.42, vol: 0.011, tvl: 41_800_000, supply: 120_000_000 },
  { symbol: 'WETH', name: 'Wrapped Ether', decimals: 18, tags: ['blue'], price: 3183.9, vol: 0.011, tvl: 38_400_000, supply: 2_400_000 },
  { symbol: 'USDC', name: 'USD Coin', decimals: 6, tags: ['stable'], price: 1.0, vol: 0.0004, tvl: 52_100_000, supply: 52_000_000 },
  { symbol: 'USDT', name: 'Tether USD', decimals: 6, tags: ['stable'], price: 0.9998, vol: 0.0005, tvl: 18_900_000, supply: 19_000_000 },
  { symbol: 'GIWA', name: 'Giwa', decimals: 18, tags: ['eco', 'blue'], price: 2.417, vol: 0.028, tvl: 24_600_000, supply: 1_000_000_000 },
  { symbol: 'TPK', name: 'Topoki', decimals: 18, tags: ['eco'], price: 0.4192, vol: 0.045, tvl: 9_800_000, supply: 100_000_000 },
  { symbol: 'KRWS', name: 'Korean Won Stable', decimals: 6, tags: ['stable'], price: 0.000724, vol: 0.0006, tvl: 7_450_000, supply: 10_000_000_000 },
  { symbol: 'WBTC', name: 'Wrapped Bitcoin', decimals: 8, tags: ['blue'], price: 91_240.0, vol: 0.009, tvl: 14_200_000, supply: 155 },
  { symbol: 'gwETH', name: 'Giwa Staked Ether', decimals: 18, tags: ['lst'], price: 3341.08, vol: 0.012, tvl: 11_300_000, supply: 3_400 },
  { symbol: 'TILE', name: 'Roof Tile Protocol', decimals: 18, tags: ['eco'], price: 1.084, vol: 0.052, tvl: 3_900_000, supply: 42_000_000 },
  { symbol: 'MOCHI', name: 'Mochi Cat', decimals: 18, tags: ['meme'], price: 0.00318, vol: 0.11, tvl: 2_140_000, supply: 1_000_000_000 },
  { symbol: 'KIMCHI', name: 'Kimchi Finance', decimals: 18, tags: ['meme'], price: 0.0471, vol: 0.09, tvl: 1_620_000, supply: 88_000_000 },
  { symbol: 'SOJU', name: 'Soju', decimals: 18, tags: ['meme'], price: 0.00912, vol: 0.13, tvl: 940_000, supply: 420_690_000 },
  { symbol: 'HANOK', name: 'Hanok DAO', decimals: 18, tags: ['eco'], price: 6.208, vol: 0.038, tvl: 2_780_000, supply: 5_000_000 },
]

const POINTS = 168 // 7 days, hourly

export const TOKENS: Token[] = SEEDS.map((s) => {
  const series = walk('px:' + s.symbol, POINTS, s.price, s.vol)
  const last = series[series.length - 1]
  const d1 = series[series.length - 25]
  const d7 = series[0]
  const rnd = mulberry32(hashSeed('meta:' + s.symbol))
  return {
    symbol: s.symbol,
    name: s.name,
    address: s.symbol === 'ETH' ? '0x' + 'e'.repeat(40) : hexAddress('tok:' + s.symbol),
    decimals: s.decimals,
    tags: s.tags,
    price: last,
    change24h: ((last - d1) / d1) * 100,
    change7d: ((last - d7) / d7) * 100,
    volume24h: s.tvl * (0.18 + rnd() * 0.9),
    tvl: s.tvl,
    fdv: last * s.supply,
    holders: Math.floor(1200 + rnd() * 84_000),
    series,
    balance: 0,
  }
})

export const TOKEN_MAP: Record<string, Token> = Object.fromEntries(
  TOKENS.map((t) => [t.symbol, t]),
)

export function token(symbol: string): Token {
  return TOKEN_MAP[symbol] ?? TOKENS[0]
}

/* ----------------------------------------------------------------- pools -- */

const PAIRS: [string, string, number][] = [
  ['ETH', 'USDC', 5],
  ['GIWA', 'ETH', 30],
  ['GIWA', 'USDC', 30],
  ['TPK', 'ETH', 30],
  ['TPK', 'USDC', 30],
  ['USDC', 'USDT', 1],
  ['WBTC', 'ETH', 5],
  ['gwETH', 'ETH', 5],
  ['KRWS', 'USDC', 1],
  ['TILE', 'GIWA', 30],
  ['MOCHI', 'ETH', 100],
  ['KIMCHI', 'USDC', 100],
  ['SOJU', 'GIWA', 100],
  ['HANOK', 'USDC', 30],
  ['WETH', 'ETH', 1],
  ['MOCHI', 'TPK', 100],
]

export const POOLS: Pool[] = PAIRS.map(([base, quote, feeBps]) => {
  const id = `${base}-${quote}-${feeBps}`
  const rnd = mulberry32(hashSeed('pool:' + id))
  const tvl = Math.min(token(base).tvl, token(quote).tvl) * (0.12 + rnd() * 0.5)
  const volume24h = tvl * (0.1 + rnd() * 1.6)
  const fees24h = (volume24h * feeBps) / 10_000
  return {
    id,
    base,
    quote,
    feeBps,
    tvl,
    volume24h,
    fees24h,
    apr: ((fees24h * 365) / tvl) * 100,
    series: walk('pool:' + id, POINTS, tvl, 0.02),
  }
})

export function findPool(a: string, b: string): Pool | undefined {
  return POOLS.filter(
    (p) => (p.base === a && p.quote === b) || (p.base === b && p.quote === a),
  ).sort((x, y) => y.tvl - x.tvl)[0]
}

export function poolsFor(symbol: string): Pool[] {
  return POOLS.filter((p) => p.base === symbol || p.quote === symbol).sort(
    (a, b) => b.tvl - a.tvl,
  )
}

/* ---------------------------------------------------------------- quoting -- */

export interface Hop {
  pool: Pool
  from: string
  to: string
}

export interface Quote {
  amountIn: number
  amountOut: number
  /** execution price expressed as `out per in` */
  rate: number
  /** mid price with no fee and no depth, for comparison */
  midRate: number
  priceImpact: number
  feeUsd: number
  route: Hop[]
  minReceived: number
  valueUsd: number
  ok: boolean
  reason?: string
}

/** Constant-product fill against reserves implied by the pool's TVL. */
function fill(pool: Pool, from: string, to: string, amountIn: number) {
  const half = pool.tvl / 2
  const rIn = half / token(from).price
  const rOut = half / token(to).price
  const inAfterFee = amountIn * (1 - pool.feeBps / 10_000)
  const out = (rOut * inAfterFee) / (rIn + inAfterFee)
  return { out, rIn, rOut, feeUsd: amountIn * (pool.feeBps / 10_000) * token(from).price }
}

const HUBS = ['ETH', 'USDC', 'GIWA']

export function route(from: string, to: string): Hop[] {
  if (from === to) return []
  const direct = findPool(from, to)
  if (direct) return [{ pool: direct, from, to }]

  let best: { hops: Hop[]; tvl: number } | null = null
  for (const hub of HUBS) {
    if (hub === from || hub === to) continue
    const a = findPool(from, hub)
    const b = findPool(hub, to)
    if (!a || !b) continue
    const tvl = Math.min(a.tvl, b.tvl)
    if (!best || tvl > best.tvl) {
      best = {
        tvl,
        hops: [
          { pool: a, from, to: hub },
          { pool: b, from: hub, to },
        ],
      }
    }
  }
  return best?.hops ?? []
}

export function quote(from: string, to: string, amountIn: number, slippageBps = 50): Quote {
  const hops = route(from, to)
  const midRate = token(from).price / token(to).price
  const empty: Quote = {
    amountIn,
    amountOut: 0,
    rate: midRate,
    midRate,
    priceImpact: 0,
    feeUsd: 0,
    route: hops,
    minReceived: 0,
    valueUsd: 0,
    ok: false,
  }

  if (from === to) return { ...empty, reason: 'Select two different tokens' }
  if (hops.length === 0) return { ...empty, reason: 'No route found' }
  if (!(amountIn > 0)) return { ...empty, reason: 'Enter an amount' }

  let carry = amountIn
  let feeUsd = 0
  for (const hop of hops) {
    const r = fill(hop.pool, hop.from, hop.to, carry)
    carry = r.out
    feeUsd += r.feeUsd
  }

  const rate = carry / amountIn
  const priceImpact = Math.max(0, (1 - rate / midRate) * 100)
  return {
    amountIn,
    amountOut: carry,
    rate,
    midRate,
    priceImpact,
    feeUsd,
    route: hops,
    minReceived: carry * (1 - slippageBps / 10_000),
    valueUsd: amountIn * token(from).price,
    ok: true,
  }
}

/* ------------------------------------------------------------ activity -- */

const ACCOUNTS = Array.from({ length: 24 }, (_, i) => hexAddress('acct:' + i))

export function recentTrades(count = 40, now = Date.now()): Trade[] {
  const rnd = mulberry32(hashSeed('trades'))
  // walk backwards in time by accumulating gaps, so the list is always
  // strictly newest-first no matter what the gaps come out to
  let elapsed = 0
  return Array.from({ length: count }, (_, i) => {
    const pool = POOLS[Math.floor(rnd() * POOLS.length)]
    const flip = rnd() > 0.5
    const from = flip ? pool.base : pool.quote
    const to = flip ? pool.quote : pool.base
    const valueUsd = 40 * Math.pow(10, rnd() * 3.6)
    const amountIn = valueUsd / token(from).price
    const kindRoll = rnd()
    const kind: TxKind = kindRoll > 0.88 ? 'add' : kindRoll > 0.8 ? 'remove' : 'swap'
    elapsed += 14 + rnd() * 420
    return {
      hash: hexAddress('tx:' + i).replace('0x', '0x') + hexAddress('tx2:' + i).slice(2, 26),
      kind,
      from,
      to,
      amountIn,
      amountOut: (valueUsd / token(to).price) * (1 - pool.feeBps / 10_000),
      valueUsd,
      ts: now - Math.floor(elapsed * 1000),
      account: ACCOUNTS[Math.floor(rnd() * ACCOUNTS.length)],
    }
  })
}

/* ----------------------------------------------------------- aggregates -- */

export const STATS = {
  tvl: POOLS.reduce((a, p) => a + p.tvl, 0),
  volume24h: POOLS.reduce((a, p) => a + p.volume24h, 0),
  fees24h: POOLS.reduce((a, p) => a + p.fees24h, 0),
  pools: POOLS.length,
  tokens: TOKENS.length,
}

/* ------------------------------------------------------------- portfolio -- */

export interface Holding {
  symbol: string
  balance: number
  valueUsd: number
  costBasis: number
}

export interface Position {
  poolId: string
  base: string
  quote: string
  feeBps: number
  valueUsd: number
  uncollectedFees: number
  share: number
  inRange: boolean
  min: number
  max: number
}

const DEMO_BALANCES: Record<string, number> = {
  ETH: 4.281,
  USDC: 12_450.22,
  GIWA: 8_400,
  TPK: 26_500,
  MOCHI: 4_200_000,
  WBTC: 0.1042,
  KRWS: 3_200_000,
  gwETH: 1.75,
}

export function demoHoldings(): Holding[] {
  return Object.entries(DEMO_BALANCES)
    .map(([symbol, balance]) => {
      const t = token(symbol)
      const rnd = mulberry32(hashSeed('basis:' + symbol))
      return {
        symbol,
        balance,
        valueUsd: balance * t.price,
        costBasis: balance * t.price * (0.62 + rnd() * 0.55),
      }
    })
    .sort((a, b) => b.valueUsd - a.valueUsd)
}

export function demoPositions(): Position[] {
  return ['GIWA-ETH-30', 'TPK-USDC-30', 'ETH-USDC-5', 'MOCHI-ETH-100']
    .map((id) => POOLS.find((p) => p.id === id))
    .filter((p): p is Pool => Boolean(p))
    .map((p) => {
      const rnd = mulberry32(hashSeed('pos:' + p.id))
      const valueUsd = 800 + rnd() * 18_000
      const mid = token(p.base).price / token(p.quote).price
      const width = 0.18 + rnd() * 0.5
      return {
        poolId: p.id,
        base: p.base,
        quote: p.quote,
        feeBps: p.feeBps,
        valueUsd,
        uncollectedFees: valueUsd * (0.002 + rnd() * 0.03),
        share: valueUsd / p.tvl,
        inRange: rnd() > 0.25,
        min: mid * (1 - width),
        max: mid * (1 + width * 0.9),
      }
    })
}

/** Portfolio value over the last 7 days, hourly. */
export function portfolioSeries(holdings: Holding[]): number[] {
  return Array.from({ length: POINTS }, (_, i) =>
    holdings.reduce((sum, h) => sum + h.balance * token(h.symbol).series[i], 0),
  )
}
