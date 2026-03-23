import { useLocation, useNavigate } from 'react-router-dom'
import {
  Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Typography, Box, Divider, Avatar, IconButton, Tooltip,
} from '@mui/material'
import {
  DashboardOutlined as DashboardIcon,
  CheckCircleOutline as TasksIcon,
  FolderOutlined as ProjectsIcon,
  SettingsOutlined as SettingsIcon,
  RocketLaunch as RocketIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material'
import { useAuthStore } from '@/lib/store/authStore'
import { disconnectSocket } from '@/lib/socket/socketClient'

const navItems = [
  { to: '/', icon: <DashboardIcon />, label: 'Главная' },
  { to: '/tasks', icon: <TasksIcon />, label: 'Задачи' },
  { to: '/projects', icon: <ProjectsIcon />, label: 'Проекты' },
  { to: '/settings', icon: <SettingsIcon />, label: 'Настройки' },
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
        },
      }}
    >
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <RocketIcon sx={{ color: 'primary.main', fontSize: 28 }} />
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
          TaskManager
        </Typography>
      </Box>

      <Divider />

      <List sx={{ px: 1.5, py: 1, flex: 1 }}>
        {navItems.map((item) => {
          const isActive = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
          return (
            <ListItem key={item.to} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => navigate(item.to)}
                sx={{
                  borderRadius: 2,
                  bgcolor: isActive ? 'primary.main' : 'transparent',
                  color: isActive ? 'white' : 'text.primary',
                  '&:hover': { bgcolor: isActive ? 'primary.dark' : 'action.hover' },
                }}
              >
                <ListItemIcon sx={{ color: isActive ? 'white' : 'text.secondary', minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 14, fontWeight: isActive ? 600 : 400 }} />
              </ListItemButton>
            </ListItem>
          )
        })}
      </List>

      <Divider />

      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: 14 }}>
          {userInitial.toUpperCase()}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
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
