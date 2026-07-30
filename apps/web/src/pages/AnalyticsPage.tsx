import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Chip,
  Container,
  Grid,
  LinearProgress,
  Paper,
  Skeleton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  alpha,
  useTheme,
} from '@mui/material'
import {
  Assignment as TaskIcon,
  CheckCircle as DoneIcon,
  Folder as ProjectIcon,
  Schedule as InProgressIcon,
  Warning as OverdueIcon,
} from '@mui/icons-material'
import { useTasks } from '@/lib/hooks/useTasks'
import { useProjects } from '@/lib/hooks/useProjects'
import type { Project, Task } from '@/lib/types'

type Period = '7d' | '30d' | 'all'

function taskDate(task: Task) {
  return new Date(task.completed_at || task.updated_at || task.created_at || task.due_date || 0).getTime()
}

export default function AnalyticsPage() {
  const navigate = useNavigate()
  const theme = useTheme()
  const [period, setPeriod] = useState<Period>('30d')
  const { tasks: rawTasks, loading: tasksLoading, error: tasksError } = useTasks()
  const { projects: rawProjects, loading: projectsLoading, error: projectsError } = useProjects()
  const tasks = useMemo(() => Array.isArray(rawTasks) ? rawTasks : [], [rawTasks])
  const projects = useMemo(() => Array.isArray(rawProjects) ? rawProjects.filter((project) => !project.is_archived) : [], [rawProjects])

  const periodTasks = useMemo(() => {
    if (period === 'all') return tasks
    const days = period === '7d' ? 7 : 30
    const threshold = Date.now() - days * 24 * 60 * 60 * 1000
    return tasks.filter((task) => taskDate(task) >= threshold)
  }, [tasks, period])

  const stats = useMemo(() => {
    const done = periodTasks.filter((task) => task.status === 'done').length
    const inProgress = periodTasks.filter((task) => task.status === 'in_progress').length
    const overdue = periodTasks.filter((task) => task.due_date && task.status !== 'done' && new Date(task.due_date) < new Date()).length
    return {
      done,
      inProgress,
      overdue,
      completionRate: periodTasks.length ? Math.round(done / periodTasks.length * 100) : 0,
    }
  }, [periodTasks])

  const projectProgress = useMemo(() => projects.map((project: Project) => {
    const projectTasks = tasks.filter((task) => task.project_id === project.id)
    const completed = projectTasks.filter((task) => task.status === 'done').length
    return {
      project,
      total: projectTasks.length,
      completed,
      progress: projectTasks.length ? Math.round(completed / projectTasks.length * 100) : 0,
      overdue: projectTasks.filter((task) => task.due_date && task.status !== 'done' && new Date(task.due_date) < new Date()).length,
    }
  }).sort((a, b) => b.total - a.total), [projects, tasks])

  const loading = tasksLoading || projectsLoading
  const error = tasksError || projectsError
  const cards = [
    { label: 'Задач за период', value: periodTasks.length, icon: <TaskIcon />, color: theme.palette.primary.main, action: '/tasks' },
    { label: 'В работе', value: stats.inProgress, icon: <InProgressIcon />, color: theme.palette.info.main, action: '/tasks?status=in_progress' },
    { label: 'Выполнено', value: stats.done, icon: <DoneIcon />, color: theme.palette.success.main, action: '/tasks?status=done' },
    { label: 'Просрочено', value: stats.overdue, icon: <OverdueIcon />, color: theme.palette.error.main, action: '/tasks' },
  ]

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h4" fontWeight={800}>Аналитика</Typography>
            <Typography variant="body2" color="text.secondary">Результаты и состояние проектов за выбранный период</Typography>
          </Box>
          <ToggleButtonGroup value={period} exclusive onChange={(_, value) => value && setPeriod(value)} size="small">
            <ToggleButton value="7d">7 дней</ToggleButton>
            <ToggleButton value="30d">30 дней</ToggleButton>
            <ToggleButton value="all">Всё время</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        {error && <Alert severity="error">Не удалось загрузить данные аналитики.</Alert>}

        <Grid container spacing={2}>
          {cards.map((card) => (
            <Grid item xs={12} sm={6} lg={3} key={card.label}>
              <Paper
                component="button"
                type="button"
                onClick={() => navigate(card.action)}
                sx={{ width: '100%', p: 2.5, textAlign: 'left', color: 'inherit', cursor: 'pointer', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}
              >
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box sx={{ width: 44, height: 44, borderRadius: 2, display: 'grid', placeItems: 'center', color: card.color, bgcolor: alpha(card.color, 0.12) }}>{card.icon}</Box>
                  <Box>
                    {loading ? <Skeleton width={48} /> : <Typography variant="h5" fontWeight={800}>{card.value}</Typography>}
                    <Typography variant="body2" color="text.secondary">{card.label}</Typography>
                  </Box>
                </Stack>
              </Paper>
            </Grid>
          ))}
        </Grid>

        <Paper sx={{ p: 2.5, border: '1px solid', borderColor: 'divider' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1} mb={1.5}>
            <Box>
              <Typography variant="h6" fontWeight={700}>Выполнение задач</Typography>
              <Typography variant="body2" color="text.secondary">{stats.done} из {periodTasks.length} задач завершено</Typography>
            </Box>
            <Chip label={periodTasks.length ? `${stats.completionRate}%` : 'Нет данных'} color={stats.completionRate >= 70 ? 'success' : 'default'} />
          </Stack>
          <LinearProgress variant="determinate" value={stats.completionRate} sx={{ height: 10, borderRadius: 2 }} />
        </Paper>

        <Box>
          <Typography variant="h6" fontWeight={700} mb={1.5}>Проекты</Typography>
          <Stack spacing={1}>
            {loading ? [1, 2, 3].map((item) => <Skeleton key={item} height={72} />) : projectProgress.length ? projectProgress.map(({ project, total, completed, progress, overdue }) => (
              <Paper key={project.id} onClick={() => navigate(`/projects/${project.id}`)} sx={{ p: 2, cursor: 'pointer', border: '1px solid', borderColor: 'divider' }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: { sm: 240 } }}>
                    <ProjectIcon sx={{ color: project.color || 'primary.main' }} />
                    <Box minWidth={0}>
                      <Typography fontWeight={700} noWrap>{project.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{completed} из {total} выполнено</Typography>
                    </Box>
                  </Stack>
                  <LinearProgress variant="determinate" value={progress} sx={{ flex: 1, width: '100%', height: 8, borderRadius: 2 }} />
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography fontWeight={700}>{progress}%</Typography>
                    {overdue > 0 && <Chip size="small" color="error" label={`${overdue} проср.`} />}
                  </Stack>
                </Stack>
              </Paper>
            )) : <Typography color="text.secondary">Создайте проект и добавьте задачи, чтобы увидеть прогресс.</Typography>}
          </Stack>
        </Box>
      </Stack>
    </Container>
  )
}