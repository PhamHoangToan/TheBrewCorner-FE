import { createCrudService } from './crud.service'

export interface Supplier {
  id: string
  code: string
  name: string
  phone?: string | null
  address?: string | null
  note?: string | null
  createdAt: string
  _count?: { imports: number }
}

export const supplierService = createCrudService<Supplier>('/suppliers')
