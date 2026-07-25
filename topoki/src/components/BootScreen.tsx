import { useEffect, useRef, useState } from 'react'
import { CAT_SIT, GIWA_PROVERB } from '../lib/ascii'
import { AsciiArt, PixelWordmark } from './PixelArt'
import { DEFAULT_CHAIN } from '../lib/chain'
import { STATS } from '../lib/market'
import { cx } from '../lib/cx'

const LINES = [
  'topoki boot v0.1.0',
  `chain ......... ${DEFAULT_CHAIN.name} (${DEFAULT_CHAIN.chainId})`,
  `rpc ........... ${DEFAULT_CHAIN.rpcUrls[0]}`,
  `pools ......... ${STATS.pools} indexed`,
  'router ........ simulated',
  'renderer ...... ascii/braille',
  'ok',
]

/**
 * A two second cold start. Runs once per tab, is skipped entirely for
 * visitors who prefer reduced motion, and any key or click cuts it short.
 */
export function BootScreen({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0)
  const [leaving, setLeaving] = useState(false)

  // stop advancing once the last line has printed, otherwise the tick below
  // would keep re-arming the exit timer and the screen would never leave
  useEffect(() => {
    if (step > LINES.length) return
    const id = setTimeout(() => setStep((s) => s + 1), 170)
    return () => clearTimeout(id)
  }, [step])

  // hold onDone in a ref so re-rendering can never cancel the exit timer
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  useEffect(() => {
    if (step <= LINES.length) return
    setLeaving(true)
    const id = setTimeout(() => doneRef.current(), 420)
    return () => clearTimeout(id)
  }, [step])

  useEffect(() => {
    const skip = () => setStep(LINES.length + 1)
    window.addEventListener('keydown', skip)
    window.addEventListener('pointerdown', skip)
    return () => {
      window.removeEventListener('keydown', skip)
      window.removeEventListener('pointerdown', skip)
    }
  }, [])

  return (
    <div
      className={cx(
        'fixed inset-0 z-100 flex flex-col items-center justify-center bg-void transition-opacity duration-400',
        leaving ? 'pointer-events-none opacity-0' : 'opacity-100',
      )}
    >
      <div className="bg-scanlines pointer-events-none absolute inset-0" />
      <div className="animate-flicker flex flex-col items-center">
        <AsciiArt lines={CAT_SIT} className="text-[11px] text-ember sm:text-sm" />
        <PixelWordmark className="mt-6 w-[180px] sm:w-[240px]" scale={4} />
      </div>

      <div className="mt-8 h-28 w-[300px] sm:w-[420px]">
        {LINES.slice(0, step).map((l, i) => (
          <div
            key={l}
            className="flex items-center gap-2 text-2xs text-smoke sm:text-xs"
          >
            <span className="text-ember">›</span>
            <span className={cx(i === LINES.length - 1 && 'text-ember')}>{l}</span>
          </div>
        ))}
        {step <= LINES.length && (
          <span className="animate-blink inline-block h-3 w-1.5 bg-ember" />
        )}
      </div>

      <p className="kr absolute bottom-16 max-w-md px-6 text-center text-2xs leading-relaxed text-dust">
        {GIWA_PROVERB}
      </p>
      <span className="label absolute bottom-8">press any key to skip</span>
    </div>
  )
}
