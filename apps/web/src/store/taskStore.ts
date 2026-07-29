/**
 * ARCH FIX: Single source of truth for task state.
 * Previously duplicated across src/store/ and src/lib/store/.
 * src/lib/store/taskStore.ts is now a re-export shim → see below.
 *
 * Added:
 *  - 'timeline' view mode (for Gantt/Timeline page)
 *  - 'position' sort key (replaces ambiguous 'order')
 *  - Safe optional chaining in getFilteredTasks (t.description?.toLowerCase())
 *  - t.labels is now Label[] instead of string[]
 */
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { Task, Label } from '../lib/types'

export type { Task }

export type ViewMode = 'list' | 'board' | 'timeline' | 'calendar'
export type SortBy = 'created_at' | 'due_date' | 'priority' | 'position'
export type SortOrder = 'asc' | 'desc'

interface TaskFilter {
  status?: string
  priority?: string
  search?: string
  label?: string
}

interface TaskState {
  tasks: Task[]
  selectedTask: Task | null
  filter: TaskFilter
  sortBy: SortBy
  sortOrder: SortOrder
  viewMode: ViewMode

  // Setters
  setTasks: (tasks: Task[]) => void
  addTask: (task: Task) => void
  updateTask: (task: Task) => void
  removeTask: (taskId: string) => void
  setSelectedTask: (task: Task | null) => void
  setFilter: (filter: Partial<TaskFilter>) => void
  clearFilters: () => void
  setSortBy: (sortBy: SortBy) => void
  setSortOrder: (order: SortOrder) => void
  setViewMode: (mode: ViewMode) => void

  // Derived
  getFilteredTasks: () => Task[]
}

const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }

export const useTaskStore = create<TaskState>()(
  devtools(
    persist(
      (set, get) => ({
        tasks: [],
        selectedTask: null,
        filter: {},
        sortBy: 'position',
        sortOrder: 'asc',
        viewMode: 'board',

        setTasks: (tasks) => set({ tasks }),

        addTask: (task) =>
          set((state) => ({ tasks: [...state.tasks, task] })),

        updateTask: (task) =>
          set((state) => ({
            tasks: state.tasks.map((t) => (t.id === task.id ? task : t)),
            selectedTask:
              state.selectedTask?.id === task.id ? task : state.selectedTask,
          })),

        removeTask: (taskId) =>
          set((state) => ({
            tasks: state.tasks.filter((t) => t.id !== taskId),
            selectedTask:
              state.selectedTask?.id === taskId ? null : state.selectedTask,
          })),

        setSelectedTask: (task) => set({ selectedTask: task }),

        setFilter: (filter) =>
          set((state) => ({ filter: { ...state.filter, ...filter } })),

        clearFilters: () => set({ filter: {} }),
        setSortBy: (sortBy) => set({ sortBy }),
        setSortOrder: (sortOrder) => set({ sortOrder }),
        setViewMode: (viewMode) => set({ viewMode }),

        getFilteredTasks: () => {
          const { tasks, filter, sortBy, sortOrder } = get()
          let result = [...tasks]

          if (filter.status)
            result = result.filter((t) => t.status === filter.status)
          if (filter.priority)
            result = result.filter((t) => t.priority === filter.priority)
          if (filter.search) {
            const q = filter.search.toLowerCase()
            result = result.filter(
              (t) =>
                t.title.toLowerCase().includes(q) ||
                // BUG FIX: was t.description.toLowerCase() — crashed when description is undefined
                t.description?.toLowerCase().includes(q),
            )
          }
          if (filter.label) {
            result = result.filter((t) =>
              // BUG FIX: labels is Label[] not string[]
              (t.labels as Label[] | undefined)?.some(
                (l) => l.id === filter.label || l.name === filter.label,
              ),
            )
          }

          result.sort((a, b) => {
            let cmp = 0
            switch (sortBy) {
              case 'priority':
                cmp =
                  (priorityOrder[a.priority] ?? 2) -
                  (priorityOrder[b.priority] ?? 2)
                break
              case 'due_date':
                cmp = (a.due_date ?? '').localeCompare(b.due_date ?? '')
                break
              case 'created_at':
                cmp = (a.created_at ?? '').localeCompare(b.created_at ?? '')
                break
              default:
                cmp = (a.position ?? 0) - (b.position ?? 0)
            }
            return sortOrder === 'asc' ? cmp : -cmp
          })

          return result
        },
      }),
      {
        name: 'task-store',
        // Do NOT persist tasks — always fresh from server via react-query
        partialize: (state) => ({
          filter: state.filter,
          sortBy: state.sortBy,
          sortOrder: state.sortOrder,
          viewMode: state.viewMode,
        }),
      },
    ),
  ),
)
