import { useEffect, useState } from 'react'
import { CAT_MARK, CAT_MARK_BLINK } from '../lib/ascii'
import { cx } from '../lib/cx'
import { AsciiArt } from './PixelArt'

/** The kitten. Blinks on a lazy, slightly irregular cadence. */
export function CatMark({
  className,
  size = 'md',
}: {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const [blink, setBlink] = useState(false)

  useEffect(() => {
    let t: number
    const loop = () => {
      const wait = 2600 + Math.random() * 4200
      t = window.setTimeout(() => {
        setBlink(true)
        window.setTimeout(() => {
          setBlink(false)
          loop()
        }, 130)
      }, wait)
    }
    loop()
    return () => window.clearTimeout(t)
  }, [])

  const art = blink ? CAT_MARK_BLINK : CAT_MARK

  return (
    <AsciiArt
      lines={art}
      className={cx(
        'text-ember transition-colors duration-300',
        size === 'sm' && 'text-[8px]',
        size === 'md' && 'text-[10px]',
        size === 'lg' && 'text-[15px]',
        className,
      )}
    />
  )
}



/** Header lockup: kitten + name + chain tag. */
export function Lockup() {
  return (
    <span className="group flex items-center gap-2.5">
      <CatMark className="group-hover:text-ember-soft" />
      <span className="flex flex-col leading-none">
        <span className="text-[15px] font-semibold tracking-[0.34em] text-bone">
          TOPOKI
        </span>
        <span className="mt-1 text-[8px] tracking-[0.3em] text-smoke">
          DEX · GIWA L2
        </span>
      </span>
    </span>
  )
}
