import { useState, useMemo } from 'react'
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
} from '@mui/material'
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
  Flag as FlagIcon,
  CalendarToday as CalendarIcon,
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
  { id: 'todo', title: 'К выполнению', color: '#CAC4D0', bgColor: 'rgba(202,196,208,0.08)' },
  { id: 'in_progress', title: 'В работе', color: '#D0BCFF', bgColor: 'rgba(208,188,255,0.08)' },
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
  onEdit?: (task: Task) => void
  onDelete?: (task: Task) => void
}

function KanbanCard({ task, onEdit, onDelete }: KanbanCardProps) {
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
    opacity: isDragging ? 0.4 : 1,
  }

  const priority = priorityConfig[task.priority] || priorityConfig.low

  return (
    <Card
      ref={setNodeRef}
      style={style}
      sx={{
        mb: 1.5,
        cursor: isDragging ? 'grabbing' : 'grab',
        borderRadius: 2,
        border: '1px solid',
        borderColor: isDragging ? 'primary.main' : 'divider',
        boxShadow: isDragging ? 4 : 1,
        transition: 'box-shadow 0.2s, border-color 0.2s',
        '&:hover': {
          boxShadow: 3,
          borderColor: 'primary.main',
        },
      }}
    >
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Stack direction="row" alignItems="flex-start" spacing={0.5}>
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
              fontWeight={500}
              sx={{
                mb: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {task.title}
            </Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
              <Chip
                size="small"
                label={priority.label}
                color={priority.color}
                icon={<FlagIcon />}
                sx={{ height: 20, '& .MuiChip-label': { px: 0.75, fontSize: '0.65rem' }, '& .MuiChip-icon': { fontSize: '0.75rem' } }}
              />
              {task.due_date && (
                <Chip
                  size="small"
                  icon={<CalendarIcon />}
                  label={format(new Date(task.due_date), 'd MMM', { locale: ru })}
                  sx={{ height: 20, '& .MuiChip-label': { px: 0.75, fontSize: '0.65rem' }, '& .MuiChip-icon': { fontSize: '0.75rem' } }}
                />
              )}
            </Stack>
          </Box>
          <Stack direction="row" spacing={0}>
            {onEdit && (
              <Tooltip title="Редактировать">
                <IconButton
                  size="small"
                  onClick={(e) => { e.stopPropagation(); onEdit(task) }}
                  sx={{ p: 0.25 }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {onDelete && (
              <Tooltip title="Удалить">
                <IconButton
                  size="small"
                  onClick={(e) => { e.stopPropagation(); onDelete(task) }}
                  sx={{ p: 0.25, color: 'error.main' }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}

interface KanbanColumnProps {
  column: KanbanColumn
  tasks: Task[]
  onEdit?: (task: Task) => void
  onDelete?: (task: Task) => void
}

function KanbanColumnComponent({ column, tasks, onEdit, onDelete }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 260,
        maxWidth: 360,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <MotionPaper
        ref={setNodeRef}
        elevation={0}
        sx={{
          p: 2,
          height: '100%',
          minHeight: 400,
          backgroundColor: isOver
            ? alpha(column.color, 0.15)
            : column.bgColor,
          border: '1px solid',
          borderColor: isOver ? column.color : 'divider',
          borderRadius: 3,
          transition: 'background-color 0.2s, border-color 0.2s',
          display: 'flex',
          flexDirection: 'column',
        }}
        animate={{ scale: isOver ? 1.01 : 1 }}
        transition={{ duration: 0.15 }}
      >
        <Stack direction="row" alignItems="center" spacing={1} mb={2}>
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: column.color,
              flexShrink: 0,
            }}
          />
          <Typography variant="subtitle1" fontWeight={600}>
            {column.title}
          </Typography>
          <Chip
            label={tasks.length}
            size="small"
            sx={{
              ml: 'auto',
              backgroundColor: alpha(column.color, 0.2),
              color: column.color,
              fontWeight: 700,
              height: 20,
              '& .MuiChip-label': { px: 0.75, fontSize: '0.7rem' },
            }}
          />
        </Stack>

        <Box flex={1} sx={{ overflowY: 'auto', pr: 0.5 }}>
          <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            <AnimatePresence>
              {tasks.map((task) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                  <KanbanCard
                    task={task}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
            {tasks.length === 0 && (
              <Box
                sx={{
                  textAlign: 'center',
                  py: 4,
                  color: 'text.disabled',
                  border: '2px dashed',
                  borderColor: 'divider',
                  borderRadius: 2,
                }}
              >
                <Typography variant="body2">Пусто</Typography>
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
  onEdit?: (task: Task) => void
  onDelete?: (task: Task) => void
}

export default function KanbanBoard({ tasks, onStatusChange, onEdit, onDelete }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  )

  const columnTasks = useMemo(() => {
    const map: Record<string, Task[]> = { todo: [], in_progress: [], done: [] }
    tasks.forEach(t => {
      if (map[t.status]) map[t.status].push(t)
      else map.todo.push(t)
    })
    return map
  }, [tasks])

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id)
    setActiveTask(task || null)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return
    const overId = String(over.id)
    const columnIds = columns.map(c => c.id)
    if (columnIds.includes(overId)) return
    // dragging over a task: find its column
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)
    if (!over) return

    const overId = String(over.id)
    const columnIds = columns.map(c => c.id)

    let targetStatus: string | null = null

    if (columnIds.includes(overId)) {
      targetStatus = overId
    } else {
      // dropped over another task
      const overTask = tasks.find(t => t.id === overId)
      if (overTask) targetStatus = overTask.status
    }

    if (targetStatus) {
      const draggedTask = tasks.find(t => t.id === active.id)
      if (draggedTask && draggedTask.status !== targetStatus) {
        onStatusChange(String(active.id), targetStatus)
      }
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
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          overflowX: 'auto',
          pb: 2,
          alignItems: 'flex-start',
        }}
      >
        {columns.map((column) => (
          <KanbanColumnComponent
            key={column.id}
            column={column}
            tasks={columnTasks[column.id] || []}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </Box>

      <DragOverlay>
        {activeTask ? (
          <Card
            sx={{
              opacity: 0.95,
              boxShadow: 8,
              borderRadius: 2,
              border: '2px solid',
              borderColor: 'primary.main',
              minWidth: 240,
            }}
          >
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="body2" fontWeight={500}>
                {activeTask.title}
              </Typography>
            </CardContent>
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
