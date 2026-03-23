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
  ChevronLeft as CollapseIcon,
} from '@mui/icons-material'
import { useAuthStore } from '@/lib/store/authStore'
import { disconnectSocket } from '@/lib/socket/socketClient'

const navItems = [
  { to: '/', icon: <DashboardIcon />, activeIcon: <DashboardFilled />, label: '\u0413\u043b\u0430\u0432\u043d\u0430\u044f' },
  { to: '/tasks', icon: <TasksIcon />, activeIcon: <TasksFilled />, label: '\u0417\u0430\u0434\u0430\u0447\u0438' },
  { to: '/projects', icon: <ProjectsIcon />, activeIcon: <ProjectsFilled />, label: '\u041f\u0440\u043e\u0435\u043a\u0442\u044b' },
  { to: '/calendar', icon: <CalendarIcon />, activeIcon: <CalendarFilled />, label: '\u041a\u0430\u043b\u0435\u043d\u0434\u0430\u0440\u044c' },
  { to: '/analytics', icon: <AnalyticsIcon />, activeIcon: <AnalyticsFilled />, label: '\u0410\u043d\u0430\u043b\u0438\u0442\u0438\u043a\u0430' },
  { to: '/settings', icon: <SettingsIcon />, activeIcon: <SettingsFilled />, label: '\u041d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438' },
]

interface SidebarProps {
  drawerWidth: number
  collapsedWidth: number
  open: boolean
  mobileOpen: boolean
  isMobile: boolean
  onClose: () => void
}

export default function Sidebar({ drawerWidth, collapsedWidth, open, mobileOpen, isMobile, onClose }: SidebarProps) {
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
                    transition: 'all 0.2s ease',
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
              {user?.full_name || user?.username || '\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c'}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {user?.email || ''}
            </Typography>
          </Box>
        )}
        {open && (
          <Tooltip title="\u0412\u044b\u0439\u0442\u0438">
            <IconButton size="small" onClick={handleLogout}>
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        {!open && (
          <Tooltip title="\u0412\u044b\u0439\u0442\u0438" placement="right">
            <IconButton size="small" onClick={handleLogout}>
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  )

  if (isMobile) {
    return (
      <SwipeableDrawer
        open={mobileOpen}
        onClose={onClose}
        onOpen={() => {}}
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
          transition: 'width 0.3s ease',
          overflowX: 'hidden',
        },
      }}
    >
      {drawerContent}
    </Drawer>
  )
}
