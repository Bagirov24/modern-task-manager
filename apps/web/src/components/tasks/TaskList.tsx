import { useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useTaskStore } from '@/lib/store/taskStore'
import TaskItem from './TaskItem'
import { staggerChildren, taskItem } from '@/lib/animations/variants'
import { Stack, Typography, Box } from '@mui/material'
import { InboxOutlined as EmptyIcon, DragIndicator as DragIcon } from '@mui/icons-material'
import type { Task } from '@/lib/types'

interface Props {
  onEdit?: (task: Task) => void
  onDelete?: (task: Task) => void
}

function SortableTaskItem({ task, onEdit, onDelete }: { task: Task; onEdit?: (t: Task) => void; onDelete?: (t: Task) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const,
  }

  return (
    <Box ref={setNodeRef} style={style} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Box
        {...attributes}
        {...listeners}
        sx={{
          cursor: 'grab',
          color: 'text.secondary',
          opacity: 0.4,
          '&:hover': { opacity: 1 },
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <DragIcon fontSize="small" />
      </Box>
      <Box sx={{ flexGrow: 1 }}>
        <TaskItem task={task} onEdit={onEdit} onDelete={onDelete} />
      </Box>
    </Box>
  )
}

export default function TaskList({ onEdit, onDelete }: Props) {
  const tasks = useTaskStore((s) => s.tasks)
  const filter = useTaskStore((s) => s.filter)
  const setTasks = useTaskStore((s) => s.setTasks)

  const filtered = tasks.filter((t) => {
    if (filter.status && t.status !== filter.status) return false
    if (filter.priority && t.priority !== filter.priority) return false
    if (filter.search && !t.title.toLowerCase().includes(filter.search.toLowerCase())) return false
    return true
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (over && active.id !== over.id) {
        const oldIndex = tasks.findIndex((t) => t.id === active.id)
        const newIndex = tasks.findIndex((t) => t.id === over.id)
        setTasks(arrayMove(tasks, oldIndex, newIndex))
      }
    },
    [tasks, setTasks]
  )

  if (filtered.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <EmptyIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
        <Typography variant="h6" color="text.secondary">
          Нет задач
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Создайте первую задачу, нажав кнопку выше
        </Typography>
      </Box>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={filtered.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <Stack spacing={1.5}>
          <AnimatePresence mode="popLayout">
            {filtered.map((task) => (
              <motion.div key={task.id} variants={taskItem} layout>
                <SortableTaskItem task={task} onEdit={onEdit} onDelete={onDelete} />
              </motion.div>
            ))}
          </AnimatePresence>
        </Stack>
      </SortableContext>
    </DndContext>
  )
}
