import { motion, AnimatePresence } from 'framer-motion'
import { useTaskStore } from '@/lib/store/taskStore'
import TaskItem from './TaskItem'
import { staggerChildren, taskItem } from '@/lib/animations/variants'

export default function TaskList() {
  const tasks = useTaskStore((s) => s.tasks)
  const filter = useTaskStore((s) => s.filter)

  const filtered = tasks.filter((t) => {
    if (filter.status && t.status !== filter.status) return false
    if (filter.priority && t.priority !== filter.priority) return false
    if (filter.search && !t.title.toLowerCase().includes(filter.search.toLowerCase())) return false
    return true
  })

  return (
    <motion.div variants={staggerChildren} initial="initial" animate="animate" className="space-y-2">
      <AnimatePresence mode="popLayout">
        {filtered.map((task) => (
          <motion.div key={task.id} variants={taskItem} layout>
            <TaskItem task={task} />
          </motion.div>
        ))}
      </AnimatePresence>
      {filtered.length === 0 && (
        <p className="text-center text-slate-500 py-12">Нет задач</p>
      )}
    </motion.div>
  )
}
