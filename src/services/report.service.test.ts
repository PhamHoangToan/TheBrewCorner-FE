import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../config/axios', () => ({
  default: {
    get: vi.fn(),
  },
}))

import apiClient from '../config/axios'
import { reportService } from './report.service'

const mockGet = apiClient.get as ReturnType<typeof vi.fn>

describe('reportService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('revenue — gọi GET /reports/revenue kèm startDate/endDate', async () => {
    mockGet.mockResolvedValue({ data: [] })
    await reportService.revenue({ startDate: '2026-07-01', endDate: '2026-07-10' })
    expect(mockGet).toHaveBeenCalledWith('/reports/revenue', { params: { startDate: '2026-07-01', endDate: '2026-07-10' } })
  })

  it('sales — gọi GET /reports/sales kèm params', async () => {
    mockGet.mockResolvedValue({ data: [] })
    await reportService.sales({ startDate: '2026-07-01', endDate: '2026-07-10' })
    expect(mockGet).toHaveBeenCalledWith('/reports/sales', { params: { startDate: '2026-07-01', endDate: '2026-07-10' } })
  })

  it('revenueByHour — gọi GET /reports/revenue-by-hour', async () => {
    mockGet.mockResolvedValue({ data: [] })
    await reportService.revenueByHour({ startDate: '2026-07-01', endDate: '2026-07-10' })
    expect(mockGet).toHaveBeenCalledWith('/reports/revenue-by-hour', { params: { startDate: '2026-07-01', endDate: '2026-07-10' } })
  })

  it('topProducts — gọi GET /reports/top-products kèm limit', async () => {
    mockGet.mockResolvedValue({ data: [] })
    await reportService.topProducts({ startDate: '2026-07-01', endDate: '2026-07-10', limit: 5 })
    expect(mockGet).toHaveBeenCalledWith('/reports/top-products', {
      params: { startDate: '2026-07-01', endDate: '2026-07-10', limit: 5 },
    })
  })

  it('dashboard — gọi GET /reports/dashboard không kèm params', async () => {
    mockGet.mockResolvedValue({ data: {} })
    await reportService.dashboard()
    expect(mockGet).toHaveBeenCalledWith('/reports/dashboard')
  })
})
