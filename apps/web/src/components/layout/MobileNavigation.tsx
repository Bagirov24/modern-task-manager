import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material'
import { CalendarMonthOutlined, FolderOutlined, ForumOutlined, SpaceDashboardOutlined, TaskAltOutlined } from '@mui/icons-material'
import { Link as RouterLink, useLocation } from 'react-router-dom'

const destinations = [
  { to: '/', label: 'Обзор', icon: <SpaceDashboardOutlined /> },
  { to: '/inbox', label: 'Входящие', icon: <ForumOutlined /> },
  { to: '/tasks', label: 'Задачи', icon: <TaskAltOutlined /> },
  { to: '/projects', label: 'Проекты', icon: <FolderOutlined /> },
  { to: '/calendar', label: 'Календарь', icon: <CalendarMonthOutlined /> },
]

export default function MobileNavigation() {
  const location = useLocation()
  const activeDestination = destinations.find((destination) => (
    destination.to === '/' ? location.pathname === '/' : location.pathname.startsWith(destination.to)
  ))?.to ?? false

  return (
    <Paper component="nav" aria-label="Основная навигация" elevation={4} square sx={{ position: 'fixed', zIndex: (theme) => theme.zIndex.appBar, bottom: 0, left: 0, right: 0, borderTop: '1px solid', borderColor: 'divider' }}>
      <BottomNavigation showLabels value={activeDestination}>
        {destinations.map((destination) => (
          <BottomNavigationAction key={destination.to} component={RouterLink} to={destination.to} value={destination.to} label={destination.label} icon={destination.icon} />
        ))}
      </BottomNavigation>
    </Paper>
  )
}
