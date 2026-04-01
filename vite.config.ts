import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Use /ArchScape/ base when building for GitHub Pages, / for local dev
  base: process.env.VITE_BASE_PATH ?? '/',
  build: {
    target: 'esnext',
  },
})
