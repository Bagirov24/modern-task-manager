import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  IconButton,
  InputAdornment,
  Skeleton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  Add as AddIcon,
  ArrowBack as BackIcon,
  Search as SearchIcon,
  ViewKanban as KanbanIcon,
  ViewList as ListIcon,
} from '@mui/icons-material'
import KanbanBoard from '@/components/tasks/KanbanBoard'
import TaskList from '@/components/tasks/TaskList'
import TaskDetailDialog from '@/components/tasks/TaskDetailDialog'
import { useProjectsQuery } from '@/lib/hooks/useProjectsQuery'
import { useTasksQuery } from '@/lib/hooks/useTasksQuery'
import type { Task } from '@/lib/types'

export default function ProjectDetailPage() {
  const { projectId = '' } = useParams()
  const navigate = useNavigate()
  const { projects, loading: projectsLoading } = useProjectsQuery()
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'view' | 'edit' | 'create'>('view')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const { tasks: rawTasks, loading: tasksLoading, error, updateTask } = useTasksQuery(projectId, search)

  const project = Array.isArray(projects) ? projects.find((item) => item.id === projectId) : undefined
  const tasks = useMemo(() => Array.isArray(rawTasks) ? rawTasks : [], [rawTasks])
  const stats = useMemo(() => ({
    total: tasks.length,
    inProgress: tasks.filter((task) => task.status === 'in_progress').length,
    done: tasks.filter((task) => task.status === 'done').length,
    overdue: tasks.filter((task) => task.due_date && task.status !== 'done' && new Date(task.due_date) < new Date()).length,
  }), [tasks])

  const openTask = (task: Task, mode: 'view' | 'edit' = 'view') => {
    setSelectedTask(task)
    setDialogMode(mode)
    setDialogOpen(true)
  }

  if (projectsLoading) {
    return <Container maxWidth="xl" sx={{ py: 4 }}><Skeleton height={64} /><Skeleton height={480} /></Container>
  }

  if (!project) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="warning" action={<Button onClick={() => navigate('/projects')}>К проектам</Button>}>
          Проект не найден или у вас больше нет к нему доступа.
        </Alert>
      </Container>
    )
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Stack spacing={2.5}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <Tooltip title="К проектам"><IconButton aria-label="К проектам" onClick={() => navigate('/projects')} sx={{ minWidth: 44, minHeight: 44 }}><BackIcon /></IconButton></Tooltip>
            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: project.color || 'primary.main' }} />
                <Typography variant="h4" fontWeight={800}>{project.name}</Typography>
              </Stack>
              {project.description && <Typography color="text.secondary" sx={{ mt: 0.5 }}>{project.description}</Typography>}
            </Box>
          </Stack>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setSelectedTask(null); setDialogMode('create'); setDialogOpen(true) }}>
            Новая задача
          </Button>
        </Stack>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip label={`Всего ${stats.total}`} />
          <Chip label={`В работе ${stats.inProgress}`} color="info" variant="outlined" />
          <Chip label={`Готово ${stats.done}`} color="success" variant="outlined" />
          <Chip label={`Просрочено ${stats.overdue}`} color={stats.overdue ? 'error' : 'default'} variant="outlined" />
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            size="small"
            placeholder="Поиск в проекте..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
            sx={{ flex: 1 }}
          />
          <ToggleButtonGroup value={viewMode} exclusive onChange={(_, value) => value && setViewMode(value)} size="small">
            <ToggleButton value="kanban"><KanbanIcon sx={{ mr: 1 }} />Канбан</ToggleButton>
            <ToggleButton value="list"><ListIcon sx={{ mr: 1 }} />Список</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        {error && <Alert severity="error">Не удалось загрузить задачи проекта.</Alert>}
        {tasksLoading ? (
          <Stack spacing={1.5}>{[1, 2, 3].map((item) => <Skeleton key={item} height={72} sx={{ borderRadius: 2 }} />)}</Stack>
        ) : viewMode === 'kanban' ? (
          <KanbanBoard
            tasks={tasks}
            onStatusChange={(taskId, status) => updateTask(taskId, { status: status as Task['status'] })}
            onEdit={(task) => openTask(task, 'edit')}
            onDelete={(task) => openTask(task)}
          />
        ) : (
          <TaskList tasks={tasks} onEdit={(task) => openTask(task, 'edit')} onDelete={(task) => openTask(task)} />
        )}
      </Stack>

      <TaskDetailDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        task={selectedTask}
        mode={dialogMode}
        initialValues={dialogMode === 'create' ? { project_id: projectId } : undefined}
      />
    </Container>
  )
}