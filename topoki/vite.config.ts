import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// Preview deployments carry the Agentation review toolbar; production never does.
// Vercel sets VERCEL_ENV at build time, so a preview needs no project config —
// VITE_AGENTATION=1 still forces it on anywhere else.
const agentation =
  process.env.VITE_AGENTATION ?? (process.env.VERCEL_ENV === 'preview' ? '1' : '')

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    'import.meta.env.VITE_AGENTATION': JSON.stringify(agentation),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
