import apiClient from '../config/axios'
import { createCrudService } from './crud.service'
import type { ListParams } from './crud.service'

export const ingredientService = {
  ...createCrudService('/ingredients'),
  stockStats: () => apiClient.get('/ingredients/stock-stats'),
  stockImports: (params?: ListParams) => apiClient.get('/ingredients/stock-imports/list', { params }),
  createStockImport: (data: unknown) => apiClient.post('/ingredients/stock-imports', data),
  stockExports: (params?: ListParams) => apiClient.get('/ingredients/stock-exports/list', { params }),
  createStockExport: (data: unknown) => apiClient.post('/ingredients/stock-exports', data),
  forecast: () => apiClient.get('/ingredients/forecast'),
}
