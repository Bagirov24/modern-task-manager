import { useEffect, useMemo, useState } from 'react'
import {
  Alert, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, InputLabel, MenuItem, Select, Stack, TextField, Typography,
} from '@mui/material'
import { AutoAwesome, CalendarToday, FolderOutlined, PersonOutline } from '@mui/icons-material'
import { useUIStore } from '@/store/uiStore'
import { useProjectsQuery } from '@/lib/hooks/useProjectsQuery'
import { useTasksQuery } from '@/lib/hooks/useTasksQuery'
import { parseQuickTask } from '@/lib/quickTaskParser'
import type { TaskPriority } from '@/lib/types'

export default function QuickTaskDialog() {
  const modal = useUIStore((state) => state.modal)
  const closeModal = useUIStore((state) => state.closeModal)
  const addSnackbar = useUIStore((state) => state.addSnackbar)
  const { projects } = useProjectsQuery()
  const { createTask } = useTasksQuery()
  const open = modal.isOpen && modal.type === 'task.quickCreate'
  const [input, setInput] = useState('')
  const parsed = useMemo(() => parseQuickTask(input), [input])
  const [title, setTitle] = useState('')
  const [projectId, setProjectId] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [assignee, setAssignee] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setTitle(parsed.title)
    setPriority(parsed.priority)
    setAssignee(parsed.assignee)
    setDueDate(parsed.dueDate)
    const match = projects.find((project) => project.name.toLowerCase() === parsed.project.toLowerCase())
    setProjectId(match?.id || '')
  }, [parsed.title, parsed.priority, parsed.assignee, parsed.dueDate, parsed.project, projects, open])

  const close = () => {
    closeModal()
    setInput('')
    setError('')
  }
  const submit = async () => {
    if (!title.trim()) return
    setSaving(true)
    setError('')
    try {
      await createTask({
        title: title.trim(), priority, project_id: projectId || undefined,
        due_date: dueDate ? new Date(`${dueDate}T23:59:00`).toISOString() : undefined,
        workflow_status: projectId ? 'backlog' : 'inbox',
      })
      addSnackbar({ message: 'Задача добавлена', type: 'success', duration: 2500 })
      close()
    } catch {
      setError('Не удалось создать задачу. Проверьте поля и отсутствие секретов.')
    } finally {
      setSaving(false)
    }
  }

  return <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
    <DialogTitle><Stack direction="row" spacing={1} alignItems="center"><AutoAwesome color="primary" /><span>Быстрая задача</span></Stack></DialogTitle>
    <DialogContent>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>Введите задачу естественной строкой, затем проверьте распознанные значения.</Typography>
      <TextField autoFocus fullWidth multiline minRows={2} value={input} onChange={(event) => setInput(event.target.value)} placeholder="Подготовить API интеграции Telegram #CRM !Высокий @Иван завтра" />
      <Stack spacing={2} sx={{ mt: 2 }}>
        <TextField label="Название" value={title} onChange={(event) => setTitle(event.target.value)} required />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <FormControl fullWidth><InputLabel>Проект</InputLabel><Select label="Проект" value={projectId} onChange={(event) => setProjectId(event.target.value)} startAdornment={<FolderOutlined fontSize="small" sx={{ mr: 1 }} />}><MenuItem value="">Входящие</MenuItem>{projects.map((project) => <MenuItem key={project.id} value={project.id}>{project.name}</MenuItem>)}</Select></FormControl>
          <FormControl fullWidth><InputLabel>Приоритет</InputLabel><Select label="Приоритет" value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)}>{[['urgent', 'Критичный'], ['high', 'Высокий'], ['medium', 'Средний'], ['low', 'Низкий']].map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</Select></FormControl>
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField fullWidth label="Исполнитель" value={assignee} onChange={(event) => setAssignee(event.target.value)} helperText="Имя распознано; назначение станет доступно после выбора участника проекта" InputProps={{ startAdornment: <PersonOutline fontSize="small" sx={{ mr: 1 }} /> }} />
          <TextField fullWidth type="date" label="Срок" value={dueDate} onChange={(event) => setDueDate(event.target.value)} InputLabelProps={{ shrink: true }} InputProps={{ startAdornment: <CalendarToday fontSize="small" sx={{ mr: 1 }} /> }} />
        </Stack>
        {parsed.labels.length > 0 && <Stack direction="row" gap={1} flexWrap="wrap"><Typography variant="body2" color="text.secondary">Метки:</Typography>{parsed.labels.map((label) => <Chip size="small" key={label} label={label} />)}</Stack>}
        {error && <Alert severity="error">{error}</Alert>}
      </Stack>
    </DialogContent>
    <DialogActions><Button onClick={close}>Отмена</Button><Button variant="contained" disabled={!title.trim() || saving} onClick={() => void submit()}>Создать</Button></DialogActions>
  </Dialog>
}
