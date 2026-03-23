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
  Fab,
} from '@mui/material'
import {
  CheckCircleOutline as TasksIcon,
  FolderOutlined as ProjectsIcon,
  SettingsOutlined as SettingsIcon,
  Add as AddIcon,
  RocketLaunch as RocketIcon,
} from '@mui/icons-material'

const navItems = [
  { to: '/tasks', icon: <TasksIcon />, label: 'Задачи' },
  { to: '/projects', icon: <ProjectsIcon />, label: 'Проекты' },
  { to: '/settings', icon: <SettingsIcon />, label: 'Настройки' },
]

export default function Sidebar({ drawerWidth }: { drawerWidth: number }) {
  const location = useLocation()
  const navigate = useNavigate()

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
                <ListItemText
                  primary={label}
                  primaryTypographyProps={{ fontSize: 14, fontWeight: isActive ? 600 : 400 }}
                />
              </ListItemButton>
            </ListItem>
          )
        })}
      </List>

      <Box sx={{ p: 2 }}>
        <Fab
          color="primary"
          variant="extended"
          onClick={() => navigate('/tasks')}
          sx={{ width: '100%' }}
        >
          <AddIcon sx={{ mr: 1 }} />
          Новая задача
        </Fab>
      </Box>
    </Drawer>
  )
}
