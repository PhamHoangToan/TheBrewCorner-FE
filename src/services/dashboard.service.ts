import api from '../config/axios'

export interface DashboardSummary {
  revenueToday: number
  ordersToday: number
  tablesServing: number
  tablesTotal: number
  lowStockCount: number
  staffCount: number
  tableStatus: { available: number; serving: number; checkoutRequested: number }
  revenueWeek: { date: string; revenue: number }[]
  topProducts: { name: string; qty: number }[]
  recentOrders: {
    id: string
    code: string
    tableName: string
    createdBy: string
    totalAmount: number
    status: string
    type: string
    createdAt: string
  }[]
}

export const dashboardService = {
  getSummary: () => api.get<DashboardSummary>('/dashboard/summary'),
}
