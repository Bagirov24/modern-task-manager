import { useState, useCallback } from 'react'
import TaskList from '@/components/tasks/TaskList'
import AddTask from '@/components/tasks/AddTask'
import TaskDetailDialog from '@/components/tasks/TaskDetailDialog'
import KanbanBoard from '@/components/tasks/KanbanBoard'
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
  Divider,
} from '@mui/material'
import {
  Search as SearchIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  ViewList as ListIcon,
  ViewKanban as KanbanIcon,
} from '@mui/icons-material'
import { useTasks, useDeleteTask, useUpdateTask } from '@/lib/hooks/useTasks'
import type { Task } from '@/lib/types'

export default function TasksPage() {
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list')

  const { data, isLoading, isError, refetch } = useTasks({
    status: statusFilter || undefined,
    search: debouncedSearch || undefined,
  })
  const deleteMutation = useDeleteTask()
  const updateMutation = useUpdateTask()

  const tasks = data?.tasks || []
  const todoCount = tasks.filter((t: Task) => t.status === 'todo').length
  const inProgressCount = tasks.filter((t: Task) => t.status === 'in_progress').length
  const doneCount = tasks.filter((t: Task) => t.status === 'done').length

  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogTask, setDialogTask] = useState<Task | null>(null)
  const [dialogMode, setDialogMode] = useState<'view' | 'edit' | 'create'>('create')
  const [deleteConfirm, setDeleteConfirm] = useState<Task | null>(null)

  let searchTimeout: ReturnType<typeof setTimeout>
  const handleSearchChange = (value: string) => {
    setSearch(value)
    clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => setDebouncedSearch(value), 300)
  }

  const handleStatusFilter = (_: any, value: string | null) => {
    setStatusFilter(value)
  }

  const handleEdit = useCallback((task: Task) => {
    setDialogTask(task)
    setDialogMode('edit')
    setDialogOpen(true)
  }, [])

  const handleDelete = useCallback((task: Task) => {
    setDeleteConfirm(task)
  }, [])

  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteMutation.mutate(deleteConfirm.id)
      setDeleteConfirm(null)
    }
  }

  const handleCreate = () => {
    setDialogTask(null)
    setDialogMode('create')
    setDialogOpen(true)
  }

  const handleStatusChange = (taskId: string, newStatus: string) => {
    updateMutation.mutate({ id: taskId, data: { status: newStatus as Task['status'] } })
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Мои задачи
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Управляйте своими задачами эффективно
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Обновить">
            <IconButton onClick={() => refetch()}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_: any, v: string | null) => { if (v) setViewMode(v as 'list' | 'kanban') }}
            size="small"
            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
          >
            <ToggleButton value="list" sx={{ px: 1.5 }}>
              <Tooltip title="Список">
                <ListIcon fontSize="small" />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="kanban" sx={{ px: 1.5 }}>
              <Tooltip title="Канбан">
                <KanbanIcon fontSize="small" />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreate}
            sx={{ borderRadius: 2 }}
          >
            Задача
          </Button>
        </Stack>
      </Stack>

      {isError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Не удалось загрузить задачи с сервера.
        </Alert>
      )}

      <Stack direction="row" spacing={2} alignItems="center" mb={3} flexWrap="wrap" gap={1}>
        <TextField
          placeholder="Поиск задач..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          size="small"
          sx={{ flexGrow: 1, maxWidth: 400 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <ToggleButtonGroup
          value={statusFilter}
          exclusive
          onChange={handleStatusFilter}
          size="small"
        >
          <ToggleButton value="todo">
            <Chip label={`К вып. ${todoCount}`} size="small" clickable />
          </ToggleButton>
          <ToggleButton value="in_progress">
            <Chip label={`В работе ${inProgressCount}`} size="small" clickable />
          </ToggleButton>
          <ToggleButton value="done">
            <Chip label={`Готово ${doneCount}`} size="small" clickable />
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {isLoading ? (
        <Stack spacing={2}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" height={80} />
          ))}
        </Stack>
      ) : viewMode === 'kanban' ? (
        <KanbanBoard
          tasks={tasks}
          onStatusChange={handleStatusChange}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ) : (
        <TaskList tasks={tasks} onEdit={handleEdit} onDelete={handleDelete} />
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
          Вы уверены, что хотите удалить задачу "{deleteConfirm?.title}"?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Отмена</Button>
          <Button color="error" onClick={confirmDelete}>Удалить</Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
