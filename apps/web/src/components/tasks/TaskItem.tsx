import { motion } from 'framer-motion'
import {
  Card, CardActionArea, CardContent, Typography, Chip, Box,
  IconButton, Stack, Tooltip, alpha,
} from '@mui/material'
import {
  CheckCircle as CheckIcon,
  RadioButtonUnchecked as UncheckedIcon,
  CalendarToday as CalendarIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Flag as FlagIcon,
} from '@mui/icons-material'
import type { Task } from '@/lib/types'
import { useTaskStore } from '@/lib/store/taskStore'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

const MotionCard = motion(Card)

const priorityConfig: Record<string, { color: 'default' | 'info' | 'warning' | 'error'; label: string; accent: string }> = {
  low: { color: 'default', label: 'Низкий', accent: '#81C784' },
  medium: { color: 'info', label: 'Средний', accent: '#4FC3F7' },
  high: { color: 'warning', label: 'Высокий', accent: '#FFB74D' },
  urgent: { color: 'error', label: 'Срочный', accent: '#EF5350' },
}

const statusConfig: Record<string, { label: string; color: string }> = {
  todo: { label: 'К выполнению', color: '#CAC4D0' },
  in_progress: { label: 'В работе', color: '#D0BCFF' },
  done: { label: 'Готово', color: '#81C784' },
}

interface Props {
  task: Task
  onEdit?: (task: Task) => void
  onDelete?: (task: Task) => void
}

export default function TaskItem({ task, onEdit, onDelete }: Props) {
  const updateTask = useTaskStore((s) => s.updateTask)
  const selectTask = useTaskStore((s) => s.selectTask)
  const isDone = task.status === 'done'

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    updateTask(task.id, { status: isDone ? 'todo' : 'done' })
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit?.(task)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete?.(task)
  }

  const priority = priorityConfig[task.priority] || priorityConfig.low
  const status = statusConfig[task.status] || statusConfig.todo

  return (
    <MotionCard
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      elevation={0}
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
        overflow: 'hidden',
        position: 'relative',
        opacity: isDone ? 0.7 : 1,
        '&::before': {
          content: '""',
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          bgcolor: priority.accent,
          borderRadius: '4px 0 0 4px',
        },
        '&:hover': {
          borderColor: (t: any) => alpha(t.palette.primary.main, 0.3),
          boxShadow: '0px 2px 6px 2px rgba(0,0,0,0.08)',
        },
        transition: 'all 0.2s ease',
      }}
    >
      <CardActionArea onClick={() => selectTask(task)} sx={{ p: 0 }}>
        <CardContent sx={{ p: 2, pl: 3, '&:last-child': { pb: 2 } }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
            <IconButton size="small" onClick={toggle} sx={{ mt: -0.25, color: isDone ? 'success.main' : 'text.disabled' }}>
              {isDone ? <CheckIcon /> : <UncheckedIcon />}
            </IconButton>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="body1"
                fontWeight={500}
                sx={{
                  textDecoration: isDone ? 'line-through' : 'none',
                  color: isDone ? 'text.disabled' : 'text.primary',
                }}
              >
                {task.title}
              </Typography>

              {task.description && (
                <Typography variant="body2" color="text.secondary" noWrap sx={{ mt: 0.5 }}>
                  {task.description}
                </Typography>
              )}

              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
                <Chip
                  label={priority.label}
                  size="small"
                  color={priority.color}
                  variant="outlined"
                  icon={<FlagIcon sx={{ fontSize: 14 }} />}
                  sx={{ height: 24, fontSize: '0.7rem' }}
                />
                <Chip
                  label={status.label}
                  size="small"
                  sx={{
                    height: 24,
                    fontSize: '0.7rem',
                    bgcolor: (t: any) => alpha(status.color, 0.15),
                    color: status.color,
                    border: 'none',
                  }}
                />
                {task.due_date && (
                  <Chip
                    icon={<CalendarIcon sx={{ fontSize: 14 }} />}
                    label={format(new Date(task.due_date), 'd MMM', { locale: ru })}
                    size="small"
                    variant="outlined"
                    sx={{ height: 24, fontSize: '0.7rem', color: 'text.secondary' }}
                  />
                )}
              </Stack>
            </Box>

            <Stack direction="row" spacing={0.5} sx={{ opacity: 0, '.MuiCard-root:hover &': { opacity: 1 }, transition: 'opacity 0.2s' }}>
              <Tooltip title="Редактировать">
                <IconButton size="small" onClick={handleEdit}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Удалить">
                <IconButton size="small" onClick={handleDelete} sx={{ color: 'error.main' }}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>
        </CardContent>
      </CardActionArea>
    </MotionCard>
  )
}
