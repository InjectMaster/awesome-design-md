/** Number and address formatting. Every figure in TOPOKI passes through here. */

export function compact(n: number, digits = 2): string {
  const abs = Math.abs(n)
  if (abs >= 1e12) return (n / 1e12).toFixed(digits) + 'T'
  if (abs >= 1e9) return (n / 1e9).toFixed(digits) + 'B'
  if (abs >= 1e6) return (n / 1e6).toFixed(digits) + 'M'
  if (abs >= 1e3) return (n / 1e3).toFixed(digits) + 'K'
  return n.toFixed(digits)
}

export function usd(n: number, opts: { compact?: boolean } = {}): string {
  if (!Number.isFinite(n)) return '$—'
  if (opts.compact && Math.abs(n) >= 1000) return '$' + compact(n)
  if (Math.abs(n) > 0 && Math.abs(n) < 0.01) return '$<0.01'
  return (
    '$' +
    n.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: Math.abs(n) < 1 ? 4 : 2,
    })
  )
}

export function price(n: number): string {
  if (!Number.isFinite(n)) return '—'
  if (n >= 1000) return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 2 })
  if (n >= 1) return '$' + n.toFixed(3)
  if (n >= 0.01) return '$' + n.toFixed(4)
  return '$' + n.toPrecision(3)
}

export function amount(n: number, decimals = 6): string {
  if (!Number.isFinite(n)) return '0'
  if (n === 0) return '0'
  if (Math.abs(n) >= 1e6) return compact(n, 3)
  const d = Math.abs(n) >= 1 ? Math.min(decimals, 4) : decimals
  return Number(n.toFixed(d)).toLocaleString('en-US', { maximumFractionDigits: d })
}

export function pct(n: number, digits = 2): string {
  const s = Math.abs(n).toFixed(digits) + '%'
  return (n > 0 ? '+' : n < 0 ? '-' : '') + s
}

export function truncAddress(a: string, head = 6, tail = 4): string {
  if (!a) return ''
  return a.length <= head + tail + 2 ? a : `${a.slice(0, head)}…${a.slice(-tail)}`
}

export function ago(ts: number, now = Date.now()): string {
  const s = Math.max(0, Math.floor((now - ts) / 1000))
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

export function clockUTC(d = new Date()): string {
  return d.toISOString().slice(11, 19)
}
