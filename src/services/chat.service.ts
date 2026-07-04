import apiClient from '../config/axios'

export interface ChatThreadSummary {
  id: string
  customerId: string | null
  customerName: string
  status: 'OPEN' | 'CLOSED'
  lastMessageAt: string
  lastMessage: string | null
  unreadCount: number
}

export interface ChatMessage {
  id: string
  threadId: string
  senderType: 'CUSTOMER' | 'STAFF'
  senderId: string | null
  content: string
  read: boolean
  createdAt: string
}

export const chatService = {
  listThreads: (status?: string) => apiClient.get<ChatThreadSummary[]>('/chat/threads', { params: { status } }),
  listMessages: (threadId: string) => apiClient.get<ChatMessage[]>(`/chat/threads/${threadId}/messages`),
  reply: (threadId: string, content: string) => apiClient.post<ChatMessage>(`/chat/threads/${threadId}/staff-reply`, { content }),
  markRead: (threadId: string) => apiClient.patch(`/chat/threads/${threadId}/read`),
  close: (threadId: string) => apiClient.patch(`/chat/threads/${threadId}/close`),
}
