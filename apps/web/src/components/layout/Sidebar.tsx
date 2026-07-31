import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Avatar, Box, Divider, Drawer, IconButton, List, ListItemButton, ListItemIcon,
  ListItemText, Stack, SwipeableDrawer, Tooltip, Typography,
} from '@mui/material'
import {
  ArticleOutlined, CalendarMonthOutlined, ChevronLeft, DarkModeOutlined,
  FolderOutlined, ForumOutlined, LightModeOutlined, Logout, LinkOutlined,
  MenuBookOutlined, QueryStatsOutlined, RocketLaunch, Search, SettingsOutlined,
  SpaceDashboardOutlined, TaskAltOutlined, ViewKanbanOutlined,
} from '@mui/icons-material'
import { useAuthStore } from '@/lib/store/authStore'
import { disconnectSocket } from '@/lib/socket/socketClient'
import { useUIStore } from '@/store/uiStore'

const SIDEBAR_TRANSITION = 'all 0.28s cubic-bezier(0.4, 0, 0.2, 1)'

const navigationItems = {
  '/': { icon: SpaceDashboardOutlined, label: 'Обзор' },
  '/inbox': { icon: ForumOutlined, label: 'Входящие действия' },
  '/tasks': { icon: TaskAltOutlined, label: 'Мои задачи' },
  '/projects': { icon: FolderOutlined, label: 'Проекты' },
  '/boards': { icon: ViewKanbanOutlined, label: 'Доски' },
  '/calendar': { icon: CalendarMonthOutlined, label: 'Календарь' },
  '/knowledge': { icon: MenuBookOutlined, label: 'Требования и знания' },
  '/documents': { icon: ArticleOutlined, label: 'Документы' },
  '/links': { icon: LinkOutlined, label: 'Полезные ссылки' },
  '/analytics': { icon: QueryStatsOutlined, label: 'Отчёты' },
  '/settings': { icon: SettingsOutlined, label: 'Настройки' },
} as const

export const navigationGroups = [
  { label: 'Моя работа', items: ['/', '/inbox', '/tasks'] },
  { label: 'Планирование', items: ['/projects', '/boards', '/calendar'] },
  { label: 'Знания', items: ['/knowledge', '/documents', '/links'] },
  { label: 'Управление', items: ['/analytics', '/settings'] },
] as const

interface SidebarProps {
  drawerWidth: number
  collapsedWidth: number
  open: boolean
  mobileOpen: boolean
  isMobile: boolean
  onClose: () => void
  onOpen: () => void
}

export default function Sidebar({ drawerWidth, collapsedWidth, open, mobileOpen, isMobile, onClose, onOpen }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const setSidebarCollapsed = useUIStore((state) => state.setSidebarCollapsed)
  const setCommandPaletteOpen = useUIStore((state) => state.setCommandPaletteOpen)
  const mode = useUIStore((state) => state.mode)
  const toggleTheme = useUIStore((state) => state.toggleTheme)

  const navigateTo = (path: string) => {
    if (isMobile) onClose()
    navigate(path)
  }
  const handleLogout = () => {
    disconnectSocket()
    logout()
    navigate('/login')
  }
  const userInitial = (user?.full_name || user?.username || user?.email || '?').charAt(0).toUpperCase()
  const currentWidth = open ? drawerWidth : collapsedWidth

  const actionButton = (label: string, icon: JSX.Element, action: () => void, shortcut?: string) => (
    <Tooltip title={!open ? label : ''} placement="right" arrow>
      <ListItemButton onClick={action} aria-label={label} sx={{ mx: open ? 1 : 0.5, minHeight: 44, px: open ? 1.5 : 1, justifyContent: open ? 'flex-start' : 'center', color: '#CBD5E1', borderRadius: 1, '&:hover': { bgcolor: 'rgba(148,163,184,0.12)', color: '#F8FAFC' } }}>
        <ListItemIcon sx={{ color: 'inherit', minWidth: open ? 40 : 0, justifyContent: 'center' }}>{icon}</ListItemIcon>
        {open && <ListItemText primary={label} primaryTypographyProps={{ fontSize: 13, fontWeight: 600 }} />}
        {open && shortcut && <Typography variant="caption" sx={{ color: '#64748B' }}>{shortcut}</Typography>}
      </ListItemButton>
    </Tooltip>
  )

  const content = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', bgcolor: '#0F172A', color: '#F8FAFC' }}>
      <Stack direction="row" alignItems="center" justifyContent={open ? 'space-between' : 'center'} sx={{ minHeight: 72, px: open ? 2 : 1 }}>
        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
          <Box sx={{ width: 36, height: 36, display: 'grid', placeItems: 'center', bgcolor: '#2563EB', borderRadius: 1, flexShrink: 0 }}><RocketLaunch sx={{ fontSize: 20 }} /></Box>
          {open && <Box sx={{ minWidth: 0 }}><Typography fontWeight={800} noWrap>Modern Task Manager</Typography><Typography variant="caption" sx={{ color: '#94A3B8' }} noWrap>Единое рабочее пространство</Typography></Box>}
        </Stack>
        {!isMobile && open && <Tooltip title="Свернуть"><IconButton size="small" onClick={() => setSidebarCollapsed(true)} sx={{ color: '#94A3B8' }}><ChevronLeft /></IconButton></Tooltip>}
      </Stack>
      <Divider sx={{ borderColor: 'rgba(148,163,184,0.16)' }} />
      <List dense sx={{ flex: 1, overflowY: 'auto', py: 1, px: 0 }}>
        {navigationGroups.map((group) => (
          <Box key={group.label} sx={{ mb: 1.25 }}>
            {open && <Typography variant="overline" sx={{ display: 'block', px: 2.5, pb: 0.5, color: '#94A3B8', fontSize: 10, fontWeight: 700 }}>{group.label}</Typography>}
            {group.items.map((path) => {
              const item = navigationItems[path]
              const active = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
              const Icon = item.icon
              return <Tooltip key={path} title={!open ? item.label : ''} placement="right" arrow><ListItemButton component={RouterLink} to={path} selected={active} onClick={() => { if (isMobile) onClose() }} aria-current={active ? 'page' : undefined} sx={{ mx: open ? 1 : 0.5, mb: 0.25, minHeight: 44, px: open ? 1.5 : 1, justifyContent: open ? 'flex-start' : 'center', color: active ? '#FFFFFF' : '#CBD5E1', borderRadius: 1, borderLeft: '3px solid', borderLeftColor: active ? '#60A5FA' : 'transparent', '&.Mui-selected': { bgcolor: 'rgba(96,165,250,0.16)' }, '&.Mui-selected:hover': { bgcolor: 'rgba(96,165,250,0.22)' }, '&:hover': { bgcolor: 'rgba(148,163,184,0.1)', color: '#FFFFFF' } }}><ListItemIcon sx={{ color: active ? '#60A5FA' : 'inherit', minWidth: open ? 40 : 0, justifyContent: 'center' }}><Icon fontSize="small" /></ListItemIcon>{open && <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 14, fontWeight: active ? 700 : 550 }} />}</ListItemButton></Tooltip>
            })}
          </Box>
        ))}
      </List>
      <Divider sx={{ borderColor: 'rgba(148,163,184,0.16)' }} />
      <Box sx={{ py: 0.75 }}>
        {actionButton('Быстрый поиск', <Search fontSize="small" />, () => setCommandPaletteOpen(true), 'Ctrl K')}
        {actionButton(mode === 'dark' ? 'Светлая тема' : 'Тёмная тема', mode === 'dark' ? <LightModeOutlined fontSize="small" /> : <DarkModeOutlined fontSize="small" />, toggleTheme)}
      </Box>
      <Divider sx={{ borderColor: 'rgba(148,163,184,0.16)' }} />
      <Stack direction="row" alignItems="center" gap={1.25} sx={{ px: open ? 1.5 : 1, py: 1.25, minHeight: 68 }}>
        <Tooltip title={!open ? (user?.full_name || user?.username || 'Профиль') : ''} placement="right"><Avatar onClick={() => navigateTo('/settings')} sx={{ width: 36, height: 36, bgcolor: '#2563EB', cursor: 'pointer', flexShrink: 0 }}>{userInitial}</Avatar></Tooltip>
        {open && <Box sx={{ minWidth: 0, flex: 1, cursor: 'pointer' }} onClick={() => navigateTo('/settings')}><Typography variant="body2" fontWeight={700} noWrap>{user?.full_name || user?.username || 'Пользователь'}</Typography><Typography variant="caption" sx={{ color: '#94A3B8' }} noWrap>{user?.email}</Typography></Box>}
        {open && <Tooltip title="Выйти"><IconButton size="small" onClick={handleLogout} sx={{ color: '#94A3B8' }}><Logout fontSize="small" /></IconButton></Tooltip>}
      </Stack>
    </Box>
  )

  if (isMobile) return <SwipeableDrawer open={mobileOpen} onClose={onClose} onOpen={onOpen} sx={{ '& .MuiDrawer-paper': { width: drawerWidth, borderRadius: 0 } }}>{content}</SwipeableDrawer>

  return <Drawer variant="permanent" sx={{ width: currentWidth, flexShrink: 0, '& .MuiDrawer-paper': { width: currentWidth, boxSizing: 'border-box', borderRadius: 0, overflowX: 'hidden', transition: SIDEBAR_TRANSITION, borderRight: 0 } }}>{content}</Drawer>
}
