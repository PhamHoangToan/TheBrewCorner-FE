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
  forgotPassword: (email: string) => apiClient.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, newPassword: string) => apiClient.post('/auth/reset-password', { token, newPassword }),
}
