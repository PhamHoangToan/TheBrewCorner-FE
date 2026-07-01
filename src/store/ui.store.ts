import { create } from 'zustand'

const STORAGE_KEY = 'brew-ui-collapsed'

interface UiStore {
  collapsed: boolean
  toggleCollapsed: () => void
  mobileOpen: boolean
  setMobileOpen: (open: boolean) => void
  toggleMobileOpen: () => void
}

const readCollapsed = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export const useUiStore = create<UiStore>((set) => ({
  collapsed: readCollapsed(),
  toggleCollapsed: () =>
    set((state) => {
      const next = !state.collapsed
      try { localStorage.setItem(STORAGE_KEY, String(next)) } catch {}
      return { collapsed: next }
    }),
  mobileOpen: false,
  setMobileOpen: (open) => set({ mobileOpen: open }),
  toggleMobileOpen: () => set((state) => ({ mobileOpen: !state.mobileOpen })),
}))
