import { useMemo, useState } from 'react'
import { Modal } from './Modal'
import { Badge, TokenMark } from './primitives'
import { TOKENS, token, type Token } from '../lib/market'
import { amount as fmtAmount, price as fmtPrice, usd } from '../lib/format'

const COMMON = ['ETH', 'USDC', 'GIWA', 'TPK', 'WBTC']

export function TokenSelect({
  open,
  onClose,
  onPick,
  exclude,
  balances,
}: {
  open: boolean
  onClose: () => void
  onPick: (symbol: string) => void
  exclude?: string
  balances?: Record<string, number>
}) {
  const [q, setQ] = useState('')

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return TOKENS.filter((t) => {
      if (t.symbol === exclude) return false
      if (!needle) return true
      return (
        t.symbol.toLowerCase().includes(needle) ||
        t.name.toLowerCase().includes(needle) ||
        t.address.toLowerCase().includes(needle)
      )
    }).sort((a, b) => {
      const ba = (balances?.[a.symbol] ?? 0) * a.price
      const bb = (balances?.[b.symbol] ?? 0) * b.price
      return bb - ba || b.tvl - a.tvl
    })
  }, [q, exclude, balances])

  return (
    <Modal open={open} onClose={onClose} title="Select token" width="max-w-lg">
      <div className="border-b border-line p-4">
        <div className="flex items-center gap-2 border border-line bg-ink-2 px-3 focus-within:border-ember/60">
          <span className="text-dust">/</span>
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, symbol or address"
            className="h-10 w-full bg-transparent text-sm outline-none"
          />
          {q && (
            <button onClick={() => setQ('')} className="text-dust hover:text-ash">
              ✕
            </button>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {COMMON.filter((s) => s !== exclude).map((s) => (
            <button
              key={s}
              onClick={() => {
                onPick(s)
                onClose()
              }}
              className="flex items-center gap-1.5 border border-line px-2 py-1 text-2xs tracking-[0.12em] text-ash transition-colors hover:border-ember/60 hover:text-bone"
            >
              <TokenMark symbol={s} size="sm" />
              {s}
            </button>
          ))}
        </div>
      </div>

      <ul className="divide-y divide-line">
        {list.map((t) => (
          <TokenRow
            key={t.symbol}
            t={t}
            balance={balances?.[t.symbol] ?? 0}
            onPick={() => {
              onPick(t.symbol)
              onClose()
            }}
          />
        ))}
        {list.length === 0 && (
          <li className="p-8 text-center">
            <pre className="ascii text-xs text-dust">
              {'  /\\_/\\ \n ( -.- )\nno match'}
            </pre>
          </li>
        )}
      </ul>
    </Modal>
  )
}

function TokenRow({
  t,
  balance,
  onPick,
}: {
  t: Token
  balance: number
  onPick: () => void
}) {
  return (
    <li>
      <button
        onClick={onPick}
        className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-ink-2"
      >
        <TokenMark symbol={t.symbol} />
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span className="text-sm text-bone">{t.symbol}</span>
            {t.tags.includes('stable') && <Badge tone="mute">stable</Badge>}
            {t.tags.includes('native') && <Badge tone="ember">gas</Badge>}
          </span>
          <span className="block truncate text-2xs text-smoke">{t.name}</span>
        </span>
        <span className="ml-auto text-right">
          <span className="tnum block text-sm text-bone">
            {balance > 0 ? fmtAmount(balance) : fmtPrice(t.price)}
          </span>
          <span className="tnum block text-2xs text-smoke">
            {balance > 0 ? usd(balance * token(t.symbol).price, { compact: true }) : 'no balance'}
          </span>
        </span>
      </button>
    </li>
  )
}
