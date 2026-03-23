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
} from '@mui/material'
import {
  CheckCircleOutline as TasksIcon,
  FolderOutlined as ProjectsIcon,
  SettingsOutlined as SettingsIcon,
  RocketLaunch as RocketIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material'
import { useAuthStore } from '@/lib/store/authStore'
import { disconnectSocket } from '@/lib/socket/socketClient'

const navItems = [
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
          Task Manager
        </Typography>
      </Box>

      <Divider />

      <List sx={{ px: 1.5, py: 2, flexGrow: 1 }}>
        {navItems.map(({ to, icon, label }) => {
          const isActive = location.pathname === to || (to === '/tasks' && location.pathname === '/')
          return (
            <ListItem key={to} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => navigate(to)}
                sx={{
                  borderRadius: 2,
                  py: 1.2,
                  bgcolor: isActive ? 'primary.main' : 'transparent',
                  color: isActive ? 'white' : 'text.secondary',
                  '&:hover': {
                    bgcolor: isActive ? 'primary.dark' : 'action.hover',
                  },
                  '& .MuiListItemIcon-root': {
                    color: isActive ? 'white' : 'text.secondary',
                    minWidth: 40,
                  },
                }}
              >
                <ListItemIcon>{icon}</ListItemIcon>
                <ListItemText primary={label} />
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
            fontSize: 16,
            fontWeight: 700,
          }}
        >
          {userInitial.toUpperCase()}
        </Avatar>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={600} noWrap>
            {user?.full_name || user?.username || 'Пользователь'}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
            {user?.email || ''}
          </Typography>
        </Box>
        <Tooltip title="Выйти">
          <IconButton size="small" onClick={handleLogout} color="default">
            <LogoutIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Drawer>
  )
}
