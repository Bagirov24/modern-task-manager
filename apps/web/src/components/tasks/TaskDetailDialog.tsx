import { useState, useEffect } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, FormControl, InputLabel, Select, MenuItem, Stack,
  IconButton, Typography, Box, CircularProgress, Divider,
} from '@mui/material'
import { Close as CloseIcon } from '@mui/icons-material'
import { useTasks } from '../../hooks/useTasks'
import type { Task } from '../../lib/types'

interface Props {
  open: boolean
  onClose: () => void
  task: Task | null
  mode: 'view' | 'edit' | 'create'
}

const priorities = [
  { value: 'low', label: 'Низкий', color: '#4caf50' },
  { value: 'medium', label: 'Средний', color: '#ff9800' },
  { value: 'high', label: 'Высокий', color: '#f44336' },
  { value: 'urgent', label: 'Срочный', color: '#9c27b0' },
]

const statuses = [
  { value: 'todo', label: 'К выполнению' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'done', label: 'Готово' },
]

export default function TaskDetailDialog({ open, onClose, task, mode }: Props) {
  const { createTask, updateTask, deleteTask } = useTasks()
  const [form, setForm] = useState<Record<string, string>>({
    title: '',
    description: '',
    priority: 'medium' ,
    status: 'todo' ,
    due_date: '',
  })
  const [isEditing, setIsEditing] = useState(mode === 'edit' || mode === 'create')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (task && mode !== 'create') {
      setForm({
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        status: task.status,
        due_date: task.due_date || '',
      })
      setIsEditing(mode === 'edit')
    } else {
      setForm({ title: '', description: '', priority: 'medium', status: 'todo', due_date: '' })
      setIsEditing(true)
    }
  }, [task, mode, open])

  const handleSave = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      if (mode === 'create') {
        await createTask(form)
      } else if (task) {
        await updateTask(task.id, form)
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (task) {
      await deleteTask(task.id)
      onClose()
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6">
          {mode === 'create' ? 'Новая задача' : isEditing ? 'Редактирование' : task?.title}
        </Typography>
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {isEditing ? (
            <>
              <TextField
                label="Название"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                fullWidth required autoFocus
              />
              <TextField
                label="Описание"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                fullWidth multiline rows={3}
              />
              <Stack direction="row" spacing={2}>
                <FormControl fullWidth>
                  <InputLabel>Приоритет</InputLabel>
                  <Select
                    value={form.priority}
                    label="Приоритет"
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  >
                    {priorities.map(p => (
                      <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>Статус</InputLabel>
                  <Select
                    value={form.status}
                    label="Статус"
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    {statuses.map(s => (
                      <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
              <TextField
                label="Срок"
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </>
          ) : (
            <>
              {task?.description && (
                <Typography variant="body1">{task.description}</Typography>
              )}
              <Divider />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Приоритет: {priorities.find(p => p.value === task?.priority)?.label}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Статус: {statuses.find(s => s.value === task?.status)?.label}
                </Typography>
              </Box>
              {task?.due_date && (
                <Typography variant="body2" color="text.secondary">
                  Срок: {new Date(task.due_date).toLocaleDateString('ru-RU')}
                </Typography>
              )}
            </>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        {task && mode !== 'create' && (
          <Button color="error" onClick={handleDelete} sx={{ mr: 'auto' }}>Удалить</Button>
        )}
        {!isEditing && mode === 'view' && (
          <Button onClick={() => setIsEditing(true)}>Редактировать</Button>
        )}
        <Button onClick={onClose}>Отмена</Button>
        {isEditing && (
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : mode === 'create' ? 'Создать' : 'Сохранить'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
