import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../config/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

import apiClient from '../config/axios'
import { ingredientService } from './ingredient.service'

const mockGet = apiClient.get as ReturnType<typeof vi.fn>

describe('ingredientService.forecast', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('gọi GET /ingredients/forecast', async () => {
    mockGet.mockResolvedValue({ data: [] })

    await ingredientService.forecast()

    expect(mockGet).toHaveBeenCalledWith('/ingredients/forecast')
  })

  it('trả về danh sách dự báo từ BE', async () => {
    const forecast = [{
      ingredientId: 'ing-1',
      name: 'Sữa tươi',
      unit: 'lít',
      stockQuantity: 5,
      avgDailyUsage: 1.2,
      daysUntilStockout: 4.2,
      predictedStockoutDate: '2026-07-15T00:00:00.000Z',
      hasEnoughData: true,
    }]
    mockGet.mockResolvedValue({ data: forecast })

    const res = await ingredientService.forecast()

    expect(res.data).toEqual(forecast)
  })
})
