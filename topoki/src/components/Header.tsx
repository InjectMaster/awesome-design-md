import { NavLink } from 'react-router-dom'
import { useState } from 'react'
import { Lockup } from './Logo'
import { Button, Badge } from './primitives'
import { cx } from '../lib/cx'
import { Modal } from './Modal'
import { useWallet } from '../lib/wallet'
import { DEFAULT_CHAIN } from '../lib/chain'
import { truncAddress } from '../lib/format'

const NAV = [
  { to: '/swap', label: 'SWAP', key: 'S' },
  { to: '/explore', label: 'EXPLORE', key: 'E' },
  { to: '/portfolio', label: 'PORTFOLIO', key: 'P' },
]

export function Header() {
  const [walletOpen, setWalletOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const w = useWallet()

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-void/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-4 px-4 sm:px-6">
          <NavLink to="/swap" className="shrink-0" aria-label="TOPOKI home">
            <Lockup />
          </NavLink>

          {/* desktop nav */}
          <nav className="ml-6 hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cx(
                    'group relative flex h-9 items-center gap-2 px-3 text-xs tracking-[0.18em] transition-colors duration-200',
                    isActive ? 'text-bone' : 'text-smoke hover:text-ash',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={cx('text-dust', isActive && 'text-ember')}>
                      {isActive ? '▸' : ' '}
                    </span>
                    {item.label}
                    <span
                      className={cx(
                        'absolute inset-x-2 -bottom-px h-px transition-colors duration-200',
                        isActive ? 'bg-ember' : 'bg-transparent group-hover:bg-line-2',
                      )}
                    />
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <NetworkChip />
            {w.address ? (
              <Button
                variant="outline"
                onClick={() => setWalletOpen(true)}
                className="tnum normal-case"
              >
                <span className="size-1.5 bg-ember animate-ember-pulse" />
                {truncAddress(w.address)}
              </Button>
            ) : (
              <Button variant="primary" onClick={() => setWalletOpen(true)}>
                Connect
              </Button>
            )}
            <button
              className="flex size-9 items-center justify-center border border-line-2 text-ash md:hidden"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Menu"
            >
              {menuOpen ? 'x' : '='}
            </button>
          </div>
        </div>

        {/* mobile nav */}
        {menuOpen && (
          <nav className="border-t border-line bg-ink md:hidden">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  cx(
                    'flex h-12 items-center gap-3 border-b border-line px-5 text-xs tracking-[0.2em]',
                    isActive ? 'text-bone' : 'text-smoke',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={isActive ? 'text-ember' : 'text-dust'}>
                      {isActive ? '▸' : '·'}
                    </span>
                    {item.label}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <WalletModal open={walletOpen} onClose={() => setWalletOpen(false)} />
    </>
  )
}

function NetworkChip() {
  const w = useWallet()
  const live = w.chain ?? DEFAULT_CHAIN

  if (w.wrongNetwork) {
    return (
      <button
        onClick={w.switchToGiwa}
        className="hidden h-9 items-center gap-2 border border-alert/60 bg-alert/10 px-3 text-2xs tracking-[0.16em] text-alert uppercase sm:flex"
      >
        <span className="size-1.5 bg-alert" />
        Wrong network — switch
      </button>
    )
  }

  return (
    <span className="hidden h-9 items-center gap-2 border border-line-2 px-3 text-2xs tracking-[0.16em] text-ash uppercase sm:flex">
      <span className="size-1.5 bg-ember animate-ember-pulse" />
      {live.shortName}
    </span>
  )
}

function WalletModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const w = useWallet()

  return (
    <Modal open={open} onClose={onClose} title={w.address ? 'Account' : 'Connect'}>
      <div className="p-4">
        {w.address ? (
          <div className="space-y-4">
            <div className="corner-frame border border-line bg-ink-2 p-4">
              <div className="label mb-2">Address</div>
              <div className="tnum text-sm break-all text-bone">{w.address}</div>
              <div className="mt-3 flex items-center gap-2">
                <Badge tone={w.mode === 'demo' ? 'ember' : 'neutral'}>
                  {w.mode === 'demo' ? 'Demo account' : 'Injected'}
                </Badge>
                <Badge tone="mute">{(w.chain ?? DEFAULT_CHAIN).name}</Badge>
              </div>
            </div>
            {w.mode === 'demo' && (
              <p className="text-xs leading-relaxed text-smoke">
                Demo mode uses generated balances and simulated quotes. No transaction is
                ever broadcast.
              </p>
            )}
            <Button
              block
              variant="outline"
              onClick={() => {
                w.disconnect()
                onClose()
              }}
            >
              Disconnect
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <ConnectRow
              name="Browser wallet"
              hint={w.hasProvider ? 'Detected · EIP-1193' : 'Not detected'}
              disabled={!w.hasProvider}
              onClick={async () => {
                await w.connect()
                onClose()
              }}
            />
            <ConnectRow
              name="Demo account"
              hint="Explore the interface with generated balances"
              onClick={() => {
                w.connectDemo()
                onClose()
              }}
            />
            {w.error && (
              <p className="border border-alert/40 bg-alert/5 p-2 text-xs text-alert">
                {w.error}
              </p>
            )}
            <p className="pt-1 text-2xs leading-relaxed text-dust">
              TOPOKI never asks for your seed phrase. Connecting only shares your public
              address.
            </p>
          </div>
        )}
      </div>
    </Modal>
  )
}

function ConnectRow({
  name,
  hint,
  onClick,
  disabled,
}: {
  name: string
  hint: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cx(
        'corner-frame flex w-full items-center justify-between border border-line bg-ink-2 px-4 py-3 text-left transition-colors duration-200',
        disabled
          ? 'cursor-not-allowed opacity-40'
          : 'hover:border-ember/60 hover:bg-ink-3',
      )}
    >
      <span>
        <span className="block text-sm text-bone">{name}</span>
        <span className="block text-2xs text-smoke">{hint}</span>
      </span>
      <span className="text-ember">-&gt;</span>
    </button>
  )
}
