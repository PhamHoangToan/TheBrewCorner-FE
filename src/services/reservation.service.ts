import apiClient from '../config/axios'

export const reservationService = {
  list: (params?: { status?: string; date?: string }) =>
    apiClient.get('/reservations', { params }),
  confirm: (id: string) => apiClient.patch(`/reservations/${id}/confirm`),
  cancel: (id: string) => apiClient.patch(`/reservations/${id}/cancel`),
}
