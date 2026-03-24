import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { Task } from '../lib/types'

export type { Task }

interface TaskState {
  tasks: Task[]
  selectedTask: Task | null
  filter: {
    status?: string
    priority?: string
    search?: string
    label?: string
  }
  sortBy: 'created_at' | 'due_date' | 'priority' | 'order'
  sortOrder: 'asc' | 'desc'
  viewMode: 'list' | 'board' | 'calendar'
  setTasks: (tasks: Task[]) => void
  addTask: (task: Task) => void
  updateTask: (task: Task) => void
  removeTask: (taskId: string) => void
  setSelectedTask: (task: Task | null) => void
  setFilter: (filter: Partial<TaskState['filter']>) => void
  clearFilters: () => void
  setSortBy: (sortBy: TaskState['sortBy']) => void
  setSortOrder: (order: TaskState['sortOrder']) => void
  setViewMode: (mode: TaskState['viewMode']) => void
  getFilteredTasks: () => Task[]
}

export const useTaskStore = create<TaskState>()(
  devtools(
    persist(
      (set, get) => ({
        tasks: [],
        selectedTask: null,
        filter: {},
        sortBy: 'order',
        sortOrder: 'asc',
        viewMode: 'list',

        setTasks: (tasks) => set({ tasks }),
        addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
        updateTask: (task) => set((state) => ({
          tasks: state.tasks.map(t => t.id === task.id ? task : t),
          selectedTask: state.selectedTask?.id === task.id ? task : state.selectedTask
        })),
        removeTask: (taskId) => set((state) => ({
          tasks: state.tasks.filter(t => t.id !== taskId),
          selectedTask: state.selectedTask?.id === taskId ? null : state.selectedTask
        })),
        setSelectedTask: (task) => set({ selectedTask: task }),
        setFilter: (filter) => set((state) => ({
          filter: { ...state.filter, ...filter }
        })),
        clearFilters: () => set({ filter: {} }),
        setSortBy: (sortBy) => set({ sortBy }),
        setSortOrder: (sortOrder) => set({ sortOrder }),
        setViewMode: (viewMode) => set({ viewMode }),
        getFilteredTasks: () => {
          const { tasks, filter, sortBy, sortOrder } = get()
          let filtered = [...tasks]

          if (filter.status) {
            filtered = filtered.filter(t => t.status === filter.status)
          }
          if (filter.priority) {
            filtered = filtered.filter(t => t.priority === filter.priority)
          }
          if (filter.search) {
            const search = filter.search.toLowerCase()
            filtered = filtered.filter(t =>
              t.title.toLowerCase().includes(search) ||
              t.description.toLowerCase().includes(search)
            )
          }
          if (filter.label) {
            filtered = filtered.filter(t => t.labels.includes(filter.label!))
          }

          const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
          filtered.sort((a, b) => {
            let comparison = 0
            switch (sortBy) {
              case 'priority':
                comparison = (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2)
                break
              case 'due_date':
                comparison = (a.due_date || '').localeCompare(b.due_date || '')
                break
              case 'created_at':
                comparison = a.created_at.localeCompare(b.created_at)
                break
              default:
                comparison = a.order - b.order
            }
            return sortOrder === 'asc' ? comparison : -comparison
          })
          return filtered
        },
      }),
      { name: 'task-store' }
    )
  )
)
