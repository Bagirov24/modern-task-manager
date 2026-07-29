import { useMemo, useState } from 'react'
import {
  AppBar,
  Toolbar,
  TextField,
  IconButton,
  Badge,
  Avatar,
  Typography,
  Box,
  InputAdornment,
  Menu,
  MenuItem,
  Tooltip,
  Popover,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  Button,
  alpha,
  Chip,
  Stack,
} from '@mui/material'
import {
  Search as SearchIcon,
  NotificationsOutlined as BellIcon,
  Logout as LogoutIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  TaskAlt,
  Comment,
  FolderOpen,
  AlternateEmail,
  DoneAll,
  Menu as MenuIcon,
  CalendarViewWeek as TimelineIcon,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/lib/store/authStore'
import { useThemeStore } from '@/lib/store/themeStore'
import { useNotifications } from '@/lib/hooks/useNotifications'
import { useUIStore } from '@/store/uiStore'
import type { AppNotification } from '@/lib/types'

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
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { mode, toggleTheme } = useThemeStore()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [notifAnchor, setNotifAnchor] = useState<null | HTMLElement>(null)
  const [search, setSearch] = useState('')
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const setCommandPaletteOpen = useUIStore((s) => s.setCommandPaletteOpen)

  const todayLabel = useMemo(() => {
    return new Intl.DateTimeFormat('ru-RU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(new Date())
  }, [])

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'только что'
    if (mins < 60) return `${mins} мин назад`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs} ч назад`
    return `${Math.floor(hrs / 24)} д назад`
  }

  const openSearch = () => {
    if (search.trim()) navigate(`/tasks?search=${encodeURIComponent(search.trim())}`)
    else setCommandPaletteOpen(true)
  }

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        backdropFilter: 'blur(10px)',
        backgroundColor: (t) => alpha(t.palette.background.paper, 0.82),
      }}
    >
      <Toolbar sx={{ gap: 1.5, minHeight: 72 }}>
        <IconButton onClick={onToggleSidebar} sx={{ color: 'text.secondary' }}>
          <MenuIcon />
        </IconButton>

        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ textTransform: 'capitalize' }}>
            {todayLabel}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Сфокусируйтесь на приоритетных задачах
          </Typography>
        </Box>

        <TextField
          size="small"
          placeholder="Поиск задач, проектов, комментариев..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') openSearch()
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
              e.preventDefault()
              setCommandPaletteOpen(true)
            }
          }}
          onClick={() => { if (!search) setCommandPaletteOpen(true) }}
          sx={{
            flex: 1,
            maxWidth: 480,
            '& .MuiOutlinedInput-root': {
              borderRadius: 999,
              bgcolor: 'action.hover',
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <Chip label="⌘K" size="small" variant="outlined" onClick={() => setCommandPaletteOpen(true)} />
              </InputAdornment>
            ),
          }}
        />

        <Box sx={{ flex: 1 }} />

        <Stack direction="row" spacing={1} alignItems="center">
          <Chip icon={<TimelineIcon />} label="Timeline" variant="outlined" onClick={() => navigate('/tasks')} sx={{ display: { xs: 'none', lg: 'inline-flex' } }} />
          <Tooltip title={mode === 'dark' ? 'Светлая тема' : 'Тёмная тема'}>
            <IconButton onClick={toggleTheme} sx={{ color: 'text.secondary' }}>
              {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>
          <IconButton onClick={(e) => setNotifAnchor(e.currentTarget)} sx={{ color: 'text.secondary', bgcolor: 'action.hover', '&:hover': { bgcolor: 'action.selected' } }}>
            <Badge badgeContent={unreadCount} color="error" variant={unreadCount > 0 ? 'standard' : 'dot'}>
              <BellIcon />
            </Badge>
          </IconButton>
        </Stack>

        <Popover open={Boolean(notifAnchor)} anchorEl={notifAnchor} onClose={() => setNotifAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }} PaperProps={{ sx: { width: 380, maxHeight: 480, borderRadius: 3, mt: 1 } }}>
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle1" fontWeight={700}>Уведомления</Typography>
            {unreadCount > 0 && <Button size="small" startIcon={<DoneAll />} onClick={() => markAllAsRead()}>Прочитать все</Button>}
          </Box>
          <Divider />
          {notifications.length === 0 ? (
            <Typography sx={{ p: 3, textAlign: 'center' }} color="text.secondary">Нет уведомлений</Typography>
          ) : (
            <List disablePadding>
              {notifications.slice(0, 10).map((n: AppNotification) => (
                <ListItem key={n.id} onClick={() => !n.is_read && markAsRead(n.id)} sx={{ cursor: 'pointer', bgcolor: n.is_read ? 'transparent' : 'action.hover', '&:hover': { bgcolor: 'action.selected' }, px: 2, py: 1.5 }}>
                  <ListItemAvatar>{notifIcon[n.type] || <BellIcon />}</ListItemAvatar>
                  <ListItemText primary={n.message} secondary={timeAgo(n.created_at)} />
                  {!n.is_read && <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main', ml: 1 }} />}
                </ListItem>
              ))}
            </List>
          )}
        </Popover>

        <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
          <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: 14, fontWeight: 700 }}>
            {user?.username?.charAt(0)?.toUpperCase() || 'U'}
          </Avatar>
        </IconButton>

        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)} PaperProps={{ sx: { mt: 1, minWidth: 180, borderRadius: 3 } }}>
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="body2" fontWeight={700}>{user?.full_name || user?.username || 'Пользователь'}</Typography>
            <Typography variant="caption" color="text.secondary">{user?.email || ''}</Typography>
          </Box>
          <Divider />
          <MenuItem onClick={() => navigate('/settings')}>Настройки</MenuItem>
          <MenuItem onClick={() => { logout(); setAnchorEl(null) }} sx={{ gap: 1.5, color: 'error.main' }}>
            <LogoutIcon fontSize="small" />Выйти
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  )
}
