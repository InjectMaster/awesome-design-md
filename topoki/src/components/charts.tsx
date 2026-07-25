import { PixelSpark } from './PixelArt'
import { DitherBar } from './DitherBar'

/* -------------------------------------------------------------- sparkline --
   A table-row trend line, painted. It used to be braille characters, which the
   page face does not carry — so it is a canvas now, on the same engine as the
   charts.
   -------------------------------------------------------------------------*/

export function Spark({
  series,
  width = 92,
  className,
}: {
  series: number[]
  width?: number
  className?: string
}) {
  return <PixelSpark series={series} width={width} height={20} className={className} />
}

/* --------------------------------------------------------------- bar rows --
   Allocation bars made of block characters.
   -------------------------------------------------------------------------*/

export function BarRow({
  label,
  ratio,
  value,
}: {
  label: string
  ratio: number
  value: string
}) {
  return (
    <div className="flex items-center gap-3 py-1 text-xs">
      <span className="w-16 shrink-0 truncate text-ash">{label}</span>
      <DitherBar ratio={ratio} className="max-w-[168px] flex-1" />
      <span className="tnum shrink-0 text-smoke">{value}</span>
    </div>
  )
}
