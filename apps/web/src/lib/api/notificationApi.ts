import api from './client'
import type { Notification } from '@/lib/types'

export const notificationApi = {
  list: (params?: Record<string, any>) => api.get<{ notifications: Notification[]; total: number }>('/notifications', { params }),
  get: (id: string) => api.get<Notification>(`/notifications/${id}`),
  markRead: (id: string) => api.patch<Notification>(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
  delete: (id: string) => api.delete(`/notifications/${id}`),
}
