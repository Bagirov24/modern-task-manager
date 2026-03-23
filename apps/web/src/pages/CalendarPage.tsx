import { useState, useMemo } from 'react'
import {
  Container,
  Typography,
  Box,
  Stack,
  IconButton,
  Paper,
  Chip,
  Tooltip,
  alpha,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
} from '@mui/material'
import {
  ChevronLeft,
  ChevronRight,
  Today as TodayIcon,
  Flag as FlagIcon,
  CheckCircleOutline,
  RadioButtonUnchecked,
  Circle as CircleIcon,
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
} from 'date-fns'
import { ru } from 'date-fns/locale'
import { useTasks } from '@/lib/hooks/useTasks'
import type { Task } from '@/lib/types'
import TaskDetailDialog from '@/components/tasks/TaskDetailDialog'

const MotionPaper = motion(Paper)

const priorityColors: Record<string, string> = {
  low: '#81C784',
  medium: '#4FC3F7',
  high: '#FFB74D',
  urgent: '#EF5350',
}

const statusIcons: Record<string, React.ReactNode> = {
  todo: <RadioButtonUnchecked fontSize="small" sx={{ color: '#CAC4D0' }} />,
  in_progress: <CircleIcon fontSize="small" sx={{ color: '#D0BCFF' }} />,
  done: <CheckCircleOutline fontSize="small" sx={{ color: '#81C784' }} />,
}

export default function CalendarPage() {
  const theme = useTheme()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)

  const { data } = useTasks({})
  const tasks = data?.tasks || []

  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {}
    tasks.forEach((task) => {
      if (task.due_date) {
        const dateKey = format(parseISO(task.due_date), 'yyyy-MM-dd')
        if (!map[dateKey]) map[dateKey] = []
        map[dateKey].push(task)
      }
    })
    return map
  }, [tasks])

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(monthStart)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

    const days: Date[] = []
    let day = calStart
    while (day <= calEnd) {
      days.push(day)
      day = addDays(day, 1)
    }
    return days
  }, [currentMonth])

  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const handleToday = () => setCurrentMonth(new Date())

  const handleDateClick = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd')
    const dayTasks = tasksByDate[dateKey]
    if (dayTasks && dayTasks.length > 0) {
      setSelectedDate(date)
    }
  }

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task)
    setTaskDialogOpen(true)
    setSelectedDate(null)
  }

  const totalTasksThisMonth = useMemo(() => {
    return tasks.filter((t) => {
      if (!t.due_date) return false
      const d = parseISO(t.due_date)
      return isSameMonth(d, currentMonth)
    }).length
  }, [tasks, currentMonth])

  const overdueThisMonth = useMemo(() => {
    const now = new Date()
    return tasks.filter((t) => {
      if (!t.due_date || t.status === 'done') return false
      const d = parseISO(t.due_date)
      return isSameMonth(d, currentMonth) && d < now
    }).length
  }, [tasks, currentMonth])

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Календарь
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Отслеживайте дедлайны задач
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Chip label={`Задач в этом месяце: ${totalTasksThisMonth}`} size="small" />
          {overdueThisMonth > 0 && (
            <Chip label={`Просрочено: ${overdueThisMonth}`} size="small" color="error" />
          )}
        </Stack>
      </Stack>

      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        {/* Header with month navigation */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{
            px: 3,
            py: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: alpha(theme.palette.primary.main, 0.04),
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconButton onClick={handlePrevMonth} size="small">
              <ChevronLeft />
            </IconButton>
            <Typography variant="h6" fontWeight={600} sx={{ minWidth: 200, textAlign: 'center' }}>
              {format(currentMonth, 'LLLL yyyy', { locale: ru }).replace(/^./, s => s.toUpperCase())}
            </Typography>
            <IconButton onClick={handleNextMonth} size="small">
              <ChevronRight />
            </IconButton>
          </Stack>
          <Tooltip title="Сегодня">
            <IconButton onClick={handleToday} size="small">
              <TodayIcon />
            </IconButton>
          </Tooltip>
        </Stack>

        {/* Week day headers */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          {weekDays.map((day) => (
            <Box
              key={day}
              sx={{
                py: 1,
                textAlign: 'center',
                bgcolor: alpha(theme.palette.text.primary, 0.02),
              }}
            >
              <Typography variant="caption" fontWeight={600} color="text.secondary">
                {day}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Calendar grid */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
          }}
        >
          {calendarDays.map((day, index) => {
            const dateKey = format(day, 'yyyy-MM-dd')
            const dayTasks = tasksByDate[dateKey] || []
            const isCurrentMonth = isSameMonth(day, currentMonth)
            const isTodayDate = isToday(day)
            const hasOverdue = dayTasks.some(
              (t) => t.status !== 'done' && parseISO(t.due_date!) < new Date()
            )

            return (
              <Box
                key={index}
                onClick={() => handleDateClick(day)}
                sx={{
                  minHeight: 100,
                  p: 0.75,
                  borderRight: (index + 1) % 7 !== 0 ? '1px solid' : 'none',
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  cursor: dayTasks.length > 0 ? 'pointer' : 'default',
                  bgcolor: isTodayDate
                    ? alpha(theme.palette.primary.main, 0.06)
                    : !isCurrentMonth
                    ? alpha(theme.palette.text.primary, 0.02)
                    : 'transparent',
                  transition: 'background-color 0.15s',
                  '&:hover': dayTasks.length > 0 ? {
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                  } : {},
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: isTodayDate ? 700 : 400,
                    color: !isCurrentMonth
                      ? 'text.disabled'
                      : isTodayDate
                      ? 'primary.main'
                      : 'text.primary',
                    width: 28,
                    height: 28,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    bgcolor: isTodayDate
                      ? alpha(theme.palette.primary.main, 0.15)
                      : 'transparent',
                    mb: 0.5,
                  }}
                >
                  {format(day, 'd')}
                </Typography>

                <Stack spacing={0.25}>
                  {dayTasks.slice(0, 3).map((task) => (
                    <Box
                      key={task.id}
                      sx={{
                        px: 0.5,
                        py: 0.15,
                        borderRadius: 0.5,
                        bgcolor: alpha(
                          priorityColors[task.priority] || priorityColors.low,
                          0.15
                        ),
                        borderLeft: '2px solid',
                        borderColor: priorityColors[task.priority] || priorityColors.low,
                        overflow: 'hidden',
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: '0.6rem',
                          lineHeight: 1.3,
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          textDecoration: task.status === 'done' ? 'line-through' : 'none',
                          color: task.status === 'done' ? 'text.disabled' : 'text.primary',
                        }}
                      >
                        {task.title}
                      </Typography>
                    </Box>
                  ))}
                  {dayTasks.length > 3 && (
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem', pl: 0.5 }}>
                      +{dayTasks.length - 3} ещё
                    </Typography>
                  )}
                </Stack>
              </Box>
            )
          })}
        </Box>
      </Paper>

      {/* Day tasks dialog */}
      <Dialog
        open={!!selectedDate}
        onClose={() => setSelectedDate(null)}
        maxWidth="sm"
        fullWidth
      >
        {selectedDate && (
          <>
            <DialogTitle>
              Задачи на {format(selectedDate, 'd MMMM yyyy', { locale: ru })}
            </DialogTitle>
            <DialogContent>
              <List disablePadding>
                {(tasksByDate[format(selectedDate, 'yyyy-MM-dd')] || []).map((task) => (
                  <ListItem key={task.id} disablePadding>
                    <ListItemButton onClick={() => handleTaskClick(task)} sx={{ borderRadius: 1 }}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        {statusIcons[task.status] || statusIcons.todo}
                      </ListItemIcon>
                      <ListItemText
                        primary={task.title}
                        secondary={task.description}
                        primaryTypographyProps={{
                          fontWeight: 500,
                          sx: { textDecoration: task.status === 'done' ? 'line-through' : 'none' },
                        }}
                      />
                      <Chip
                        size="small"
                        icon={<FlagIcon />}
                        label={task.priority === 'urgent' ? 'Срочный' : task.priority === 'high' ? 'Высокий' : task.priority === 'medium' ? 'Средний' : 'Низкий'}
                        sx={{
                          bgcolor: alpha(priorityColors[task.priority] || priorityColors.low, 0.15),
                          '& .MuiChip-icon': { color: priorityColors[task.priority] || priorityColors.low },
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </DialogContent>
          </>
        )}
      </Dialog>

      {/* Task detail dialog */}
      <TaskDetailDialog
        open={taskDialogOpen}
        onClose={() => setTaskDialogOpen(false)}
        task={selectedTask}
        mode="view"
      />
    </Container>
  )
}
