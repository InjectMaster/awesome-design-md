import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

// The single-file build is served from a static path with no rewrite rules,
// so it routes on the hash instead.
const Router = import.meta.env.VITE_HASH_ROUTER === '1' ? HashRouter : BrowserRouter

// Annotation toolbar for review: click any element, leave a note, hand the
// structured output to an agent. On in dev, and in preview builds started with
// VITE_AGENTATION=1. The import is lazy so it stays out of a real production
// bundle entirely rather than merely going unrendered.
const reviewing = import.meta.env.DEV || import.meta.env.VITE_AGENTATION === '1'
const Agentation = reviewing
  ? lazy(() => import('agentation').then((m) => ({ default: m.Agentation })))
  : null

// Point this at an agentation-mcp server (default http://localhost:4747) to sync
// annotations straight to the agent; unset, the toolbar copies them instead.
const endpoint = import.meta.env.VITE_AGENTATION_ENDPOINT as string | undefined

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <App />
    </Router>
    {Agentation && (
      <Suspense fallback={null}>
        <Agentation endpoint={endpoint} />
      </Suspense>
    )}
  </StrictMode>,
)
