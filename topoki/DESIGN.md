# TOPOKI — DESIGN.md

ASCII-native decentralized exchange on **GIWA**, Korea's Ethereum Layer 2.
Black, bone, one ember. Everything that is not a rectangle is made of characters.

---

## 1. Concept

**기와 (giwa)** is the curved clay roof tile of a Korean hanok. GIWA the chain takes
its name from it: *"as roof tiles interlock to form a roof, small connections become
great trust."* **토포키 (topoki)** is the street food — chewy, red with gochujang,
sold from a cart on the same street the hanok stands on.

That pairing sets the whole art direction: **an austere black terminal, with exactly
one hot orange in it.** The mascot is a kitten drawn in ASCII, because a DEX built on
a chain named after roof tiles should have something sitting on the roof.

Three rules govern every decision:

1. **Monospace or nothing.** The interface is a character grid. Charts, logos, meters,
   route diagrams and textures are all glyphs, not images.
2. **One accent.** Orange marks what is interactive, live, or yours. Nothing else is
   coloured — including gains and losses, which are read from `▲`/`▼` and brightness.
3. **Square, hairline, dense.** No rounded corners anywhere. No shadows except a single
   ember bloom. Borders are 1px and nearly black.

---

## 2. Colour

| Token | Value | Use |
|---|---|---|
| `void` | `#050505` | page ground |
| `ink` | `#0a0a0a` | raised panels |
| `ink-2` | `#101010` | inset fields, table hover |
| `ink-3` | `#161616` | pressed / nested |
| `line` | `#1d1d1c` | default hairline |
| `line-2` | `#2a2a28` | hover hairline, scrollbars |
| `line-3` | `#3c3c39` | corner ticks, active hairline |
| `bone` | `#f5f5f0` | primary text — off-white, never `#fff` |
| `ash` | `#9a9a94` | secondary text |
| `smoke` | `#6b6b66` | tertiary, labels |
| `dust` | `#4a4a46` | disabled, punctuation, placeholders |
| `ember` | `#ff3b0d` | **the accent** — actions, live, focus, yours |
| `ember-soft` | `#ff7a4d` | accent hover |
| `ember-dim` | `#b32908` | accent pressed |
| `alert` | `#ff2200` | destructive / wrong network only |

**Ember budget.** At most three ember elements should be visible in one viewport:
the primary action, the live indicator, and the data series. If a fourth appears,
one of them is not important.

**No green, no red-for-loss.** Direction is carried by `▲` / `▼` / `·` and by
brightness — gains in `bone`, losses in `smoke`. This is the strictest rule in the
system and the one that makes the whole thing look composed rather than crypto.

---

## 3. Type

Two faces, split by job — not by taste.

- **`Geist Pixel`** is the page face: prose, labels, buttons, token names, and any
  headline figure that stands on its own (net worth, mid price, the swap amounts).
  A pixel display face with a big x-height, so it holds up at 10px.
- **`JetBrains Mono`** is the data face: every figure that shares a column with
  another figure, and every piece of character art. Geist Pixel is proportional
  and ships no tabular figures — it sets `1` narrower than `4`, so a column of
  prices in it comes out ragged and a ticking counter jumps on each digit. It also
  covers no block, box-drawing or braille glyphs, which is the entire alphabet the
  art is drawn from.
- **Korean copy** is set in **Pretendard** — the face GIWA itself uses.

Three utilities carry the split, and nothing else should set a family:

| Utility | Face | For |
|---|---|---|
| *(default)* | Geist Pixel | all prose, labels, buttons |
| `figure` | Geist Pixel | a headline number with nothing to line up against |
| `tnum` | JetBrains Mono | any number in a column, and anything that ticks |
| `ascii` | JetBrains Mono | character art — mascot, wordmark, roofline, meters |

A column of digits must never reflow. That rule outranks the choice of face.

| Role | Spec |
|---|---|
| Display | `700`, uppercase, `-0.02em`, `0.95` leading, **terminated with a period** — `NOTHING TO SHOW.` |
| Page figure | `2.5–3rem`, tabular, `bone` |
| Panel title | `10px`, `0.18em`, uppercase, `ash`, wrapped in dim `[` `]` |
| Label | `10px`, `0.18em`, uppercase, `smoke` |
| Body | `12px`, `ash`, `1.6` leading |
| Data cell | `12px`, tabular, `bone` for primary column, `ash` for the rest |
| Button | `12px`, uppercase, `0.14em` |

The bracketed panel title (`[SWAP]`, `[RECENT TRADES]`) and the `›` prompt are the
two typographic signatures. Use them consistently or not at all.

---

## 4. Geometry & surface

- **Radius: 0.** Everywhere. The only curve permitted is the ember bloom.
- **Borders: 1px**, `line`. Panels sit on `ink`; fields inset on `ink-2`.
- **Corner ticks.** Every panel draws 7px L-brackets at its top-left and bottom-right
  in `line-3`, which warm to ember on hover. This is the frame motif — it replaces
  shadows entirely.
- **Spacing** is a 4px grid: `12px` inside dense panels, `16px` at page level, `4px`
  between related figures.
- **Four background layers**, in order: 64px engineering grid → 4px dot matrix →
  3px scanlines → one ember bloom at 9% behind the top of the page, then a vignette
  that returns the edges to `void`.

---

## 5. The ASCII layer

This is what makes it TOPOKI rather than another dark DEX.

- **Mascot.** A kitten at three densities: a 3-line mark (`/\_/\` `( o.o )` `> ^ <`)
  in the header that blinks on an irregular 3–7s cadence; an 8-line sitting kitten
  for empty states and the boot screen; alarmed and sleeping variants for errors and
  no-results.
- **Wordmark.** A 5-row block face (`█`) assembled at runtime from a glyph table, so
  columns can never drift.
- **Charts.** Price history is **ordered-dithered** on a low-resolution canvas
  scaled up `pixelated`: a 4×4 Bayer matrix decides each 2px cell, dense at the
  floor and dissolving upward toward the value line, with a blurred additive copy
  behind it for the ember bloom. Fill strength is held at 0.6 — at full strength
  the floor goes solid and one chart spends the page's whole ember budget.
  Allocation meters run the same matrix at constant vertical density, dissolving
  toward the tip. Engine vendored from dither-kit (MIT); see `lib/dither.ts`.
- **Sparklines.** Dense table rows keep single-row **braille** plots — 2×4 dots per
  character, selectable text, and legible at 13px where a 2px dither cell is mush.
- **Roofline.** A 기와 roof drawn in `▁ █ ╱‾╲ │` runs edge-to-edge along the bottom of
  the viewport at low opacity. This is the direct quote from GIWA's own brand texture.
- **Token marks.** No logo images. Each token is a two-letter monogram in a hairline
  box with a single corner pip whose position is hashed from the symbol.
- **Route diagram.** Swap routes are wire diagrams: boxed tokens joined by `──▶` with
  the fee tier above each hop.
- **Boot.** A ~1.8s cold start prints chain, RPC, pool count and `ok`, once per tab,
  skipped entirely under `prefers-reduced-motion`.

---

## 6. Motion

Restrained and mechanical. Everything eases on `cubic-bezier(0.22, 1, 0.36, 1)`.

| Motion | Spec |
|---|---|
| Cursor blink | `steps(1)`, ~1s |
| Live dot | opacity `0.5 → 1`, 2.6s |
| Price tape | 44s linear, seamless two-strip loop, masked at both edges |
| Flip control | 180° rotate, 300ms |
| Panel entry | 10px rise + fade, 500ms |
| Hover | colour and border only, 200ms — **nothing moves on hover** |

All of it collapses to ~0ms under `prefers-reduced-motion: reduce`.

---

## 7. Components

**Panel** — hairline box, corner ticks, optional bracketed title bar with actions on
the right. Three tones: `raised` (`ink`), `default` (translucent), `flush`.

**Button** — four variants: `primary` (solid ember, void text), `outline` (hairline,
goes ember on hover), `quiet` (filled `ink-2`), `ghost`. Three heights: 28 / 36 / 52.
Disabled drops to 45% and stops responding to hover.

**Field** — inset `ink-2` box: label and balance on the top row, a `2xl` tabular amount
on the left, token selector on the right, USD value beneath in `dust`.

**Table** — sticky `ink` head with `label` type, sortable columns marked by `▲`/`▼` in
ember, rows separated by `line/70`, `ink-2` on hover, first cell `bone` and the rest
`ash`.

**Modal** — `void/85` + 2px blur + dot matrix over the page, square `ink` dialog with a
bracketed title and an ember-tinted bloom. Escape closes; body scroll locks.

**Status bar** — sticky instrument strip: live dot, chain, block height ticking at the
chain's real cadence, gas, preconfirmation latency, UTC clock, then explorer/faucet
links and a build tag.

---

## 8. Voice

Terminal-plain, lowercase in system output (`› router ........ simulated`), sentence
case in prose, ALL CAPS with a period for display lines. Never exclaim. Say what a
number is and where it came from — a demo build says it is a demo build, on the screen,
in `dust`.

---

## 9. Applying this

Copy this file into a project root and tell an agent: *"build me a page that looks like
this."* The three rules in §1 do most of the work; §2 and §5 do the rest.
