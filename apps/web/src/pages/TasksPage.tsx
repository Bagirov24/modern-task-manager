import { useMemo, useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { Task, TaskCreate } from '@/lib/types'
import { taskApi } from '@/lib/api/taskApi'
import TaskList from '@/components/tasks/TaskList'
import KanbanBoard from '@/components/tasks/KanbanBoard'
import TaskDetailDialog from '@/components/tasks/TaskDetailDialog'
import TimelineView from '@/components/tasks/TimelineView'
import PageHeader from '@/components/common/PageHeader'
import ViewSwitcher from '@/components/common/ViewSwitcher'
import FilterBar, { type ActiveFilter } from '@/components/common/FilterBar'
import {
  Container, Typography, Chip, Stack,
  TextField, InputAdornment,
  IconButton, Tooltip, Dialog, DialogTitle, DialogContent,
  DialogActions, Button, Skeleton, Alert, Card, CardContent,
  Divider,
} from '@mui/material'
import {
  Search as SearchIcon, Add as AddIcon, Refresh as RefreshIcon,
} from '@mui/icons-material'
import { useTasksQuery } from '@/lib/hooks/useTasksQuery'
import { useUIStore, type TaskView } from '@/store/uiStore'
import { useTaskStore } from '@/store/taskStore'
import { useAuthStore } from '@/lib/store/authStore'
import { useProjectStore } from '@/store/projectStore'
import { matchesTaskPreset } from '@/features/tasks/taskPresetFilters'

export { matchesTaskPreset } from '@/features/tasks/taskPresetFilters'

export default function TasksPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const requestedView = searchParams.get('view')
  const selectedTaskId = searchParams.get('task')
  const lastTaskView = useUIStore((state) => state.lastTaskView)
  const setLastTaskView = useUIStore((state) => state.setLastTaskView)
  const rememberLegacyView = useTaskStore((state) => state.setViewMode)
  const initialView: TaskView = isWorkspaceView(requestedView)
    ? requestedView
    : isWorkspaceView(lastTaskView) ? lastTaskView : 'list'
  const requestedStatus = searchParams.get('status')
  const initialStatus = requestedStatus === 'todo' || requestedStatus === 'in_progress' || requestedStatus === 'done' ? requestedStatus : 'all'
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus)
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '')
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [viewMode, setViewMode] = useState<TaskView>(initialView)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogTask, setDialogTask] = useState<any>(null)
  const [dialogMode, setDialogMode] = useState<'view' | 'edit' | 'create'>('view')
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null)
  const [dialogInitialValues, setDialogInitialValues] = useState<Partial<TaskCreate>>({})
  const searchInputRef = useRef<HTMLInputElement>(null)
  const taskOriginRef = useRef<HTMLElement | null>(null)

  const projectId = searchParams.get('project_id') ?? undefined
  const { tasks: rawTasks, loading, error, fetchTasks, deleteTask, updateTask } = useTasksQuery(projectId, search)
  const tasks: any[] = useMemo(() => Array.isArray(rawTasks) ? rawTasks : [], [rawTasks])

  const addSnackbar = useUIStore((s) => s.addSnackbar)
  const currentUserId = useAuthStore((state) => state.user?.id ?? '')
  const modalState = useUIStore((s) => s.modal)
  const closeModal = useUIStore((s) => s.closeModal)
  const projects = useProjectStore((state) => state.projects)

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
    if (nextView === 'calendar') {
      navigate(calendarLocation(searchParams), { replace: true })
    } else if (isWorkspaceView(nextView)) {
      setViewMode(nextView)
      setLastTaskView(nextView)
      rememberLegacyView(nextView)
    } else {
      setViewMode(isWorkspaceView(lastTaskView) ? lastTaskView : 'list')
    }
  }, [searchParams, lastTaskView, setLastTaskView, rememberLegacyView, navigate])

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return
      const active = document.activeElement
      if (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        active instanceof HTMLSelectElement ||
        active?.getAttribute('contenteditable') === 'true'
      ) return
      event.preventDefault()
      searchInputRef.current?.focus()
    }
    document.addEventListener('keydown', focusSearch)
    return () => document.removeEventListener('keydown', focusSearch)
  }, [])

  useEffect(() => {
    if (!modalState.isOpen) return
    if (modalState.type === 'task.create') {
      if (selectedTaskId) {
        setSearchParams((current) => {
          const next = new URLSearchParams(current)
          next.delete('task')
          return next
        }, { replace: true })
        return
      }
      const data = modalState.data || {}
      setDialogInitialValues({
        due_date: typeof data.due_date === 'string' ? data.due_date : undefined,
        start_date: typeof data.start_date === 'string' ? data.start_date : undefined,
        project_id: typeof data.project_id === 'string' ? data.project_id : undefined,
      })
      setDialogTask(null)
      setDialogMode('create')
      setDialogOpen(true)
    } else if (modalState.type === 'task.detail') {
      const taskId = modalState.data?.taskId
      if (typeof taskId === 'string' && taskId) {
        setSearchParams((current) => {
          const next = new URLSearchParams(current)
          next.set('task', taskId)
          return next
        }, { replace: true })
      }
      closeModal()
    }
  }, [modalState, closeModal, setSearchParams, selectedTaskId])

  useEffect(() => {
    if (
      modalState.isOpen && modalState.type === 'task.create' &&
      !selectedTaskId && dialogOpen && dialogMode === 'create'
    ) closeModal()
  }, [modalState.isOpen, modalState.type, selectedTaskId, dialogOpen, dialogMode, closeModal])

  useEffect(() => {
    const taskId = selectedTaskId
    if (modalState.isOpen && modalState.type === 'task.create') return
    if (!taskId) {
      if (dialogMode === 'view') {
        setDialogOpen(false)
        setDialogTask(null)
        const origin = taskOriginRef.current
        window.setTimeout(() => { if (origin?.isConnected) origin.focus() }, 0)
      }
      return
    }
    let cancelled = false
    const listedTask = tasks.find((item) => item.id === taskId)
    const openTask = (selected: Task) => {
      if (cancelled) return
      setDialogTask(selected)
      setDialogMode('view')
      setDialogOpen(true)
    }
    if (listedTask) openTask(listedTask)
    else {
      setDialogOpen(false)
      setDialogTask(null)
      void taskApi.get(taskId).then((response) => openTask(response.data)).catch(() => {
        if (cancelled) return
        addSnackbar({ message: 'Не удалось загрузить задачу', type: 'error', duration: 4000 })
        setSearchParams((current) => {
          const next = new URLSearchParams(current)
          next.delete('task')
          return next
        }, { replace: true })
      })
    }
    return () => { cancelled = true }
  }, [selectedTaskId, tasks, dialogMode, addSnackbar, setSearchParams, modalState.isOpen, modalState.type])

  const closeTaskPanel = () => {
    setDialogOpen(false)
    const next = new URLSearchParams(searchParams)
    next.delete('task')
    setSearchParams(next, { replace: true })
    const origin = taskOriginRef.current
    window.setTimeout(() => { if (origin?.isConnected) origin.focus() }, 0)
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
    return matchesTaskPreset(t, preset, currentUserId, new Date())
  }), [tasks, statusFilter, preset, currentUserId])
  const stats = useMemo(() => ({
    total: tasks.length,
    todo: tasks.filter((t: any) => t.status === 'todo').length,
    inProgress: tasks.filter((t: any) => t.status === 'in_progress').length,
    done: tasks.filter((t: any) => t.status === 'done').length,
  }), [tasks])

  const handleOpen = (task: Task) => {
    taskOriginRef.current = document.activeElement as HTMLElement | null
    const next = new URLSearchParams(searchParams)
    next.set('task', task.id)
    setSearchParams(next, { replace: true })
  }
  const handleEdit = (task: any) => { setDialogTask(task); setDialogMode('edit'); setDialogOpen(true) }
  const handleDelete = (task: any) => setDeleteConfirm(task)
  const handleCreate = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('task')
    setSearchParams(next, { replace: true })
    setDialogInitialValues({}); setDialogTask(null); setDialogMode('create'); setDialogOpen(true)
  }

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

  const activeFilters = useMemo<ActiveFilter[]>(() => {
    const filters: ActiveFilter[] = []
    const activePreset = searchParams.get('preset')
    if (activePreset && presetLabels[activePreset]) {
      filters.push({ key: 'preset', label: presetLabels[activePreset] })
    }
    const projectId = searchParams.get('project_id')
    if (projectId) {
      filters.push({
        key: 'project_id',
        label: projects.find((project) => project.id === projectId)?.name ?? projectId,
      })
    }
    return filters
  }, [searchParams, projects])

  const removeFilter = (key: string) => {
    const next = new URLSearchParams(searchParams)
    next.delete(key)
    setSearchParams(next, { replace: true })
  }

  const selectView = (view: TaskView) => {
    if (view === 'calendar') {
      navigate(calendarLocation(searchParams))
      return
    }
    setLastTaskView(view)
    rememberLegacyView(view)
    setViewMode(view)
    const next = new URLSearchParams(searchParams)
    next.set('view', view)
    setSearchParams(next, { replace: true })
  }
  if (requestedView === 'calendar') return null

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <PageHeader
          title="Задачи"
          description="Канбан, список и timeline в одном рабочем пространстве"
          actions={<>
            <Tooltip title="Обновить"><IconButton onClick={() => fetchTasks()}><RefreshIcon /></IconButton></Tooltip>
            <ViewSwitcher value={viewMode} onChange={selectView} />
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>Задача</Button>
          </>}
        />

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

        <FilterBar filters={activeFilters} onRemove={removeFilter} />

        {error && <Alert severity="error">{error}</Alert>}

        <Card sx={{ borderRadius: 4 }}>
          <CardContent>
            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems={{ xs: 'stretch', lg: 'center' }}>
              <TextField
                size="small" placeholder="Поиск задач..."
                inputRef={searchInputRef}
                inputProps={{ 'aria-label': 'Поиск задач' }}
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
          <KanbanBoard tasks={filteredTasks as any} onStatusChange={handleStatusChange} onOpen={handleOpen} onEdit={handleEdit} onDelete={handleDelete} />
        ) : viewMode === 'timeline' ? (
          <TimelineView tasks={filteredTasks as any} />
        ) : (
          <TaskList tasks={filteredTasks as any} onOpen={handleOpen} onEdit={handleEdit} onDelete={handleDelete} />
        )}
      </Stack>

      {dialogOpen && (dialogMode !== 'view' || Boolean(selectedTaskId)) && <TaskDetailDialog open onClose={closeTaskPanel} task={dialogTask} mode={dialogMode} initialValues={dialogInitialValues} />}

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

function isWorkspaceView(value: string | null): value is Exclude<TaskView, 'calendar'> {
  return value === 'list' || value === 'kanban' || value === 'timeline'
}

function calendarLocation(searchParams: URLSearchParams): string {
  const next = new URLSearchParams(searchParams)
  next.delete('view')
  const query = next.toString()
  return query ? `/calendar?${query}` : '/calendar'
}

const presetLabels: Record<string, string> = {
  overdue: 'Просрочено',
  blocked: 'Заблокировано',
  unassigned: 'Без исполнителя',
  'needs-planning': 'Требует планирования',
  'missing-documentation': 'Без документации',
  'due-this-week': 'На этой неделе',
  'recently-completed': 'Недавно завершено',
}
