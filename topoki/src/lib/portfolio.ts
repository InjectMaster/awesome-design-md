import { useMemo } from 'react'
import { useWallet } from './wallet'
import { demoHoldings, demoPositions, type Holding, type Position } from './market'

/**
 * Balances for the connected account. Injected wallets get the same demo
 * ledger for now — reading real ERC-20 balances is the first thing to wire
 * up when a token list and multicall address exist on GIWA.
 */
export function useBalances(): Record<string, number> {
  const { address } = useWallet()
  return useMemo(() => {
    if (!address) return {}
    return Object.fromEntries(demoHoldings().map((h) => [h.symbol, h.balance]))
  }, [address])
}

export function useHoldings(): Holding[] {
  const { address } = useWallet()
  return useMemo(() => (address ? demoHoldings() : []), [address])
}

export function usePositions(): Position[] {
  const { address } = useWallet()
  return useMemo(() => (address ? demoPositions() : []), [address])
}
