import { useState, useMemo, useCallback } from 'react'
import {
  Container, Typography, Box, Stack, IconButton, Paper,
  Chip, Tooltip, alpha, useTheme, Dialog, DialogTitle,
  DialogContent, DialogActions, Button, List, ListItem,
  ListItemButton, ListItemText, ListItemIcon, ToggleButtonGroup,
  ToggleButton, Alert, LinearProgress,
} from '@mui/material'
import {
  ChevronLeft, ChevronRight,
  Today as TodayIcon,
  CalendarViewMonth as MonthIcon,
  CalendarViewWeek as WeekIcon,
  CalendarViewDay as DayIcon,
  Timeline as GanttIcon,
  Add as AddIcon,
  Warning as WarningIcon,
  CheckCircleOutline, RadioButtonUnchecked, Circle as CircleIcon,
  Flag as FlagIcon,
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'
import {
  startOfMonth, endOfMonth,
  startOfWeek, endOfWeek,
  addDays, addWeeks, subWeeks,
  addMonths, subMonths,
  format, isSameMonth, isToday, isPast,
  parseISO, differenceInCalendarDays,
} from 'date-fns'
import { ru } from 'date-fns/locale'
import { useTasks } from '@/lib/hooks/useTasks'
import { useProjects } from '@/lib/hooks/useProjects'
import { useUIStore } from '@/store/uiStore'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/lib/store/authStore'
import { matchesTaskPreset } from '@/features/tasks/taskPresetFilters'
import TaskDetailDialog from '@/components/tasks/TaskDetailDialog'
import type { Task, Project } from '@/lib/types'

type ViewMode = 'month' | 'week' | 'day' | 'gantt'

const PRIORITY_COLOR: Record<string, string> = {
  urgent: '#EF5350',
  high: '#FFA726',
  medium: '#42A5F5',
  low: '#81C784',
}

const PRIORITY_LABEL: Record<string, string> = {
  urgent: 'Срочный',
  high: 'Высокий',
  medium: 'Средний',
  low: 'Низкий',
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  todo: <RadioButtonUnchecked fontSize="small" sx={{ color: '#CAC4D0' }} />,
  in_progress: <CircleIcon fontSize="small" sx={{ color: '#D0BCFF' }} />,
  done: <CheckCircleOutline fontSize="small" sx={{ color: '#81C784' }} />,
}

const DAY_HOURS = Array.from({ length: 15 }, (_, i) => i + 7) // 07:00 – 21:00

// ─── Task pill used inside day cells ─────────────────────────────────────────
function TaskPill({ task, onClick }: { task: Task; onClick: () => void }) {
  const color = PRIORITY_COLOR[task.priority] || PRIORITY_COLOR.low
  const done = task.status === 'done'
  return (
    <Box
      onClick={(e) => { e.stopPropagation(); onClick() }}
      sx={{
        px: 0.5, py: 0.15, borderRadius: 0.5, cursor: 'pointer',
        bgcolor: alpha(color, done ? 0.06 : 0.15),
        borderLeft: '2px solid', borderColor: done ? alpha(color, 0.3) : color,
        overflow: 'hidden',
        '&:hover': { bgcolor: alpha(color, 0.25) },
      }}
    >
      <Typography
        variant="caption"
        sx={{
          fontSize: '0.62rem', lineHeight: 1.4, display: 'block',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          textDecoration: done ? 'line-through' : 'none',
          color: done ? 'text.disabled' : 'text.primary',
        }}
      >
        {task.title}
      </Typography>
    </Box>
  )
}

// ─── Overdue rail ─────────────────────────────────────────────────────────────
function OverdueRail({ tasks, onTaskClick }: { tasks: Task[]; onTaskClick: (t: Task) => void }) {
  if (!tasks.length) return null
  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid', borderColor: alpha('#EF5350', 0.4),
        borderRadius: 2, p: 1.5, mb: 2,
        bgcolor: alpha('#EF5350', 0.04),
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <WarningIcon sx={{ color: '#EF5350', fontSize: 18 }} />
        <Typography variant="caption" fontWeight={700} color="error">
          Просрочено — {tasks.length} задач
        </Typography>
      </Stack>
      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
        {tasks.slice(0, 8).map((t) => (
          <Chip
            key={t.id}
            label={t.title}
            size="small"
            onClick={() => onTaskClick(t)}
            sx={{
              maxWidth: 180, fontSize: '0.7rem',
              bgcolor: alpha('#EF5350', 0.1),
              '&:hover': { bgcolor: alpha('#EF5350', 0.2) },
            }}
          />
        ))}
        {tasks.length > 8 && (
          <Typography variant="caption" color="error" sx={{ alignSelf: 'center' }}>
            +{tasks.length - 8} ещё
          </Typography>
        )}
      </Stack>
    </Paper>
  )
}

// ─── Month view ───────────────────────────────────────────────────────────────
function MonthView({
  currentDate,
  tasksByDate,
  onDateClick,
  onTaskClick,
}: {
  currentDate: Date
  tasksByDate: Record<string, Task[]>
  onDateClick: (d: Date) => void
  onTaskClick: (t: Task) => void
}) {
  const theme = useTheme()
  const calDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 })
    const days: Date[] = []
    let d = start
    while (d <= end) { days.push(d); d = addDays(d, 1) }
    return days
  }, [currentDate])

  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

  return (
    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
      {/* Weekday headers */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '1px solid', borderColor: 'divider' }}>
        {weekDays.map((d) => (
          <Box key={d} sx={{ py: 1, textAlign: 'center', bgcolor: alpha(theme.palette.text.primary, 0.02) }}>
            <Typography variant="caption" fontWeight={600} color="text.secondary">{d}</Typography>
          </Box>
        ))}
      </Box>
      {/* Day grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
        {calDays.map((day, idx) => {
          const key = format(day, 'yyyy-MM-dd')
          const dayTasks = tasksByDate[key] || []
          const inMonth = isSameMonth(day, currentDate)
          const isNow = isToday(day)
          return (
            <Box
              key={idx}
              onClick={() => onDateClick(day)}
              sx={{
                minHeight: { xs: 70, sm: 90, md: 110 },
                p: 0.75, cursor: 'pointer',
                borderRight: (idx + 1) % 7 !== 0 ? '1px solid' : 'none',
                borderBottom: '1px solid', borderColor: 'divider',
                bgcolor: isNow
                  ? alpha(theme.palette.primary.main, 0.06)
                  : !inMonth ? alpha(theme.palette.text.primary, 0.02) : 'transparent',
                transition: 'background-color 0.15s',
                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.06) },
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontWeight: isNow ? 700 : 400,
                  color: !inMonth ? 'text.disabled' : isNow ? 'primary.main' : 'text.primary',
                  width: 26, height: 26, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  borderRadius: '50%',
                  bgcolor: isNow ? alpha(theme.palette.primary.main, 0.15) : 'transparent',
                  mb: 0.5,
                }}
              >
                {format(day, 'd')}
              </Typography>
              <Stack spacing={0.25}>
                {dayTasks.slice(0, 3).map((t) => (
                  <TaskPill key={t.id} task={t} onClick={() => onTaskClick(t)} />
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
  )
}

// ─── Week view ────────────────────────────────────────────────────────────────
function WeekView({
  currentDate,
  tasksByDate,
  onTaskClick,
  onDateClick,
}: {
  currentDate: Date
  tasksByDate: Record<string, Task[]>
  onTaskClick: (t: Task) => void
  onDateClick: (d: Date) => void
}) {
  const theme = useTheme()
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  return (
    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
      {/* Column headers */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '48px repeat(7,1fr)', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ py: 1 }} />
        {days.map((d) => (
          <Box
            key={d.toISOString()}
            onClick={() => onDateClick(d)}
            sx={{
              py: 1, textAlign: 'center', cursor: 'pointer',
              bgcolor: isToday(d) ? alpha(theme.palette.primary.main, 0.06) : 'transparent',
              '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) },
            }}
          >
            <Typography variant="caption" color="text.secondary">
              {format(d, 'EEE', { locale: ru }).toUpperCase()}
            </Typography>
            <Typography
              variant="h6"
              sx={{
                fontWeight: isToday(d) ? 800 : 500,
                color: isToday(d) ? 'primary.main' : 'text.primary',
                lineHeight: 1.2,
              }}
            >
              {format(d, 'd')}
            </Typography>
          </Box>
        ))}
      </Box>
      {/* Hour rows */}
      <Box sx={{ maxHeight: 500, overflowY: 'auto' }}>
        {DAY_HOURS.map((h) => (
          <Box
            key={h}
            sx={{ display: 'grid', gridTemplateColumns: '48px repeat(7,1fr)', borderBottom: '1px solid', borderColor: 'divider' }}
          >
            <Box sx={{ py: 0.5, px: 1, borderRight: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" color="text.disabled">{String(h).padStart(2, '0')}:00</Typography>
            </Box>
            {days.map((d) => {
              const key = format(d, 'yyyy-MM-dd')
              const slotTasks = (tasksByDate[key] || []).filter((t) => {
                const src = t.start_date || t.due_date
                if (!src) return false
                const taskHour = parseISO(src).getHours()
                return taskHour === h
              })
              return (
                <Box
                  key={d.toISOString()}
                  sx={{
                    minHeight: 40, p: 0.25,
                    borderRight: '1px solid', borderColor: 'divider',
                    bgcolor: isToday(d) ? alpha(theme.palette.primary.main, 0.03) : 'transparent',
                  }}
                >
                  {slotTasks.map((t) => (
                    <TaskPill key={t.id} task={t} onClick={() => onTaskClick(t)} />
                  ))}
                </Box>
              )
            })}
          </Box>
        ))}
      </Box>
    </Paper>
  )
}

// ─── Day view ─────────────────────────────────────────────────────────────────
function DayView({
  currentDate,
  tasksByDate,
  onTaskClick,
}: {
  currentDate: Date
  tasksByDate: Record<string, Task[]>
  onTaskClick: (t: Task) => void
}) {
  const theme = useTheme()
  const key = format(currentDate, 'yyyy-MM-dd')
  const dayTasks = tasksByDate[key] || []

  return (
    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
        <Typography variant="h6" fontWeight={700}>
          {format(currentDate, 'EEEE, d MMMM', { locale: ru }).replace(/^./, s => s.toUpperCase())}
        </Typography>
      </Box>
      <Box sx={{ maxHeight: 520, overflowY: 'auto' }}>
        {DAY_HOURS.map((h) => {
          const slotTasks = dayTasks.filter((t) => {
            const src = t.start_date || t.due_date
            if (!src) return h === 9 // tasks with only a date land at 09:00
            const taskHour = parseISO(src).getHours()
            return taskHour === h || (!parseISO(src).getHours() && h === 9)
          })
          return (
            <Box
              key={h}
              sx={{ display: 'flex', borderBottom: '1px solid', borderColor: 'divider', minHeight: 52 }}
            >
              <Box sx={{ width: 52, flexShrink: 0, px: 1, py: 0.75, borderRight: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" color="text.disabled">{String(h).padStart(2, '0')}:00</Typography>
              </Box>
              <Box sx={{ flex: 1, p: 0.5 }}>
                <Stack spacing={0.5}>
                  {slotTasks.map((t) => (
                    <Box
                      key={t.id}
                      onClick={() => onTaskClick(t)}
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 1,
                        px: 1.5, py: 0.75, borderRadius: 2, cursor: 'pointer',
                        bgcolor: alpha(PRIORITY_COLOR[t.priority] || PRIORITY_COLOR.low, 0.1),
                        borderLeft: '3px solid',
                        borderColor: PRIORITY_COLOR[t.priority] || PRIORITY_COLOR.low,
                        '&:hover': { bgcolor: alpha(PRIORITY_COLOR[t.priority] || PRIORITY_COLOR.low, 0.2) },
                      }}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight={500}
                          sx={{ textDecoration: t.status === 'done' ? 'line-through' : 'none' }}>
                          {t.title}
                        </Typography>
                        {t.description && (
                          <Typography variant="caption" color="text.secondary" noWrap>{t.description}</Typography>
                        )}
                      </Box>
                      <Chip
                        size="small"
                        label={PRIORITY_LABEL[t.priority] || 'Низкий'}
                        sx={{
                          height: 18, fontSize: '0.65rem',
                          bgcolor: alpha(PRIORITY_COLOR[t.priority] || PRIORITY_COLOR.low, 0.15),
                          color: PRIORITY_COLOR[t.priority] || PRIORITY_COLOR.low,
                        }}
                      />
                    </Box>
                  ))}
                </Stack>
              </Box>
            </Box>
          )
        })}
      </Box>
    </Paper>
  )
}

// ─── Gantt Lite view ─────────────────────────────────────────────────────────
function GanttLiteView({
  projects,
  tasks,
  currentDate,
  onTaskClick,
}: {
  projects: Project[]
  tasks: Task[]
  currentDate: Date
  onTaskClick: (t: Task) => void
}) {
  const theme = useTheme()
  // Show 5 weeks starting from start of current week
  const ganttStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const totalDays = 35 // 5 weeks
  const DAY_PX = 32

  const days = Array.from({ length: totalDays }, (_, i) => addDays(ganttStart, i))
  const weeks = Array.from({ length: 5 }, (_, i) => addDays(ganttStart, i * 7))

  // Tasks without a project go into a virtual "Без проекта" group
  const projectGroups = useMemo(() => {
    const groups: Array<{ project: Project | null; tasks: Task[] }> = []
    projects.forEach((p) => {
      const pt = tasks.filter(
        (t) => t.project_id === p.id && (t.due_date || t.start_date) && t.status !== 'archived'
      )
      if (pt.length) groups.push({ project: p, tasks: pt })
    })
    const noProject = tasks.filter(
      (t) => !t.project_id && (t.due_date || t.start_date) && t.status !== 'archived'
    )
    if (noProject.length) groups.push({ project: null, tasks: noProject })
    return groups
  }, [projects, tasks])

  const getBar = (task: Task) => {
    const start = task.start_date ? parseISO(task.start_date) : task.due_date ? parseISO(task.due_date) : null
    const end = task.due_date ? parseISO(task.due_date) : start
    if (!start || !end) return null
    const offsetDays = differenceInCalendarDays(start, ganttStart)
    const durationDays = Math.max(1, differenceInCalendarDays(end, start) + 1)
    if (offsetDays + durationDays < 0 || offsetDays > totalDays) return null
    return {
      left: Math.max(0, offsetDays) * DAY_PX,
      width: Math.min(durationDays, totalDays - Math.max(0, offsetDays)) * DAY_PX - 2,
      clipped: offsetDays < 0,
    }
  }

  const ROW_H = 36
  const LABEL_W = 180

  return (
    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
      <Box sx={{ overflowX: 'auto' }}>
        {/* Week headers */}
        <Box sx={{ display: 'flex', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ width: LABEL_W, flexShrink: 0, borderRight: '1px solid', borderColor: 'divider' }} />
          {weeks.map((w) => (
            <Box
              key={w.toISOString()}
              sx={{ width: DAY_PX * 7, flexShrink: 0, py: 0.75, textAlign: 'center',
                borderRight: '1px solid', borderColor: 'divider' }}
            >
              <Typography variant="caption" fontWeight={600} color="text.secondary">
                {format(w, 'd MMM', { locale: ru })}
              </Typography>
            </Box>
          ))}
        </Box>
        {/* Day headers */}
        <Box sx={{ display: 'flex', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ width: LABEL_W, flexShrink: 0, borderRight: '1px solid', borderColor: 'divider' }} />
          {days.map((d, i) => (
            <Box
              key={i}
              sx={{
                width: DAY_PX, flexShrink: 0, py: 0.5, textAlign: 'center',
                bgcolor: isToday(d) ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                borderRight: (i + 1) % 7 === 0 ? '1px solid' : 'none',
                borderColor: 'divider',
              }}
            >
              <Typography
                variant="caption"
                sx={{ fontSize: '0.6rem', color: isToday(d) ? 'primary.main' : 'text.disabled' }}
              >
                {format(d, 'd')}
              </Typography>
            </Box>
          ))}
        </Box>
        {/* Project rows */}
        {projectGroups.map(({ project, tasks: pt }, gi) => (
          <Box key={gi}>
            {/* Project header row */}
            <Box
              sx={{
                display: 'flex', height: ROW_H,
                borderBottom: '1px solid', borderColor: 'divider',
                bgcolor: alpha(theme.palette.text.primary, 0.02),
              }}
            >
              <Box
                sx={{
                  width: LABEL_W, flexShrink: 0, px: 1.5,
                  display: 'flex', alignItems: 'center', gap: 1,
                  borderRight: '1px solid', borderColor: 'divider',
                }}
              >
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  bgcolor: project?.color || theme.palette.primary.main }} />
                <Typography variant="caption" fontWeight={700} noWrap>
                  {project?.name || 'Без проекта'}
                </Typography>
              </Box>
              <Box sx={{ flex: 1, position: 'relative' }}>
                {/* Today line */}
                {(() => {
                  const todayOffset = differenceInCalendarDays(new Date(), ganttStart)
                  if (todayOffset >= 0 && todayOffset < totalDays) {
                    return (
                      <Box sx={{
                        position: 'absolute', top: 0, bottom: 0,
                        left: todayOffset * DAY_PX + DAY_PX / 2,
                        width: 1, bgcolor: 'primary.main', opacity: 0.4, zIndex: 1,
                      }} />
                    )
                  }
                  return null
                })()}
              </Box>
            </Box>
            {/* Task rows */}
            {pt.map((task) => {
              const bar = getBar(task)
              const color = PRIORITY_COLOR[task.priority] || PRIORITY_COLOR.low
              return (
                <Box
                  key={task.id}
                  sx={{
                    display: 'flex', height: ROW_H,
                    borderBottom: '1px solid', borderColor: 'divider',
                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) },
                  }}
                >
                  <Box
                    sx={{
                      width: LABEL_W, flexShrink: 0, px: 2,
                      display: 'flex', alignItems: 'center',
                      borderRight: '1px solid', borderColor: 'divider',
                    }}
                  >
                    <Typography
                      variant="caption"
                      noWrap
                      sx={{ color: task.status === 'done' ? 'text.disabled' : 'text.primary',
                        textDecoration: task.status === 'done' ? 'line-through' : 'none' }}
                    >
                      {task.title}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                    {/* Grid lines */}
                    {weeks.map((_, wi) => (
                      <Box
                        key={wi}
                        sx={{
                          position: 'absolute', top: 0, bottom: 0,
                          left: wi * 7 * DAY_PX,
                          width: 1, bgcolor: 'divider',
                        }}
                      />
                    ))}
                    {/* Today line */}
                    {(() => {
                      const off = differenceInCalendarDays(new Date(), ganttStart)
                      if (off >= 0 && off < totalDays) {
                        return (
                          <Box sx={{
                            position: 'absolute', top: 0, bottom: 0,
                            left: off * DAY_PX + DAY_PX / 2,
                            width: 1, bgcolor: 'primary.main', opacity: 0.4, zIndex: 1,
                          }} />
                        )
                      }
                      return null
                    })()}
                    {/* Task bar */}
                    {bar && (
                      <Tooltip title={`${task.title} — ${PRIORITY_LABEL[task.priority] || ''}`}>
                        <Box
                          onClick={() => onTaskClick(task)}
                          sx={{
                            position: 'absolute',
                            top: '50%', transform: 'translateY(-50%)',
                            left: bar.left, width: bar.width,
                            height: 22, borderRadius: 1.5,
                            bgcolor: alpha(color, task.status === 'done' ? 0.25 : 0.7),
                            border: '1px solid', borderColor: alpha(color, 0.8),
                            cursor: 'pointer', zIndex: 2,
                            display: 'flex', alignItems: 'center', px: 0.75,
                            overflow: 'hidden',
                            '&:hover': { bgcolor: alpha(color, 0.85) },
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              fontSize: '0.6rem', color: 'white', fontWeight: 600,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              textDecoration: task.status === 'done' ? 'line-through' : 'none',
                            }}
                          >
                            {task.title}
                          </Typography>
                        </Box>
                      </Tooltip>
                    )}
                  </Box>
                </Box>
              )
            })}
          </Box>
        ))}
        {projectGroups.length === 0 && (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Нет задач с датами для отображения на диаграмме
            </Typography>
          </Box>
        )}
      </Box>
    </Paper>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const theme = useTheme()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const openModal = useUIStore((s) => s.openModal)
  const currentUserId = useAuthStore((state) => state.user?.id ?? '')

  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const projectFilter = searchParams.get('project_id') ?? 'all'
  const preset = searchParams.get('preset')

  // Task detail dialog
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)

  // Create task dialog (prefilled due_date)
  const [createDialogDate, setCreateDialogDate] = useState<Date | null>(null)
  const [createMode, setCreateMode] = useState<'deadline' | 'range'>('deadline')

  // Day panel dialog (month view click on occupied date)
  const [dayPanelDate, setDayPanelDate] = useState<Date | null>(null)

  const { tasks: rawTasks, loading: tasksLoading, error: tasksError } = useTasks()
  const { projects: rawProjects, loading: projectsLoading, error: projectsError } = useProjects()

  const allTasks: Task[] = useMemo(() => Array.isArray(rawTasks) ? rawTasks : [], [rawTasks])
  const projects: Project[] = useMemo(
    () => (Array.isArray(rawProjects) ? rawProjects : []).filter((p: Project) => !p.is_archived),
    [rawProjects]
  )

  // Apply project filter (exclude tasks without due_date from calendar grid)
  const filteredTasks = useMemo(() => {
    return allTasks.filter((t) => {
      if (!t.due_date && !t.start_date) return false // no date = not on calendar
      if (projectFilter !== 'all' && t.project_id !== projectFilter) return false
      return matchesTaskPreset(t, preset, currentUserId, new Date())
    })
  }, [allTasks, projectFilter, preset, currentUserId])

  const selectProject = (projectId: string) => {
    const next = new URLSearchParams(searchParams)
    if (projectId === 'all') next.delete('project_id')
    else next.set('project_id', projectId)
    setSearchParams(next, { replace: true })
  }

  // Overdue tasks (non-done, due_date in past)
  const overdueTasks = useMemo(
    () => filteredTasks.filter((t) => t.due_date && isPast(parseISO(t.due_date)) && t.status !== 'done'),
    [filteredTasks]
  )

  // tasks indexed by due_date for month/week/day views
  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {}
    filteredTasks.forEach((t) => {
      const key = t.due_date ? format(parseISO(t.due_date), 'yyyy-MM-dd') : null
      if (key) {
        if (!map[key]) map[key] = []
        map[key].push(t)
      }
    })
    return map
  }, [filteredTasks])

  // Navigation helpers
  const goNext = () => {
    if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1))
    else if (viewMode === 'week' || viewMode === 'gantt') setCurrentDate(addWeeks(currentDate, 1))
    else setCurrentDate(addDays(currentDate, 1))
  }
  const goPrev = () => {
    if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1))
    else if (viewMode === 'week' || viewMode === 'gantt') setCurrentDate(subWeeks(currentDate, 1))
    else setCurrentDate(addDays(currentDate, -1))
  }
  const goToday = () => setCurrentDate(new Date())

  const navLabel = useMemo(() => {
    if (viewMode === 'month')
      return format(currentDate, 'LLLL yyyy', { locale: ru }).replace(/^./, (s) => s.toUpperCase())
    if (viewMode === 'week' || viewMode === 'gantt') {
      const ws = startOfWeek(currentDate, { weekStartsOn: 1 })
      const we = endOfWeek(currentDate, { weekStartsOn: 1 })
      return `${format(ws, 'd MMM', { locale: ru })} – ${format(we, 'd MMM yyyy', { locale: ru })}`
    }
    return format(currentDate, 'EEEE, d MMMM yyyy', { locale: ru }).replace(/^./, (s) => s.toUpperCase())
  }, [currentDate, viewMode])

  // Month view: click on date
  const handleDateClick = useCallback((date: Date) => {
    const key = format(date, 'yyyy-MM-dd')
    const dayTasks = tasksByDate[key] || []
    if (dayTasks.length > 0) {
      setDayPanelDate(date)
    } else {
      // Empty date → prompt create
      setCreateDialogDate(date)
    }
  }, [tasksByDate])

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task)
    setTaskDialogOpen(true)
    setDayPanelDate(null)
  }

  const handleConfirmCreate = () => {
    if (!createDialogDate) return
    const selectedDate = format(createDialogDate, 'yyyy-MM-dd')
    openModal('task.create', {
      due_date: createMode === 'range' ? format(addDays(createDialogDate, 1), 'yyyy-MM-dd') : selectedDate,
      start_date: createMode === 'range' ? selectedDate : undefined,
      project_id: projectFilter === 'all' ? undefined : projectFilter,
    })
    setCreateDialogDate(null)
    navigate('/tasks')
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Page header */}
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }}
        justifyContent="space-between" spacing={1.5} mb={2}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Календарь</Typography>
          <Typography variant="body2" color="text.secondary">
            Дедлайны, расписание и Gantt-диаграмма проектов
          </Typography>
        </Box>
        {/* View mode switcher */}
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, v) => v && setViewMode(v)}
          size="small"
        >
          <ToggleButton value="month"><Tooltip title="Месяц"><MonthIcon /></Tooltip></ToggleButton>
          <ToggleButton value="week"><Tooltip title="Неделя"><WeekIcon /></Tooltip></ToggleButton>
          <ToggleButton value="day"><Tooltip title="День"><DayIcon /></Tooltip></ToggleButton>
          <ToggleButton value="gantt"><Tooltip title="Gantt Lite"><GanttIcon /></Tooltip></ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {(tasksError || projectsError) && <Alert severity="error" sx={{ mb: 2 }}>Не удалось загрузить календарь.</Alert>}
      {(tasksLoading || projectsLoading) && <LinearProgress sx={{ mb: 2 }} />}
      {/* Project filter */}
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        <Chip
          label="Все проекты"
          size="small"
          onClick={() => selectProject('all')}
          color={projectFilter === 'all' ? 'primary' : 'default'}
        />
        {projects.map((p) => (
          <Chip
            key={p.id}
            label={p.name}
            size="small"
            onClick={() => selectProject(p.id)}
            color={projectFilter === p.id ? 'primary' : 'default'}
            sx={{
              '&.MuiChip-colorDefault': {
                borderLeft: `3px solid ${p.color || theme.palette.primary.main}`,
              },
            }}
          />
        ))}
      </Stack>

      {/* Overdue rail */}
      <OverdueRail tasks={overdueTasks} onTaskClick={handleTaskClick} />

      {/* Navigation bar */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <IconButton onClick={goPrev} size="small"><ChevronLeft /></IconButton>
        <Typography
          variant="h6" fontWeight={600}
          sx={{ minWidth: { xs: 160, md: 240 }, textAlign: 'center' }}
        >
          {navLabel}
        </Typography>
        <IconButton onClick={goNext} size="small"><ChevronRight /></IconButton>
        <Tooltip title="Сегодня">
          <IconButton onClick={goToday} size="small"><TodayIcon /></IconButton>
        </Tooltip>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="outlined"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => { navigate('/tasks'); openModal('task.create') }}
        >
          Новая задача
        </Button>
      </Stack>

      {/* View content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={viewMode}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          {viewMode === 'month' && (
            <MonthView
              currentDate={currentDate}
              tasksByDate={tasksByDate}
              onDateClick={handleDateClick}
              onTaskClick={handleTaskClick}
            />
          )}
          {viewMode === 'week' && (
            <WeekView
              currentDate={currentDate}
              tasksByDate={tasksByDate}
              onTaskClick={handleTaskClick}
              onDateClick={(d) => { setViewMode('day'); setCurrentDate(d) }}
            />
          )}
          {viewMode === 'day' && (
            <DayView
              currentDate={currentDate}
              tasksByDate={tasksByDate}
              onTaskClick={handleTaskClick}
            />
          )}
          {viewMode === 'gantt' && (
            <GanttLiteView
              projects={projects}
              tasks={filteredTasks}
              currentDate={currentDate}
              onTaskClick={handleTaskClick}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Day panel dialog (month: click occupied date) */}
      <Dialog open={!!dayPanelDate} onClose={() => setDayPanelDate(null)} maxWidth="sm" fullWidth>
        {dayPanelDate && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {format(dayPanelDate, 'd MMMM yyyy', { locale: ru }).replace(/^./, s => s.toUpperCase())}
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => { setDayPanelDate(null); setCreateDialogDate(dayPanelDate) }}
              >
                Добавить
              </Button>
            </DialogTitle>
            <DialogContent dividers>
              <List disablePadding>
                {(tasksByDate[format(dayPanelDate, 'yyyy-MM-dd')] || []).map((task) => (
                  <ListItem key={task.id} disablePadding>
                    <ListItemButton onClick={() => handleTaskClick(task)} sx={{ borderRadius: 1 }}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        {STATUS_ICON[task.status] || STATUS_ICON.todo}
                      </ListItemIcon>
                      <ListItemText
                        primary={task.title}
                        secondary={task.description}
                        primaryTypographyProps={{
                          fontWeight: 500,
                          sx: { textDecoration: task.status === 'done' ? 'line-through' : 'none' },
                        }}
                        secondaryTypographyProps={{ noWrap: true }}
                      />
                      <Chip
                        size="small"
                        icon={<FlagIcon sx={{ fontSize: '0.75rem !important' }} />}
                        label={PRIORITY_LABEL[task.priority] || 'Низкий'}
                        sx={{
                          height: 20, fontSize: '0.65rem',
                          bgcolor: alpha(PRIORITY_COLOR[task.priority] || PRIORITY_COLOR.low, 0.15),
                          '& .MuiChip-icon': { color: PRIORITY_COLOR[task.priority] || PRIORITY_COLOR.low },
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

      {/* Create task prompt (click empty date) */}
      <Dialog open={!!createDialogDate} onClose={() => setCreateDialogDate(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Добавить задачу</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {createDialogDate && format(createDialogDate, 'd MMMM yyyy', { locale: ru })}
          </Typography>
          <Stack spacing={1}>
            <Button
              fullWidth variant={createMode === 'deadline' ? 'contained' : 'outlined'}
              onClick={() => setCreateMode('deadline')}
            >
              Поставить дедлайн
            </Button>
            <Button
              fullWidth variant={createMode === 'range' ? 'contained' : 'outlined'}
              onClick={() => setCreateMode('range')}
            >
              Запланировать: начало + дедлайн
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogDate(null)}>Отмена</Button>
          <Button variant="contained" onClick={handleConfirmCreate}>Создать</Button>
        </DialogActions>
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
