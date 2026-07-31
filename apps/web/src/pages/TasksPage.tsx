import { useMemo, useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { TaskCreate } from '@/lib/types'
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
  CalendarMonth as CalendarIcon,
} from '@mui/icons-material'
import { useTasksQuery } from '@/lib/hooks/useTasksQuery'
import { useUIStore } from '@/store/uiStore'
import { useTaskStore } from '@/store/taskStore'

export default function TasksPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedView = searchParams.get('view')
  const storedView = useTaskStore((state) => state.viewMode)
  const rememberView = useTaskStore((state) => state.setViewMode)
  const initialView = requestedView === 'list' || requestedView === 'timeline' || requestedView === 'kanban'
    ? requestedView
    : storedView === 'calendar' ? 'list' : storedView
  const requestedStatus = searchParams.get('status')
  const initialStatus = requestedStatus === 'todo' || requestedStatus === 'in_progress' || requestedStatus === 'done' ? requestedStatus : 'all'
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus)
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '')
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'timeline'>(initialView)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogTask, setDialogTask] = useState<any>(null)
  const [dialogMode, setDialogMode] = useState<'view' | 'edit' | 'create'>('view')
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null)
  const [dialogInitialValues, setDialogInitialValues] = useState<Partial<TaskCreate>>({})

  const { tasks: rawTasks, loading, error, fetchTasks, deleteTask, updateTask } = useTasksQuery(undefined, search)
  const tasks: any[] = useMemo(() => Array.isArray(rawTasks) ? rawTasks : [], [rawTasks])

  const addSnackbar = useUIStore((s) => s.addSnackbar)
  const modalState = useUIStore((s) => s.modal)
  const closeModal = useUIStore((s) => s.closeModal)

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    const requestedSearch = searchParams.get('search') || ''
    if (requestedSearch) setSearchInput((current) => requestedSearch === current ? current : requestedSearch)
    const nextStatus = searchParams.get('status')
    setStatusFilter(nextStatus === 'todo' || nextStatus === 'in_progress' || nextStatus === 'done' ? nextStatus : 'all')
    const nextView = searchParams.get('view')
    if (nextView === 'list' || nextView === 'kanban' || nextView === 'timeline') { setViewMode(nextView); rememberView(nextView) }
  }, [searchParams, rememberView])

  useEffect(() => {
    if (!modalState.isOpen) return
    if (modalState.type === 'task.create') {
      const data = modalState.data || {}
      setDialogInitialValues({
        due_date: typeof data.due_date === 'string' ? data.due_date : undefined,
        start_date: typeof data.start_date === 'string' ? data.start_date : undefined,
        project_id: typeof data.project_id === 'string' ? data.project_id : undefined,
      })
      setDialogTask(null)
      setDialogMode('create')
      setDialogOpen(true)
      closeModal()
    } else if (modalState.type === 'task.detail') {
      const taskId = modalState.data?.taskId
      const task = tasks.find((item) => item.id === taskId)
      if (task) {
        setDialogInitialValues({})
        setDialogTask(task)
        setDialogMode('view')
        setDialogOpen(true)
        closeModal()
      }
    }
  }, [modalState, closeModal, tasks])

  useEffect(() => {
    const taskId = searchParams.get('task')
    if (!taskId) return
    const task = tasks.find((item) => item.id === taskId)
    if (task) {
      setDialogTask(task)
      setDialogMode('view')
      setDialogOpen(true)
    }
  }, [searchParams, tasks])

  const closeTaskPanel = () => {
    setDialogOpen(false)
    const next = new URLSearchParams(searchParams)
    next.delete('task')
    setSearchParams(next, { replace: true })
  }
  const selectStatus = (status: string) => {
    setStatusFilter(status)
    const next = new URLSearchParams(searchParams)
    if (status === 'all') next.delete('status')
    else next.set('status', status)
    setSearchParams(next, { replace: true })
  }
  const preset = searchParams.get('preset')
  const filteredTasks = useMemo(() => tasks.filter((t: any) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    const now = new Date()
    const today = now.toISOString().slice(0, 10)
    const due = t.due_date?.slice(0, 10)
    const weekEnd = new Date(now.getTime() + 7 * 86400000)
    if (preset === 'inbox' && t.workflow_status !== 'inbox' && t.project_id) return false
    if (preset === 'today' && due !== today) return false
    if (preset === 'overdue' && (!t.due_date || new Date(t.due_date) >= now || t.status === 'done')) return false
    if (preset === 'blocked' && !t.is_blocked) return false
    if (preset === 'unassigned' && t.assignee_id) return false
    if (preset === 'needs-planning' && (!['urgent', 'high'].includes(t.priority) || (t.due_date && t.is_planning_complete))) return false
    if (preset === 'missing-documentation' && (t.documentation_count || 0) > 0) return false
    if (preset === 'due-this-week' && (!t.due_date || new Date(t.due_date) < now || new Date(t.due_date) > weekEnd)) return false
    if (preset === 'recently-completed' && (t.status !== 'done' || !t.completed_at || now.getTime() - new Date(t.completed_at).getTime() > 7 * 86400000)) return false
    return true
  }), [tasks, statusFilter, preset])
  const stats = useMemo(() => ({
    total: tasks.length,
    todo: tasks.filter((t: any) => t.status === 'todo').length,
    inProgress: tasks.filter((t: any) => t.status === 'in_progress').length,
    done: tasks.filter((t: any) => t.status === 'done').length,
  }), [tasks])

  const handleEdit = (task: any) => { setDialogTask(task); setDialogMode('edit'); setDialogOpen(true) }
  const handleDelete = (task: any) => setDeleteConfirm(task)
  const handleCreate = () => { setDialogInitialValues({}); setDialogTask(null); setDialogMode('create'); setDialogOpen(true) }

  const confirmDelete = async () => {
    if (!deleteConfirm) return
    try {
      await deleteTask(deleteConfirm.id)
      addSnackbar({ message: `Задача «${deleteConfirm.title}» удалена`, type: 'success', duration: 3500 })
      setDeleteConfirm(null)
    } catch {
      addSnackbar({ message: 'Не удалось удалить задачу', type: 'error', duration: 4000 })
    }
  }

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await updateTask(taskId, { status: newStatus as any })
      addSnackbar({ message: 'Статус задачи обновлён', type: 'success', duration: 2500 })
    } catch {
      addSnackbar({ message: 'Не удалось изменить статус задачи', type: 'error', duration: 4000 })
    }
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
            <ToggleButtonGroup value={viewMode} exclusive onChange={(_, v) => {
              if (!v) return
              if (v === 'calendar') { rememberView('calendar'); window.location.assign('/calendar'); return }
              setViewMode(v)
              rememberView(v)
              const next = new URLSearchParams(searchParams)
              next.set('view', v)
              setSearchParams(next, { replace: true })
            }} size="small">
              <ToggleButton value="list"><Tooltip title="Список"><ListIcon /></Tooltip></ToggleButton>
              <ToggleButton value="kanban"><Tooltip title="Канбан"><KanbanIcon /></Tooltip></ToggleButton>
              <ToggleButton value="timeline"><Tooltip title="Timeline"><TimelineIcon /></Tooltip></ToggleButton>
              <ToggleButton value="calendar"><Tooltip title="Календарь"><CalendarIcon /></Tooltip></ToggleButton>
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
                {loading ? <Skeleton width={48} height={42} /> : <Typography variant="h5" fontWeight={800}>{value}</Typography>}
              </CardContent>
            </Card>
          ))}
        </Stack>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap aria-label="Сохранённые представления">
          {[
            ['my-work', 'My Work'], ['today', 'Today'], ['overdue', 'Overdue'],
            ['blocked', 'Blocked'], ['unassigned', 'Unassigned'], ['needs-planning', 'Needs Planning'],
            ['missing-documentation', 'Missing Documentation'], ['due-this-week', 'Due This Week'],
            ['recently-completed', 'Recently Completed'],
          ].map(([value, label]) => (
            <Chip
              key={value}
              size="small"
              variant={preset === value ? 'filled' : 'outlined'}
              color={preset === value ? 'primary' : 'default'}
              label={label}
              onClick={() => {
                const next = new URLSearchParams(searchParams)
                if (value === 'my-work') next.delete('preset')
                else next.set('preset', value)
                setSearchParams(next, { replace: true })
              }}
            />
          ))}
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}

        <Card sx={{ borderRadius: 4 }}>
          <CardContent>
            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems={{ xs: 'stretch', lg: 'center' }}>
              <TextField
                size="small" placeholder="Поиск задач..."
                value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
                sx={{ minWidth: { lg: 280 } }}
              />
              <Divider flexItem orientation="vertical" sx={{ display: { xs: 'none', lg: 'block' } }} />
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip label={`Все ${stats.total}`} onClick={() => selectStatus('all')} color={statusFilter === 'all' ? 'primary' : 'default'} />
                <Chip label={`К выполнению ${stats.todo}`} onClick={() => selectStatus('todo')} color={statusFilter === 'todo' ? 'warning' : 'default'} />
                <Chip label={`В работе ${stats.inProgress}`} onClick={() => selectStatus('in_progress')} color={statusFilter === 'in_progress' ? 'info' : 'default'} />
                <Chip label={`Готово ${stats.done}`} onClick={() => selectStatus('done')} color={statusFilter === 'done' ? 'success' : 'default'} />
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
          <TaskList tasks={filteredTasks as any} onEdit={handleEdit} onDelete={handleDelete} />
        )}
      </Stack>

      <TaskDetailDialog open={dialogOpen} onClose={closeTaskPanel} task={dialogTask} mode={dialogMode} initialValues={dialogInitialValues} />

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
