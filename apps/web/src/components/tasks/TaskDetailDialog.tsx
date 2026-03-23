import { useState, useEffect } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, FormControl, InputLabel, Select, MenuItem, Stack,
  IconButton, Typography, Box, CircularProgress, Divider, Avatar,
  List, ListItem, ListItemAvatar, ListItemText, Chip,
} from '@mui/material'
import {
  Close as CloseIcon, Delete as DeleteIcon,
  Send as SendIcon, Comment as CommentIcon,
} from '@mui/icons-material'
import type { Task } from '@/lib/types'
import { useCreateTask, useUpdateTask, useDeleteTask } from '@/lib/hooks/useTasks'
import { useComments, useCreateComment, useDeleteComment } from '@/lib/hooks/useComments'
import { useLabels } from '@/lib/hooks/useLabels'

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
  const createMutation = useCreateTask()
  const updateMutation = useUpdateTask()
  const deleteMutation = useDeleteTask()
  const { data: comments = [], isLoading: commentsLoading } = useComments(task?.id)
  const createComment = useCreateComment()
  const deleteComment = useDeleteComment()
  const { data: labels = [] } = useLabels()

  const [form, setForm] = useState(emptyTask)
  const [isEditing, setIsEditing] = useState(mode === 'edit' || mode === 'create')
  const [commentText, setCommentText] = useState('')

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
    setCommentText('')
  }, [task, mode, open])

  const isSaving = createMutation.isPending || updateMutation.isPending

  const handleSave = () => {
    if (!form.title.trim()) return
    if (mode === 'create') {
      createMutation.mutate(
        { title: form.title.trim(), description: form.description || undefined, priority: form.priority, status: form.status, due_date: form.due_date || undefined },
        { onSuccess: () => onClose() }
      )
    } else if (task) {
      updateMutation.mutate(
        { id: task.id, data: { title: form.title.trim(), description: form.description || undefined, priority: form.priority, status: form.status, due_date: form.due_date || undefined } },
        { onSuccess: () => onClose() }
      )
    }
  }

  const handleDelete = () => {
    if (task) deleteMutation.mutate(task.id, { onSuccess: () => onClose() })
  }

  const handleAddComment = () => {
    if (!commentText.trim() || !task) return
    createComment.mutate({ content: commentText.trim(), task_id: task.id })
    setCommentText('')
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
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {mode === 'create' ? 'Новая задача' : isEditing ? 'Редактирование' : task?.title}
        <Box>
          {task && mode !== 'create' && (
            <IconButton onClick={handleDelete} color="error" size="small">
              <DeleteIcon />
            </IconButton>
          )}
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2}>
          <TextField label="Название" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} fullWidth required disabled={!isEditing} autoFocus={isEditing} />
          <TextField label="Описание" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} fullWidth multiline rows={3} disabled={!isEditing} />

          <FormControl fullWidth size="small">
            <InputLabel>Приоритет</InputLabel>
            <Select value={form.priority} label="Приоритет" onChange={(e) => setForm({ ...form, priority: e.target.value as Task['priority'] })} disabled={!isEditing}>
              {priorityOptions.map((o) => (<MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>Статус</InputLabel>
            <Select value={form.status} label="Статус" onChange={(e) => setForm({ ...form, status: e.target.value as Task['status'] })} disabled={!isEditing}>
              {statusOptions.map((o) => (<MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>))}
            </Select>
          </FormControl>

          <TextField label="Срок" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth size="small" disabled={!isEditing} />

          {/* Метки */}
          {labels.length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>Метки</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {labels.map((label: any) => (
                  <Chip key={label.id} label={label.name} size="small" sx={{ bgcolor: label.color + '20', color: label.color, borderColor: label.color, border: '1px solid' }} />
                ))}
              </Box>
            </Box>
          )}

          {task && !isEditing && (
            <Typography variant="caption" color="text.secondary">
              Создано: {new Date(task.created_at).toLocaleDateString('ru-RU')}
            </Typography>
          )}
        </Stack>

        {/* Комментарии */}
        {task && mode !== 'create' && (
          <>
            <Divider sx={{ my: 2 }} />
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <CommentIcon fontSize="small" /> Комментарии ({comments.length})
              </Typography>

              {commentsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : comments.length > 0 ? (
                <List dense disablePadding>
                  {comments.map((c: any) => (
                    <ListItem key={c.id} secondaryAction={
                      <IconButton edge="end" size="small" onClick={() => deleteComment.mutate({ commentId: c.id, taskId: task.id })}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    }>
                      <ListItemAvatar>
                        <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: 'primary.main' }}>
                          {(c.author_id || '?').charAt(0).toUpperCase()}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={c.content}
                        secondary={new Date(c.created_at).toLocaleString('ru-RU')}
                        primaryTypographyProps={{ variant: 'body2' }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                  Нет комментариев
                </Typography>
              )}

              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <TextField
                  placeholder="Напишите комментарий..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  fullWidth
                  size="small"
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleAddComment())}
                />
                <IconButton onClick={handleAddComment} color="primary" disabled={!commentText.trim() || createComment.isPending}>
                  <SendIcon />
                </IconButton>
              </Box>
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions>
        {!isEditing && mode !== 'create' ? (
          <Button onClick={() => setIsEditing(true)} variant="outlined">Редактировать</Button>
        ) : (
          <>
            <Button onClick={onClose}>Отмена</Button>
            <Button onClick={handleSave} variant="contained" disabled={isSaving || !form.title.trim()} startIcon={isSaving ? <CircularProgress size={16} /> : undefined}>
              {mode === 'create' ? 'Создать' : 'Сохранить'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  )
}
