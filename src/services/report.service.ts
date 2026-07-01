import apiClient from '../config/axios'

export const reportService = {
  dashboard: () => apiClient.get('/reports/dashboard'),
  revenue: () => apiClient.get('/reports/revenue'),
  sales: () => apiClient.get('/reports/sales'),
}
