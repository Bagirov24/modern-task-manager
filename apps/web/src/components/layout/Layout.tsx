import { ReactNode } from 'react'
import { Box, Tooltip, useMediaQuery, useTheme, Fab, Zoom } from '@mui/material'
import {
  Circle as CircleIcon,
  Add as AddIcon,
  KeyboardCommandKey as CommandIcon,
} from '@mui/icons-material'
import Sidebar from './Sidebar'
import Header from './Header'
import { useGlobalShortcuts } from '@/lib/hooks/useKeyboardShortcuts'
import { useRealtimeSync } from '@/lib/hooks/useSocket'
import { useUIStore } from '@/store/uiStore'

export const DRAWER_WIDTH = 280
export const COLLAPSED_WIDTH = 80
export const SIDEBAR_TRANSITION = 'all 0.28s cubic-bezier(0.4, 0, 0.2, 1)'

export default function Layout({ children }: { children: ReactNode }) {
  useGlobalShortcuts()
  const { connected } = useRealtimeSync()
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

  const currentWidth = isMobile ? 0 : sidebarCollapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        bgcolor: 'background.default',
        backgroundImage: (t) =>
          `radial-gradient(circle at top right, ${t.palette.primary.main}10, transparent 28%), radial-gradient(circle at bottom left, ${t.palette.secondary.main}10, transparent 24%)`,
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
          ml: `${currentWidth}px`,
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

        <Box sx={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1300 }}>
          <Tooltip title={connected ? 'Realtime подключён' : 'Realtime отключён'}>
            <CircleIcon
              sx={{
                fontSize: 12,
                color: connected ? 'success.main' : 'error.main',
                filter: connected ? 'drop-shadow(0 0 6px rgba(102, 187, 106, 0.9))' : 'none',
              }}
            />
          </Tooltip>
        </Box>

        <Zoom in>
          <Fab
            color="primary"
            aria-label="Создать задачу"
            onClick={handleCreateTask}
            sx={{
              position: 'fixed',
              right: { xs: 20, md: 28 },
              bottom: { xs: 64, md: 28 },
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
              right: { xs: 20, md: 100 },
              bottom: { xs: 64, md: 28 },
              opacity: 0.92,
            }}
          >
            <CommandIcon fontSize="small" />
          </Fab>
        </Tooltip>
      </Box>
    </Box>
  )
}
