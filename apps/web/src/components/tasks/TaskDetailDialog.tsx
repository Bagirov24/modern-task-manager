import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  IconButton,
  Typography,
  Box,
} from '@mui/material'
import { Close as CloseIcon, Delete as DeleteIcon } from '@mui/icons-material'
import type { Task } from '@/lib/types'
import { useTaskStore } from '@/lib/store/taskStore'

interface Props {
  open: boolean
  onClose: () => void
  task: Task | null
  mode: 'view' | 'edit' | 'create'
}

const emptyTask = {
  title: '',
  description: '',
  priority: 'medium' as const,
  status: 'todo' as const,
  due_date: '',
}

export default function TaskDetailDialog({ open, onClose, task, mode }: Props) {
  const { addTask, updateTask, removeTask } = useTaskStore()
  const [form, setForm] = useState(emptyTask)
  const [isEditing, setIsEditing] = useState(mode === 'edit' || mode === 'create')

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
      setForm(emptyTask)
      setIsEditing(true)
    }
  }, [task, mode, open])

  const handleSave = () => {
    if (!form.title.trim()) return
    if (mode === 'create') {
      addTask({
        id: crypto.randomUUID(),
        title: form.title.trim(),
        description: form.description || undefined,
        priority: form.priority,
        status: form.status,
        due_date: form.due_date || undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Task)
    } else if (task) {
      updateTask(task.id, {
        title: form.title.trim(),
        description: form.description || undefined,
        priority: form.priority,
        status: form.status,
        due_date: form.due_date || undefined,
        updated_at: new Date().toISOString(),
      })
    }
    onClose()
  }

  const handleDelete = () => {
    if (task) {
      removeTask(task.id)
      onClose()
    }
  }

  const priorityOptions = [
    { value: 'low', label: 'Низкий' },
    { value: 'medium', label: 'Средний' },
    { value: 'high', label: 'Высокий' },
    { value: 'urgent', label: 'Срочный' },
  ]

  const statusOptions = [
    { value: 'todo', label: 'К выполнению' },
    { value: 'in_progress', label: 'В работе' },
    { value: 'done', label: 'Готово' },
    { value: 'archived', label: 'Архив' },
  ]

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6">
          {mode === 'create' ? 'Новая задача' : isEditing ? 'Редактирование' : task?.title}
        </Typography>
        <Box>
          {task && mode !== 'create' && (
            <IconButton onClick={handleDelete} color="error" size="small" sx={{ mr: 1 }}>
              <DeleteIcon />
            </IconButton>
          )}
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <TextField
            label="Название"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            fullWidth
            required
            disabled={!isEditing}
            autoFocus={isEditing}
          />
          <TextField
            label="Описание"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            fullWidth
            multiline
            rows={3}
            disabled={!isEditing}
          />
          <Stack direction="row" spacing={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Приоритет</InputLabel>
              <Select
                value={form.priority}
                label="Приоритет"
                onChange={(e) => setForm({ ...form, priority: e.target.value as Task['priority'] })}
                disabled={!isEditing}
              >
                {priorityOptions.map((o) => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>Статус</InputLabel>
              <Select
                value={form.status}
                label="Статус"
                onChange={(e) => setForm({ ...form, status: e.target.value as Task['status'] })}
                disabled={!isEditing}
              >
                {statusOptions.map((o) => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
          <TextField
            label="Срок"
            type="date"
            value={form.due_date ? form.due_date.slice(0, 10) : ''}
            onChange={(e) => setForm({ ...form, due_date: e.target.value })}
            InputLabelProps={{ shrink: true }}
            fullWidth
            size="small"
            disabled={!isEditing}
          />
          {task && !isEditing && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Создано: {new Date(task.created_at).toLocaleDateString('ru-RU')}
              </Typography>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        {!isEditing && mode !== 'create' ? (
          <Button onClick={() => setIsEditing(true)} variant="outlined">
            Редактировать
          </Button>
        ) : (
          <>
            <Button onClick={onClose}>Отмена</Button>
            <Button onClick={handleSave} variant="contained" disabled={!form.title.trim()}>
              {mode === 'create' ? 'Создать' : 'Сохранить'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  )
}
