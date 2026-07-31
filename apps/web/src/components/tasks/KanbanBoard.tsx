import { useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  alpha,
  Paper,
  LinearProgress,
  Avatar,
  Divider,
} from '@mui/material'
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
  Flag as FlagIcon,
  CalendarToday as CalendarIcon,
  AccessTime as TimeIcon,
  OpenInNew as OpenIcon,
} from '@mui/icons-material'
import { useDroppable } from '@dnd-kit/core'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import type { Task } from '@/lib/types'

const MotionPaper = motion(Paper)

interface KanbanColumn {
  id: string
  title: string
  color: string
  bgColor: string
}

const columns: KanbanColumn[] = [
  { id: 'todo', title: 'К выполнению', color: '#B39DDB', bgColor: 'rgba(179,157,219,0.08)' },
  { id: 'in_progress', title: 'В работе', color: '#64B5F6', bgColor: 'rgba(100,181,246,0.08)' },
  { id: 'done', title: 'Готово', color: '#81C784', bgColor: 'rgba(129,199,132,0.08)' },
]

const priorityConfig: Record<string, { color: 'default' | 'info' | 'warning' | 'error'; label: string }> = {
  low: { color: 'default', label: 'Низкий' },
  medium: { color: 'info', label: 'Средний' },
  high: { color: 'warning', label: 'Высокий' },
  urgent: { color: 'error', label: 'Срочный' },
}

interface KanbanCardProps {
  task: Task
  onOpen?: (task: Task) => void
  onEdit?: (task: Task) => void
  onDelete?: (task: Task) => void
}

function formatDate(date?: string | null) {
  if (!date) return null
  return format(new Date(date), 'd MMM', { locale: ru })
}

function resolveColumnId(overId: string, tasks: Task[]) {
  if (columns.some((column) => column.id === overId)) return overId
  const overTask = tasks.find((task) => task.id === overId)
  return overTask?.status ?? null
}

function KanbanCard({ task, onOpen, onEdit, onDelete }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.42 : 1,
  }

  const priority = priorityConfig[task.priority] || priorityConfig.low
  const labels = task.labels?.slice(0, 2) ?? []
  const overdue = !!task.due_date && new Date(task.due_date).getTime() < Date.now() && task.status !== 'done'

  return (
    <Card
      ref={setNodeRef}
      style={style}
      sx={{
        mb: 1.5,
        cursor: isDragging ? 'grabbing' : 'grab',
        borderRadius: 3,
        border: '1px solid',
        borderColor: isDragging ? 'primary.main' : overdue ? 'error.light' : 'divider',
        boxShadow: isDragging ? 5 : 1,
        transition: 'box-shadow 0.2s, border-color 0.2s, transform 0.2s',
        backgroundImage: overdue
          ? 'linear-gradient(180deg, rgba(244,67,54,0.04) 0%, rgba(244,67,54,0) 100%)'
          : 'none',
        '&:hover': {
          boxShadow: 4,
          borderColor: 'primary.main',
          transform: 'translateY(-1px)',
        },
      }}
    >
      <CardContent sx={{ p: 1.6, '&:last-child': { pb: 1.6 } }}>
        <Stack direction="row" alignItems="flex-start" spacing={0.75}>
          <Box
            {...attributes}
            {...listeners}
            sx={{ color: 'text.disabled', cursor: 'grab', mt: 0.2, flexShrink: 0 }}
          >
            <DragIcon fontSize="small" />
          </Box>

          <Box flex={1} minWidth={0}>
            <Typography
              variant="body2"
              fontWeight={700}
              sx={{
                mb: 0.75,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {task.title}
            </Typography>

            {task.description && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  mb: 1,
                }}
              >
                {task.description}
              </Typography>
            )}

            <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5} mb={labels.length ? 1 : 0.5}>
              <Chip size="small" label={priority.label} color={priority.color} icon={<FlagIcon />} sx={{ height: 22 }} />
              {task.due_date && (
                <Chip
                  size="small"
                  color={overdue ? 'error' : 'default'}
                  icon={<CalendarIcon />}
                  label={formatDate(task.due_date)}
                  sx={{ height: 22 }}
                />
              )}
              {task.start_date && (
                <Chip size="small" variant="outlined" icon={<TimeIcon />} label={`Старт ${formatDate(task.start_date)}`} sx={{ height: 22 }} />
              )}
            </Stack>

            {labels.length > 0 && (
              <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5} mb={1}>
                {labels.map((label: any) => (
                  <Chip
                    key={label.id ?? label.name}
                    size="small"
                    label={label.name}
                    sx={{
                      height: 20,
                      bgcolor: label.color ? `${label.color}20` : 'action.hover',
                      color: label.color || 'text.primary',
                    }}
                  />
                ))}
              </Stack>
            )}

            <Divider sx={{ my: 1 }} />

            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Stack direction="row" spacing={1} alignItems="center">
                <Avatar sx={{ width: 24, height: 24, fontSize: 11, bgcolor: 'primary.main' }}>
                  {(task.assignee?.full_name || task.assignee?.username || 'U').charAt(0).toUpperCase()}
                </Avatar>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {task.assignee?.full_name || task.assignee?.username || 'Без исполнителя'}
                </Typography>
              </Stack>

              <Stack direction="row" spacing={0}>
                {onOpen && <Tooltip title="Открыть"><IconButton size="small" aria-label={`Открыть задачу ${task.title}`} onClick={(e) => { e.stopPropagation(); onOpen(task) }} sx={{ p: 0.4 }}><OpenIcon fontSize="small" /></IconButton></Tooltip>}
                {onEdit && (
                  <Tooltip title="Редактировать">
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); onEdit(task) }} sx={{ p: 0.4 }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                {onDelete && (
                  <Tooltip title="Удалить">
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDelete(task) }} sx={{ p: 0.4, color: 'error.main' }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>
            </Stack>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  )
}

interface KanbanColumnProps {
  column: KanbanColumn
  tasks: Task[]
  isPreviewTarget: boolean
  onOpen?: (task: Task) => void
  onEdit?: (task: Task) => void
  onDelete?: (task: Task) => void
}

function KanbanColumnComponent({ column, tasks, isPreviewTarget, onOpen, onEdit, onDelete }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })
  const completedRatio = column.id === 'done' && tasks.length > 0 ? 100 : column.id === 'in_progress' ? 60 : 20

  return (
    <Box sx={{ flex: 1, minWidth: 290, maxWidth: 390, display: 'flex', flexDirection: 'column' }}>
      <MotionPaper
        ref={setNodeRef}
        elevation={0}
        sx={{
          p: 2,
          height: '100%',
          minHeight: 460,
          backgroundColor: isOver || isPreviewTarget ? alpha(column.color, 0.16) : column.bgColor,
          border: '1px solid',
          borderColor: isOver || isPreviewTarget ? column.color : 'divider',
          borderRadius: 4,
          transition: 'background-color 0.2s, border-color 0.2s, transform 0.2s',
          display: 'flex',
          flexDirection: 'column',
          backdropFilter: 'blur(10px)',
        }}
        animate={{ scale: isOver || isPreviewTarget ? 1.01 : 1 }}
        transition={{ duration: 0.15 }}
      >
        <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: column.color, flexShrink: 0 }} />
          <Typography variant="subtitle1" fontWeight={700}>{column.title}</Typography>
          <Chip label={tasks.length} size="small" sx={{ ml: 'auto', backgroundColor: alpha(column.color, 0.2), color: column.color, fontWeight: 800, height: 22 }} />
        </Stack>

        <LinearProgress
          variant="determinate"
          value={completedRatio}
          sx={{
            mb: 2,
            height: 6,
            borderRadius: 999,
            bgcolor: alpha(column.color, 0.12),
            '& .MuiLinearProgress-bar': { bgcolor: column.color },
          }}
        />

        <Box flex={1} sx={{ overflowY: 'auto', pr: 0.5 }}>
          <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <AnimatePresence>
              {tasks.map((task) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                  <KanbanCard task={task} onOpen={onOpen} onEdit={onEdit} onDelete={onDelete} />
                </motion.div>
              ))}
            </AnimatePresence>
            {tasks.length === 0 && (
              <Box
                sx={{
                  textAlign: 'center',
                  py: 5,
                  color: 'text.disabled',
                  border: '2px dashed',
                  borderColor: alpha(column.color, 0.25),
                  borderRadius: 3,
                }}
              >
                <Typography variant="body2" fontWeight={600}>Перетащите задачу сюда</Typography>
              </Box>
            )}
          </SortableContext>
        </Box>
      </MotionPaper>
    </Box>
  )
}

interface KanbanBoardProps {
  tasks: Task[]
  onStatusChange: (taskId: string, newStatus: string) => void
  onOpen?: (task: Task) => void
  onEdit?: (task: Task) => void
  onDelete?: (task: Task) => void
}

export default function KanbanBoard({ tasks, onStatusChange, onOpen, onEdit, onDelete }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [previewColumn, setPreviewColumn] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  )

  const columnTasks = useMemo(() => {
    const map: Record<string, Task[]> = { todo: [], in_progress: [], done: [] }
    tasks.forEach((t) => {
      if (map[t.status]) map[t.status].push(t)
      else map.todo.push(t)
    })
    return map
  }, [tasks])

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id)
    setActiveTask(task || null)
    setPreviewColumn(task?.status ?? null)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event
    if (!over) {
      setPreviewColumn(null)
      return
    }
    const resolved = resolveColumnId(String(over.id), tasks)
    setPreviewColumn(resolved)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)
    setPreviewColumn(null)
    if (!over) return

    const targetStatus = resolveColumnId(String(over.id), tasks)
    if (!targetStatus) return

    const draggedTask = tasks.find((t) => t.id === active.id)
    if (draggedTask && draggedTask.status !== targetStatus) {
      onStatusChange(String(active.id), targetStatus)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2, alignItems: 'flex-start' }}>
        {columns.map((column) => (
          <KanbanColumnComponent
            key={column.id}
            column={column}
            tasks={columnTasks[column.id] || []}
            isPreviewTarget={previewColumn === column.id}
            onOpen={onOpen}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </Box>

      <DragOverlay>
        {activeTask ? (
          <Card sx={{ opacity: 0.96, boxShadow: 10, borderRadius: 3, border: '2px solid', borderColor: 'primary.main', minWidth: 260 }}>
            <CardContent sx={{ p: 1.6, '&:last-child': { pb: 1.6 } }}>
              <Typography variant="body2" fontWeight={700}>{activeTask.title}</Typography>
              {activeTask.description && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  {activeTask.description}
                </Typography>
              )}
            </CardContent>
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
