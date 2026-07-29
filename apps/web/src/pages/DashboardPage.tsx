import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useTasks } from '@/lib/hooks/useTasks'
import { useProjects } from '@/lib/hooks/useProjects'
import { useAuthStore } from '@/lib/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { pageTransition, staggerChildren, listItem } from '@/lib/animations/variants'
import {
  Container, Typography, Box, Card, CardContent, Grid,
  Skeleton, Button, LinearProgress, Chip, Stack, Divider,
} from '@mui/material'
import {
  TaskAlt as TaskIcon,
  FolderOutlined as ProjectIcon,
  TrendingUp as TrendIcon,
  Schedule as ClockIcon,
  Add as AddIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material'

const MotionBox = motion(Box)
const MotionCard = motion(Card)

function StatCard({ title, value, icon, color, loading }: { title: string; value: number; icon: JSX.Element; color: string; loading: boolean }) {
  return (
    <Grid item xs={12} sm={6} md={3}>
      <MotionCard
        variants={listItem}
        elevation={0}
        sx={{ border: '1px solid', borderColor: 'divider', height: '100%', borderRadius: 4 }}
      >
        <CardContent sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              <Typography variant="caption" color="text.secondary">{title}</Typography>
              {loading ? (
                <Skeleton width={60} height={40} />
              ) : (
                <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5 }}>{value}</Typography>
              )}
            </Box>
            <Box sx={{ p: 1.2, borderRadius: 3, bgcolor: color + '18' }}>
              {icon}
            </Box>
          </Box>
        </CardContent>
      </MotionCard>
    </Grid>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const openModal = useUIStore((s) => s.openModal)
  const addSnackbar = useUIStore((s) => s.addSnackbar)

  const { tasks: rawTasks, loading: tasksLoading } = useTasks()
  const { projects: rawProjects, loading: projectsLoading } = useProjects()

  const tasks = useMemo(() => Array.isArray(rawTasks) ? rawTasks : [], [rawTasks])
  const projects = useMemo(() => Array.isArray(rawProjects) ? rawProjects : [], [rawProjects])

  const stats = useMemo(() => ({
    total: tasks.length,
    todo: tasks.filter((t: any) => t.status === 'todo').length,
    inProgress: tasks.filter((t: any) => t.status === 'in_progress').length,
    done: tasks.filter((t: any) => t.status === 'done').length,
    projects: projects.length,
    completionRate: tasks.length > 0 ? Math.round((tasks.filter((t: any) => t.status === 'done').length / tasks.length) * 100) : 0,
  }), [tasks, projects])

  const recentTasks = useMemo(() => tasks.slice(0, 6), [tasks])
  const overdueTasks = useMemo(() =>
    tasks.filter((t: any) => t.due_date && new Date(t.due_date).getTime() < Date.now() && t.status !== 'done').length,
    [tasks]
  )

  return (
    <MotionBox variants={pageTransition} initial="initial" animate="animate" exit="exit">
      <Container maxWidth="lg" disableGutters>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Добро пожаловать{user?.username ? `, ${user.username}` : ''} 👋
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Обзор ваших задач и проектов на сегодня
          </Typography>
        </Box>

        <MotionBox variants={staggerChildren} initial="initial" animate="animate">
          <Grid container spacing={2} sx={{ mb: 4 }}>
            <StatCard title="Всего задач" value={stats.total} icon={<TaskIcon sx={{ color: '#7C4DFF' }} />} color="#7C4DFF" loading={tasksLoading} />
            <StatCard title="В работе" value={stats.inProgress} icon={<ClockIcon sx={{ color: '#FFA726' }} />} color="#FFA726" loading={tasksLoading} />
            <StatCard title="Завершено" value={stats.done} icon={<TrendIcon sx={{ color: '#66BB6A' }} />} color="#66BB6A" loading={tasksLoading} />
            <StatCard title="Проектов" value={stats.projects} icon={<ProjectIcon sx={{ color: '#42A5F5' }} />} color="#42A5F5" loading={projectsLoading} />
          </Grid>
        </MotionBox>

        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 4 }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" fontWeight={700}>Последние задачи</Typography>
                  <Stack direction="row" spacing={1}>
                    {overdueTasks > 0 && (
                      <Chip label={`${overdueTasks} просрочено`} color="error" size="small" />
                    )}
                    <Button size="small" onClick={() => navigate('/tasks')}>Все задачи</Button>
                  </Stack>
                </Box>
                {tasksLoading ? (
                  <Stack spacing={1.5}>{[1, 2, 3].map((i) => <Skeleton key={i} height={52} sx={{ borderRadius: 2 }} />)}</Stack>
                ) : recentTasks.length > 0 ? (
                  <Stack spacing={1}>
                    {recentTasks.map((task: any) => {
                      const isOverdue = task.due_date && new Date(task.due_date).getTime() < Date.now() && task.status !== 'done'
                      return (
                        <Box
                          key={task.id}
                          sx={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            p: 1.5, borderRadius: 2, bgcolor: 'background.default',
                            border: '1px solid',
                            borderColor: isOverdue ? 'error.light' : 'transparent',
                          }}
                        >
                          <Typography variant="body2" noWrap sx={{ flex: 1, mr: 1 }}>{task.title}</Typography>
                          <Chip
                            label={task.status === 'done' ? 'Готово' : task.status === 'in_progress' ? 'В работе' : 'К выполнению'}
                            size="small"
                            color={task.status === 'done' ? 'success' : task.status === 'in_progress' ? 'warning' : 'default'}
                          />
                        </Box>
                      )
                    })}
                  </Stack>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>Задач пока нет</Typography>
                    <Button variant="outlined" startIcon={<AddIcon />} onClick={() => { navigate('/tasks'); openModal('task.create') }}>
                      Создать задачу
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Stack spacing={3}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 4 }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Прогресс</Typography>
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">Выполнение</Typography>
                      <Typography variant="body2" fontWeight={700}>{stats.completionRate}%</Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={stats.completionRate} sx={{ height: 8, borderRadius: 4 }} />
                  </Box>
                  <Divider sx={{ my: 2 }} />
                  <Stack spacing={1}>
                    {[
                      { label: 'К выполнению', value: stats.todo },
                      { label: 'В работе', value: stats.inProgress },
                      { label: 'Готово', value: stats.done },
                    ].map(({ label, value }) => (
                      <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">{label}</Typography>
                        <Typography variant="body2" fontWeight={700}>{value}</Typography>
                      </Box>
                    ))}
                  </Stack>
                  <Button variant="contained" fullWidth startIcon={<AddIcon />} sx={{ mt: 3 }}
                    onClick={() => { navigate('/tasks'); openModal('task.create') }}>
                    Новая задача
                  </Button>
                </CardContent>
              </Card>

              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 4 }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} gutterBottom>Быстрые действия</Typography>
                  <Stack spacing={1}>
                    <Button fullWidth variant="outlined" startIcon={<TimelineIcon />} onClick={() => navigate('/tasks')}>
                      Timeline задач
                    </Button>
                    <Button fullWidth variant="outlined" startIcon={<ProjectIcon />} onClick={() => navigate('/projects')}>
                      Мои проекты
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </MotionBox>
  )
}
