import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cx } from '../lib/cx'

export function Modal({
  open,
  onClose,
  title,
  children,
  width = 'max-w-md',
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  width?: string
  footer?: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-void/85 backdrop-blur-[2px]"
      />
      <div className="bg-matrix pointer-events-none absolute inset-0 opacity-[0.35]" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          'animate-rise relative m-0 w-full border border-line-2 bg-ink shadow-[0_0_60px_-20px_rgba(255,90,31,0.35)] sm:m-4',
          width,
        )}
      >
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="label text-ash">
            <span className="text-dust">[</span>
            {title}
            <span className="text-dust">]</span>
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex size-6 items-center justify-center border border-line text-smoke transition-colors hover:border-ember hover:text-ember"
          >
            x
          </button>
        </header>
        <div className="max-h-[70vh] overflow-y-auto">{children}</div>
        {footer && <footer className="border-t border-line px-4 py-3">{footer}</footer>}
      </div>
    </div>,
    document.body,
  )
}
