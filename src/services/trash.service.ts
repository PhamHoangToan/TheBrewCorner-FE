import apiClient from '../config/axios'

export interface TrashItem {
  id: string
  code?: string
  name?: string
  productName?: string
  content?: string
  deletedAt: string
  [key: string]: unknown
}

export const trashService = {
  list: (type: string) => apiClient.get<{ items: TrashItem[]; total: number }>('/trash', { params: { type } }),
  restore: (type: string, id: string) => apiClient.patch<{ restored: boolean }>(`/trash/${type}/${id}/restore`),
}
