import { ReactNode } from 'react'
import { Box, Tooltip, Badge } from '@mui/material'
import { Circle as CircleIcon } from '@mui/icons-material'
import Sidebar from './Sidebar'
import Header from './Header'
import { useGlobalShortcuts } from '@/lib/hooks/useKeyboardShortcuts'
import { useRealtimeSync } from '@/lib/hooks/useSocket'

const DRAWER_WIDTH = 260

export default function Layout({ children }: { children: ReactNode }) {
  useGlobalShortcuts()
  const { connected } = useRealtimeSync()

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Sidebar drawerWidth={DRAWER_WIDTH} />
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', ml: `${DRAWER_WIDTH}px` }}>
        <Header />
        <Box component="main" sx={{ flexGrow: 1, p: 3, overflow: 'auto' }}>
          {children}
        </Box>
        <Box
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: 1000,
          }}
        >
          <Tooltip title={connected ? 'Подключено (real-time)' : 'Нет подключения'}>
            <CircleIcon
              sx={{
                fontSize: 12,
                color: connected ? 'success.main' : 'text.disabled',
                transition: 'color 0.3s',
              }}
            />
          </Tooltip>
        </Box>
      </Box>
    </Box>
  )
}
