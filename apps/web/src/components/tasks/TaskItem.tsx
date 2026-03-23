import {
  Card,
  CardActionArea,
  CardContent,
  Typography,
  Chip,
  Box,
  IconButton,
  Stack,
  Tooltip,
} from '@mui/material'
import {
  CheckCircle as CheckIcon,
  RadioButtonUnchecked as UncheckedIcon,
  CalendarToday as CalendarIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
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

  return (
    <Card
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        opacity: isDone ? 0.6 : 1,
        transition: 'all 0.2s',
        '&:hover': { borderColor: 'primary.main', transform: 'translateY(-1px)' },
        '&:hover .task-actions': { opacity: 1 },
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
                color: isDone ? 'text.disabled' : 'text.primary',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {task.title}
            </Typography>
            {task.description && (
              <Typography variant="body2" color="text.secondary" noWrap>
                {task.description}
              </Typography>
            )}
            <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
              <Chip label={priority.label} color={priority.color} size="small" />
              {task.due_date && (
                <Chip
                  icon={<CalendarIcon />}
                  label={format(new Date(task.due_date), 'd MMM', { locale: ru })}
                  size="small"
                  variant="outlined"
                  sx={{ color: 'text.secondary' }}
                />
              )}
            </Stack>
          </Box>

          <Stack
            direction="row"
            spacing={0.5}
            className="task-actions"
            sx={{ opacity: 0, transition: 'opacity 0.2s' }}
          >
            <Tooltip title="Редактировать">
              <IconButton size="small" onClick={handleEdit}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Удалить">
              <IconButton size="small" onClick={handleDelete} color="error">
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  )
}
