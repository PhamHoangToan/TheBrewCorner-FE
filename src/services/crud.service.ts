import apiClient from '../config/axios'

export type ListParams = Record<string, string | number | boolean | undefined>

export const createCrudService = <T = unknown, CreateDto = Partial<T>, UpdateDto = Partial<T>>(path: string) => ({
  list: (params?: ListParams) => apiClient.get<{ items: T[]; total: number; page: number; limit: number }>(path, { params }),
  get: (id: string) => apiClient.get<T>(`${path}/${id}`),
  create: (data: CreateDto) => apiClient.post<T>(path, data),
  update: (id: string, data: UpdateDto) => apiClient.patch<T>(`${path}/${id}`, data),
  remove: (id: string) => apiClient.delete<{ deleted: boolean }>(`${path}/${id}`),
})
