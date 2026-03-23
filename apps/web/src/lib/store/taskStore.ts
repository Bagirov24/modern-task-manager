import { create } from 'zustand'
import type { Task } from '@/lib/types'

interface TaskState {
  tasks: Task[]
  selectedTask: Task | null
  filter: { status?: string; priority?: string; search?: string }
  setTasks: (tasks: Task[]) => void
  addTask: (task: Task) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  removeTask: (id: string) => void
  selectTask: (task: Task | null) => void
  setFilter: (filter: Partial<TaskState['filter']>) => void
}

const sampleTasks: Task[] = [
  {
    id: '1',
    title: 'Настроить CI/CD пайплайн',
    description: 'Настроить GitHub Actions для автоматического деплоя',
    status: 'todo',
    priority: 'high',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'Рефакторинг компонентов',
    description: 'Разбить крупные компоненты на меньшие',
    status: 'in_progress',
    priority: 'medium',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    title: 'Написать тесты',
    description: 'Покрыть основные функции юнит-тестами',
    status: 'todo',
    priority: 'urgent',
    due_date: new Date(Date.now() + 3 * 86400000).toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '4',
    title: 'Обновить документацию',
    status: 'done',
    priority: 'low',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '5',
    title: 'Добавить тёмную тему',
    description: 'Реализовать переключение темы в настройках',
    status: 'todo',
    priority: 'medium',
    due_date: new Date(Date.now() + 7 * 86400000).toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export const useTaskStore = create<TaskState>((set) => ({
  tasks: sampleTasks,
  selectedTask: null,
  filter: {},
  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((s) => ({ tasks: [...s.tasks, task] })),
  updateTask: (id, updates) =>
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),
  removeTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
  selectTask: (task) => set({ selectedTask: task }),
  setFilter: (filter) => set((s) => ({ filter: { ...s.filter, ...filter } })),
}))
