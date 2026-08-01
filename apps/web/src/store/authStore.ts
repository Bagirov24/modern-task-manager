import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import axios from 'axios'

const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

export interface User {
  id: string
  email: string
  username: string
  full_name: string
  avatar_url?: string
  created_at: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  updateProfile: (data: Partial<User>) => Promise<void>
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
  clearError: () => void
  checkAuth: () => Promise<void>
}

interface RegisterData {
  email: string
  username: string
  password: string
  full_name: string
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,

        login: async (email, password) => {
          set({ isLoading: true, error: null })
          try {
            const resp = await apiClient.post('/auth/login', { email, password })
            const { access_token } = resp.data
            apiClient.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
            const profile = await apiClient.get('/auth/me')
            set({ token: access_token, user: profile.data, isAuthenticated: true, isLoading: false })
          } catch (err: any) {
            set({
              error: err.response?.data?.detail || 'Login failed',
              isLoading: false,
            })
            throw err
          }
        },

        register: async (data) => {
          set({ isLoading: true, error: null })
          try {
            await apiClient.post('/auth/register', data)
            await get().login(data.email, data.password)
          } catch (err: any) {
            set({
              error: err.response?.data?.detail || 'Registration failed',
              isLoading: false,
            })
            throw err
          }
        },

        logout: () => {
          set({ user: null, token: null, isAuthenticated: false, error: null })
          delete apiClient.defaults.headers.common['Authorization']
        },

        updateProfile: async (data) => {
          set({ isLoading: true })
          try {
            const resp = await apiClient.patch('/auth/profile', data)
            set({ user: resp.data, isLoading: false })
          } catch (err: any) {
            set({ error: err.response?.data?.detail || 'Update failed', isLoading: false })
            throw err
          }
        },

        setUser: (user) => set({ user, isAuthenticated: !!user }),
        setToken: (token) => {
          set({ token })
          if (token) {
            apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`
          } else {
            delete apiClient.defaults.headers.common['Authorization']
          }
        },
        clearError: () => set({ error: null }),
        checkAuth: async () => {
          const token = get().token
          if (!token) return
          try {
            apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`
            const resp = await apiClient.get('/auth/me')
            set({ user: resp.data, isAuthenticated: true })
          } catch (error) {
            const status = axios.isAxiosError(error) ? error.response?.status : undefined
            if (status === 401 || status === 403) get().logout()
          }
        },
      }),
      { name: 'auth-storage' }
    )
  )
)
