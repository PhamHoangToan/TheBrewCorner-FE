import apiClient from '../config/axios'

export interface AppNotification {
  id: string
  role: string
  title: string
  body: string
  type: string
  refId: string | null
  read: boolean
  createdAt: string
}

export const notificationService = {
  getAll: (role: string, page = 1, limit = 20) =>
    apiClient.get<{ items: AppNotification[]; total: number }>('/notifications', {
      params: { role, page, limit },
    }),

  getUnreadCount: (role: string) =>
    apiClient.get<{ count: number }>('/notifications/unread-count', { params: { role } }),

  markRead: (id: string) => apiClient.patch(`/notifications/${id}/read`),

  markAllRead: (role: string) => apiClient.patch('/notifications/read-all', null, { params: { role } }),
}
