// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { ThemeProvider } from '@mui/material/styles'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import theme from '@/lib/theme'
import CalendarPage from './CalendarPage'

const mocks = vi.hoisted(() => ({
  tasks: [] as any[],
  projects: [
    { id: 'p1', name: 'CRM', is_archived: false },
    { id: 'p2', name: 'Platform', is_archived: false },
  ] as any[],
}))

vi.mock('@/lib/hooks/useTasks', () => ({
  useTasks: () => ({ tasks: mocks.tasks, loading: false, error: null }),
}))

vi.mock('@/lib/hooks/useProjects', () => ({
  useProjects: () => ({ projects: mocks.projects, loading: false, error: null }),
}))

vi.mock('@/lib/store/authStore', () => ({
  useAuthStore: (selector: (state: { user: { id: string } }) => unknown) => selector({ user: { id: 'u1' } }),
}))

vi.mock('@/components/tasks/TaskDetailDialog', () => ({ default: () => null }))

function LocationProbe() {
  const location = useLocation()
  return <output aria-label="current search">{location.search}</output>
}

function renderCalendar(path: string) {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/calendar" element={<><CalendarPage /><LocationProbe /></>} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  )
}

function task(overrides: Record<string, unknown>) {
  return {
    id: crypto.randomUUID(),
    title: 'Task',
    status: 'todo',
    workflow_status: 'ready',
    priority: 'medium',
    due_date: new Date().toISOString(),
    project_id: 'p1',
    next_action_owner_id: 'u1',
    assignee_id: null,
    is_blocked: false,
    ...overrides,
  }
}

beforeEach(() => {
  mocks.tasks = []
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Calendar URL filters', () => {
  it('selects and applies project_id, then preserves other params when project chips change', async () => {
    mocks.tasks = [
      task({ id: 'crm-task', title: 'CRM action', project_id: 'p1' }),
      task({ id: 'platform-task', title: 'Platform action', project_id: 'p2' }),
    ]

    renderCalendar('/calendar?project_id=p1&preset=my-actions&sort=priority')

    expect(screen.getByText('CRM').closest('.MuiChip-root')).toHaveClass('MuiChip-colorPrimary')
    expect(screen.queryAllByText('CRM action').length).toBeGreaterThan(0)
    expect(screen.queryAllByText('Platform action')).toHaveLength(0)

    fireEvent.click(screen.getByText('Platform'))

    await waitFor(() => {
      expect(screen.getByLabelText('current search')).toHaveTextContent('?project_id=p2&preset=my-actions&sort=priority')
    })
    expect(screen.queryAllByText('CRM action')).toHaveLength(0)
    expect(screen.queryAllByText('Platform action').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByText('Все проекты'))

    await waitFor(() => {
      expect(screen.getByLabelText('current search')).toHaveTextContent('?preset=my-actions&sort=priority')
    })
  })

  it('applies my-actions with the current user context', () => {
    mocks.tasks = [
      task({ id: 'mine', title: 'My action', next_action_owner_id: 'u1' }),
      task({ id: 'other', title: 'Other action', next_action_owner_id: 'u2' }),
      task({ id: 'waiting', title: 'My waiting', workflow_status: 'waiting_for_client' }),
    ]

    renderCalendar('/calendar?preset=my-actions')

    expect(screen.queryAllByText('My action').length).toBeGreaterThan(0)
    expect(screen.queryAllByText('Other action')).toHaveLength(0)
    expect(screen.queryAllByText('My waiting')).toHaveLength(0)
  })

  it('applies my-waiting with the current user context', () => {
    mocks.tasks = [
      task({ id: 'action', title: 'My action' }),
      task({ id: 'waiting', title: 'My waiting', workflow_status: 'waiting_for_client' }),
      task({ id: 'other-waiting', title: 'Other waiting', next_action_owner_id: 'u2', workflow_status: 'waiting_for_client' }),
    ]

    renderCalendar('/calendar?preset=my-waiting')

    expect(screen.queryAllByText('My waiting').length).toBeGreaterThan(0)
    expect(screen.queryAllByText('My action')).toHaveLength(0)
    expect(screen.queryAllByText('Other waiting')).toHaveLength(0)
  })
})
