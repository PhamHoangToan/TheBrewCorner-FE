import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../config/axios', () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}))

import apiClient from '../config/axios'
import { reservationService } from './reservation.service'

const mockGet = apiClient.get as ReturnType<typeof vi.fn>
const mockPatch = apiClient.patch as ReturnType<typeof vi.fn>

describe('reservationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('list', () => {
    it('gọi GET /reservations kèm params status/date', async () => {
      mockGet.mockResolvedValue({ data: { items: [], total: 0 } })

      await reservationService.list({ status: 'PENDING', date: '2026-07-10' })

      expect(mockGet).toHaveBeenCalledWith('/reservations', { params: { status: 'PENDING', date: '2026-07-10' } })
    })

    it('cho phép gọi không truyền params', async () => {
      mockGet.mockResolvedValue({ data: { items: [], total: 0 } })
      await reservationService.list()
      expect(mockGet).toHaveBeenCalledWith('/reservations', { params: undefined })
    })
  })

  describe('confirm', () => {
    it('gọi PATCH /reservations/:id/confirm', async () => {
      mockPatch.mockResolvedValue({ data: {} })
      await reservationService.confirm('res-1')
      expect(mockPatch).toHaveBeenCalledWith('/reservations/res-1/confirm')
    })
  })

  describe('cancel', () => {
    it('gọi PATCH /reservations/:id/cancel', async () => {
      mockPatch.mockResolvedValue({ data: {} })
      await reservationService.cancel('res-1')
      expect(mockPatch).toHaveBeenCalledWith('/reservations/res-1/cancel')
    })
  })
})
