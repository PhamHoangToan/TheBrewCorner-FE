import { createCrudService } from './crud.service'
import apiClient from '../config/axios'

const crud = createCrudService('/promotions')

export const promotionService = {
  ...crud,
  valid: (totalAmount: number) => apiClient.get('/promotions/valid', { params: { totalAmount } }),
  validate: (code: string, totalAmount: number) => apiClient.post('/promotions/validate', { code, totalAmount }),
}
