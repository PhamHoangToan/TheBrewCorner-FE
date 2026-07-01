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
}
