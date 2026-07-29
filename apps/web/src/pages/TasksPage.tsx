import { useMemo, useState } from 'react'
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
  Card,
  CardContent,
  Divider,
  LinearProgress,
} from '@mui/material'
import {
  Search as SearchIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  ViewList as ListIcon,
  ViewKanban as KanbanIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useTasks } from '../hooks/useTasks'

function TimelineView({ tasks }: { tasks: any[] }) {
  const sorted = [...tasks]
    .filter((task) => task.start_date || task.due_date)
    .sort((a, b) => new Date(a.start_date || a.due_date).getTime() - new Date(b.start_date || b.due_date).getTime())

  if (sorted.length === 0) {
    return (
      <Card sx={{ borderRadius: 4 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Timeline
          </Typography>
          <Typography color="text.secondary">
            У задач пока нет start_date или due_date.
          </Typography>
        </CardContent>
      </Card>
    )
  }

  const minDate = new Date(sorted[0].start_date || sorted[0].due_date)
  const maxDate = new Date(sorted[sorted.length - 1].due_date || sorted[sorted.length - 1].start_date)
  const totalRange = Math.max(1, maxDate.getTime() - minDate.getTime())

  return (
    <Stack spacing={2}>
      {sorted.map((task) => {
        const start = new Date(task.start_date || task.due_date)
        const end = new Date(task.due_date || task.start_date || task.created_at)
        const offset = ((start.getTime() - minDate.getTime()) / totalRange) * 100
        const width = Math.max(8, ((end.getTime() - start.getTime()) / totalRange) * 100)
        const progress = task.status === 'done' ? 100 : task.status === 'in_progress' ? 60 : 20

        return (
          <Card key={task.id} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }}>
                <Box sx={{ minWidth: { md: 260 }, flexShrink: 0 }}>
                  <Typography variant="subtitle1" fontWeight={700}>{task.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {task.start_date ? format(new Date(task.start_date), 'd MMM', { locale: ru }) : '—'} → {task.due_date ? format(new Date(task.due_date), 'd MMM', { locale: ru }) : '—'}
                  </Typography>
                </Box>

                <Box sx={{ flex: 1, width: '100%' }}>
                  <Box sx={{ position: 'relative', height: 28, borderRadius: 999, bgcolor: 'action.hover', overflow: 'hidden' }}>
                    <Box
                      sx={{
                        position: 'absolute',
                        left: `${offset}%`,
                        width: `${Math.min(width, 100 - offset)}%`,
                        top: 4,
                        bottom: 4,
                        borderRadius: 999,
                        bgcolor: task.status === 'done' ? 'success.main' : task.status === 'in_progress' ? 'info.main' : 'primary.main',
                        boxShadow: 2,
                      }}
                    />
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={progress}
                    sx={{ mt: 1, height: 6, borderRadius: 999 }}
                  />
                </Box>

                <Chip
                  label={task.status === 'done' ? 'Готово' : task.status === 'in_progress' ? 'В работе' : 'К выполнению'}
                  color={task.status === 'done' ? 'success' : task.status === 'in_progress' ? 'info' : 'default'}
                />
              </Stack>
            </CardContent>
          </Card>
        )
      })}
    </Stack>
  )
}

export default function TasksPage() {
  const { tasks: rawTasks, loading, error, fetchTasks, deleteTask, updateTask } = useTasks()
  const tasks: any[] = Array.isArray(rawTasks) ? rawTasks : []

  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'timeline'>('kanban')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogTask, setDialogTask] = useState<any>(null)
  const [dialogMode, setDialogMode] = useState<'view' | 'edit' | 'create'>('view')
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null)

  const filteredTasks = useMemo(() => {
    return tasks.filter((t: any) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false
      if (search && !t.title?.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [tasks, statusFilter, search])

  const stats = useMemo(() => ({
    total: tasks.length,
    todo: tasks.filter((t: any) => t.status === 'todo').length,
    inProgress: tasks.filter((t: any) => t.status === 'in_progress').length,
    done: tasks.filter((t: any) => t.status === 'done').length,
  }), [tasks])

  const handleEdit = (task: any) => {
    setDialogTask(task)
    setDialogMode('edit')
    setDialogOpen(true)
  }

  const handleDelete = (task: any) => setDeleteConfirm(task)

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
      <Stack spacing={3}>
        <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', md: 'center' }, justifyContent: 'space-between', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight={800}>Задачи</Typography>
            <Typography variant="body2" color="text.secondary">Канбан, список и timeline в одном рабочем пространстве</Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Обновить">
              <IconButton onClick={() => fetchTasks()}><RefreshIcon /></IconButton>
            </Tooltip>
            <ToggleButtonGroup value={viewMode} exclusive onChange={(_, v) => v && setViewMode(v)} size="small">
              <ToggleButton value="list"><ListIcon /></ToggleButton>
              <ToggleButton value="kanban"><KanbanIcon /></ToggleButton>
              <ToggleButton value="timeline"><TimelineIcon /></ToggleButton>
            </ToggleButtonGroup>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>Задача</Button>
          </Stack>
        </Box>

        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2}>
          <Card sx={{ borderRadius: 4, flex: 1 }}><CardContent><Typography color="text.secondary" variant="body2">Всего задач</Typography><Typography variant="h5" fontWeight={800}>{stats.total}</Typography></CardContent></Card>
          <Card sx={{ borderRadius: 4, flex: 1 }}><CardContent><Typography color="text.secondary" variant="body2">К выполнению</Typography><Typography variant="h5" fontWeight={800}>{stats.todo}</Typography></CardContent></Card>
          <Card sx={{ borderRadius: 4, flex: 1 }}><CardContent><Typography color="text.secondary" variant="body2">В работе</Typography><Typography variant="h5" fontWeight={800}>{stats.inProgress}</Typography></CardContent></Card>
          <Card sx={{ borderRadius: 4, flex: 1 }}><CardContent><Typography color="text.secondary" variant="body2">Готово</Typography><Typography variant="h5" fontWeight={800}>{stats.done}</Typography></CardContent></Card>
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}

        <Card sx={{ borderRadius: 4 }}>
          <CardContent>
            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems={{ xs: 'stretch', lg: 'center' }}>
              <TextField
                size="small"
                placeholder="Поиск задач..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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
          <TimelineView tasks={filteredTasks} />
        ) : (
          <TaskList onEdit={handleEdit} onDelete={handleDelete} />
        )}
      </Stack>

      <TaskDetailDialog open={dialogOpen} onClose={() => setDialogOpen(false)} task={dialogTask} mode={dialogMode} />

      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle>Удалить задачу?</DialogTitle>
        <DialogContent>
          <Typography>Вы уверены, что хотите удалить задачу "{deleteConfirm?.title}"?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Отмена</Button>
          <Button color="error" variant="contained" onClick={confirmDelete}>Удалить</Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
