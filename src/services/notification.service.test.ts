import { describe, it, expect, vi, beforeEach } from 'vitest'
import { notificationService } from './notification.service'

vi.mock('../config/axios', () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}))

import apiClient from '../config/axios'

const mockGet = apiClient.get as ReturnType<typeof vi.fn>
const mockPatch = apiClient.patch as ReturnType<typeof vi.fn>

const makeItem = (overrides: Partial<any> = {}) => ({
  id: 'n1',
  role: 'barista',
  title: 'Order mới',
  body: 'Bàn 1 — 2 món',
  type: 'ORDER_NEW',
  refId: 'order-1',
  read: false,
  createdAt: new Date().toISOString(),
  ...overrides,
})

describe('notificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAll', () => {
    it('fetches notifications with correct params', async () => {
      mockGet.mockResolvedValue({ data: { items: [makeItem()], total: 1 } })

      await notificationService.getAll('barista', 1, 20)

      expect(mockGet).toHaveBeenCalledWith('/notifications', { params: { role: 'barista', page: 1, limit: 20 } })
    })

    it('returns items and total', async () => {
      const items = [makeItem(), makeItem({ id: 'n2' })]
      mockGet.mockResolvedValue({ data: { items, total: 10 } })

      const res = await notificationService.getAll('cashier', 2, 5)

      expect(res.data.items).toHaveLength(2)
      expect(res.data.total).toBe(10)
    })
  })

  describe('getUnreadCount', () => {
    it('fetches unread count for role', async () => {
      mockGet.mockResolvedValue({ data: { count: 3 } })

      const res = await notificationService.getUnreadCount('waiter')

      expect(mockGet).toHaveBeenCalledWith('/notifications/unread-count', { params: { role: 'waiter' } })
      expect(res.data.count).toBe(3)
    })
  })

  describe('markRead', () => {
    it('patches the correct endpoint', async () => {
      mockPatch.mockResolvedValue({ data: {} })

      await notificationService.markRead('notif-abc')

      expect(mockPatch).toHaveBeenCalledWith('/notifications/notif-abc/read')
    })
  })

  describe('markAllRead', () => {
    it('patches read-all with role param', async () => {
      mockPatch.mockResolvedValue({ data: { success: true } })

      await notificationService.markAllRead('admin')

      expect(mockPatch).toHaveBeenCalledWith('/notifications/read-all', null, { params: { role: 'admin' } })
    })
  })
})
