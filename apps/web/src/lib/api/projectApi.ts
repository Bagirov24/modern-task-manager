import api from './client'
import type { Project } from '@/lib/types'

export const projectApi = {
  list: () => api.get<Project[]>('/projects'),
  create: (data: Partial<Project>) => api.post<Project>('/projects', data),
  update: (id: string, data: Partial<Project>) => api.patch<Project>(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
}
