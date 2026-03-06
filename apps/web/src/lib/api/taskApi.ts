import api from './client'
import type { Task } from '@/lib/types'

export const taskApi = {
  list: (params?: Record<string, any>) => api.get<{ tasks: Task[]; total: number }>('/tasks', { params }),
  get: (id: string) => api.get<Task>(`/tasks/${id}`),
  create: (data: Partial<Task>) => api.post<Task>('/tasks', data),
  update: (id: string, data: Partial<Task>) => api.patch<Task>(`/tasks/${id}`, data),
  delete: (id: string) => api.delete(`/tasks/${id}`),
}
