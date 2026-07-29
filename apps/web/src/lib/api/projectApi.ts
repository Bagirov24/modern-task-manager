import api from './client'
import type { Project } from '@/lib/types'

export interface ProjectCreate {
  name: string
  description?: string
  color?: string
  icon?: string
}

export const projectApi = {
  list: (params?: { include_archived?: boolean }) =>
    api.get<Project[]>('/projects/', { params }),
  get: (id: string) => api.get<Project>(`/projects/${id}`),
  create: (data: ProjectCreate) => api.post<Project>('/projects/', data),
  update: (id: string, data: Partial<Project>) =>
    api.patch<Project>(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
  stats: (id: string) => api.get(`/projects/${id}/stats`),
}
