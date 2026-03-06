import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { taskSchema, TaskFormData } from '@/lib/validations/taskSchema'
import { useTaskStore } from '@/lib/store/taskStore'
import { Plus, X } from 'lucide-react'

export default function AddTask() {
  const [isOpen, setIsOpen] = useState(false)
  const addTask = useTaskStore((s) => s.addTask)
  const { register, handleSubmit, reset, formState: { errors } } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
  })

  const onSubmit = (data: TaskFormData) => {
    addTask({
      id: crypto.randomUUID(),
      ...data,
      status: 'todo',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any)
    reset()
    setIsOpen(false)
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-sky-400 py-2 transition-colors"
      >
        <Plus size={16} /> Добавить задачу
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="p-3 bg-slate-800 rounded-lg border border-slate-600">
      <input
        {...register('title')}
        placeholder="Название задачи"
        autoFocus
        className="w-full bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none mb-2"
      />
      {errors.title && <p className="text-xs text-red-400 mb-2">{errors.title.message}</p>}
      <textarea
        {...register('description')}
        placeholder="Описание (необязательно)"
        rows={2}
        className="w-full bg-transparent text-sm text-slate-400 placeholder-slate-600 outline-none resize-none mb-3"
      />
      <div className="flex items-center justify-between">
        <select {...register('priority')} className="bg-slate-700 text-sm text-slate-300 rounded px-2 py-1 outline-none">
          <option value="low">Низкий</option>
          <option value="medium">Средний</option>
          <option value="high">Высокий</option>
          <option value="urgent">Срочный</option>
        </select>
        <div className="flex gap-2">
          <button type="button" onClick={() => { reset(); setIsOpen(false) }} className="px-3 py-1 text-sm text-slate-400 hover:text-slate-200">
            <X size={16} />
          </button>
          <button type="submit" className="px-4 py-1 bg-sky-500 text-white text-sm rounded hover:bg-sky-600 transition-colors">
            Добавить
          </button>
        </div>
      </div>
    </form>
  )
}
