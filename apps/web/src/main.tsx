import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import CssBaseline from '@mui/material/CssBaseline'
import App from './App'
import ThemeWrapper from './lib/theme'
import GlobalErrorBoundary from './components/common/GlobalErrorBoundary'
import SnackbarProvider from './components/common/SnackbarProvider'
import CommandPalette from './components/common/CommandPalette'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 10,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      onError: (err) => console.error('[mutation error]', err),
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ThemeWrapper>
            <CssBaseline />
            <App />
            <SnackbarProvider />
            <CommandPalette />
          </ThemeWrapper>
        </BrowserRouter>
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </GlobalErrorBoundary>
  </React.StrictMode>
)
