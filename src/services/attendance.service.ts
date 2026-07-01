import apiClient from '../config/axios'

export interface AttendanceLog {
  id: string
  userId: string
  checkIn: string
  checkOut: string | null
  workDate: string
  source: string
  note: string | null
  user?: { id: string; name: string; code: string; role: string }
}

export interface PenaltyConfig {
  id: string
  lateGraceMinutes: number
  penaltyPerMinuteLate: number
  earlyGraceMinutes: number
  penaltyPerMinuteEarly: number
}

export interface AttendanceCorrectionRequest {
  id: string
  userId: string
  workDate: string
  checkIn: string | null
  checkOut: string | null
  reason: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  rejectReason: string | null
  decidedAt: string | null
  createdAt: string
  user?: { id: string; name: string; code: string; role: string }
}

export const attendanceService = {
  list: (params?: Record<string, string | number | undefined>) =>
    apiClient.get<{ items: AttendanceLog[]; total: number }>('/attendance', { params }),

  createManual: (data: { userId: string; checkIn: string; checkOut?: string; workDate: string; note?: string }) =>
    apiClient.post<AttendanceLog>('/attendance/manual', data),

  update: (id: string, data: { checkIn?: string; checkOut?: string; note?: string }) =>
    apiClient.patch<AttendanceLog>(`/attendance/${id}`, data),

  remove: (id: string) => apiClient.delete(`/attendance/${id}`),

  getPenaltyConfig: () => apiClient.get<PenaltyConfig>('/attendance/penalty-config'),
  updatePenaltyConfig: (data: Partial<PenaltyConfig>) =>
    apiClient.patch<PenaltyConfig>('/attendance/penalty-config', data),

  listCorrections: (params?: Record<string, string | undefined>) =>
    apiClient.get<{ items: AttendanceCorrectionRequest[]; total: number }>('/attendance/corrections', { params }),
  approveCorrection: (id: string) =>
    apiClient.patch<AttendanceCorrectionRequest>(`/attendance/corrections/${id}/approve`, {}),
  rejectCorrection: (id: string, reason: string) =>
    apiClient.patch<AttendanceCorrectionRequest>(`/attendance/corrections/${id}/reject`, { reason }),
}
