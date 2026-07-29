import { useLocation, useNavigate } from 'react-router-dom'
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Divider,
  Avatar,
  IconButton,
  Tooltip,
  alpha,
  SwipeableDrawer,
  Chip,
  Stack,
} from '@mui/material'
import type { Theme } from '@mui/material/styles'
import {
  DashboardOutlined as DashboardIcon,
  Dashboard as DashboardFilled,
  CheckCircleOutline as TasksIcon,
  CheckCircle as TasksFilled,
  FolderOutlined as ProjectsIcon,
  Folder as ProjectsFilled,
  CalendarTodayOutlined as CalendarIcon,
  CalendarMonth as CalendarFilled,
  BarChartOutlined as AnalyticsIcon,
  BarChart as AnalyticsFilled,
  SettingsOutlined as SettingsIcon,
  Settings as SettingsFilled,
  Timeline as TimelineIcon,
  RocketLaunch as RocketIcon,
  Logout as LogoutIcon,
  ChevronLeft as CollapseIcon,
  ChevronRight as ExpandIcon,
} from '@mui/icons-material'
import { useAuthStore } from '@/lib/store/authStore'
import { disconnectSocket } from '@/lib/socket/socketClient'
import { useUIStore } from '@/store/uiStore'
import { SIDEBAR_TRANSITION } from './Layout'

const navItems = [
  { to: '/', icon: <DashboardIcon />, activeIcon: <DashboardFilled />, label: 'Главная' },
  { to: '/tasks', icon: <TasksIcon />, activeIcon: <TasksFilled />, label: 'Задачи' },
  { to: '/projects', icon: <ProjectsIcon />, activeIcon: <ProjectsFilled />, label: 'Проекты' },
  { to: '/calendar', icon: <CalendarIcon />, activeIcon: <CalendarFilled />, label: 'Календарь' },
  { to: '/analytics', icon: <AnalyticsIcon />, activeIcon: <AnalyticsFilled />, label: 'Аналитика' },
  { to: '/settings', icon: <SettingsIcon />, activeIcon: <SettingsFilled />, label: 'Настройки' },
]

interface SidebarProps {
  drawerWidth: number
  collapsedWidth: number
  open: boolean
  mobileOpen: boolean
  isMobile: boolean
  onClose: () => void
  onOpen: () => void
}

export default function Sidebar({ drawerWidth, collapsedWidth, open, mobileOpen, isMobile, onClose, onOpen }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const setSidebarCollapsed = useUIStore((s) => s.setSidebarCollapsed)
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed)

  const handleLogout = () => {
    disconnectSocket()
    logout()
    navigate('/login')
  }

  const handleNav = (to: string) => {
    navigate(to)
    if (isMobile) onClose()
  }

  const userInitial = user?.full_name?.charAt(0) || user?.username?.charAt(0) || user?.email?.charAt(0) || '?'
  const currentWidth = open ? drawerWidth : collapsedWidth
  const activeBg = (opacity: number) => (t: Theme) => alpha(t.palette.primary.main, opacity)

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <Box sx={{ p: open ? 2.5 : 1.5, display: 'flex', alignItems: 'center', gap: 1.5, justifyContent: open ? 'space-between' : 'center' }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: 2.5,
              background: 'linear-gradient(135deg, #7C4DFF 0%, #5E35B1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 10px 24px rgba(124,77,255,0.25)',
            }}
          >
            <RocketIcon sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          {open && (
            <Box minWidth={0}>
              <Typography variant="h6" fontWeight={800} noWrap>
                TaskManager
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                Управление задачами
              </Typography>
            </Box>
          )}
        </Stack>

        {!isMobile && open && (
          <Tooltip title="Свернуть меню">
            <IconButton size="small" onClick={() => setSidebarCollapsed(true)}>
              <CollapseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        {!isMobile && !open && (
          <Tooltip title="Развернуть меню">
            <IconButton size="small" onClick={() => setSidebarCollapsed(false)}>
              <ExpandIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      <Divider />

      {open && (
        <Box sx={{ px: 2, pt: 2, pb: 1 }}>
          <Chip icon={<TimelineIcon fontSize="small" />} label="Timeline ready" color="secondary" variant="outlined" size="small" />
        </Box>
      )}

      <List sx={{ px: open ? 1.5 : 0.5, py: 1, flex: 1 }}>
        {navItems.map((item) => {
          const isActive = item.to === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.to)

          return (
            <ListItem key={item.to} disablePadding sx={{ mb: 0.75 }}>
              <Tooltip title={!open ? item.label : ''} placement="right" arrow>
                <ListItemButton
                  onClick={() => handleNav(item.to)}
                  sx={{
                    borderRadius: 3,
                    py: 1.25,
                    px: open ? 2 : 1.5,
                    minHeight: 48,
                    justifyContent: open ? 'flex-start' : 'center',
                    bgcolor: isActive ? activeBg(0.12) : 'transparent',
                    color: isActive ? 'primary.main' : 'text.primary',
                    '&:hover': {
                      bgcolor: isActive ? activeBg(0.18) : 'action.hover',
                    },
                    transition: SIDEBAR_TRANSITION,
                  }}
                >
                  <ListItemIcon sx={{ minWidth: open ? 42 : 0, color: 'inherit', justifyContent: 'center' }}>
                    {isActive ? item.activeIcon : item.icon}
                  </ListItemIcon>
                  {open && (
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{ fontWeight: isActive ? 700 : 500 }}
                    />
                  )}
                  {open && isActive && (
                    <Box sx={{ width: 6, height: 24, borderRadius: 999, bgcolor: 'primary.main' }} />
                  )}
                </ListItemButton>
              </Tooltip>
            </ListItem>
          )
        })}
      </List>

      <Divider />

      <Box sx={{ p: open ? 2 : 1, display: 'flex', alignItems: 'center', gap: 1.5, justifyContent: open ? 'flex-start' : 'center' }}>
        <Avatar
          sx={{
            width: 38,
            height: 38,
            background: 'linear-gradient(135deg, #7C4DFF 0%, #5E35B1 100%)',
            fontSize: '0.95rem',
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {userInitial.toUpperCase()}
        </Avatar>
        {open && (
          <Box flex={1} minWidth={0}>
            <Typography variant="body2" fontWeight={700} noWrap>
              {user?.full_name || user?.username || 'Пользователь'}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {user?.email || ''}
            </Typography>
          </Box>
        )}
        <Tooltip title="Выйти" placement={open ? 'top' : 'right'}>
          <IconButton size="small" onClick={handleLogout}>
            <LogoutIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  )

  if (isMobile) {
    return (
      <SwipeableDrawer
        open={mobileOpen}
        onClose={onClose}
        onOpen={onOpen}
        sx={{
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            bgcolor: 'background.paper',
          },
        }}
      >
        {drawerContent}
      </SwipeableDrawer>
    )
  }

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: currentWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: currentWidth,
          boxSizing: 'border-box',
          bgcolor: 'background.paper',
          borderRight: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 0,
          transition: SIDEBAR_TRANSITION,
          overflowX: 'hidden',
          backdropFilter: 'blur(12px)',
        },
      }}
    >
      {drawerContent}
    </Drawer>
  )
}
