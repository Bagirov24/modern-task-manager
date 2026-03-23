import { motion, AnimatePresence } from 'framer-motion'
import { useTaskStore } from '@/lib/store/taskStore'
import TaskItem from './TaskItem'
import { staggerChildren, taskItem } from '@/lib/animations/variants'
import { Stack, Typography, Box } from '@mui/material'
import { InboxOutlined as EmptyIcon } from '@mui/icons-material'
import type { Task } from '@/lib/types'

interface Props {
  onEdit?: (task: Task) => void
  onDelete?: (task: Task) => void
}

export default function TaskList({ onEdit, onDelete }: Props) {
  const tasks = useTaskStore((s) => s.tasks)
  const filter = useTaskStore((s) => s.filter)

  const filtered = tasks.filter((t) => {
    if (filter.status && t.status !== filter.status) return false
    if (filter.priority && t.priority !== filter.priority) return false
    if (filter.search && !t.title.toLowerCase().includes(filter.search.toLowerCase())) return false
    return true
  })

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
    <motion.div variants={staggerChildren} initial="initial" animate="animate">
      <Stack spacing={1.5}>
        <AnimatePresence mode="popLayout">
          {filtered.map((task) => (
            <motion.div key={task.id} variants={taskItem} layout>
              <TaskItem task={task} onEdit={onEdit} onDelete={onDelete} />
            </motion.div>
          ))}
        </AnimatePresence>
      </Stack>
    </motion.div>
  )
}
