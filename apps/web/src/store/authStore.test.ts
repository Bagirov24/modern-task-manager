// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const get = vi.fn()
  return {
    get,
    apiClient: {
      get,
      post: vi.fn(),
      patch: vi.fn(),
      defaults: { headers: { common: {} as Record<string, string> } },
    },
  }
})

vi.mock('axios', () => ({
  default: {
    create: () => mocks.apiClient,
    isAxiosError: (error: unknown) => Boolean((error as { isAxiosError?: boolean })?.isAxiosError),
  },
}))

import { useAuthStore, type User } from './authStore'

const user: User = {
  id: 'manager-1',
  email: 'manager@example.com',
  username: 'manager',
  full_name: 'Manager',
  created_at: '2026-08-01T00:00:00Z',
}

function setAuthenticatedState() {
  useAuthStore.setState({
    user,
    token: 'test-access-token',
    isAuthenticated: true,
    isLoading: false,
    error: null,
  })
}

describe('authStore.checkAuth', () => {
  beforeEach(() => {
    localStorage.clear()
    mocks.get.mockReset()
    mocks.apiClient.defaults.headers.common = {}
    setAuthenticatedState()
  })

  it('keeps the local session on a transient rate-limit response', async () => {
    mocks.get.mockRejectedValueOnce({ isAxiosError: true, response: { status: 429 } })

    await useAuthStore.getState().checkAuth()

    expect(useAuthStore.getState()).toMatchObject({
      user,
      token: 'test-access-token',
      isAuthenticated: true,
    })
  })

  it('clears the local session when the token is rejected', async () => {
    mocks.get.mockRejectedValueOnce({ isAxiosError: true, response: { status: 401 } })

    await useAuthStore.getState().checkAuth()

    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      token: null,
      isAuthenticated: false,
    })
  })
})