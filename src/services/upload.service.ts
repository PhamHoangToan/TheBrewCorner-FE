import apiClient from '../config/axios'

export const uploadService = {
  uploadImage: async (file: File): Promise<string> => {
    const form = new FormData()
    form.append('file', file)
    const res = await apiClient.post<{ url: string }>('/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    // BE now uploads to Cloudinary and returns an absolute URL directly.
    // Kept the relative-path fallback for backward compatibility with any
    // stale deployment still returning the old `/uploads/xxx.jpg` shape.
    if (/^https?:\/\//.test(res.data.url)) return res.data.url
    const base = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api')
      .replace(/\/api$/, '')
    return `${base}${res.data.url}`
  },
}
