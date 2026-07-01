import axios from 'axios'
import { useAuthStore } from '../store/auth.store'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api',
  timeout: 15000,
})

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token && token !== 'dev-token') {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  },
)

export default apiClient
