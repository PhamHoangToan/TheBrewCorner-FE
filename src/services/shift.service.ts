import apiClient from '../config/axios'
import { createCrudService } from './crud.service'
import type { ListParams } from './crud.service'

export interface ShiftChangeRequest {
  id: string
  type: 'REGISTER' | 'SWAP'
  workDate: string
  reason: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  rejectReason?: string | null
  createdAt: string
  user?: { id: string; name: string; code: string; role: string }
  shift?: { id: string; name: string; startTime: string; endTime: string }
}

export const shiftService = {
  ...createCrudService('/shifts'),
  assignments: (params?: ListParams) => apiClient.get('/shifts/assignments', { params }),
  createAssignment: (data: unknown) => apiClient.post('/shifts/assignments', data),
  updateAssignment: (id: string, data: unknown) => apiClient.patch(`/shifts/assignments/${id}`, data),
  removeAssignment: (id: string) => apiClient.delete(`/shifts/assignments/${id}`),
  listRequests: (params?: ListParams) =>
    apiClient.get<{ items: ShiftChangeRequest[]; total: number }>('/shifts/requests', { params }),
  approveRequest: (id: string) => apiClient.patch(`/shifts/requests/${id}/approve`),
  rejectRequest: (id: string, reason: string) => apiClient.patch(`/shifts/requests/${id}/reject`, { reason }),
}
