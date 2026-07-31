import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

export type ThemeMode = 'light' | 'dark'
export type TaskView = 'list' | 'kanban' | 'calendar' | 'timeline'

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
  mode: ThemeMode
  language: 'en' | 'ru'
  snackbars: SnackbarItem[]
  modal: ModalState
  searchOpen: boolean
  commandPaletteOpen: boolean
  pinnedFocusEntityKey: string | null
  lastTaskView: TaskView

  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleTheme: () => void
  setMode: (mode: ThemeMode) => void
  setLanguage: (language: UIState['language']) => void
  addSnackbar: (snackbar: Omit<SnackbarItem, 'id'>) => void
  removeSnackbar: (id: string) => void
  openModal: (type: string, data?: Record<string, unknown>) => void
  closeModal: () => void
  setSearchOpen: (open: boolean) => void
  setCommandPaletteOpen: (open: boolean) => void
  setPinnedFocusEntityKey: (entityKey: string | null) => void
  setLastTaskView: (view: TaskView) => void
}

export function partializeUIState(state: UIState) {
  return {
    mode: state.mode,
    language: state.language,
    sidebarCollapsed: state.sidebarCollapsed,
    pinnedFocusEntityKey: state.pinnedFocusEntityKey,
    lastTaskView: state.lastTaskView,
  }
}

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set) => ({
        sidebarOpen: true,
        sidebarCollapsed: false,
        mode: 'dark',
        language: 'ru',
        snackbars: [],
        modal: { isOpen: false, type: null, data: null },
        searchOpen: false,
        commandPaletteOpen: false,
        pinnedFocusEntityKey: null,
        lastTaskView: 'list',

        toggleSidebar: () =>
          set((state) => ({ sidebarOpen: !state.sidebarOpen })),
        setSidebarOpen: (open) => set({ sidebarOpen: open }),
        setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
        toggleTheme: () =>
          set((state) => ({ mode: state.mode === 'dark' ? 'light' : 'dark' })),
        setMode: (mode) => set({ mode }),
        setLanguage: (language) => set({ language }),

        addSnackbar: (snackbar) =>
          set((state) => ({
            snackbars: [
              ...state.snackbars,
              { ...snackbar, id: crypto.randomUUID() },
            ],
          })),
        removeSnackbar: (id) =>
          set((state) => ({
            snackbars: state.snackbars.filter((s) => s.id !== id),
          })),

        openModal: (type, data) =>
          set({ modal: { isOpen: true, type, data: data ?? null } }),
        closeModal: () =>
          set({ modal: { isOpen: false, type: null, data: null } }),

        setSearchOpen: (open) => set({ searchOpen: open }),
        setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
        setPinnedFocusEntityKey: (entityKey) => set({ pinnedFocusEntityKey: entityKey }),
        setLastTaskView: (lastTaskView) => set({ lastTaskView }),
      }),
      {
        name: 'ui-store',
        partialize: partializeUIState,
      },
    ),
  ),
)
