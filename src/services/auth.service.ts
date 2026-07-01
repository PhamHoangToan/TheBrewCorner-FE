import apiClient from '../config/axios'

export interface LoginPayload {
  email?: string
  username?: string
  code?: string
  password?: string
}

export const authService = {
  login: (data: LoginPayload) => apiClient.post('/auth/login', data),
  me: () => apiClient.get('/auth/me'),
}
