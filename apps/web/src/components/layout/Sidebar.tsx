import { useLocation, useNavigate } from 'react-router-dom'
import {
  Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Typography, Box, Divider, Avatar, IconButton, Tooltip, alpha,
} from '@mui/material'
import {
  DashboardOutlined as DashboardIcon,
  Dashboard as DashboardFilled,
  CheckCircleOutline as TasksIcon,
  CheckCircle as TasksFilled,
  FolderOutlined as ProjectsIcon,
  Folder as ProjectsFilled,
  SettingsOutlined as SettingsIcon,
  Settings as SettingsFilled,
  RocketLaunch as RocketIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material'
import { useAuthStore } from '@/lib/store/authStore'
import { disconnectSocket } from '@/lib/socket/socketClient'

const navItems = [
  { to: '/', icon: <DashboardIcon />, activeIcon: <DashboardFilled />, label: 'Главная' },
  { to: '/tasks', icon: <TasksIcon />, activeIcon: <TasksFilled />, label: 'Задачи' },
  { to: '/projects', icon: <ProjectsIcon />, activeIcon: <ProjectsFilled />, label: 'Проекты' },
  { to: '/settings', icon: <SettingsIcon />, activeIcon: <SettingsFilled />, label: 'Настройки' },
]

export default function Sidebar({ drawerWidth }: { drawerWidth: number }) {
  const location = useLocation()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const handleLogout = () => {
    disconnectSocket()
    logout()
    navigate('/login')
  }

  const userInitial = user?.full_name?.charAt(0) || user?.username?.charAt(0) || user?.email?.charAt(0) || '?'

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          bgcolor: 'background.paper',
          borderRight: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 0,
        },
      }}
    >
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 3,
            bgcolor: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <RocketIcon sx={{ color: 'white', fontSize: 22 }} />
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
          TaskManager
        </Typography>
      </Box>

      <Divider />

      <List sx={{ flex: 1, px: 1.5, py: 1 }}>
        {navItems.map((item) => {
          const isActive = item.to === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.to)
          return (
            <ListItem key={item.to} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => navigate(item.to)}
                sx={{
                  borderRadius: 28,
                  py: 1.2,
                  px: 2,
                  bgcolor: isActive
                    ? (t: any) => alpha(t.palette.primary.main, 0.12)
                    : 'transparent',
                  color: isActive ? 'primary.main' : 'text.primary',
                  '&:hover': {
                    bgcolor: isActive
                      ? (t: any) => alpha(t.palette.primary.main, 0.18)
                      : 'action.hover',
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 40,
                    color: isActive ? 'primary.main' : 'text.secondary',
                  }}
                >
                  {isActive ? item.activeIcon : item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    variant: 'body2',
                    fontWeight: isActive ? 600 : 400,
                  }}
                />
                {isActive && (
                  <Box
                    sx={{
                      width: 4,
                      height: 16,
                      borderRadius: 2,
                      bgcolor: 'primary.main',
                    }}
                  />
                )}
              </ListItemButton>
            </ListItem>
          )
        })}
      </List>

      <Divider />

      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar
          sx={{
            width: 36,
            height: 36,
            bgcolor: 'primary.main',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {userInitial.toUpperCase()}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" noWrap fontWeight={500}>
            {user?.full_name || user?.username || 'Пользователь'}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {user?.email || ''}
          </Typography>
        </Box>
        <Tooltip title="Выйти">
          <IconButton size="small" onClick={handleLogout} sx={{ color: 'text.secondary' }}>
            <LogoutIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Drawer>
  )
}
