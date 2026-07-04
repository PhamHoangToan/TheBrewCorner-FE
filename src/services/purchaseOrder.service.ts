import apiClient from '../config/axios'

export interface PurchaseSuggestion {
  ingredientId: string
  ingredientName: string
  unit: string
  stockQuantity: number
  avgDailyUsage: number
  daysUntilStockout: number
  suggestedQty: number
}

export interface PurchaseOrderItem {
  id?: string
  ingredientId?: string | null
  ingredientName: string
  quantity: number
  unit: string
  estPrice: number
}

export interface PurchaseOrder {
  id: string
  code: string
  supplierId: string | null
  supplierName: string
  status: 'DRAFT' | 'SENT' | 'RECEIVED' | 'CANCELLED'
  note: string | null
  receivedAt: string | null
  createdAt: string
  items: PurchaseOrderItem[]
}

export const purchaseOrderService = {
  suggestions: (days?: number) =>
    apiClient.get<PurchaseSuggestion[]>('/purchase-orders/suggestions', { params: { days } }),
  list: (params?: Record<string, string | undefined>) =>
    apiClient.get<{ items: PurchaseOrder[]; total: number }>('/purchase-orders', { params }),
  get: (id: string) => apiClient.get<PurchaseOrder>(`/purchase-orders/${id}`),
  create: (data: unknown) => apiClient.post<PurchaseOrder>('/purchase-orders', data),
  setStatus: (id: string, status: string) => apiClient.patch(`/purchase-orders/${id}/status`, { status }),
  receive: (id: string, data?: unknown) => apiClient.post(`/purchase-orders/${id}/receive`, data ?? {}),
  remove: (id: string) => apiClient.delete(`/purchase-orders/${id}`),
}
