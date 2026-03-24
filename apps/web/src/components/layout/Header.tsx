import { useState } from 'react'
import {
  AppBar, Toolbar, TextField, IconButton, Badge, Avatar,
  Typography, Box, InputAdornment, Menu, MenuItem, Tooltip,
  Popover, List, ListItem, ListItemText, ListItemAvatar,
  Divider, Button, alpha,
} from '@mui/material'
import {
  Search as SearchIcon, NotificationsOutlined as BellIcon,
  Logout as LogoutIcon, DarkMode as DarkModeIcon,
  LightMode as LightModeIcon, TaskAlt, Comment, FolderOpen,
  AlternateEmail, DoneAll,
  Menu as MenuIcon,
} from '@mui/icons-material'
import { useAuthStore } from '@/lib/store/authStore'
import { useThemeStore } from '@/lib/store/themeStore'
import { useNotifications } from '@/lib/hooks/useNotifications'
import type { Notification } from '@/lib/types'

const notifIcon: Record<string, JSX.Element> = {
  task_assigned: <TaskAlt color="primary" fontSize="small" />,
  task_updated: <TaskAlt color="info" fontSize="small" />,
  comment_added: <Comment color="secondary" fontSize="small" />,
  project_invited: <FolderOpen color="success" fontSize="small" />,
  mention: <AlternateEmail color="warning" fontSize="small" />,
}

interface HeaderProps {
  onToggleSidebar: () => void
}

export default function Header({ onToggleSidebar }: HeaderProps) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { mode, toggleTheme } = useThemeStore()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [notifAnchor, setNotifAnchor] = useState<null | HTMLElement>(null)
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return '\u0442\u043e\u043b\u044c\u043a\u043e \u0447\u0442\u043e'
    if (mins < 60) return `${mins} \u043c\u0438\u043d \u043d\u0430\u0437\u0430\u0434`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs} \u0447 \u043d\u0430\u0437\u0430\u0434`
    return `${Math.floor(hrs / 24)} \u0434 \u043d\u0430\u0437\u0430\u0434`
  }

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        backdropFilter: 'blur(8px)',
        backgroundColor: (t) => alpha(t.palette.background.paper, 0.8),
      }}
    >
      <Toolbar sx={{ gap: 1 }}>
        <IconButton onClick={onToggleSidebar} sx={{ color: 'text.secondary' }}>
          <MenuIcon />
        </IconButton>

        <TextField
          size="small"
          placeholder="\u041f\u043e\u0438\u0441\u043a..."
          sx={{ flex: 1, maxWidth: 400 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />

        <Box sx={{ flex: 1 }} />

        <Tooltip title={mode === 'dark' ? '\u0421\u0432\u0435\u0442\u043b\u0430\u044f \u0442\u0435\u043c\u0430' : '\u0422\u0451\u043c\u043d\u0430\u044f \u0442\u0435\u043c\u0430'}>
          <IconButton onClick={toggleTheme} sx={{ color: 'text.secondary' }}>
            {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Tooltip>

        <IconButton
          onClick={(e) => setNotifAnchor(e.currentTarget)}
          sx={{
            color: 'text.secondary',
            bgcolor: 'action.hover',
            '&:hover': { bgcolor: 'action.selected' },
          }}
        >
          <Badge badgeContent={unreadCount} color="error" variant={unreadCount > 0 ? 'standard' : 'dot'}>
            <BellIcon />
          </Badge>
        </IconButton>

        {/* Notification Popover */}
        <Popover
          open={Boolean(notifAnchor)}
          anchorEl={notifAnchor}
          onClose={() => setNotifAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          PaperProps={{ sx: { width: 380, maxHeight: 480, borderRadius: 3, mt: 1 } }}
        >
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle1" fontWeight={600}>\u0423\u0432\u0435\u0434\u043e\u043c\u043b\u0435\u043d\u0438\u044f</Typography>
            {unreadCount > 0 && (
              <Button size="small" startIcon={<DoneAll />} onClick={() => markAllAsRead()}>
                \u041f\u0440\u043e\u0447\u0438\u0442\u0430\u0442\u044c \u0432\u0441\u0435
              </Button>
            )}
          </Box>
          <Divider />
          {notifications.length === 0 ? (
            <Typography sx={{ p: 3, textAlign: 'center' }} color="text.secondary">
              \u041d\u0435\u0442 \u0443\u0432\u0435\u0434\u043e\u043c\u043b\u0435\u043d\u0438\u0439
            </Typography>
          ) : (
            <List disablePadding>
              {notifications.slice(0, 10).map((n: Notification) => (
                <ListItem
                  key={n.id}
                  onClick={() => !n.is_read && markAsRead(n.id)}
                  sx={{
                    cursor: 'pointer',
                    bgcolor: n.is_read ? 'transparent' : 'action.hover',
                    '&:hover': { bgcolor: 'action.selected' },
                    px: 2,
                    py: 1.5,
                  }}
                >
                  <ListItemAvatar>{notifIcon[n.type] || <BellIcon />}</ListItemAvatar>
                  <ListItemText
                    primary={n.message}
                    secondary={timeAgo(n.created_at)}
                  />
                  {!n.is_read && (
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main', ml: 1 }} />
                  )}
                </ListItem>
              ))}
            </List>
          )}
        </Popover>

        <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 14 }}>
            {user?.username?.charAt(0)?.toUpperCase() || 'U'}
          </Avatar>
        </IconButton>
        <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
          {user?.username || '\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c'}
        </Typography>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          PaperProps={{ sx: { mt: 1, minWidth: 160, borderRadius: 3 } }}
        >
          <MenuItem
            onClick={() => { logout(); setAnchorEl(null) }}
            sx={{ gap: 1.5, color: 'error.main' }}
          >
            <LogoutIcon fontSize="small" />
            \u0412\u044b\u0439\u0442\u0438
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  )
}
