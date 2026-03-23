import { useState, useCallback } from 'react'
import TaskList from '@/components/tasks/TaskList'
import KanbanBoard from '@/components/tasks/KanbanBoard'
import TaskDetailDialog from '@/components/tasks/TaskDetailDialog'
import {
  Container,
  Typography,
  Box,
  Chip,
  Stack,
  TextField,
  InputAdornment,
  ToggleButtonGroup,
  ToggleButton,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Skeleton,
  Alert,
} from '@mui/material'
import {
  Search as SearchIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  ViewList as ListIcon,
  ViewKanban as KanbanIcon,
} from '@mui/icons-material'
import { useTasks } from '../hooks/useTasks'
import type { Task } from '@/lib/types'

export default function TasksPage() {
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogTask, setDialogTask] = useState<Task | null>(null)
  const [dialogMode, setDialogMode] = useState<'view' | 'edit' | 'create'>('create')
  const [deleteConfirm, setDeleteConfirm] = useState<Task | null>(null)

  const { tasks: rawTasks, loading, error, fetchTasks, deleteTask, updateTask } = useTasks()
  const tasks = Array.isArray(rawTasks) ? rawTasks : []

  const filteredTasks = tasks.filter((t: Task) => {
    const matchStatus = !statusFilter || t.status === statusFilter
    const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const todoCount = tasks.filter((t: Task) => t.status === 'todo').length
  const inProgressCount = tasks.filter((t: Task) => t.status === 'in_progress').length
  const doneCount = tasks.filter((t: Task) => t.status === 'done').length

  const handleEdit = useCallback((task: Task) => {
    setDialogTask(task)
    setDialogMode('edit')
    setDialogOpen(true)
  }, [])

  const handleDelete = useCallback((task: Task) => {
    setDeleteConfirm(task)
  }, [])

  const confirmDelete = async () => {
    if (deleteConfirm) {
      await deleteTask(deleteConfirm.id)
      setDeleteConfirm(null)
    }
  }

  const handleCreate = () => {
    setDialogTask(null)
    setDialogMode('create')
    setDialogOpen(true)
  }

  const handleStatusFilter = (_: any, value: string | null) => {
    setStatusFilter(value)
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Мои задачи</Typography>
          <Typography variant="body2" color="text.secondary">
            Управляйте своими задачами эффективно
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Обновить">
            <IconButton onClick={fetchTasks} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, v) => { if (v) setViewMode(v as 'list' | 'kanban') }}
            size="small"
          >
            <ToggleButton value="list"><ListIcon /></ToggleButton>
            <ToggleButton value="kanban"><KanbanIcon /></ToggleButton>
          </ToggleButtonGroup>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>
            Задача
          </Button>
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>Не удалось загрузить задачи</Alert>}

      <Stack direction="row" spacing={2} sx={{ mb: 2 }} alignItems="center">
        <TextField
          placeholder="Поиск задач..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          sx={{ flexGrow: 1, maxWidth: 400 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
        />
        <ToggleButtonGroup value={statusFilter} exclusive onChange={handleStatusFilter} size="small">
          <ToggleButton value="todo">
            <Chip label={`Новые ${todoCount}`} size="small" />
          </ToggleButton>
          <ToggleButton value="in_progress">
            <Chip label={`В работе ${inProgressCount}`} size="small" color="warning" />
          </ToggleButton>
          <ToggleButton value="done">
            <Chip label={`Готово ${doneCount}`} size="small" color="success" />
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {loading ? (
        <Stack spacing={1}>
          {[1, 2, 3].map((i) => <Skeleton key={i} height={60} variant="rounded" />)}
        </Stack>
      ) : viewMode === 'kanban' ? (
        <KanbanBoard />
      ) : (
        <TaskList onEdit={handleEdit} onDelete={handleDelete} />
      )}

      <TaskDetailDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        task={dialogTask}
        mode={dialogMode}
      />

      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle>Удалить задачу?</DialogTitle>
        <DialogContent>
          <Typography>Вы уверены, что хотите удалить «{deleteConfirm?.title}»?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Отмена</Button>
          <Button color="error" variant="contained" onClick={confirmDelete}>Удалить</Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
