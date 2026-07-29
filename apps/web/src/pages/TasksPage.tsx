import { useMemo, useState, useEffect } from 'react'
import TaskList from '@/components/tasks/TaskList'
import KanbanBoard from '@/components/tasks/KanbanBoard'
import TaskDetailDialog from '@/components/tasks/TaskDetailDialog'
import TimelineView from '@/components/tasks/TimelineView'
import {
  Container, Typography, Box, Chip, Stack,
  TextField, InputAdornment, ToggleButtonGroup, ToggleButton,
  IconButton, Tooltip, Dialog, DialogTitle, DialogContent,
  DialogActions, Button, Skeleton, Alert, Card, CardContent,
  Divider,
} from '@mui/material'
import {
  Search as SearchIcon, Add as AddIcon, Refresh as RefreshIcon,
  ViewList as ListIcon, ViewKanban as KanbanIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material'
import { useTasks } from '../hooks/useTasks'
import { useUIStore } from '@/store/uiStore'

export default function TasksPage() {
  const { tasks: rawTasks, loading, error, fetchTasks, deleteTask, updateTask } = useTasks()
  const tasks: any[] = Array.isArray(rawTasks) ? rawTasks : []

  const addSnackbar = useUIStore((s) => s.addSnackbar)
  const modalState = useUIStore((s) => s.modal)
  const closeModal = useUIStore((s) => s.closeModal)

  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'timeline'>('kanban')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogTask, setDialogTask] = useState<any>(null)
  const [dialogMode, setDialogMode] = useState<'view' | 'edit' | 'create'>('view')
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null)

  // handle openModal('task.create') from Layout FAB / CommandPalette
  useEffect(() => {
    if (modalState.isOpen && modalState.type === 'task.create') {
      setDialogTask(null)
      setDialogMode('create')
      setDialogOpen(true)
      closeModal()
    }
  }, [modalState, closeModal])

  const filteredTasks = useMemo(() => tasks.filter((t: any) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    if (search && !t.title?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [tasks, statusFilter, search])

  const stats = useMemo(() => ({
    total: tasks.length,
    todo: tasks.filter((t: any) => t.status === 'todo').length,
    inProgress: tasks.filter((t: any) => t.status === 'in_progress').length,
    done: tasks.filter((t: any) => t.status === 'done').length,
  }), [tasks])

  const handleEdit = (task: any) => { setDialogTask(task); setDialogMode('edit'); setDialogOpen(true) }
  const handleDelete = (task: any) => setDeleteConfirm(task)
  const handleCreate = () => { setDialogTask(null); setDialogMode('create'); setDialogOpen(true) }

  const confirmDelete = async () => {
    if (!deleteConfirm) return
    await deleteTask(deleteConfirm.id)
    addSnackbar({ message: `Задача «${deleteConfirm.title}» удалена`, type: 'success', duration: 3500 })
    setDeleteConfirm(null)
  }

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    await updateTask(taskId, { status: newStatus })
    addSnackbar({ message: 'Статус задачи обновлён', type: 'success', duration: 2500 })
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', md: 'center' }, justifyContent: 'space-between', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight={800}>Задачи</Typography>
            <Typography variant="body2" color="text.secondary">Канбан, список и timeline в одном рабочем пространстве</Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Обновить"><IconButton onClick={() => fetchTasks()}><RefreshIcon /></IconButton></Tooltip>
            <ToggleButtonGroup value={viewMode} exclusive onChange={(_, v) => v && setViewMode(v)} size="small">
              <ToggleButton value="list"><Tooltip title="Список"><ListIcon /></Tooltip></ToggleButton>
              <ToggleButton value="kanban"><Tooltip title="Канбан"><KanbanIcon /></Tooltip></ToggleButton>
              <ToggleButton value="timeline"><Tooltip title="Timeline"><TimelineIcon /></Tooltip></ToggleButton>
            </ToggleButtonGroup>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>Задача</Button>
          </Stack>
        </Box>

        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2}>
          {[
            { label: 'Всего задач', value: stats.total },
            { label: 'К выполнению', value: stats.todo },
            { label: 'В работе', value: stats.inProgress },
            { label: 'Готово', value: stats.done },
          ].map(({ label, value }) => (
            <Card key={label} sx={{ borderRadius: 4, flex: 1 }}>
              <CardContent>
                <Typography color="text.secondary" variant="body2">{label}</Typography>
                <Typography variant="h5" fontWeight={800}>{value}</Typography>
              </CardContent>
            </Card>
          ))}
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}

        <Card sx={{ borderRadius: 4 }}>
          <CardContent>
            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems={{ xs: 'stretch', lg: 'center' }}>
              <TextField
                size="small" placeholder="Поиск задач..."
                value={search} onChange={(e) => setSearch(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
                sx={{ minWidth: { lg: 280 } }}
              />
              <Divider flexItem orientation="vertical" sx={{ display: { xs: 'none', lg: 'block' } }} />
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip label={`Все ${stats.total}`} onClick={() => setStatusFilter('all')} color={statusFilter === 'all' ? 'primary' : 'default'} />
                <Chip label={`К выполнению ${stats.todo}`} onClick={() => setStatusFilter('todo')} color={statusFilter === 'todo' ? 'warning' : 'default'} />
                <Chip label={`В работе ${stats.inProgress}`} onClick={() => setStatusFilter('in_progress')} color={statusFilter === 'in_progress' ? 'info' : 'default'} />
                <Chip label={`Готово ${stats.done}`} onClick={() => setStatusFilter('done')} color={statusFilter === 'done' ? 'success' : 'default'} />
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {loading ? (
          <Stack spacing={2}>{[1, 2, 3].map((i) => <Skeleton key={i} variant="rectangular" height={72} sx={{ borderRadius: 3 }} />)}</Stack>
        ) : viewMode === 'kanban' ? (
          <KanbanBoard tasks={filteredTasks as any} onStatusChange={handleStatusChange} onEdit={handleEdit} onDelete={handleDelete} />
        ) : viewMode === 'timeline' ? (
          <TimelineView tasks={filteredTasks as any} />
        ) : (
          <TaskList onEdit={handleEdit} onDelete={handleDelete} />
        )}
      </Stack>

      <TaskDetailDialog open={dialogOpen} onClose={() => setDialogOpen(false)} task={dialogTask} mode={dialogMode} />

      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle>Удалить задачу?</DialogTitle>
        <DialogContent>
          <Typography>Вы уверены, что хотите удалить задачу «{deleteConfirm?.title}»?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Отмена</Button>
          <Button color="error" variant="contained" onClick={confirmDelete}>Удалить</Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
