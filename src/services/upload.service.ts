import apiClient from '../config/axios'

export const uploadService = {
  uploadImage: async (file: File): Promise<string> => {
    const form = new FormData()
    form.append('file', file)
    const res = await apiClient.post<{ url: string }>('/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    // res.data.url is like /uploads/uuid.jpg — prefix the API base host
    const base = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api')
      .replace(/\/api$/, '')
    return `${base}${res.data.url}`
  },
}
