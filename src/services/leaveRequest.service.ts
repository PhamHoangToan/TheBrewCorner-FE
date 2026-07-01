import apiClient from '../config/axios'

export interface LeaveRequest {
  id: string
  userId: string
  startDate: string
  endDate: string
  type: 'ANNUAL' | 'SICK' | 'UNPAID'
  reason: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  rejectReason: string | null
  decidedAt: string | null
  createdAt: string
  user?: { id: string; name: string; code: string; role: string }
}

export const leaveRequestService = {
  list: (params?: Record<string, string | undefined>) =>
    apiClient.get<{ items: LeaveRequest[]; total: number }>('/leave-requests', { params }),

  approve: (id: string) => apiClient.patch<LeaveRequest>(`/leave-requests/${id}/approve`, {}),
  reject: (id: string, reason: string) => apiClient.patch<LeaveRequest>(`/leave-requests/${id}/reject`, { reason }),
}
