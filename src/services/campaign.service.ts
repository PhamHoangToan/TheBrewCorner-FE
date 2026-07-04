import apiClient from '../config/axios'

export interface Campaign {
  id: string
  title: string
  content: string
  channel: 'EMAIL' | 'PUSH' | 'BOTH'
  segment: string
  status: 'DRAFT' | 'SENT'
  sentAt: string | null
  sentCount: number
  createdAt: string
}

export const campaignService = {
  list: () => apiClient.get<{ items: Campaign[]; total: number }>('/campaigns'),
  previewCount: (segment: string) => apiClient.get<{ count: number }>('/campaigns/preview-count', { params: { segment } }),
  create: (data: unknown) => apiClient.post<Campaign>('/campaigns', data),
  send: (id: string) => apiClient.post<{ sent: number; total: number }>(`/campaigns/${id}/send`, {}),
}
