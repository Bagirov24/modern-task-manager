// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { ThemeProvider } from '@mui/material/styles'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import theme from '@/lib/theme'
import { useUIStore } from '@/store/uiStore'
import Layout from './Layout'

vi.mock('@/lib/hooks/useKeyboardShortcuts', () => ({
  useGlobalShortcuts: vi.fn(),
}))

vi.mock('@/components/tasks/QuickTaskDialog', () => ({
  default: () => null,
}))

vi.mock('./Header', () => ({
  default: () => <header />,
}))

vi.mock('@/lib/socket/socketClient', () => ({
  disconnectSocket: vi.fn(),
}))

vi.mock('@/lib/store/authStore', () => ({
  useAuthStore: (selector: (state: { user: { full_name: string; username: string; email: string }; logout: () => void }) => unknown) => selector({
    user: { full_name: 'Тестовый пользователь', username: 'tester', email: 'tester@example.com' },
    logout: vi.fn(),
  }),
}))

afterEach(() => {
  cleanup()
  useUIStore.setState({ sidebarCollapsed: false, sidebarOpen: false })
})

function setViewport(width: number) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: query.includes('max-width') && width < 900,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  })
}

function renderShell(path: string, width: number) {
  setViewport(width)
  useUIStore.setState({ sidebarCollapsed: false, sidebarOpen: false })

  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[path]}>
        <Layout><div>Рабочая область</div></Layout>
      </MemoryRouter>
    </ThemeProvider>,
  )
}

describe('app shell', () => {
  it('groups navigation by user intent', () => {
    renderShell('/tasks', 1440)

    expect(screen.getByText('Моя работа')).toBeVisible()
    expect(screen.getByText('Планирование')).toBeVisible()
    expect(screen.getByText('Знания')).toBeVisible()
    expect(screen.getByText('Управление')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Мои задачи' })).toHaveAttribute('aria-current', 'page')
  })

  it('renders five mobile destinations', () => {
    renderShell('/', 390)

    expect(screen.getByRole('navigation', { name: 'Основная навигация' }).querySelectorAll('a')).toHaveLength(5)
  })
})
