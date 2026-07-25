// Shared seed palette for the dither chart family.
//
// TOPOKI note: the upstream seeds (green/blue/purple/pink/red) are replaced by
// the app's own two-tone system — one ember, one ash — so a chart can never
// introduce a colour the design system does not have. The seed *shape*
// (fill/line/star) is upstream's, and `orange` keeps its name so kit
// components that default to it land on the accent.

export type Rgb = [number, number, number]

export type DitherColor = "orange" | "ember" | "grey" | "ash" | "bone"

export type Seed = { fill: Rgb; line: Rgb; star: Rgb }

const EMBER: Seed = {
  fill: [255, 59, 13],
  line: [255, 122, 77],
  star: [255, 170, 140],
}
const ASH: Seed = {
  fill: [107, 107, 102],
  line: [154, 154, 148],
  star: [190, 190, 184],
}
const BONE: Seed = {
  fill: [245, 245, 240],
  line: [245, 245, 240],
  star: [255, 255, 255],
}

export const PALETTE: Record<DitherColor, Seed> = {
  orange: EMBER,
  ember: EMBER,
  grey: ASH,
  ash: ASH,
  bone: BONE,
}

export const rgb = ([r, g, b]: Rgb, k = 1, a = 1) =>
  `rgba(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)},${a})`

export const seedOfColor = (color: DitherColor): Seed => PALETTE[color]

export const isDitherColor = (value: unknown): value is DitherColor =>
  typeof value === "string" && value in PALETTE
