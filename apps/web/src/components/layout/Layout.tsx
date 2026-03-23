import { ReactNode } from 'react'
import { Box } from '@mui/material'
import Sidebar from './Sidebar'
import Header from './Header'
import { useGlobalShortcuts } from '@/lib/hooks/useKeyboardShortcuts'

const DRAWER_WIDTH = 260

export default function Layout({ children }: { children: ReactNode }) {
  useGlobalShortcuts()

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Sidebar drawerWidth={DRAWER_WIDTH} />
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', ml: `${DRAWER_WIDTH}px` }}>
        <Header />
        <Box component="main" sx={{ flexGrow: 1, p: 3, overflow: 'auto' }}>
          {children}
        </Box>
      </Box>
    </Box>
  )
}
