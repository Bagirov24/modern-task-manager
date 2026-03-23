import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useTasks } from '@/lib/hooks/useTasks'
import { useProjects } from '@/lib/hooks/useProjects'
import { useAuthStore } from '@/lib/store/authStore'
import { pageTransition, staggerChildren, listItem } from '@/lib/animations/variants'
import {
  Container, Typography, Box, Card, CardContent, Grid,
  Skeleton, Button, LinearProgress, Chip, Stack,
} from '@mui/material'
import {
  TaskAlt as TaskIcon, FolderOutlined as ProjectIcon,
  TrendingUp as TrendIcon, Schedule as ClockIcon,
  Add as AddIcon,
} from '@mui/icons-material'

const MotionBox = motion(Box)
const MotionCard = motion(Card)

function StatCard({ title, value, icon, color, loading }: any) {
  return (
    <Grid item xs={12} sm={6} md={3}>
      <MotionCard
        variants={listItem}
        elevation={0}
        sx={{ border: '1px solid', borderColor: 'divider', height: '100%' }}
      >
        <CardContent sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              <Typography variant="caption" color="text.secondary">{title}</Typography>
              {loading ? (
                <Skeleton width={60} height={40} />
              ) : (
                <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5 }}>{value}</Typography>
              )}
            </Box>
            <Box sx={{ p: 1, borderRadius: 2, bgcolor: color + '15' }}>
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
  const { data: tasks = [], isLoading: tasksLoading } = useTasks({})
  const { data: projects = [], isLoading: projectsLoading } = useProjects()

  const todoCount = tasks.filter((t: any) => t.status === 'todo').length
  const inProgressCount = tasks.filter((t: any) => t.status === 'in_progress').length
  const doneCount = tasks.filter((t: any) => t.status === 'done').length
  const totalTasks = tasks.length
  const completionRate = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0

  const recentTasks = tasks.slice(0, 5)

  return (
    <MotionBox
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <Container maxWidth="lg" disableGutters>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Добро пожаловать{user?.username ? `, ${user.username}` : ''}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Обзор ваших задач и проектов
          </Typography>
        </Box>

        <MotionBox variants={staggerChildren} initial="initial" animate="animate">
          <Grid container spacing={2} sx={{ mb: 4 }}>
            <StatCard title="Всего задач" value={totalTasks} icon={<TaskIcon sx={{ color: '#7C4DFF' }} />} color="#7C4DFF" loading={tasksLoading} />
            <StatCard title="В работе" value={inProgressCount} icon={<ClockIcon sx={{ color: '#FFA726' }} />} color="#FFA726" loading={tasksLoading} />
            <StatCard title="Завершено" value={doneCount} icon={<TrendIcon sx={{ color: '#66BB6A' }} />} color="#66BB6A" loading={tasksLoading} />
            <StatCard title="Проектов" value={projects.length} icon={<ProjectIcon sx={{ color: '#42A5F5' }} />} color="#42A5F5" loading={projectsLoading} />
          </Grid>
        </MotionBox>

        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Последние задачи</Typography>
                  <Button size="small" onClick={() => navigate('/tasks')}>Все задачи</Button>
                </Box>
                {tasksLoading ? (
                  <Stack spacing={1.5}>
                    {[1, 2, 3].map((i) => <Skeleton key={i} height={48} />)}
                  </Stack>
                ) : recentTasks.length > 0 ? (
                  <Stack spacing={1}>
                    {recentTasks.map((task: any) => (
                      <Box key={task.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, borderRadius: 1, bgcolor: 'background.default' }}>
                        <Typography variant="body2" noWrap sx={{ flex: 1 }}>{task.title}</Typography>
                        <Chip label={task.status === 'done' ? 'Готово' : task.status === 'in_progress' ? 'В работе' : 'К выполнению'} size="small" color={task.status === 'done' ? 'success' : task.status === 'in_progress' ? 'warning' : 'default'} />
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">Нет задач</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Прогресс</Typography>
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">Выполнение</Typography>
                    <Typography variant="body2" fontWeight={600}>{completionRate}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={completionRate} sx={{ height: 8, borderRadius: 4 }} />
                </Box>
                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">К выполнению</Typography>
                    <Typography variant="body2" fontWeight={600}>{todoCount}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">В работе</Typography>
                    <Typography variant="body2" fontWeight={600}>{inProgressCount}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Готово</Typography>
                    <Typography variant="body2" fontWeight={600}>{doneCount}</Typography>
                  </Box>
                </Stack>
                <Button variant="contained" fullWidth startIcon={<AddIcon />} sx={{ mt: 3 }} onClick={() => navigate('/tasks')}>
                  Новая задача
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </MotionBox>
  )
}
