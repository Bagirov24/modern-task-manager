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

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [],
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
