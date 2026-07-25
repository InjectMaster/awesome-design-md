/**
 * Upstream declares this union in `chart-context.tsx`, which builds the whole
 * cartesian composition layer. TOPOKI renders its cartesian surface itself, so
 * that file is not installed and the type lives here instead — the only
 * divergence from the registry sources in this folder.
 */
export type AreaVariant = 'gradient' | 'solid' | 'dotted' | 'hatched'
