import api from './client'
import type { WorkspaceLink, WorkspaceLinkInput } from '@/lib/types'

export interface WorkspaceLinkListResponse {
  links: WorkspaceLink[]
  total: number
  page: number
  per_page: number
}

export const workspaceLinkApi = {
  list: (params?: { search?: string; project_id?: string; general_only?: boolean; category?: string; favorites_only?: boolean; per_page?: number }) =>
    api.get<WorkspaceLinkListResponse>('/workspace-links/', { params }),
  get: (id: string) => api.get<WorkspaceLink>(`/workspace-links/${id}`),
  create: (data: WorkspaceLinkInput) => api.post<WorkspaceLink>('/workspace-links/', data),
  update: (id: string, data: Partial<WorkspaceLinkInput>) => api.patch<WorkspaceLink>(`/workspace-links/${id}`, data),
  delete: (id: string) => api.delete(`/workspace-links/${id}`),
  listForTask: (taskId: string) => api.get<WorkspaceLink[]>(`/workspace-links/tasks/${taskId}`),
  attachToTask: (taskId: string, linkId: string) => api.put<WorkspaceLink>(`/workspace-links/tasks/${taskId}/${linkId}`),
  detachFromTask: (taskId: string, linkId: string) => api.delete(`/workspace-links/tasks/${taskId}/${linkId}`),
}
