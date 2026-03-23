import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface SnackbarItem {
  id: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  duration: number
}

interface ModalState {
  isOpen: boolean
  type: string | null
  data: Record<string, unknown> | null
}

interface UIState {
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  theme: 'light' | 'dark' | 'system'
  language: 'en' | 'ru'
  snackbars: SnackbarItem[]
  modal: ModalState
  searchOpen: boolean
  commandPaletteOpen: boolean

  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setTheme: (theme: UIState['theme']) => void
  setLanguage: (language: UIState['language']) => void
  addSnackbar: (snackbar: Omit<SnackbarItem, 'id'>) => void
  removeSnackbar: (id: string) => void
  openModal: (type: string, data?: Record<string, unknown>) => void
  closeModal: () => void
  setSearchOpen: (open: boolean) => void
  setCommandPaletteOpen: (open: boolean) => void
}

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set) => ({
        sidebarOpen: true,
        sidebarCollapsed: false,
        theme: 'system',
        language: 'ru',
        snackbars: [],
        modal: { isOpen: false, type: null, data: null },
        searchOpen: false,
        commandPaletteOpen: false,

        toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
        setSidebarOpen: (open) => set({ sidebarOpen: open }),
        setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
        setTheme: (theme) => set({ theme }),
        setLanguage: (language) => set({ language }),
        addSnackbar: (snackbar) => set((state) => ({
          snackbars: [...state.snackbars, { ...snackbar, id: crypto.randomUUID() }]
        })),
        removeSnackbar: (id) => set((state) => ({
          snackbars: state.snackbars.filter(s => s.id !== id)
        })),
        openModal: (type, data) => set({
          modal: { isOpen: true, type, data: data || null }
        }),
        closeModal: () => set({
          modal: { isOpen: false, type: null, data: null }
        }),
        setSearchOpen: (open) => set({ searchOpen: open }),
        setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
      }),
      {
        name: 'ui-store',
        partialize: (state) => ({
          theme: state.theme,
          language: state.language,
          sidebarCollapsed: state.sidebarCollapsed,
        }),
      }
    )
  )
)
