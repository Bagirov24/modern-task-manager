import React, { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  TextField,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Chip,
  InputAdornment,
} from '@mui/material'
import {
  Search,
  Task,
  Folder,
  Dashboard,
  Settings,
  CalendarMonth,
  Analytics,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useTaskStore } from '../../store/taskStore'
import { useProjectStore } from '../../store/projectStore'
import { useUIStore } from '../../store/uiStore'

const PAGES = [
  { name: 'Главная', path: '/', icon: <Dashboard /> },
  { name: 'Задачи', path: '/tasks', icon: <Task /> },
  { name: 'Проекты', path: '/projects', icon: <Folder /> },
  { name: 'Календарь', path: '/calendar', icon: <CalendarMonth /> },
  { name: 'Аналитика', path: '/analytics', icon: <Analytics /> },
  { name: 'Настройки', path: '/settings', icon: <Settings /> },
]

export const SearchDialog: React.FC = () => {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const commandPaletteOpen = useUIStore((s) => s.commandPaletteOpen)
  const setCommandPaletteOpen = useUIStore((s) => s.setCommandPaletteOpen)
  const tasks = useTaskStore((s) => s.tasks)
  const projects = useProjectStore((s) => s.projects)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(!commandPaletteOpen)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [commandPaletteOpen, setCommandPaletteOpen])

  const results = useMemo(() => {
    if (!query.trim()) return { pages: PAGES, tasks: [], projects: [] }
    const q = query.toLowerCase()
    return {
      pages: PAGES.filter(p => p.name.toLowerCase().includes(q)),
      tasks: tasks.filter(t => t.title.toLowerCase().includes(q)).slice(0, 5),
      projects: projects.filter(p => p.name.toLowerCase().includes(q)).slice(0, 5),
    }
  }, [query, tasks, projects])

  const handleClose = () => {
    setCommandPaletteOpen(false)
    setQuery('')
  }

  const handleNavigate = (path: string) => {
    navigate(path)
    handleClose()
  }

  return (
    <Dialog
      open={commandPaletteOpen}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, mt: -10 } }}
    >
      <DialogContent sx={{ p: 0 }}>
        <TextField
          fullWidth
          autoFocus
          placeholder="Поиск задач, проектов, страниц..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <Chip label="Esc" size="small" variant="outlined" />
              </InputAdornment>
            ),
          }}
          sx={{ '& .MuiOutlinedInput-notchedOutline': { border: 'none' }, p: 1 }}
        />

        <List dense sx={{ maxHeight: 400, overflow: 'auto' }}>
          {results.pages.length > 0 && (
            <>
              <Typography variant="caption" sx={{ px: 2, py: 0.5, color: 'text.secondary' }}>
                Страницы
              </Typography>
              {results.pages.map((page) => (
                <ListItem
                  key={page.path}
                  onClick={() => handleNavigate(page.path)}
                  sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' } }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>{page.icon}</ListItemIcon>
                  <ListItemText primary={page.name} />
                </ListItem>
              ))}
            </>
          )}

          {results.tasks.length > 0 && (
            <>
              <Typography variant="caption" sx={{ px: 2, py: 0.5, color: 'text.secondary' }}>
                Задачи
              </Typography>
              {results.tasks.map((task) => (
                <ListItem
                  key={task.id}
                  onClick={() => handleNavigate('/tasks')}
                  sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' } }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}><Task /></ListItemIcon>
                  <ListItemText primary={task.title} secondary={task.status} />
                </ListItem>
              ))}
            </>
          )}

          {results.projects.length > 0 && (
            <>
              <Typography variant="caption" sx={{ px: 2, py: 0.5, color: 'text.secondary' }}>
                Проекты
              </Typography>
              {results.projects.map((project) => (
                <ListItem
                  key={project.id}
                  onClick={() => handleNavigate('/projects')}
                  sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' } }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Folder sx={{ color: project.color }} />
                  </ListItemIcon>
                  <ListItemText primary={project.name} />
                </ListItem>
              ))}
            </>
          )}
        </List>
      </DialogContent>
    </Dialog>
  )
}
