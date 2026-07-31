import { ReactNode } from 'react'
import { Box, Tooltip, useMediaQuery, useTheme, Fab, Zoom } from '@mui/material'
import {
  Add as AddIcon,
  KeyboardCommandKey as CommandIcon,
} from '@mui/icons-material'
import Sidebar from './Sidebar'
import Header from './Header'
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
  const openModal = useUIStore((s) => s.openModal)
  const commandPaletteOpen = useUIStore((s) => s.commandPaletteOpen)
  const setCommandPaletteOpen = useUIStore((s) => s.setCommandPaletteOpen)

  const handleToggleSidebar = () => {
    if (isMobile) {
      setSidebarOpen(!sidebarOpen)
      return
    }
    setSidebarCollapsed(!sidebarCollapsed)
  }

  const handleCloseMobile = () => setSidebarOpen(false)
  const handleOpenMobile = () => setSidebarOpen(true)
  const handleCreateTask = () => openModal('task.create')

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        bgcolor: 'background.default',
      }}
    >
      <Sidebar
        drawerWidth={DRAWER_WIDTH}
        collapsedWidth={COLLAPSED_WIDTH}
        open={!sidebarCollapsed}
        mobileOpen={sidebarOpen}
        isMobile={isMobile}
        onClose={handleCloseMobile}
        onOpen={handleOpenMobile}
      />

      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          transition: SIDEBAR_TRANSITION,
          minWidth: 0,
        }}
      >
        <Header onToggleSidebar={handleToggleSidebar} />

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: { xs: 2, md: 3 },
            overflow: 'auto',
          }}
        >
          {children}
        </Box>


        <Zoom in>
          <Fab
            color="primary"
            aria-label="Создать задачу"
            onClick={handleCreateTask}
            sx={{
              position: 'fixed',
              right: { xs: 20, md: 28 },
              bottom: { xs: 20, md: 28 },
              boxShadow: 6,
            }}
          >
            <AddIcon />
          </Fab>
        </Zoom>

        <Tooltip title="Командная палитра">
          <Fab
            size="small"
            color={commandPaletteOpen ? 'secondary' : 'default'}
            onClick={() => setCommandPaletteOpen(!commandPaletteOpen)}
            sx={{
              position: 'fixed',
              right: { xs: 84, md: 100 },
              bottom: { xs: 28, md: 28 },
              opacity: 0.92,
            }}
          >
            <CommandIcon fontSize="small" />
          </Fab>
        </Tooltip>
      </Box>
      <QuickTaskDialog />
    </Box>
  )
}
