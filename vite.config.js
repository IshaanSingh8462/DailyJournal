import { defineConfig } from 'vite'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readdirSync, existsSync } from 'node:fs'

const root = dirname(fileURLToPath(import.meta.url))

// Multi-page setup: index.html is the journal, and every .html file you drop
// into /pages becomes its own page automatically (e.g. pages/stats.html -> /pages/stats.html).
const input = { main: resolve(root, 'index.html') }
const pagesDir = resolve(root, 'pages')
if (existsSync(pagesDir)) {
  for (const f of readdirSync(pagesDir)) {
    if (f.endsWith('.html')) input[f.slice(0, -5)] = resolve(pagesDir, f)
  }
}

export default defineConfig({
  build: { rollupOptions: { input } }
})
