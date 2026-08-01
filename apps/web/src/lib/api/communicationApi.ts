import api from './client'
import type { CommunicationItem, CommunicationItemInput } from '@/lib/types'

export interface CommunicationListResponse {
  items: CommunicationItem[]
  total: number
  groups: Record<string, number>
  page: number
  per_page: number
}

export const communicationApi = {
  list: (params?: { action_status?: string; project_id?: string; task_id?: string; search?: string; active_only?: boolean; per_page?: number }) => api.get<CommunicationListResponse>('/communication-items/', { params }),
  get: (id: string) => api.get<CommunicationItem>(`/communication-items/${id}`),
  create: (data: CommunicationItemInput) => api.post<CommunicationItem>('/communication-items/', data),
  update: (id: string, data: Partial<CommunicationItemInput>) => api.patch<CommunicationItem>(`/communication-items/${id}`, data),
  archive: (id: string) => api.delete(`/communication-items/${id}`),
  createTask: (id: string) => api.post<CommunicationItem>(`/communication-items/${id}/create-task`),
}
