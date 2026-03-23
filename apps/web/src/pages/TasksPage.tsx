import { useState, useCallback } from 'react'
import TaskList from '@/components/tasks/TaskList'
import AddTask from '@/components/tasks/AddTask'
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
} from '@mui/material'
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Add as AddIcon,
} from '@mui/icons-material'
import { useTaskStore } from '@/lib/store/taskStore'
import type { Task } from '@/lib/types'

export default function TasksPage() {
  const tasks = useTaskStore((s) => s.tasks)
  const setFilter = useTaskStore((s) => s.setFilter)
  const filter = useTaskStore((s) => s.filter)
  const removeTask = useTaskStore((s) => s.removeTask)

  const todoCount = tasks.filter((t) => t.status === 'todo').length
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length
  const doneCount = tasks.filter((t) => t.status === 'done').length

  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogTask, setDialogTask] = useState<Task | null>(null)
  const [dialogMode, setDialogMode] = useState<'view' | 'edit' | 'create'>('create')
  const [deleteConfirm, setDeleteConfirm] = useState<Task | null>(null)
  const [search, setSearch] = useState('')

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setFilter({ search: value })
  }

  const handleStatusFilter = (_: any, value: string | null) => {
    setFilter({ status: value || undefined })
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
      removeTask(deleteConfirm.id)
      setDeleteConfirm(null)
    }
  }

  const handleCreate = () => {
    setDialogTask(null)
    setDialogMode('create')
    setDialogOpen(true)
  }

  return (
    <Container maxWidth="md" disableGutters>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
            Мои задачи
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Управляйте своими задачами эффективно
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Chip label={`${todoCount} активных`} color="primary" variant="outlined" size="small" />
          <Chip label={`${inProgressCount} в работе`} color="warning" variant="outlined" size="small" />
          <Chip label={`${doneCount} выполнено`} color="success" variant="outlined" size="small" />
        </Stack>
      </Box>

      <Stack direction="row" spacing={2} sx={{ mb: 3 }} alignItems="center">
        <TextField
          placeholder="Поиск задач..."
          size="small"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          sx={{ flexGrow: 1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
        />
        <ToggleButtonGroup
          value={filter.status || null}
          exclusive
          onChange={handleStatusFilter}
          size="small"
        >
          <ToggleButton value="todo">К выполнению</ToggleButton>
          <ToggleButton value="in_progress">В работе</ToggleButton>
          <ToggleButton value="done">Готово</ToggleButton>
        </ToggleButtonGroup>
        <Tooltip title="Создать задачу">
          <IconButton color="primary" onClick={handleCreate}>
            <AddIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      <AddTask />

      <Box sx={{ mt: 3 }}>
        <TaskList onEdit={handleEdit} onDelete={handleDelete} />
      </Box>

      <TaskDetailDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        task={dialogTask}
        mode={dialogMode}
      />

      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle>Удалить задачу?</DialogTitle>
        <DialogContent>
          <Typography>
            Вы уверены, что хотите удалить задачу "{deleteConfirm?.title}"?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Отмена</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
