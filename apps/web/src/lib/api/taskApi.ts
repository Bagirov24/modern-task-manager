import api from './client'
import type { Task, TaskCreate, TaskUpdate, TaskListResponse } from '@/lib/types'

export const taskApi = {
  /**
   * List tasks. Always returns { tasks, total, page, per_page }.
   * Using strict TaskListResponse eliminates the triple-format guessing in useTasks.
   */
  list: (params?: {
    status?: string
    priority?: string
    project_id?: string
    search?: string
    page?: number
    per_page?: number
  }) => api.get<TaskListResponse>('/tasks/', { params }),

  get: (id: string) => api.get<Task>(`/tasks/${id}`),

  create: (data: TaskCreate) => api.post<Task>('/tasks/', data),

  update: (id: string, data: TaskUpdate) => api.patch<Task>(`/tasks/${id}`, data),

  delete: (id: string) => api.delete(`/tasks/${id}`),
}
