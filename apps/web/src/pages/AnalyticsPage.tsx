import { useMemo } from 'react'
import {
  Container, Typography, Box, Stack, Paper, Grid, Chip,
  alpha, useTheme, LinearProgress, Divider,
} from '@mui/material'
import {
  CheckCircle as DoneIcon, Schedule as InProgressIcon,
  RadioButtonUnchecked as TodoIcon, TrendingUp as TrendingIcon,
  Assignment as TaskIcon, Folder as ProjectIcon,
  Warning as OverdueIcon, Flag as FlagIcon,
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { useTasks } from '@/lib/hooks/useTasks'
import { useProjects } from '@/lib/hooks/useProjects'
import { format, parseISO, isThisWeek, isThisMonth, isPast, startOfWeek, addDays } from 'date-fns'
import { ru } from 'date-fns/locale'
import type { Task } from '@/lib/types'

const MotionPaper = motion(Paper)

interface StatCardProps {
  title: string
  value: number
  icon: React.ReactNode
  color: string
  subtitle?: string
}

function StatCard({ title, value, icon, color, subtitle }: StatCardProps) {
  return (
    <MotionPaper
      elevation={0}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 3, position: 'relative', overflow: 'hidden' }}
    >
      <Box sx={{ position: 'absolute', top: -10, right: -10, width: 80, height: 80, borderRadius: '50%', bgcolor: alpha(color, 0.08) }} />
      <Stack direction="row" alignItems="center" spacing={2}>
        <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: alpha(color, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center', color: color }}>
          {icon}
        </Box>
        <Box>
          <Typography variant="h4" fontWeight={700}>{value}</Typography>
          <Typography variant="body2" color="text.secondary">{title}</Typography>
          {subtitle && <Typography variant="caption" color="text.disabled">{subtitle}</Typography>}
        </Box>
      </Stack>
    </MotionPaper>
  )
}

export default function AnalyticsPage() {
  const theme = useTheme()
  const { tasks } = useTasks()
  const { projects } = useProjects()

  const stats = useMemo(() => {
    const todo = tasks.filter((t: any) => t.status === 'todo').length
    const inProgress = tasks.filter((t: any) => t.status === 'in_progress').length
    const done = tasks.filter((t: any) => t.status === 'done').length
    const overdue = tasks.filter(
      (t: any) => t.due_date && t.status !== 'done' && isPast(parseISO(t.due_date))
    ).length
    const thisWeek = tasks.filter(
      (t: any) => t.due_date && isThisWeek(parseISO(t.due_date), { weekStartsOn: 1 })
    ).length
    const completionRate = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0
    return { todo, inProgress, done, overdue, thisWeek, completionRate }
  }, [tasks])

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700}>Аналитика</Typography>
        <Typography variant="body2" color="text.secondary">Статистика по задачам и проектам</Typography>
        <Chip
          label={`${stats.completionRate}%`}
          color={stats.completionRate >= 70 ? 'success' : stats.completionRate >= 40 ? 'warning' : 'error'}
          icon={<TrendingIcon />}
        />
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Всего задач" value={tasks.length} icon={<TaskIcon />} color={theme.palette.primary.main} subtitle={`На этой неделе: ${stats.thisWeek}`} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Выполнено" value={stats.done} icon={<DoneIcon />} color="#81C784" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Проекты" value={projects.length} icon={<ProjectIcon />} color="#D0BCFF" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Просрочено" value={stats.overdue} icon={<OverdueIcon />} color="#EF5350" subtitle={stats.overdue > 0 ? 'Требует внимания' : 'Всё в порядке'} />
        </Grid>
      </Grid>

      <Stack spacing={3}>
        <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} mb={2}>Прогресс выполнения</Typography>
          <Stack spacing={2}>
            <Box>
              <Stack direction="row" justifyContent="space-between" mb={0.5}>
                <Typography variant="body2">Общий прогресс</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {stats.done}/{tasks.length} ({stats.completionRate}%)
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={stats.completionRate}
                sx={{
                  height: 12, borderRadius: 6,
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 6,
                    bgcolor: stats.completionRate >= 70 ? '#81C784' : stats.completionRate >= 40 ? '#FFB74D' : '#EF5350',
                  },
                }}
              />
            </Box>
            <Divider />
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Stack alignItems="center">
                  <TodoIcon sx={{ color: '#CAC4D0', fontSize: 28, mb: 0.5 }} />
                  <Typography variant="h6" fontWeight={700}>{stats.todo}</Typography>
                  <Typography variant="caption" color="text.secondary">К выполнению</Typography>
                </Stack>
              </Grid>
              <Grid item xs={4}>
                <Stack alignItems="center">
                  <InProgressIcon sx={{ color: '#D0BCFF', fontSize: 28, mb: 0.5 }} />
                  <Typography variant="h6" fontWeight={700}>{stats.inProgress}</Typography>
                  <Typography variant="caption" color="text.secondary">В работе</Typography>
                </Stack>
              </Grid>
              <Grid item xs={4}>
                <Stack alignItems="center">
                  <DoneIcon sx={{ color: '#81C784', fontSize: 28, mb: 0.5 }} />
                  <Typography variant="h6" fontWeight={700}>{stats.done}</Typography>
                  <Typography variant="caption" color="text.secondary">Готово</Typography>
                </Stack>
              </Grid>
            </Grid>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  )
}
