import apiClient from '../config/axios'

export interface PayrollSummary {
  id: string
  userId: string
  periodYear: number
  periodMonth: number
  employmentType: 'FULL_TIME' | 'PART_TIME'
  baseSalary: number
  scheduledDays: number
  workedDays: number
  paidLeaveDays: number
  absentDays: number
  totalHours: number
  otHours: number
  otAmount: number
  penaltyAmount: number
  totalAmount: number
  status: 'DRAFT' | 'APPROVED' | 'PAID'
  user?: {
    id: string
    code: string
    name: string
    role: string
    employmentType: string
    baseSalary?: number
    otRatePerHour?: number
  }
}

export interface PayrollDay {
  id: string
  workDate: string
  scheduledIn: string | null
  scheduledOut: string | null
  actualIn: string | null
  actualOut: string | null
  workedMinutes: number
  otMinutes: number
  lateMinutes: number
  earlyMinutes: number
  penaltyAmount: number
  dayType: 'WORK' | 'PAID_LEAVE' | 'ABSENT' | 'REST'
}

export interface PayrollDetail extends PayrollSummary {
  days: PayrollDay[]
}

// Trả về từ GET /payroll/user/:userId — mỗi tháng kèm tổng hợp sẵn để vẽ biểu đồ xu hướng.
export interface PayrollHistoryItem extends PayrollSummary {
  days: PayrollDay[]
  totalLateMinutes: number
  totalEarlyMinutes: number
  totalOtMinutes: number
  totalPenaltyAmount: number
}

export const payrollService = {
  list: (params?: Record<string, string | number | undefined>) =>
    apiClient.get<{ items: PayrollSummary[]; total: number }>('/payroll', { params }),

  historyByUser: (userId: string) =>
    apiClient.get<PayrollHistoryItem[]>(`/payroll/user/${userId}`),

  getByUserMonth: (userId: string, year: number, month: number) =>
    apiClient.get<PayrollDetail>(`/payroll/user/${userId}/${year}/${month}`),

  getById: (id: string) => apiClient.get<PayrollDetail>(`/payroll/${id}`),

  calculate: (params: { year: number; month: number; userId?: string }) =>
    apiClient.post('/payroll/calculate', params),

  setSalaryConfig: (userId: string, data: { employmentType?: string; baseSalary?: number; otRatePerHour?: number; paidLeaveDaysLeft?: number }) =>
    apiClient.patch(`/payroll/salary-config/${userId}`, data),

  approve: (id: string) => apiClient.patch(`/payroll/${id}/approve`),
  markPaid: (id: string) => apiClient.patch(`/payroll/${id}/paid`),
}
