import apiClient from '../config/axios'
import { createCrudService } from './crud.service'

export const orderService = {
  ...createCrudService('/orders'),
  updateItem: (orderId: string, itemId: string, data: unknown) => apiClient.patch(`/orders/${orderId}/items/${itemId}`, data),
  returnRequests: () => apiClient.get('/orders/returns'),
  approveReturn: (itemId: string) => apiClient.patch(`/orders/items/${itemId}/approve-return`, {}),
  rejectReturn: (itemId: string, reason: string) => apiClient.patch(`/orders/items/${itemId}/reject-return`, { reason }),
  split: (orderId: string, itemIds: string[]) => apiClient.post(`/orders/${orderId}/split`, { itemIds }),
  merge: (orderId: string, sourceOrderId: string) => apiClient.post(`/orders/${orderId}/merge`, { sourceOrderId }),
}
