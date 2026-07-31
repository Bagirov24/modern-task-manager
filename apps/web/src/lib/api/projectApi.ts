import api from './client'
import type { Project } from '@/lib/types'

export interface ProjectListResponse {
  projects: Project[]
  total: number
  page: number
  per_page: number
}

export interface ProjectStats {
  total_tasks: number
  completed_tasks: number
  overdue_count: number
  progress: number
  by_status: Record<string, number>
  by_priority: Record<string, number>
}

export interface ProjectCreate {
  name: string
  description?: string
  color?: string
  icon?: string
}

export const projectApi = {
  list: (params?: { include_archived?: boolean }) =>
    api.get<ProjectListResponse>('/projects/', { params }),
  get: (id: string) => api.get<Project>(`/projects/${id}`),
  create: (data: ProjectCreate) => api.post<Project>('/projects/', data),
  update: (id: string, data: Partial<Project>) =>
    api.patch<Project>(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
  stats: (id: string) => api.get<ProjectStats>(`/projects/${id}/stats`),
}
