import api from './client'
import type { AppNotification } from '@/lib/types'

export const notificationApi = {
  list: (params?: Record<string, unknown>) => api.get<{ notifications: AppNotification[]; total: number }>('/notifications', { params }),
  get: (id: string) => api.get<AppNotification>(`/notifications/${id}`),
  markRead: (id: string) => api.patch<AppNotification>(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
  delete: (id: string) => api.delete(`/notifications/${id}`),
}
