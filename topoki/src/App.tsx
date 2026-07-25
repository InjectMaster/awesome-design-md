import { useEffect, useState } from 'react'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Backdrop, StatusBar, Ticker } from './components/Chrome'
import { Header } from './components/Header'
import { BootScreen } from './components/BootScreen'
import { Button } from './components/primitives'
import { AsciiArt } from './components/PixelArt'
import { SwapPage } from './pages/Swap'
import { ExplorePage } from './pages/Explore'
import { PortfolioPage } from './pages/Portfolio'
import { WalletProvider } from './lib/wallet'
import { CAT_ALERT } from './lib/ascii'

const BOOT_KEY = 'topoki:booted'

export default function App() {
  const [booting, setBooting] = useState(() => {
    if (typeof window === 'undefined') return false
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
    return sessionStorage.getItem(BOOT_KEY) !== '1'
  })

  const done = () => {
    sessionStorage.setItem(BOOT_KEY, '1')
    setBooting(false)
  }

  return (
    <WalletProvider>
      {booting && <BootScreen onDone={done} />}
      <Backdrop />
      <div className="relative z-10 flex min-h-dvh flex-col">
        <Header />
        <Ticker />
        <main className="flex-1">
          <ScrollTop />
          <Routes>
            <Route path="/" element={<Navigate to="/swap" replace />} />
            <Route path="/swap" element={<SwapPage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/portfolio" element={<PortfolioPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <StatusBar />
      </div>
    </WalletProvider>
  )
}

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => window.scrollTo(0, 0), [pathname])
  return null
}

function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
      <AsciiArt lines={CAT_ALERT} className="text-sm text-ember" />
      <h1 className="mt-8 text-2xl tracking-[0.3em] text-bone">404</h1>
      <p className="mt-3 text-xs text-smoke">
        This route does not exist on TOPOKI.
      </p>
      <Link to="/swap" className="mt-6">
        <Button variant="primary" size="lg">
          Back to swap
        </Button>
      </Link>
    </div>
  )
}
