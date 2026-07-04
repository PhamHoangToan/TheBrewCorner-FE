import apiClient from '../config/axios'

export interface ProductReview {
  id: string
  productId: string
  userId: string
  orderId: string
  rating: number
  comment: string | null
  hidden: boolean
  reply: string | null
  repliedAt: string | null
  createdAt: string
  product?: { id: string; name: string }
  user?: { id: string; name: string }
}

export const reviewService = {
  list: (params?: { page?: number; limit?: number; rating?: number; productId?: string; hidden?: boolean }) =>
    apiClient.get<{ items: ProductReview[]; total: number; page: number; limit: number }>('/reviews', { params }),
  setHidden: (id: string, hidden: boolean) => apiClient.patch<ProductReview>(`/reviews/${id}/hide`, { hidden }),
  reply: (id: string, reply: string) => apiClient.patch<ProductReview>(`/reviews/${id}/reply`, { reply }),
}
