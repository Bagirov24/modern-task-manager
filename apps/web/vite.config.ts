import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

const apiProxyTarget = process.env.VITE_API_PROXY_TARGET ?? 'http://api:8000'

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
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
      '/ws': { target: process.env.VITE_WS_PROXY_TARGET ?? apiProxyTarget, ws: true },
    },
  },
})
