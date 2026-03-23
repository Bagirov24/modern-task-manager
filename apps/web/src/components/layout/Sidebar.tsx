import { useLocation, useNavigate } from 'react-router-dom'
import {
  Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Typography, Box, Divider, Avatar, IconButton, Tooltip, alpha,
  SwipeableDrawer,
} from '@mui/material'
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
  RocketLaunch as RocketIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material'
import { useAuthStore } from '@/lib/store/authStore'
import { disconnectSocket } from '@/lib/socket/socketClient'
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

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <Box sx={{ p: open ? 2.5 : 1.5, display: 'flex', alignItems: 'center', gap: 1.5, justifyContent: open ? 'flex-start' : 'center' }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            bgcolor: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <RocketIcon sx={{ color: '#fff', fontSize: 22 }} />
        </Box>
        {open && (
          <Typography variant="h6" fontWeight={700} noWrap>
            TaskManager
          </Typography>
        )}
      </Box>

      <Divider />

      <List sx={{ px: open ? 1.5 : 0.5, py: 1, flex: 1 }}>
        {navItems.map((item) => {
          const isActive = item.to === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.to)

          return (
            <ListItem key={item.to} disablePadding sx={{ mb: 0.5 }}>
              <Tooltip title={!open ? item.label : ''} placement="right" arrow>
                <ListItemButton
                  onClick={() => handleNav(item.to)}
                  sx={{
                    borderRadius: 28,
                    py: 1.2,
                    px: open ? 2 : 1.5,
                    minHeight: 44,
                    justifyContent: open ? 'flex-start' : 'center',
                    bgcolor: isActive
                      ? (t: any) => alpha(t.palette.primary.main, 0.12)
                      : 'transparent',
                    color: isActive ? 'primary.main' : 'text.primary',
                    '&:hover': {
                      bgcolor: isActive
                        ? (t: any) => alpha(t.palette.primary.main, 0.18)
                        : 'action.hover',
                    },
                    transition: SIDEBAR_TRANSITION,
                  }}
                >
                  <ListItemIcon sx={{ minWidth: open ? 40 : 0, color: 'inherit', justifyContent: 'center' }}>
                    {isActive ? item.activeIcon : item.icon}
                  </ListItemIcon>
                  {open && (
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{ fontWeight: isActive ? 600 : 400 }}
                    />
                  )}
                  {open && isActive && (
                    <Box
                      sx={{
                        width: 4,
                        height: 20,
                        borderRadius: 2,
                        bgcolor: 'primary.main',
                      }}
                    />
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
            width: 36,
            height: 36,
            bgcolor: 'primary.main',
            fontSize: '0.9rem',
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          {userInitial.toUpperCase()}
        </Avatar>
        {open && (
          <Box flex={1} minWidth={0}>
            <Typography variant="body2" fontWeight={600} noWrap>
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
        },
      }}
    >
      {drawerContent}
    </Drawer>
  )
}
