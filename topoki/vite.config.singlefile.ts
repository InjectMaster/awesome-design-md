import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import path from 'node:path'

/**
 * Builds the whole app — scripts, styles and webfonts — into one HTML file
 * with no external requests, for hosts that only serve a single static page.
 * Routing switches to the hash so deep links work without rewrite rules.
 *
 *   npx vite build --config vite.config.singlefile.ts
 */
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  define: {
    'import.meta.env.VITE_HASH_ROUTER': JSON.stringify('1'),
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    outDir: 'dist-singlefile',
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
    cssCodeSplit: false,
    emptyOutDir: true,
  },
})
