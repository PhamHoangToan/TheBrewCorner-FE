import apiClient from '../config/axios'

export interface DateRangeParams {
  startDate?: string
  endDate?: string
}

export const reportService = {
  dashboard: () => apiClient.get('/reports/dashboard'),
  revenue: (params?: DateRangeParams) => apiClient.get('/reports/revenue', { params }),
  sales: (params?: DateRangeParams) => apiClient.get('/reports/sales', { params }),
  revenueByHour: (params?: DateRangeParams) => apiClient.get('/reports/revenue-by-hour', { params }),
  topProducts: (params?: DateRangeParams & { limit?: number }) => apiClient.get('/reports/top-products', { params }),
  profit: (params?: DateRangeParams) => apiClient.get('/reports/profit', { params }),
  zReport: (params?: { date?: string }) => apiClient.get('/reports/z-report', { params }),
  waste: (params?: DateRangeParams) => apiClient.get('/reports/waste', { params }),
  staffPerformance: (params?: DateRangeParams) => apiClient.get('/reports/staff-performance', { params }),
}
