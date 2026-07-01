import apiClient from '../config/axios'
import { createCrudService } from './crud.service'

export const invoiceService = {
  ...createCrudService('/invoices'),
  pay: (id: string, data: unknown) => apiClient.post(`/invoices/${id}/payments`, data),
}
