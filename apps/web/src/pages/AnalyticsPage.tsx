import { useMemo } from 'react'
import {
  Container,
  Typography,
  Box,
  Stack,
  Paper,
  Grid,
  Chip,
  alpha,
  useTheme,
  LinearProgress,
  Divider,
} from '@mui/material'
import {
  CheckCircle as DoneIcon,
  Schedule as InProgressIcon,
  RadioButtonUnchecked as TodoIcon,
  TrendingUp as TrendingIcon,
  Assignment as TaskIcon,
  Folder as ProjectIcon,
  Warning as OverdueIcon,
  Flag as FlagIcon,
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
  const theme = useTheme()
  return (
    <MotionPaper
      elevation={0}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      sx={{
        p: 2.5,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: -10,
          right: -10,
          width: 80,
          height: 80,
          borderRadius: '50%',
          bgcolor: alpha(color, 0.08),
        }}
      />
      <Stack direction="row" alignItems="center" spacing={2}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            bgcolor: alpha(color, 0.12),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: color,
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            {value}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.disabled">
              {subtitle}
            </Typography>
          )}
        </Box>
      </Stack>
    </MotionPaper>
  )
}

interface BarChartProps {
  data: { label: string; value: number; color: string }[]
  title: string
}

function HorizontalBarChart({ data, title }: BarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
      <Typography variant="subtitle1" fontWeight={600} mb={2}>
        {title}
      </Typography>
      <Stack spacing={1.5}>
        {data.map((item) => (
          <Box key={item.label}>
            <Stack direction="row" justifyContent="space-between" mb={0.5}>
              <Typography variant="body2">{item.label}</Typography>
              <Typography variant="body2" fontWeight={600}>
                {item.value}
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={(item.value / max) * 100}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: alpha(item.color, 0.1),
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                  bgcolor: item.color,
                },
              }}
            />
          </Box>
        ))}
      </Stack>
    </Paper>
  )
}

interface DonutProps {
  segments: { label: string; value: number; color: string }[]
  title: string
}

function DonutChart({ segments, title }: DonutProps) {
  const total = segments.reduce((s, item) => s + item.value, 0) || 1
  let cumulative = 0
  const size = 160
  const stroke = 24
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius

  return (
    <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
      <Typography variant="subtitle1" fontWeight={600} mb={2}>
        {title}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
        <Box sx={{ position: 'relative', width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {segments.map((seg) => {
              const pct = seg.value / total
              const dashLen = circumference * pct
              const dashOffset = circumference * (1 - cumulative / total)
              cumulative += seg.value
              return (
                <circle
                  key={seg.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={stroke}
                  strokeDasharray={`${dashLen} ${circumference - dashLen}`}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                  style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
                />
              )
            })}
          </svg>
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
            }}
          >
            <Typography variant="h5" fontWeight={700}>
              {segments.reduce((s, i) => s + i.value, 0)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              всего
            </Typography>
          </Box>
        </Box>
        <Stack spacing={1}>
          {segments.map((seg) => (
            <Stack key={seg.label} direction="row" alignItems="center" spacing={1}>
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: seg.color, flexShrink: 0 }} />
              <Typography variant="body2">
                {seg.label}: <b>{seg.value}</b>
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Box>
    </Paper>
  )
}

function WeeklyActivity({ tasks }: { tasks: Task[] }) {
  const theme = useTheme()
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const data = days.map((day) => {
    const dayStr = format(day, 'yyyy-MM-dd')
    const count = tasks.filter(
      (t) => t.due_date && format(parseISO(t.due_date), 'yyyy-MM-dd') === dayStr
    ).length
    return {
      label: format(day, 'EEE', { locale: ru }),
      value: count,
    }
  })

  const max = Math.max(...data.map((d) => d.value), 1)

  return (
    <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
      <Typography variant="subtitle1" fontWeight={600} mb={2}>
        Активность на этой неделе
      </Typography>
      <Stack direction="row" spacing={1} alignItems="flex-end" sx={{ height: 120 }}>
        {data.map((item, i) => (
          <Box key={i} sx={{ flex: 1, textAlign: 'center' }}>
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(item.value / max) * 80}px` }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              style={{
                width: '100%',
                borderRadius: '6px 6px 0 0',
                background: item.value > 0
                  ? theme.palette.primary.main
                  : alpha(theme.palette.text.primary, 0.08),
                minHeight: 4,
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {item.label}
            </Typography>
            {item.value > 0 && (
              <Typography variant="caption" fontWeight={600} sx={{ display: 'block' }}>
                {item.value}
              </Typography>
            )}
          </Box>
        ))}
      </Stack>
    </Paper>
  )
}

export default function AnalyticsPage() {
  const theme = useTheme()
  const { data: tasksData } = useTasks({})
  const { data: projectsData } = useProjects()
  const tasks = tasksData?.tasks || []
  const projects = projectsData || []

  const stats = useMemo(() => {
    const todo = tasks.filter((t) => t.status === 'todo').length
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length
    const done = tasks.filter((t) => t.status === 'done').length
    const overdue = tasks.filter(
      (t) => t.due_date && t.status !== 'done' && isPast(parseISO(t.due_date))
    ).length
    const thisWeek = tasks.filter(
      (t) => t.due_date && isThisWeek(parseISO(t.due_date), { weekStartsOn: 1 })
    ).length
    const thisMonth = tasks.filter(
      (t) => t.due_date && isThisMonth(parseISO(t.due_date))
    ).length
    const completionRate = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0

    const low = tasks.filter((t) => t.priority === 'low').length
    const medium = tasks.filter((t) => t.priority === 'medium').length
    const high = tasks.filter((t) => t.priority === 'high').length
    const urgent = tasks.filter((t) => t.priority === 'urgent').length

    return { todo, inProgress, done, overdue, thisWeek, thisMonth, completionRate, low, medium, high, urgent }
  }, [tasks])

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Аналитика
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Статистика по задачам и проектам
          </Typography>
        </Box>
        <Chip
          label={`Выполнение: ${stats.completionRate}%`}
          color={stats.completionRate >= 70 ? 'success' : stats.completionRate >= 40 ? 'warning' : 'error'}
          icon={<TrendingIcon />}
        />
      </Stack>

      {/* Stat cards */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Всего задач"
            value={tasks.length}
            icon={<TaskIcon />}
            color={theme.palette.primary.main}
            subtitle={`На этой неделе: ${stats.thisWeek}`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Выполнено"
            value={stats.done}
            icon={<DoneIcon />}
            color="#81C784"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Проектов"
            value={projects.length}
            icon={<ProjectIcon />}
            color="#D0BCFF"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Просрочено"
            value={stats.overdue}
            icon={<OverdueIcon />}
            color="#EF5350"
            subtitle={stats.overdue > 0 ? 'Требует внимания' : 'Всё в порядке'}
          />
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={4}>
          <DonutChart
            title="Распределение по статусам"
            segments={[
              { label: 'К выполнению', value: stats.todo, color: '#CAC4D0' },
              { label: 'В работе', value: stats.inProgress, color: '#D0BCFF' },
              { label: 'Готово', value: stats.done, color: '#81C784' },
            ]}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <HorizontalBarChart
            title="Приоритеты задач"
            data={[
              { label: 'Низкий', value: stats.low, color: '#81C784' },
              { label: 'Средний', value: stats.medium, color: '#4FC3F7' },
              { label: 'Высокий', value: stats.high, color: '#FFB74D' },
              { label: 'Срочный', value: stats.urgent, color: '#EF5350' },
            ]}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <WeeklyActivity tasks={tasks} />
        </Grid>
      </Grid>

      {/* Completion progress */}
      <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} mb={2}>
          Прогресс выполнения
        </Typography>
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
                height: 12,
                borderRadius: 6,
                bgcolor: alpha(theme.palette.primary.main, 0.08),
                '& .MuiLinearProgress-bar': {
                  borderRadius: 6,
                  bgcolor:
                    stats.completionRate >= 70
                      ? '#81C784'
                      : stats.completionRate >= 40
                      ? '#FFB74D'
                      : '#EF5350',
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
    </Container>
  )
}
