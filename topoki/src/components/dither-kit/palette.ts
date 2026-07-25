// Shared seed palette for the dither chart family.
//
// TOPOKI note: the upstream seeds (green/blue/purple/pink/red) are replaced by
// the app's own two-tone system — one ember, one ash — so a chart can never
// introduce a colour the design system does not have. The seed *shape*
// (fill/line/star) is upstream's, and `orange` keeps its name so kit
// components that default to it land on the accent.

export type Rgb = [number, number, number]

export type DitherColor =
  | "orange"
  | "ember"
  | "green"
  | "blue"
  | "purple"
  | "pink"
  | "red"
  | "grey"
  | "ash"
  | "bone"

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
  // upstream's hues, kept for charts that must separate many series by colour
  // (the allocation ring). Everything else in TOPOKI still runs on ember alone.
  green: { fill: [40, 210, 110], line: [150, 255, 180], star: [200, 255, 220] },
  blue: { fill: [53, 143, 243], line: [150, 200, 255], star: [205, 228, 255] },
  purple: { fill: [150, 110, 255], line: [200, 175, 255], star: [225, 210, 255] },
  pink: { fill: [240, 90, 190], line: [255, 170, 220], star: [255, 205, 235] },
  red: { fill: [240, 70, 70], line: [255, 150, 140], star: [255, 195, 185] },
  grey: ASH,
  ash: ASH,
  bone: BONE,
}

/** Slice order for multi-series charts — ember first, so the accent still leads. */
export const SERIES_COLORS: DitherColor[] = [
  "ember",
  "blue",
  "green",
  "purple",
  "pink",
  "red",
  "orange",
  "grey",
]

export const rgb = ([r, g, b]: Rgb, k = 1, a = 1) =>
  `rgba(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)},${a})`

export const seedOfColor = (color: DitherColor): Seed => PALETTE[color]

export const isDitherColor = (value: unknown): value is DitherColor =>
  typeof value === "string" && value in PALETTE
