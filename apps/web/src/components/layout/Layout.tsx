import { ReactNode } from 'react'
import { Box, useMediaQuery, useTheme } from '@mui/material'
import Sidebar from './Sidebar'
import Header from './Header'
import MobileNavigation from './MobileNavigation'
import { useGlobalShortcuts } from '@/lib/hooks/useKeyboardShortcuts'
import { useUIStore } from '@/store/uiStore'
import QuickTaskDialog from '@/components/tasks/QuickTaskDialog'

export const DRAWER_WIDTH = 280
export const COLLAPSED_WIDTH = 80
export const SIDEBAR_TRANSITION = 'all 0.28s cubic-bezier(0.4, 0, 0.2, 1)'

export default function Layout({ children }: { children: ReactNode }) {
  useGlobalShortcuts()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed)
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen)
  const setSidebarCollapsed = useUIStore((s) => s.setSidebarCollapsed)

  const handleToggleSidebar = () => {
    if (isMobile) {
      setSidebarOpen(!sidebarOpen)
      return
    }
    setSidebarCollapsed(!sidebarCollapsed)
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Sidebar
        drawerWidth={DRAWER_WIDTH}
        collapsedWidth={COLLAPSED_WIDTH}
        open={!sidebarCollapsed}
        mobileOpen={sidebarOpen}
        isMobile={isMobile}
        onClose={() => setSidebarOpen(false)}
        onOpen={() => setSidebarOpen(true)}
      />
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', transition: SIDEBAR_TRANSITION, minWidth: 0 }}>
        <Header onToggleSidebar={handleToggleSidebar} />
        <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 3 }, pb: { xs: 10, md: 3 }, overflow: 'auto' }}>
          {children}
        </Box>
        {isMobile && <MobileNavigation />}
      </Box>
      <QuickTaskDialog />
    </Box>
  )
}
