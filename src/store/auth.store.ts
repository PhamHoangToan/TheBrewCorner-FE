import { create } from 'zustand'

export type Role = 'admin' | 'cashier' | 'barista' | 'waiter'

export interface User {
  id: string
  name: string
  role: Role
  mustChangePassword?: boolean
}

interface AuthState {
  user: User | null
  token: string | null
  setAuth: (user: User, token: string) => void
  setMustChangePassword: (value: boolean) => void
  logout: () => void
}

const STORAGE_KEY = 'brew-auth'

const loadFromStorage = (): { user: User | null; token: string | null } => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { user: null, token: null }
}

const saveToStorage = (user: User | null, token: string | null) => {
  try {
    if (user && token) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, token }))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {}
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  ...loadFromStorage(),
  setAuth: (user, token) => {
    saveToStorage(user, token)
    set({ user, token })
  },
  setMustChangePassword: (value) => {
    const { user, token } = get()
    if (!user) return
    const nextUser = { ...user, mustChangePassword: value }
    saveToStorage(nextUser, token)
    set({ user: nextUser })
  },
  logout: () => {
    saveToStorage(null, null)
    set({ user: null, token: null })
  },
}))
