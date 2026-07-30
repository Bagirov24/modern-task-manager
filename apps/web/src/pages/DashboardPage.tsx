import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { isToday, isPast, parseISO } from 'date-fns'
import { useTasks } from '@/lib/hooks/useTasks'
import { useProjects } from '@/lib/hooks/useProjects'
import { useAuthStore } from '@/lib/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { pageTransition, staggerChildren, listItem } from '@/lib/animations/variants'
import {
  Container, Typography, Box, Card, CardContent, Grid,
  Skeleton, Button, Chip, Stack, alpha, useTheme,
  IconButton, Tooltip, Alert,
} from '@mui/material'
import {
  FolderOutlined as ProjectIcon,
  Add as AddIcon,
  ArrowForward as ArrowIcon,
  Warning as WarningIcon,
  PlayCircleOutline as NowIcon,
  Today as TodayIcon,
  HourglassEmpty as WaitIcon,
  ErrorOutline as OverdueIcon,
  Circle as CircleIcon,
  Flag as FlagIcon,
} from '@mui/icons-material'

const MotionBox = motion(Box)
const MotionCard = motion(Card)

// Priority weight for sorting (higher = more urgent)
const PRIORITY_WEIGHT: Record<string, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
}

const PRIORITY_COLOR: Record<string, string> = {
  urgent: '#EF5350',
  high: '#FFA726',
  medium: '#42A5F5',
  low: '#66BB6A',
}

const PRIORITY_LABEL: Record<string, string> = {
  urgent: 'Срочный',
  high: 'Высокий',
  medium: 'Средний',
  low: 'Низкий',
}

function PriorityDot({ priority }: { priority: string }) {
  return (
    <CircleIcon
      sx={{ fontSize: 10, color: PRIORITY_COLOR[priority] || PRIORITY_COLOR.low, flexShrink: 0 }}
    />
  )
}

function TaskRow({
  task,
  onClick,
  showProject,
}: {
  task: any
  onClick?: () => void
  showProject?: boolean
}) {
  const theme = useTheme()
  const isOverdue =
    task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'done'

  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 1.5,
        py: 1.25,
        borderRadius: 2,
        cursor: onClick ? 'pointer' : 'default',
        border: '1px solid',
        borderColor: isOverdue ? alpha('#EF5350', 0.3) : 'divider',
        bgcolor: isOverdue ? alpha('#EF5350', 0.04) : 'background.default',
        transition: 'background-color 0.15s',
        '&:hover': onClick ? { bgcolor: alpha(theme.palette.primary.main, 0.06) } : {},
      }}
    >
      <PriorityDot priority={task.priority || 'low'} />
      <Typography variant="body2" noWrap sx={{ flex: 1, fontWeight: 500 }}>
        {task.title}
      </Typography>
      {showProject && task.project_name && (
        <Typography variant="caption" color="text.disabled" noWrap sx={{ maxWidth: 80 }}>
          {task.project_name}
        </Typography>
      )}
      {task.due_date && (
        <Typography
          variant="caption"
          sx={{ color: isOverdue ? 'error.main' : 'text.disabled', flexShrink: 0 }}
        >
          {isOverdue ? '⚠ ' : ''}
          {new Date(task.due_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
        </Typography>
      )}
    </Box>
  )
}

function SectionCard({
  icon,
  title,
  color,
  count,
  children,
  action,
  loading,
  emptyText,
  isEmpty,
}: {
  icon: React.ReactNode
  title: string
  color: string
  count?: number
  children: React.ReactNode
  action?: React.ReactNode
  loading?: boolean
  emptyText?: string
  isEmpty?: boolean
}) {
  const theme = useTheme()
  return (
    <MotionCard
      variants={listItem}
      elevation={0}
      sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 2,
                bgcolor: alpha(color, 0.12),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color,
              }}
            >
              {icon}
            </Box>
            <Typography variant="subtitle1" fontWeight={700}>
              {title}
            </Typography>
            {count !== undefined && count > 0 && (
              <Chip
                label={count}
                size="small"
                sx={{ bgcolor: alpha(color, 0.15), color, fontWeight: 700, height: 20, fontSize: 11 }}
              />
            )}
          </Stack>
          {action}
        </Box>

        {loading ? (
          <Stack spacing={1}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} height={44} sx={{ borderRadius: 2 }} />
            ))}
          </Stack>
        ) : isEmpty ? (
          <Typography variant="body2" color="text.disabled" sx={{ py: 1 }}>
            {emptyText || 'Нет задач'}
          </Typography>
        ) : (
          children
        )}
      </CardContent>
    </MotionCard>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const theme = useTheme()
  const user = useAuthStore((s) => s.user)
  const openModal = useUIStore((s) => s.openModal)

  const { tasks: rawTasks, loading: tasksLoading, error: tasksError } = useTasks()
  const { projects: rawProjects, loading: projectsLoading, error: projectsError } = useProjects()

  const tasks = useMemo(() => (Array.isArray(rawTasks) ? rawTasks : []), [rawTasks])
  const projects = useMemo(
    () => (Array.isArray(rawProjects) ? rawProjects : []).filter((p: any) => !p.is_archived),
    [rawProjects]
  )

  const sortByPriority = (a: any, b: any) =>
    (PRIORITY_WEIGHT[b.priority] || 1) - (PRIORITY_WEIGHT[a.priority] || 1)

  // "Сейчас" — активные in_progress, max 5, по приоритету
  const nowTasks = useMemo(
    () =>
      tasks
        .filter((t: any) => t.status === 'in_progress')
        .sort(sortByPriority)
        .slice(0, 5),
    [tasks]
  )

  // "Просрочено" — все просроченные, не done
  const overdueTasks = useMemo(
    () =>
      tasks
        .filter(
          (t: any) => t.due_date && isPast(parseISO(t.due_date)) && t.status !== 'done'
        )
        .sort(sortByPriority),
    [tasks]
  )

  // "Сегодня" — дедлайн сегодня, не done
  const todayTasks = useMemo(
    () =>
      tasks
        .filter(
          (t: any) => t.due_date && isToday(parseISO(t.due_date)) && t.status !== 'done'
        )
        .sort(sortByPriority),
    [tasks]
  )

  // "Ожидаю" — статус waiting или blocked (если есть), либо todo без активности 3+ дней
  const waitingTasks = useMemo(
    () =>
      tasks
        .filter(
          (t: any) =>
            t.status === 'waiting' ||
            t.status === 'blocked' ||
            (t.status === 'todo' &&
              t.created_at &&
              Date.now() - new Date(t.created_at).getTime() > 3 * 24 * 60 * 60 * 1000)
        )
        .sort(sortByPriority)
        .slice(0, 5),
    [tasks]
  )

  // Проекты с риском: есть просроченные задачи
  const projectsAtRisk = useMemo(() => {
    const overdueProjectIds = new Set(overdueTasks.map((t: any) => t.project_id).filter(Boolean))
    return projects
      .filter((p: any) => overdueProjectIds.has(p.id))
      .slice(0, 3)
  }, [projects, overdueTasks])

  // Активные проекты без риска (первые 4)
  const activeProjects = useMemo(
    () =>
      projects
        .filter((p: any) => !projectsAtRisk.find((r: any) => r.id === p.id))
        .slice(0, 4),
    [projects, projectsAtRisk]
  )

  const handleCreateTask = () => {
    openModal('task.create')
    navigate('/tasks')
  }

  const handleOpenTask = (taskId: string) => {
    openModal('task.detail', { taskId })
    navigate('/tasks')
  }

  const greeting = useMemo(() => {
    const h = new Date().getHours()
    if (h < 12) return 'Доброе утро'
    if (h < 18) return 'Добрый день'
    return 'Добрый вечер'
  }, [])

  return (
    <MotionBox variants={pageTransition} initial="initial" animate="animate" exit="exit">
      <Container maxWidth="lg" disableGutters>
        {/* Header */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              {greeting}{user?.username ? `, ${user.username}` : ''} 👋
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {overdueTasks.length > 0
                ? `У вас ${overdueTasks.length} просроченных задач — разберитесь с ними первым делом`
                : todayTasks.length > 0
                ? `На сегодня ${todayTasks.length} задач с дедлайном — приступайте`
                : 'Всё под контролем. Выберите следующую задачу'}
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateTask}
            sx={{ flexShrink: 0 }}
          >
            Новая задача
          </Button>
        </Box>

        {(tasksError || projectsError) && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Не удалось загрузить рабочие данные. Проверьте соединение и повторите попытку.
          </Alert>
        )}
        <MotionBox variants={staggerChildren} initial="initial" animate="animate">
          <Grid container spacing={2.5}>
            {/* LEFT COLUMN — main work queue */}
            <Grid item xs={12} md={8}>
              <Stack spacing={2.5}>

                {/* БЛОК: Просрочено */}
                {(tasksLoading || overdueTasks.length > 0) && (
                  <SectionCard
                    icon={<OverdueIcon fontSize="small" />}
                    title="Просрочено"
                    color="#EF5350"
                    count={overdueTasks.length}
                    loading={tasksLoading}
                    isEmpty={overdueTasks.length === 0}
                    action={
                      <Button
                        size="small"
                        color="error"
                        variant="contained"
                        endIcon={<ArrowIcon />}
                        onClick={() => navigate('/tasks')}
                        sx={{ borderRadius: 2 }}
                      >
                        Разобрать
                      </Button>
                    }
                  >
                    <Stack spacing={0.75}>
                      {overdueTasks.slice(0, 4).map((task: any) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          showProject
                          onClick={() => handleOpenTask(task.id)}
                        />
                      ))}
                      {overdueTasks.length > 4 && (
                        <Typography
                          variant="caption"
                          color="error"
                          sx={{ pl: 1, cursor: 'pointer' }}
                          onClick={() => navigate('/tasks')}
                        >
                          +{overdueTasks.length - 4} ещё просроченных
                        </Typography>
                      )}
                    </Stack>
                  </SectionCard>
                )}

                {/* БЛОК: Сейчас */}
                <SectionCard
                  icon={<NowIcon fontSize="small" />}
                  title="Сейчас"
                  color="#7C4DFF"
                  count={nowTasks.length}
                  loading={tasksLoading}
                  isEmpty={nowTasks.length === 0}
                  emptyText="Нет активных задач — выберите следующую из очереди"
                  action={
                    <Button
                      size="small"
                      endIcon={<ArrowIcon />}
                      onClick={() => navigate('/tasks')}
                      sx={{ borderRadius: 2 }}
                    >
                      Все задачи
                    </Button>
                  }
                >
                  <Stack spacing={0.75}>
                    {nowTasks.map((task: any) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        showProject
                        onClick={() => navigate('/tasks')}
                      />
                    ))}
                    <Button
                      startIcon={<AddIcon />}
                      size="small"
                      onClick={handleCreateTask}
                      sx={{ alignSelf: 'flex-start', mt: 0.5 }}
                    >
                      Добавить задачу
                    </Button>
                  </Stack>
                </SectionCard>

                {/* БЛОК: Сегодня */}
                <SectionCard
                  icon={<TodayIcon fontSize="small" />}
                  title="Сегодня"
                  color="#FFA726"
                  count={todayTasks.length}
                  loading={tasksLoading}
                  isEmpty={todayTasks.length === 0}
                  emptyText="Задач с дедлайном сегодня нет"
                >
                  <Stack spacing={0.75}>
                    {todayTasks.map((task: any) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        showProject
                        onClick={() => navigate('/tasks')}
                      />
                    ))}
                  </Stack>
                </SectionCard>

                {/* БЛОК: Ожидаю */}
                {(tasksLoading || waitingTasks.length > 0) && (
                  <SectionCard
                    icon={<WaitIcon fontSize="small" />}
                    title="Ожидаю"
                    color="#78909C"
                    count={waitingTasks.length}
                    loading={tasksLoading}
                    isEmpty={waitingTasks.length === 0}
                    emptyText="Нет заблокированных или ожидающих задач"
                  >
                    <Stack spacing={0.75}>
                      {waitingTasks.map((task: any) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          showProject
                          onClick={() => handleOpenTask(task.id)}
                        />
                      ))}
                    </Stack>
                  </SectionCard>
                )}

              </Stack>
            </Grid>

            {/* RIGHT COLUMN — projects sidebar */}
            <Grid item xs={12} md={4}>
              <Stack spacing={2.5}>

                {/* Проекты с риском */}
                {(projectsLoading || projectsAtRisk.length > 0) && (
                  <MotionCard
                    variants={listItem}
                    elevation={0}
                    sx={{ border: '1px solid', borderColor: alpha('#EF5350', 0.4), borderRadius: 3 }}
                  >
                    <CardContent sx={{ p: 2.5 }}>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                        <WarningIcon sx={{ color: '#EF5350', fontSize: 20 }} />
                        <Typography variant="subtitle1" fontWeight={700}>
                          Риск просрочки
                        </Typography>
                      </Stack>
                      {projectsLoading ? (
                        <Stack spacing={1}>
                          {[1, 2].map((i) => <Skeleton key={i} height={36} sx={{ borderRadius: 2 }} />)}
                        </Stack>
                      ) : (
                        <Stack spacing={1}>
                          {projectsAtRisk.map((p: any) => (
                            <Box
                              key={p.id}
                              onClick={() => navigate('/projects')}
                              sx={{
                                display: 'flex', alignItems: 'center', gap: 1.5,
                                p: 1.25, borderRadius: 2, cursor: 'pointer',
                                bgcolor: alpha('#EF5350', 0.04),
                                border: '1px solid', borderColor: alpha('#EF5350', 0.2),
                                '&:hover': { bgcolor: alpha('#EF5350', 0.08) },
                              }}
                            >
                              <Box
                                sx={{
                                  width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                                  bgcolor: p.color || theme.palette.primary.main,
                                }}
                              />
                              <Typography variant="body2" fontWeight={500} noWrap sx={{ flex: 1 }}>
                                {p.name}
                              </Typography>
                              <Chip
                                label={`${overdueTasks.filter((t: any) => t.project_id === p.id).length} проср.`}
                                size="small"
                                color="error"
                                sx={{ height: 18, fontSize: 10 }}
                              />
                            </Box>
                          ))}
                        </Stack>
                      )}
                    </CardContent>
                  </MotionCard>
                )}

                {/* Активные проекты */}
                <MotionCard
                  variants={listItem}
                  elevation={0}
                  sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Box
                          sx={{
                            width: 32, height: 32, borderRadius: 2,
                            bgcolor: alpha('#42A5F5', 0.12),
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <ProjectIcon sx={{ color: '#42A5F5', fontSize: 18 }} />
                        </Box>
                        <Typography variant="subtitle1" fontWeight={700}>Проекты</Typography>
                      </Stack>
                      <Button
                        size="small"
                        endIcon={<ArrowIcon />}
                        onClick={() => navigate('/projects')}
                        sx={{ borderRadius: 2 }}
                      >
                        Все
                      </Button>
                    </Box>

                    {projectsLoading ? (
                      <Stack spacing={1}>
                        {[1, 2, 3].map((i) => <Skeleton key={i} height={36} sx={{ borderRadius: 2 }} />)}
                      </Stack>
                    ) : activeProjects.length === 0 && projectsAtRisk.length === 0 ? (
                      <Box sx={{ textAlign: 'center', py: 2 }}>
                        <Typography variant="body2" color="text.disabled" gutterBottom>
                          Нет активных проектов
                        </Typography>
                        <Button
                          size="small"
                          startIcon={<AddIcon />}
                          onClick={() => navigate('/projects')}
                        >
                          Создать проект
                        </Button>
                      </Box>
                    ) : (
                      <Stack spacing={1}>
                        {activeProjects.map((p: any) => (
                          <Box
                            key={p.id}
                            onClick={() => navigate('/projects')}
                            sx={{
                              display: 'flex', alignItems: 'center', gap: 1.5,
                              p: 1.25, borderRadius: 2, cursor: 'pointer',
                              border: '1px solid', borderColor: 'divider',
                              '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) },
                            }}
                          >
                            <Box
                              sx={{
                                width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                                bgcolor: p.color || theme.palette.primary.main,
                              }}
                            />
                            <Typography variant="body2" fontWeight={500} noWrap sx={{ flex: 1 }}>
                              {p.name}
                            </Typography>
                            {p.task_count !== undefined && (
                              <Typography variant="caption" color="text.disabled">
                                {p.task_count}
                              </Typography>
                            )}
                          </Box>
                        ))}
                      </Stack>
                    )}
                  </CardContent>
                </MotionCard>

                {/* Легенда приоритетов */}
                <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
                  <CardContent sx={{ p: 2 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1.5, display: 'block' }}>
                      ПРИОРИТЕТ
                    </Typography>
                    <Stack spacing={0.75}>
                      {Object.entries(PRIORITY_LABEL).map(([key, label]) => (
                        <Stack key={key} direction="row" alignItems="center" spacing={1}>
                          <CircleIcon sx={{ fontSize: 10, color: PRIORITY_COLOR[key] }} />
                          <Typography variant="caption" color="text.secondary">{label}</Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>

              </Stack>
            </Grid>
          </Grid>
        </MotionBox>
      </Container>
    </MotionBox>
  )
}
