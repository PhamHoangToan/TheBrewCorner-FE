import apiClient from '../config/axios'
import { createCrudService } from './crud.service'
import type { ListParams } from './crud.service'

export const shiftService = {
  ...createCrudService('/shifts'),
  assignments: (params?: ListParams) => apiClient.get('/shifts/assignments', { params }),
  createAssignment: (data: unknown) => apiClient.post('/shifts/assignments', data),
  updateAssignment: (id: string, data: unknown) => apiClient.patch(`/shifts/assignments/${id}`, data),
  removeAssignment: (id: string) => apiClient.delete(`/shifts/assignments/${id}`),
}
