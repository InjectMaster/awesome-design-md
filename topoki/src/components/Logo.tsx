import { useEffect, useState } from 'react'
import { CAT_MARK, CAT_MARK_BLINK, wordmark } from '../lib/ascii'
import { cx } from '../lib/cx'

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
    <span
      aria-hidden
      className={cx(
        'ascii block text-ember transition-colors duration-300',
        size === 'sm' && 'text-[7px] leading-[1.1]',
        size === 'md' && 'text-[9px] leading-[1.1]',
        size === 'lg' && 'text-[14px] leading-[1.1]',
        className,
      )}
    >
      {art.join('\n')}
    </span>
  )
}

/** Block-face wordmark, assembled from the ASCII font. */
export function Wordmark({
  text = 'TOPOKI',
  className,
}: {
  text?: string
  className?: string
}) {
  return (
    <span aria-label={text} className={cx('ascii-grid block', className)}>
      {wordmark(text).join('\n')}
    </span>
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
