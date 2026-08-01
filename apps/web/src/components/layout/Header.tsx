import { useMemo, useState } from 'react'
import {
  AppBar, Avatar, Badge, Box, Button, Divider, IconButton, InputAdornment, List,
  ListItem, ListItemAvatar, ListItemText, Menu, MenuItem, Popover, Stack,
  TextField, Toolbar, Tooltip, Typography, alpha,
} from '@mui/material'
import {
  Add as AddIcon, AlternateEmail, Comment, DarkMode as DarkModeIcon, DoneAll,
  FolderOpen, LightMode as LightModeIcon, Logout as LogoutIcon, Menu as MenuIcon,
  NotificationsOutlined as BellIcon, Search as SearchIcon, TaskAlt,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/lib/store/authStore'
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
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const mode = useUIStore((state) => state.mode)
  const toggleTheme = useUIStore((state) => state.toggleTheme)
  const setCommandPaletteOpen = useUIStore((state) => state.setCommandPaletteOpen)
  const openModal = useUIStore((state) => state.openModal)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [notifAnchor, setNotifAnchor] = useState<null | HTMLElement>(null)
  const [search, setSearch] = useState('')
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()

  const todayLabel = useMemo(() => new Intl.DateTimeFormat('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date()), [])

  const timeAgo = (date: string) => {
    const minutes = Math.floor((Date.now() - new Date(date).getTime()) / 60000)
    if (minutes < 1) return 'только что'
    if (minutes < 60) return `${minutes} мин назад`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} ч назад`
    return `${Math.floor(hours / 24)} д назад`
  }

  const openSearch = () => {
    if (search.trim()) navigate(`/tasks?search=${encodeURIComponent(search.trim())}`)
    else setCommandPaletteOpen(true)
  }
  const openQuickCreate = () => openModal('task.quickCreate')

  return (
    <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider', backdropFilter: 'blur(10px)', backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.82) }}>
      <Toolbar sx={{ gap: 1.5, minHeight: 72 }}>
        <Tooltip title={'Открыть навигацию'}><IconButton onClick={onToggleSidebar} aria-label={'Открыть навигацию'} sx={{ color: 'text.secondary', minWidth: 44, minHeight: 44 }}><MenuIcon /></IconButton></Tooltip>
        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ textTransform: 'capitalize' }}>{todayLabel}</Typography>
          <Typography variant="caption" color="text.secondary">Сфокусируйтесь на приоритетных задачах</Typography>
        </Box>
        <TextField
          size="small"
          placeholder="Поиск задач, проектов, комментариев..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') openSearch()
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
              event.preventDefault()
              setCommandPaletteOpen(true)
            }
          }}
          onClick={() => { if (!search) setCommandPaletteOpen(true) }}
          sx={{ display: { xs: 'none', sm: 'block' }, flex: 1, maxWidth: 480, '& .MuiOutlinedInput-root': { borderRadius: 8, bgcolor: 'action.hover' } }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
        />
        <Box sx={{ flex: 1 }} />
        <Stack direction="row" spacing={1} alignItems="center">
          <Button variant="contained" startIcon={<AddIcon />} onClick={openQuickCreate} sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>Создать</Button>
          <Tooltip title="Создать задачу"><IconButton onClick={openQuickCreate} aria-label="Создать задачу" sx={{ display: { xs: 'inline-flex', sm: 'none' }, color: 'primary.main', minWidth: 44, minHeight: 44 }}><AddIcon /></IconButton></Tooltip>
          <Tooltip title={mode === 'dark' ? 'Светлая тема' : 'Тёмная тема'}><IconButton onClick={toggleTheme} aria-label="Переключить тему" sx={{ color: 'text.secondary', minWidth: 44, minHeight: 44 }}>{mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}</IconButton></Tooltip>
          <Tooltip title={'Уведомления'}><IconButton onClick={(event) => setNotifAnchor(event.currentTarget)} aria-label={'Уведомления'} sx={{ color: 'text.secondary', bgcolor: 'action.hover', minWidth: 44, minHeight: 44, '&:hover': { bgcolor: 'action.selected' } }}>
            <Badge badgeContent={unreadCount} color="error" variant={unreadCount > 0 ? 'standard' : 'dot'}><BellIcon /></Badge>
          </IconButton></Tooltip>
        </Stack>
        <Popover open={Boolean(notifAnchor)} anchorEl={notifAnchor} onClose={() => setNotifAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }} PaperProps={{ sx: { width: 380, maxHeight: 480, borderRadius: 1, mt: 1 } }}>
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle1" fontWeight={700}>Уведомления</Typography>
            {unreadCount > 0 && <Button size="small" startIcon={<DoneAll />} onClick={() => markAllAsRead()}>Прочитать все</Button>}
          </Box>
          <Divider />
          {notifications.length === 0 ? <Typography sx={{ p: 3, textAlign: 'center' }} color="text.secondary">Нет уведомлений</Typography> : (
            <List disablePadding>
              {notifications.slice(0, 10).map((notification: AppNotification) => (
                <ListItem key={notification.id} onClick={() => !notification.is_read && markAsRead(notification.id)} sx={{ cursor: 'pointer', bgcolor: notification.is_read ? 'transparent' : 'action.hover', '&:hover': { bgcolor: 'action.selected' }, px: 2, py: 1.5 }}>
                  <ListItemAvatar>{notifIcon[notification.type] || <BellIcon />}</ListItemAvatar>
                  <ListItemText primary={notification.message} secondary={timeAgo(notification.created_at)} />
                  {!notification.is_read && <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main', ml: 1 }} />}
                </ListItem>
              ))}
            </List>
          )}
        </Popover>
        <Tooltip title={'Профиль'}><IconButton onClick={(event) => setAnchorEl(event.currentTarget)} aria-label={'Открыть меню профиля'} sx={{ minWidth: 44, minHeight: 44 }}>
          <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: 14, fontWeight: 700 }}>{user?.username?.charAt(0)?.toUpperCase() || 'U'}</Avatar>
        </IconButton></Tooltip>
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)} PaperProps={{ sx: { mt: 1, minWidth: 180, borderRadius: 1 } }}>
          <Box sx={{ px: 2, py: 1 }}><Typography variant="body2" fontWeight={700}>{user?.full_name || user?.username || 'Пользователь'}</Typography><Typography variant="caption" color="text.secondary">{user?.email || ''}</Typography></Box>
          <Divider />
          <MenuItem onClick={() => { navigate('/settings'); setAnchorEl(null) }}>Настройки</MenuItem>
          <MenuItem onClick={() => { logout(); setAnchorEl(null) }} sx={{ gap: 1.5, color: 'error.main' }}><LogoutIcon fontSize="small" />Выйти</MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  )
}
