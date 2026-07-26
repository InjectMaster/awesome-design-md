# TOPOKI

```
 /\_/\
( o.o )   TOPOKI — an ASCII-native DEX on GIWA
 > ^ <
```

A decentralized exchange front end for **GIWA**, the Ethereum Layer 2 built on the OP
Stack by Dunamu / Upbit. Three pages — **Swap**, **Explore**, **Portfolio** — drawn as
a monochrome terminal with a single ember accent. The mascot is typed; charts, logos,
meters and textures are ordered-dithered pixels. Nothing is an image file.

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

## Review loop

`npm run dev` mounts the [Agentation](https://agentation.com) toolbar, bottom
right. Click it, click any element — or drag across several, or over empty space —
write a note, and **Copy** puts structured output on the clipboard: selector, DOM
path, bounding box, CSS classes, nearby text. Paste that to an agent and it lands
on the right line without a round of *which button did you mean*. The toolbar also
pauses every animation, which is how you annotate the dithered button mid-cycle or
the ticker mid-scroll.

To skip the clipboard and let the agent read annotations directly:

```bash
npx agentation-mcp                                   # serves on :4747
VITE_AGENTATION_ENDPOINT=http://localhost:4747 npm run dev
```

The toolbar is on in dev and in preview builds started with `VITE_AGENTATION=1`.
It is a `devDependency` behind a lazy import, so a production build never pulls it
in — `npm run build` is unaffected.

## Stack

React 19 · TypeScript · Vite 8 · Tailwind CSS 4 · React Router 7. The app is set in a
single self-hosted face, **Geist Pixel**; Korean copy asks for Pretendard and falls
back to a system face rather than shipping a second webfont. Charts are dither-kit
(MIT) vendored into `src/components/dither-kit/`, not a dependency. Nothing is
fetched from a third party at runtime.

## Layout

```
src/
  lib/
    ascii.ts       mascot, wordmark glyph table, roofline generator, scramble
    dither.ts      the Bayer paint engine — vendored from dither-kit (MIT)
    market.ts      seeded market: tokens, pools, routing, quoting, activity
    chain.ts       GIWA network parameters
    wallet.tsx     EIP-1193 connector + demo account
    portfolio.ts   balances, holdings, LP positions
    format.ts      every number in the app passes through here
  components/
    dither-kit/    vendored chart parts: paint, palette, scales, polar, tooltip…
    primitives.tsx Panel, Button, Badge, Delta, Tabs, TokenMark, Scramble…
    PixelArt.tsx   AsciiArt cells, painted wordmark + roofline, PixelSpark
    DitherChart.tsx  area/line chart   DitherPie.tsx  allocation ring
    DitherBar.tsx  meters             charts.tsx     Spark + BarRow wrappers
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
never encodes direction on its own — the caret and brightness do.
