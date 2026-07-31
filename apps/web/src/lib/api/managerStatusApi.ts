import api from './client'

export interface ManagerStatusSummary {
  entity_type: 'task' | 'project'
  entity_id: string
  title: string
  short: string
  known: string[]
  unclear: string[]
  recommended_action: string
  confidence: 'high' | 'medium' | 'low'
  markdown: string
}

export const managerStatusApi = {
  task: (id: string) => api.get<ManagerStatusSummary>(`/status/tasks/${id}`),
  project: (id: string) => api.get<ManagerStatusSummary>(`/status/projects/${id}`),
}
