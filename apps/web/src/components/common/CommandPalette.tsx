import { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  TextField,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Divider,
  Chip,
  alpha,
} from '@mui/material'
import {
  Search as SearchIcon,
  TaskAlt as TaskIcon,
  FolderOutlined as ProjectIcon,
  Add as AddIcon,
  Dashboard as DashboardIcon,
  CalendarMonth as CalendarIcon,
  BarChart as AnalyticsIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  ChevronRight as ArrowIcon,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useUIStore } from '@/store/uiStore'
import { useTaskStore } from '@/store/taskStore'
import { useProjectStore } from '@/store/projectStore'
import { useAuthStore } from '@/lib/store/authStore'
import { disconnectSocket } from '@/lib/socket/socketClient'

type CommandGroup = 'navigation' | 'tasks' | 'projects' | 'actions'

interface Command {
  id: string
  label: string
  description?: string
  group: CommandGroup
  icon: JSX.Element
  shortcut?: string
  action: () => void
}

const groupLabels: Record<CommandGroup, string> = {
  navigation: 'Навигация',
  tasks: 'Задачи',
  projects: 'Проекты',
  actions: 'Действия',
}

const groupOrder: CommandGroup[] = ['navigation', 'actions', 'tasks', 'projects']

export default function CommandPalette() {
  const navigate = useNavigate()
  const open = useUIStore((s) => s.commandPaletteOpen)
  const setOpen = useUIStore((s) => s.setCommandPaletteOpen)
  const openModal = useUIStore((s) => s.openModal)
  const addSnackbar = useUIStore((s) => s.addSnackbar)
  const tasks = useTaskStore((s) => s.tasks)
  const projects = useProjectStore((s) => s.projects)
  const logout = useAuthStore((s) => s.logout)

  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const close = () => {
    setOpen(false)
    setQuery('')
    setActiveIndex(0)
  }

  const go = (action: () => void) => {
    close()
    action()
  }

  const staticCommands: Command[] = useMemo(() => [
    { id: 'nav-home', label: 'Главная', description: 'Перейти на Dashboard', group: 'navigation', icon: <DashboardIcon fontSize="small" />, shortcut: 'G H', action: () => navigate('/') },
    { id: 'nav-tasks', label: 'Задачи', description: 'Перейти к задачам', group: 'navigation', icon: <TaskIcon fontSize="small" />, shortcut: 'G T', action: () => navigate('/tasks') },
    { id: 'nav-projects', label: 'Проекты', description: 'Перейти к проектам', group: 'navigation', icon: <ProjectIcon fontSize="small" />, shortcut: 'G P', action: () => navigate('/projects') },
    { id: 'nav-calendar', label: 'Календарь', group: 'navigation', icon: <CalendarIcon fontSize="small" />, shortcut: 'G C', action: () => navigate('/calendar') },
    { id: 'nav-analytics', label: 'Аналитика', group: 'navigation', icon: <AnalyticsIcon fontSize="small" />, action: () => navigate('/analytics') },
    { id: 'nav-settings', label: 'Настройки', group: 'navigation', icon: <SettingsIcon fontSize="small" />, action: () => navigate('/settings') },
    { id: 'action-create-task', label: 'Создать задачу', description: 'Открыть форму новой задачи', group: 'actions', icon: <AddIcon fontSize="small" color="primary" />, shortcut: 'C T', action: () => { navigate('/tasks'); openModal('task.create') } },
    { id: 'action-create-project', label: 'Создать проект', description: 'Открыть форму нового проекта', group: 'actions', icon: <AddIcon fontSize="small" color="secondary" />, shortcut: 'C P', action: () => { navigate('/projects'); openModal('project.create') } },
    {
      id: 'action-logout', label: 'Выйти', description: 'Завершить сессию', group: 'actions', icon: <LogoutIcon fontSize="small" color="error" />,
      action: () => { disconnectSocket(); logout(); navigate('/login'); addSnackbar({ message: 'Вы вышли из системы', type: 'info', duration: 3000 }) },
    },
  ], [navigate, openModal, logout, addSnackbar])

  const taskCommands: Command[] = useMemo(() => tasks.slice(0, 50).map((task) => ({
    id: `task-${task.id}`,
    label: task.title,
    description: task.status === 'done' ? 'Готово' : task.status === 'in_progress' ? 'В работе' : 'К выполнению',
    group: 'tasks',
    icon: <TaskIcon fontSize="small" />,
    action: () => { navigate('/tasks'); openModal('task.detail', { taskId: task.id }) },
  })), [tasks, navigate, openModal])

  const projectCommands: Command[] = useMemo(() => (projects as any[]).slice(0, 30).map((p: any) => ({
    id: `project-${p.id}`,
    label: p.name,
    description: p.description || '',
    group: 'projects',
    icon: <ProjectIcon fontSize="small" />,
    action: () => navigate(`/projects`),
  })), [projects, navigate])

  const allCommands = useMemo(() => [...staticCommands, ...taskCommands, ...projectCommands], [staticCommands, taskCommands, projectCommands])

  const filtered = useMemo(() => {
    if (!query.trim()) return allCommands
    const q = query.toLowerCase()
    return allCommands.filter((cmd) =>
      cmd.label.toLowerCase().includes(q) ||
      cmd.description?.toLowerCase().includes(q)
    )
  }, [allCommands, query])

  const grouped = useMemo(() => {
    const map: Partial<Record<CommandGroup, Command[]>> = {}
    filtered.forEach((cmd) => {
      if (!map[cmd.group]) map[cmd.group] = []
      map[cmd.group]!.push(cmd)
    })
    return map
  }, [filtered])

  const flatFiltered = useMemo(() => {
    const result: Command[] = []
    groupOrder.forEach((g) => { if (grouped[g]) result.push(...grouped[g]!) })
    return result
  }, [grouped])

  useEffect(() => { setActiveIndex(0) }, [query])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, flatFiltered.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)) }
      if (e.key === 'Enter' && flatFiltered[activeIndex]) { e.preventDefault(); go(flatFiltered[activeIndex].action) }
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, flatFiltered, activeIndex])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(!open)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, setOpen])

  let flatIndex = 0

  return (
    <Dialog
      open={open}
      onClose={close}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: 4,
          mt: '10vh',
          verticalAlign: 'top',
          backdropFilter: 'blur(16px)',
          bgcolor: (t) => alpha(t.palette.background.paper, 0.96),
          overflow: 'hidden',
        },
      }}
      slotProps={{ backdrop: { sx: { backdropFilter: 'blur(4px)' } } }}
    >
      <DialogContent sx={{ p: 0 }}>
        <TextField
          autoFocus
          fullWidth
          placeholder="Поиск команд, задач, проектов..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start" sx={{ ml: 1 }}>
                <SearchIcon />
              </InputAdornment>
            ),
            disableUnderline: true,
            sx: { fontSize: 18, py: 0.5 },
          }}
          variant="standard"
          sx={{ px: 2, py: 1.5 }}
        />
        <Divider />

        {filtered.length === 0 ? (
          <Box sx={{ py: 5, textAlign: 'center' }}>
            <Typography color="text.secondary">Ничего не найдено по запросу «{query}»</Typography>
          </Box>
        ) : (
          <List dense disablePadding sx={{ maxHeight: '60vh', overflowY: 'auto', pb: 1 }}>
            {groupOrder.map((group) => {
              const cmds = grouped[group]
              if (!cmds?.length) return null
              return (
                <Box key={group}>
                  <Typography variant="caption" color="text.disabled" sx={{ px: 2, pt: 1.5, pb: 0.5, display: 'block', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                    {groupLabels[group]}
                  </Typography>
                  {cmds.map((cmd) => {
                    const isActive = flatIndex === activeIndex
                    const currentIndex = flatIndex
                    flatIndex++
                    return (
                      <ListItem key={cmd.id} disablePadding>
                        <ListItemButton
                          selected={isActive}
                          onClick={() => go(cmd.action)}
                          onMouseEnter={() => setActiveIndex(currentIndex)}
                          sx={{
                            mx: 1,
                            borderRadius: 2,
                            '&.Mui-selected': {
                              bgcolor: (t) => alpha(t.palette.primary.main, 0.1),
                            },
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 36, color: isActive ? 'primary.main' : 'text.secondary' }}>
                            {cmd.icon}
                          </ListItemIcon>
                          <ListItemText
                            primary={cmd.label}
                            secondary={cmd.description}
                            primaryTypographyProps={{ fontWeight: isActive ? 700 : 500 }}
                          />
                          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                            {cmd.shortcut && (
                              <Chip label={cmd.shortcut} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                            )}
                            {isActive && <ArrowIcon fontSize="small" sx={{ color: 'text.disabled' }} />}
                          </Box>
                        </ListItemButton>
                      </ListItem>
                    )
                  })}
                </Box>
              )
            })}
          </List>
        )}

        <Divider />
        <Box sx={{ px: 2, py: 1, display: 'flex', gap: 2 }}>
          <Typography variant="caption" color="text.disabled">↑↓ навигация</Typography>
          <Typography variant="caption" color="text.disabled">↵ выбрать</Typography>
          <Typography variant="caption" color="text.disabled">Esc закрыть</Typography>
          <Box flex={1} />
          <Typography variant="caption" color="text.disabled">⌘K открыть</Typography>
        </Box>
      </DialogContent>
    </Dialog>
  )
}
