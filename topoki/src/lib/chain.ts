/* =========================================================================
   chain.ts — GIWA network parameters.

   GIWA (기와 — the curved roof tile of a hanok) is an Ethereum Layer 2 built
   on the OP Stack by Dunamu / Upbit: 1s blocks, 200ms preconfirmations via
   Flashblocks, ETH for gas, and no native token.

   As of this build only GIWA Sepolia is public. Chain ID 9134 is reserved
   for mainnet but is still marked incubating upstream — no RPC and no
   explorer exist for it — so TOPOKI targets the testnet and says so.
   ========================================================================= */

export interface ChainConfig {
  key: 'mainnet' | 'sepolia'
  chainId: number
  hexChainId: string
  name: string
  shortName: string
  /** false while the network has no public endpoints */
  live: boolean
  testnet: boolean
  rpcUrls: string[]
  /** Flashblocks endpoint serving ~200ms preconfirmations */
  preconfRpcUrl?: string
  explorer: string
  explorerName: string
  faucet?: string
  currency: { name: string; symbol: string; decimals: number }
  blockTimeMs: number
  preconfMs?: number
  settlement: string
}

export const GIWA_SEPOLIA: ChainConfig = {
  key: 'sepolia',
  chainId: 91342,
  hexChainId: '0x164ce',
  name: 'GIWA Sepolia',
  shortName: 'GIWA-SEP',
  live: true,
  testnet: true,
  rpcUrls: ['https://sepolia-rpc.giwa.io'],
  preconfRpcUrl: 'https://sepolia-rpc-flashblocks.giwa.io',
  explorer: 'https://sepolia-explorer.giwa.io',
  explorerName: 'GIWA Sepolia Explorer',
  faucet: 'https://faucet.giwa.io',
  currency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
  blockTimeMs: 1000,
  preconfMs: 200,
  settlement: 'Ethereum Sepolia',
}

/** Reserved, not yet launched. Kept here so the switch is a one-line change. */
export const GIWA_MAINNET: ChainConfig = {
  key: 'mainnet',
  chainId: 9134,
  hexChainId: '0x23ae',
  name: 'GIWA',
  shortName: 'GIWA',
  live: false,
  testnet: false,
  rpcUrls: [],
  explorer: '',
  explorerName: 'GIWA Explorer',
  currency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  blockTimeMs: 1000,
  preconfMs: 200,
  settlement: 'Ethereum',
}

export const CHAINS = [GIWA_SEPOLIA, GIWA_MAINNET]

/** The network the app targets. */
export const DEFAULT_CHAIN = GIWA_SEPOLIA

export function chainById(id: number): ChainConfig | undefined {
  return CHAINS.find((c) => c.chainId === id && c.live)
}

export function txUrl(chain: ChainConfig, hash: string): string {
  return chain.explorer ? `${chain.explorer}/tx/${hash}` : '#'
}

export function addressUrl(chain: ChainConfig, address: string): string {
  return chain.explorer ? `${chain.explorer}/address/${address}` : '#'
}
