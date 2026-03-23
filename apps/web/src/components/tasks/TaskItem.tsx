import {
  Card,
  CardActionArea,
  CardContent,
  Typography,
  Chip,
  Box,
  IconButton,
  Stack,
} from '@mui/material'
import {
  CheckCircle as CheckIcon,
  RadioButtonUnchecked as UncheckedIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material'
import type { Task } from '@/lib/types'
import { useTaskStore } from '@/lib/store/taskStore'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

const priorityConfig: Record<string, { color: 'default' | 'info' | 'warning' | 'error'; label: string }> = {
  low: { color: 'default', label: 'Низкий' },
  medium: { color: 'info', label: 'Средний' },
  high: { color: 'warning', label: 'Высокий' },
  urgent: { color: 'error', label: 'Срочный' },
}

export default function TaskItem({ task }: { task: Task }) {
  const updateTask = useTaskStore((s) => s.updateTask)
  const selectTask = useTaskStore((s) => s.selectTask)
  const isDone = task.status === 'done'

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    updateTask(task.id, { status: isDone ? 'todo' : 'done' })
  }

  const priority = priorityConfig[task.priority] || priorityConfig.low

  return (
    <Card
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        opacity: isDone ? 0.6 : 1,
        transition: 'all 0.2s',
        '&:hover': { borderColor: 'primary.main', transform: 'translateY(-1px)' },
      }}
      elevation={0}
    >
      <CardActionArea onClick={() => selectTask(task)} sx={{ p: 0 }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <IconButton onClick={toggle} size="small" sx={{ color: isDone ? 'success.main' : 'text.secondary' }}>
            {isDone ? <CheckIcon /> : <UncheckedIcon />}
          </IconButton>

          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography
              variant="body1"
              sx={{
                fontWeight: 500,
                textDecoration: isDone ? 'line-through' : 'none',
                color: isDone ? 'text.secondary' : 'text.primary',
              }}
            >
              {task.title}
            </Typography>
            {task.description && (
              <Typography variant="body2" color="text.secondary" noWrap>
                {task.description}
              </Typography>
            )}
          </Box>

          <Stack direction="row" spacing={1} alignItems="center">
            <Chip label={priority.label} color={priority.color} size="small" variant="outlined" />
            {task.due_date && (
              <Chip
                icon={<CalendarIcon sx={{ fontSize: 14 }} />}
                label={format(new Date(task.due_date), 'd MMM', { locale: ru })}
                size="small"
                variant="outlined"
                sx={{ color: 'text.secondary' }}
              />
            )}
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  )
}
