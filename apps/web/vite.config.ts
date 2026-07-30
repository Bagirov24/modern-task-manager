import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    exclude: ['e2e/**', '**/node_modules/**', '**/dist/**'],
  },
  server: {
    port: 3000,
    watch: {
      usePolling: true,
      interval: 500,
    },
    proxy: {
      '/api': 'http://api:8000',
      '/ws': { target: 'http://api:8000', ws: true },
    },
  },
})
