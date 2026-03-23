import { ReactNode, useState } from 'react'
import { Box, Tooltip, useMediaQuery, useTheme } from '@mui/material'
import { Circle as CircleIcon } from '@mui/icons-material'
import Sidebar from './Sidebar'
import Header from './Header'
import { useGlobalShortcuts } from '@/lib/hooks/useKeyboardShortcuts'
import { useRealtimeSync } from '@/lib/hooks/useSocket'

export const DRAWER_WIDTH = 260
export const COLLAPSED_WIDTH = 72
export const SIDEBAR_TRANSITION = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'

export default function Layout({ children }: { children: ReactNode }) {
  useGlobalShortcuts()
  const { connected } = useRealtimeSync()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleToggleSidebar = () => {
    if (isMobile) {
      setMobileOpen((prev) => !prev)
    } else {
      setSidebarOpen((prev) => !prev)
    }
  }

  const handleCloseMobile = () => setMobileOpen(false)
  const handleOpenMobile = () => setMobileOpen(true)

  const currentWidth = isMobile ? 0 : sidebarOpen ? DRAWER_WIDTH : COLLAPSED_WIDTH

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Sidebar
        drawerWidth={DRAWER_WIDTH}
        collapsedWidth={COLLAPSED_WIDTH}
        open={sidebarOpen}
        mobileOpen={mobileOpen}
        isMobile={isMobile}
        onClose={handleCloseMobile}
        onOpen={handleOpenMobile}
      />
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', ml: `${currentWidth}px`, transition: SIDEBAR_TRANSITION }}>
        <Header onToggleSidebar={handleToggleSidebar} />
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
                color: connected ? 'success.main' : 'error.main',
                filter: connected ? 'drop-shadow(0 0 4px #66bb6a)' : 'none',
              }}
            />
          </Tooltip>
        </Box>
      </Box>
    </Box>
  )
}
