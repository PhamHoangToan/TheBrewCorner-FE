import apiClient from '../config/axios'

export interface CashSession {
  id: string
  userId: string
  openingFloat: number
  openedAt: string
  closedAt: string | null
  expectedCash: number | null
  countedCash: number | null
  difference: number | null
  note: string | null
  status: 'OPEN' | 'CLOSED'
  // các trường tạm tính khi lấy ca hiện tại
  cashPayments?: number
  cashRefunds?: number
  otherReceipt?: number
  otherExpense?: number
}

export const cashSessionService = {
  list: (params?: Record<string, string | undefined>) =>
    apiClient.get<{ items: CashSession[]; total: number }>('/cash-sessions', { params }),
  current: (userId: string) =>
    apiClient.get<CashSession | null>('/cash-sessions/current', { params: { userId } }),
  open: (data: { userId: string; openingFloat: number; note?: string }) =>
    apiClient.post<CashSession>('/cash-sessions/open', data),
  close: (id: string, data: { countedCash: number; note?: string }) =>
    apiClient.post<CashSession>(`/cash-sessions/${id}/close`, data),
}
