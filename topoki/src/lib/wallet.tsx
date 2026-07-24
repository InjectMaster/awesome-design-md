/* =========================================================================
   wallet.tsx — a dependency-free EIP-1193 connector for GIWA.

   No wagmi, no walletconnect: TOPOKI talks to `window.ethereum` directly so
   the bundle stays small and the wire protocol stays legible. When no
   injected wallet is present the app offers a read-only demo account so the
   whole interface remains explorable.
   ========================================================================= */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { DEFAULT_CHAIN, chainById, type ChainConfig } from './chain'

interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] | object }): Promise<unknown>
  on?(event: string, handler: (...args: never[]) => void): void
  removeListener?(event: string, handler: (...args: never[]) => void): void
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider
  }
}

export type WalletMode = 'disconnected' | 'injected' | 'demo'

interface WalletState {
  mode: WalletMode
  address: string | null
  chainId: number | null
  chain: ChainConfig | null
  wrongNetwork: boolean
  hasProvider: boolean
  connecting: boolean
  error: string | null
  connect: () => Promise<void>
  connectDemo: () => void
  disconnect: () => void
  switchToGiwa: () => Promise<void>
}

const DEMO_ADDRESS = '0x7a0e70e5b3085f8199510ad5c9adf07c3b08c841'
const DEMO_KEY = 'topoki:demo'

const Ctx = createContext<WalletState | null>(null)

/** A demo session survives a reload; a real one is restored from the wallet. */
function restoreDemo(): boolean {
  try {
    return localStorage.getItem(DEMO_KEY) === '1'
  } catch {
    return false
  }
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<WalletMode>(() =>
    restoreDemo() ? 'demo' : 'disconnected',
  )
  const [address, setAddress] = useState<string | null>(() =>
    restoreDemo() ? DEMO_ADDRESS : null,
  )
  const [chainId, setChainId] = useState<number | null>(() =>
    restoreDemo() ? DEFAULT_CHAIN.chainId : null,
  )
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const provider = typeof window !== 'undefined' ? window.ethereum : undefined
  const hasProvider = Boolean(provider)

  /* --- restore a previous injected session silently ---------------------- */
  useEffect(() => {
    if (!provider || restoreDemo()) return
    let alive = true
    ;(async () => {
      try {
        const accounts = (await provider.request({ method: 'eth_accounts' })) as string[]
        if (!alive || !accounts?.length) return
        const id = (await provider.request({ method: 'eth_chainId' })) as string
        setAddress(accounts[0])
        setChainId(Number.parseInt(id, 16))
        setMode('injected')
      } catch {
        /* wallet locked or unavailable — stay disconnected */
      }
    })()
    return () => {
      alive = false
    }
  }, [provider])

  /* --- keep in sync with the wallet ------------------------------------- */
  useEffect(() => {
    if (!provider?.on) return
    const onAccounts = (...args: never[]) => {
      const accounts = args[0] as unknown as string[]
      if (!accounts?.length) {
        setMode('disconnected')
        setAddress(null)
      } else {
        setAddress(accounts[0])
      }
    }
    const onChain = (...args: never[]) => {
      setChainId(Number.parseInt(args[0] as unknown as string, 16))
    }
    provider.on('accountsChanged', onAccounts)
    provider.on('chainChanged', onChain)
    return () => {
      provider.removeListener?.('accountsChanged', onAccounts)
      provider.removeListener?.('chainChanged', onChain)
    }
  }, [provider])

  const connect = useCallback(async () => {
    if (!provider) {
      setError('No injected wallet detected')
      return
    }
    setConnecting(true)
    setError(null)
    try {
      const accounts = (await provider.request({
        method: 'eth_requestAccounts',
      })) as string[]
      const id = (await provider.request({ method: 'eth_chainId' })) as string
      setAddress(accounts[0])
      setChainId(Number.parseInt(id, 16))
      setMode('injected')
    } catch (e) {
      const err = e as { code?: number; message?: string }
      setError(err.code === 4001 ? 'Connection rejected' : (err.message ?? 'Connection failed'))
    } finally {
      setConnecting(false)
    }
  }, [provider])

  const switchToGiwa = useCallback(async () => {
    if (!provider) return
    setError(null)
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: DEFAULT_CHAIN.hexChainId }],
      })
    } catch (e) {
      const err = e as { code?: number; message?: string }
      // 4902 — chain unknown to the wallet, so add it.
      if (err.code === 4902 || err.code === -32603) {
        try {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: DEFAULT_CHAIN.hexChainId,
                chainName: DEFAULT_CHAIN.name,
                nativeCurrency: DEFAULT_CHAIN.currency,
                rpcUrls: DEFAULT_CHAIN.rpcUrls,
                blockExplorerUrls: [DEFAULT_CHAIN.explorer],
              },
            ],
          })
        } catch {
          setError('Could not add the GIWA network')
        }
      } else {
        setError(err.message ?? 'Network switch failed')
      }
    }
  }, [provider])

  const connectDemo = useCallback(() => {
    setAddress(DEMO_ADDRESS)
    setChainId(DEFAULT_CHAIN.chainId)
    setMode('demo')
    setError(null)
    try {
      localStorage.setItem(DEMO_KEY, '1')
    } catch {
      /* private mode — the session just won't survive a reload */
    }
  }, [])

  const disconnect = useCallback(() => {
    setMode('disconnected')
    setAddress(null)
    setChainId(null)
    setError(null)
    try {
      localStorage.removeItem(DEMO_KEY)
    } catch {
      /* nothing to clean up */
    }
  }, [])

  const value = useMemo<WalletState>(() => {
    const chain = chainId === null ? null : (chainById(chainId) ?? null)
    return {
      mode,
      address,
      chainId,
      chain,
      wrongNetwork: mode === 'injected' && chainId !== null && chain === null,
      hasProvider,
      connecting,
      error,
      connect,
      connectDemo,
      disconnect,
      switchToGiwa,
    }
  }, [
    mode,
    address,
    chainId,
    hasProvider,
    connecting,
    error,
    connect,
    connectDemo,
    disconnect,
    switchToGiwa,
  ])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useWallet(): WalletState {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useWallet must be used inside <WalletProvider>')
  return ctx
}
