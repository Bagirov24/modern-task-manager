// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { ThemeProvider } from '@mui/material/styles'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import theme from '@/lib/theme'
import ActionInboxPage from './ActionInboxPage'

const mocks = vi.hoisted(() => ({ list: vi.fn(), get: vi.fn(), projects: vi.fn() }))

vi.mock('@/lib/api/communicationApi', () => ({
  communicationApi: {
    list: mocks.list,
    get: mocks.get,
    update: vi.fn(),
    create: vi.fn(),
    createTask: vi.fn(),
  },
}))
vi.mock('@/lib/api/projectApi', () => ({ projectApi: { list: mocks.projects } }))
vi.mock('@/lib/store/authStore', () => ({
  useAuthStore: (selector: (state: { user: { id: string } }) => unknown) => selector({ user: { id: 'me' } }),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function wrapper(children: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={['/inbox?scope=my-waiting&action_status=waiting_for_reply&item=comm-1']}>
          {children}
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

describe('Action Inbox Dashboard URLs', () => {
  it('consumes scope, status, and item deep-link parameters', async () => {
    const selected = {
      id: 'comm-1', subject: 'Выбранный ответ', body_preview: 'Ждём подтверждение', source_type: 'email',
      sender_name: 'Клиент', sender_role: 'client', action_status: 'waiting_for_reply', action_owner_id: 'me',
      waiting_for_party: 'client', importance: 'normal', needs_reply: true,
    }
    mocks.projects.mockResolvedValue({ data: { projects: [] } })
    mocks.list.mockResolvedValue({ data: { items: [], total: 0, groups: {}, page: 1, per_page: 100 } })
    mocks.get.mockResolvedValue({ data: selected })

    render(wrapper(<ActionInboxPage />))

    await waitFor(() => expect(mocks.get).toHaveBeenCalledWith('comm-1'))
    expect(mocks.list).toHaveBeenCalledWith(expect.objectContaining({ action_status: 'waiting_for_reply', active_only: true }))
    expect((await screen.findByText('Выбранный ответ')).closest('[aria-current="true"]')).toBeVisible()
  })
})
