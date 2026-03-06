import { CheckCircle2, Circle, Calendar, Flag } from 'lucide-react'
import type { Task } from '@/lib/types'
import { useTaskStore } from '@/lib/store/taskStore'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

const priorityColors = {
  low: 'text-slate-400',
  medium: 'text-blue-400',
  high: 'text-orange-400',
  urgent: 'text-red-400',
}

export default function TaskItem({ task }: { task: Task }) {
  const updateTask = useTaskStore((s) => s.updateTask)
  const selectTask = useTaskStore((s) => s.selectTask)
  const isDone = task.status === 'done'

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    updateTask(task.id, { status: isDone ? 'todo' : 'done' })
  }

  return (
    <div
      onClick={() => selectTask(task)}
      className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg border border-slate-700 hover:border-slate-600 cursor-pointer transition-colors group"
    >
      <button onClick={toggle} className="flex-shrink-0">
        {isDone ? (
          <CheckCircle2 size={20} className="text-green-400" />
        ) : (
          <Circle size={20} className="text-slate-500 group-hover:text-slate-300" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${isDone ? 'line-through text-slate-500' : 'text-slate-200'}`}>
          {task.title}
        </p>
        {task.due_date && (
          <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
            <Calendar size={12} />
            <span>{format(new Date(task.due_date), 'd MMM', { locale: ru })}</span>
          </div>
        )}
      </div>
      <Flag size={14} className={priorityColors[task.priority]} />
    </div>
  )
}
