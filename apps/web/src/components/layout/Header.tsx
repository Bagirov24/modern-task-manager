import { useState } from 'react'
import {
  AppBar, Toolbar, TextField, IconButton, Badge, Avatar,
  Typography, Box, InputAdornment, Menu, MenuItem, Tooltip,
  Popover, List, ListItem, ListItemText, ListItemAvatar,
  Divider, Button, Chip, alpha,
} from '@mui/material'
import {
  Search as SearchIcon, NotificationsOutlined as BellIcon,
  Logout as LogoutIcon, DarkMode as DarkModeIcon,
  LightMode as LightModeIcon, TaskAlt, Comment, FolderOpen,
  AlternateEmail, DoneAll, Close,
} from '@mui/icons-material'
import { useAuthStore } from '@/lib/store/authStore'
import { useThemeStore } from '@/lib/store/themeStore'
import { useNotifications, useMarkAllNotificationsRead, useMarkNotificationRead } from '@/lib/hooks/useNotifications'
import type { Notification } from '@/lib/types'

const notifIcon: Record<string, JSX.Element> = {
  task_assigned: <TaskAlt color="primary" fontSize="small" />,
  task_updated: <TaskAlt color="info" fontSize="small" />,
  comment_added: <Comment color="secondary" fontSize="small" />,
  project_invited: <FolderOpen color="success" fontSize="small" />,
  mention: <AlternateEmail color="warning" fontSize="small" />,
}

export default function Header() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { mode, toggleTheme } = useThemeStore()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [notifAnchor, setNotifAnchor] = useState<null | HTMLElement>(null)

  const { data: notifData } = useNotifications()
  const markAllRead = useMarkAllNotificationsRead()
  const markRead = useMarkNotificationRead()

  const notifications: Notification[] = notifData?.notifications || []
  const unreadCount = notifications.filter((n) => !n.is_read).length

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'только что'
    if (mins < 60) return `${mins} мин назад`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs} ч назад`
    return `${Math.floor(hrs / 24)} д назад`
  }

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        backdropFilter: 'blur(20px)',
        backgroundColor: (t) => alpha(t.palette.background.paper, 0.8),
      }}
    >
      <Toolbar sx={{ gap: 2 }}>
        <TextField
          placeholder="Поиск задач..."
          size="small"
          sx={{
            flexGrow: 1,
            maxWidth: 480,
            '& .MuiOutlinedInput-root': {
              borderRadius: 28,
              bgcolor: 'action.hover',
              '& fieldset': { border: 'none' },
              '&:hover': { bgcolor: 'action.selected' },
              '&.Mui-focused': {
                bgcolor: 'background.paper',
                '& fieldset': { border: '2px solid', borderColor: 'primary.main' },
              },
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
        />

        <Box sx={{ flexGrow: 1 }} />

        <Tooltip title={mode === 'dark' ? 'Светлая тема' : 'Тёмная тема'}>
          <IconButton
            size="small"
            onClick={toggleTheme}
            sx={{
              color: 'text.secondary',
              bgcolor: 'action.hover',
              '&:hover': { bgcolor: 'action.selected' },
            }}
          >
            {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Tooltip>

        <Tooltip title="Уведомления">
          <IconButton
            size="small"
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
        </Tooltip>

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
            <Typography variant="h6">Уведомления</Typography>
            {unreadCount > 0 && (
              <Button size="small" startIcon={<DoneAll />} onClick={() => markAllRead.mutate()}>
                Прочитать все
              </Button>
            )}
          </Box>
          <Divider />
          {notifications.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <BellIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary">Нет уведомлений</Typography>
            </Box>
          ) : (
            <List dense sx={{ p: 0 }}>
              {notifications.slice(0, 10).map((n) => (
                <ListItem
                  key={n.id}
                  onClick={() => !n.is_read && markRead.mutate(n.id)}
                  sx={{
                    cursor: 'pointer',
                    bgcolor: n.is_read ? 'transparent' : 'action.hover',
                    '&:hover': { bgcolor: 'action.selected' },
                    px: 2,
                    py: 1.5,
                  }}
                >
                  <ListItemAvatar sx={{ minWidth: 40 }}>
                    {notifIcon[n.type] || <BellIcon fontSize="small" />}
                  </ListItemAvatar>
                  <ListItemText
                    primary={n.title}
                    secondary={timeAgo(n.created_at)}
                    primaryTypographyProps={{ variant: 'body2', fontWeight: n.is_read ? 400 : 600 }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                  {!n.is_read && (
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main', ml: 1 }} />
                  )}
                </ListItem>
              ))}
            </List>
          )}
        </Popover>

        <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
          <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: 14, fontWeight: 600 }}>
            {user?.username?.charAt(0)?.toUpperCase() || 'U'}
          </Avatar>
        </IconButton>

        <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', md: 'block' } }}>
          {user?.username || 'Пользователь'}
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
            Выйти
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  )
}
