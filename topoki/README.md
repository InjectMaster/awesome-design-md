# TOPOKI

```
 /\_/\
( o.o )   TOPOKI — an ASCII-native DEX on GIWA
 > ^ <
```

A decentralized exchange front end for **GIWA**, the Ethereum Layer 2 built on the OP
Stack by Dunamu / Upbit. Three pages — **Swap**, **Explore**, **Portfolio** — drawn as
a monochrome terminal with a single ember accent. Charts, logos, meters and textures
are all made of characters.

The art direction is documented in [`DESIGN.md`](./DESIGN.md).

---

## Status: front end only

This build ships the complete interface and none of the chain plumbing:

- **Prices, pools, routes and activity are generated deterministically** by
  `src/lib/market.ts` from a fixed seed. They are stable across reloads and reviewable
  without a node, but they are not real market data.
- **Quotes are simulated.** `quote()` fills against constant-product reserves implied by
  each pool's TVL, including fee tiers, price impact, slippage and 2-hop routing through
  ETH / USDC / GIWA. The maths is real; the liquidity is not.
- **No transaction is ever broadcast.** Confirming a swap runs a scripted
  sign → broadcast → confirmed sequence against a fabricated hash.
- **Balances are demo balances**, the same ledger for the demo account and for an
  injected wallet. Reading real ERC-20 balances is the first thing to wire up.

Swapping in a real router and indexer means replacing `src/lib/market.ts` and
`src/lib/portfolio.ts`. No view component needs to change.

## Wallet

`src/lib/wallet.tsx` is a dependency-free **EIP-1193** connector — no wagmi, no
WalletConnect. It talks to `window.ethereum` directly:

- restores an existing session silently via `eth_accounts`
- connects with `eth_requestAccounts`, tracks `accountsChanged` / `chainChanged`
- switches to GIWA with `wallet_switchEthereumChain`, falling back to
  `wallet_addEthereumChain` on error `4902`
- offers a **demo account** when no wallet is installed, so the interface stays fully
  explorable (persisted in `localStorage`, cleared on disconnect)

## Network

Only **GIWA Sepolia** is public today, so that is what the app targets.

| | GIWA Sepolia | GIWA mainnet |
|---|---|---|
| Chain ID | `91342` (`0x164ce`) | `9134` — reserved, **not launched** |
| RPC | `https://sepolia-rpc.giwa.io` | none yet |
| Flashblocks RPC | `https://sepolia-rpc-flashblocks.giwa.io` (~200ms preconfs) | — |
| Explorer | `https://sepolia-explorer.giwa.io` | — |
| Faucet | `https://faucet.giwa.io` | — |
| Gas token | ETH (GIWA has no native token) | ETH |
| Block time | ~1s | ~1s |
| Settles to | Ethereum Sepolia | Ethereum |

Both are defined in `src/lib/chain.ts`; pointing the app at mainnet is a one-line
change to `DEFAULT_CHAIN` once endpoints exist. **Verify these values against the
official docs before pointing anything at real funds.**

## Run

```bash
npm install
npm run dev              # http://localhost:5173
npm run build            # typecheck + production bundle
npm run build:singlefile # one self-contained HTML file, no external requests
npm run lint
```

Requires Node 20+.

`build:singlefile` inlines scripts, styles and webfonts into a single
`dist-singlefile/index.html` and switches routing to the hash, for hosts that
serve one static page with no rewrite rules. `vercel.json` covers the normal
build with an SPA rewrite.

## Stack

React 19 · TypeScript · Vite 8 · Tailwind CSS 4 · React Router 7. Fonts (JetBrains
Mono, IBM Plex Mono, Pretendard) are self-hosted — the app makes no third-party
requests at runtime.

## Layout

```
src/
  lib/
    ascii.ts       mascot, wordmark font, braille plotter, roofline generator
    market.ts      seeded market: tokens, pools, routing, quoting, activity
    chain.ts       GIWA network parameters
    wallet.tsx     EIP-1193 connector + demo account
    portfolio.ts   balances, holdings, LP positions
    format.ts      every number in the app passes through here
  components/
    primitives.tsx Panel, Button, Badge, Delta, Tabs, TokenMark, Scramble…
    charts.tsx     braille chart, sparkline, allocation bars
    Chrome.tsx     backdrop, roofline, price tape, status bar
    Header.tsx     nav, network chip, wallet modal
    Modal.tsx      TokenSelect.tsx  BootScreen.tsx  Logo.tsx
  pages/
    Swap.tsx  Explore.tsx  Portfolio.tsx
```

## Accessibility

Focus is a 1px ember outline at 2px offset, never removed. All motion collapses under
`prefers-reduced-motion`, including the boot screen, which is skipped entirely. ASCII
art is `aria-hidden` with text alternatives on the elements that carry meaning. Colour
never encodes direction on its own — `▲` / `▼` and brightness do.
