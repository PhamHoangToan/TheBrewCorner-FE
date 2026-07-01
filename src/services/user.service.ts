import apiClient from '../config/axios'
import { createCrudService } from './crud.service'

const crud = createCrudService('/users')

export const userService = {
  ...crud,
  staffList: (params?: Parameters<typeof crud.list>[0]) => crud.list({ ...params, staffOnly: true }),
  changePassword: (id: string, data: { currentPassword: string; newPassword: string }) =>
    apiClient.patch(`/users/${id}/change-password`, data),
}
