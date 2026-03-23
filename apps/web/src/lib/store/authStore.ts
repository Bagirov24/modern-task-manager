import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '@/lib/api/client'

interface AuthUser {
  id: string
  email: string
  username: string
  full_name?: string
}

interface AuthState {
  token: string | null
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (token: string, user: AuthUser) => void
  logout: () => void
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: true,
      login: (token, user) => set({ token, user, isAuthenticated: true, isLoading: false }),
      logout: () => {
        set({ token: null, user: null, isAuthenticated: false, isLoading: false })
      },
      checkAuth: async () => {
        const { token } = get()
        if (!token) {
          set({ isAuthenticated: false, isLoading: false })
          return
        }
        try {
          const { data } = await api.get('/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
          })
          set({ user: data, isAuthenticated: true, isLoading: false })
        } catch {
          set({ token: null, user: null, isAuthenticated: false, isLoading: false })
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, user: state.user, isAuthenticated: state.isAuthenticated }),
    },
  ),
)
