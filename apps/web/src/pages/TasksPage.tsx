import { useState, useEffect } from 'react'
import TaskList from '@/components/tasks/TaskList'
import KanbanBoard from '@/components/tasks/KanbanBoard'
import TaskDetailDialog from '@/components/tasks/TaskDetailDialog'
import {
  Container, Typography, Box, Chip, Stack, TextField, InputAdornment,
  ToggleButtonGroup, ToggleButton, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Skeleton, Alert,
} from '@mui/material'
import {
  Search as SearchIcon, Add as AddIcon, Refresh as RefreshIcon,
  ViewList as ListIcon, ViewKanban as KanbanIcon,
} from '@mui/icons-material'
import { useTasks } from '../hooks/useTasks'

export default function TasksPage() {
  const { tasks: rawTasks, loading, error, fetchTasks, deleteTask, updateTask } = useTasks()
  const tasks: any[] = Array.isArray(rawTasks) ? rawTasks : []

  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogTask, setDialogTask] = useState<any>(null)
  const [dialogMode, setDialogMode] = useState<'view' | 'edit' | 'create'>('view')
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null)

  const filteredTasks = tasks.filter((t: any) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    if (search && !t.title?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const todoCount = tasks.filter((t: any) => t.status === 'todo').length
  const inProgressCount = tasks.filter((t: any) => t.status === 'in_progress').length
  const doneCount = tasks.filter((t: any) => t.status === 'done').length

  const handleEdit = (task: any) => {
    setDialogTask(task)
    setDialogMode('edit')
    setDialogOpen(true)
  }

  const handleDelete = (task: any) => {
    setDeleteConfirm(task)
  }

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

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    await updateTask(taskId, { status: newStatus })
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Задачи</Typography>
          <Typography variant="body2" color="text.secondary">Управляйте своими задачами эффективно</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Обновить">
            <IconButton onClick={() => fetchTasks()}><RefreshIcon /></IconButton>
          </Tooltip>
          <ToggleButtonGroup value={viewMode} exclusive onChange={(_, v) => v && setViewMode(v)} size="small">
            <ToggleButton value="list"><ListIcon /></ToggleButton>
            <ToggleButton value="kanban"><KanbanIcon /></ToggleButton>
          </ToggleButtonGroup>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>Задача</Button>
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Stack direction="row" spacing={2} sx={{ mb: 3 }} alignItems="center">
        <TextField
          size="small" placeholder="Поиск задач..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
          sx={{ minWidth: 250 }}
        />
        <Chip label={`Все ${tasks.length}`} onClick={() => setStatusFilter('all')} color={statusFilter === 'all' ? 'primary' : 'default'} />
        <Chip label={`К выполнению ${todoCount}`} onClick={() => setStatusFilter('todo')} color={statusFilter === 'todo' ? 'warning' : 'default'} />
        <Chip label={`В работе ${inProgressCount}`} onClick={() => setStatusFilter('in_progress')} color={statusFilter === 'in_progress' ? 'info' : 'default'} />
        <Chip label={`Готово ${doneCount}`} onClick={() => setStatusFilter('done')} color={statusFilter === 'done' ? 'success' : 'default'} />
      </Stack>

      {loading ? (
        <Stack spacing={2}>{[1,2,3].map(i => <Skeleton key={i} variant="rectangular" height={60} sx={{ borderRadius: 2 }} />)}</Stack>
      ) : viewMode === 'kanban' ? (
        <KanbanBoard tasks={filteredTasks as any} onStatusChange={handleStatusChange} onEdit={handleEdit} onDelete={handleDelete} />
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
        <DialogContent><Typography>Вы уверены, что хотите удалить задачу "{deleteConfirm?.title}"?</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Отмена</Button>
          <Button color="error" variant="contained" onClick={confirmDelete}>Удалить</Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
