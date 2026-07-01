import apiClient from '../config/axios'

export interface ActivityLog {
  id: string
  userId: string | null
  userName: string | null
  userRole: string | null
  method: string
  path: string
  module: string
  action: string
  description: string
  statusCode: number
  createdAt: string
}

export const activityLogService = {
  list: (params?: Record<string, string | number | undefined>) =>
    apiClient.get<{ items: ActivityLog[]; total: number; page: number; limit: number }>('/activity-logs', { params }),
}
