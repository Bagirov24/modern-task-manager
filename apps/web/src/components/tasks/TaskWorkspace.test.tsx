// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { ThemeProvider } from '@mui/material/styles'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import theme from '@/lib/theme'
import { useProjectStore } from '@/store/projectStore'
import { useUIStore } from '@/store/uiStore'
import TasksPage from '@/pages/TasksPage'

const mocks = vi.hoisted(() => ({
  useTasksQuery: vi.fn(),
}))

vi.mock('@/lib/hooks/useTasksQuery', () => ({
  useTasksQuery: (...args: unknown[]) => {
    mocks.useTasksQuery(...args)
    return {
      tasks: [],
      loading: false,
      error: null,
      fetchTasks: vi.fn(),
      deleteTask: vi.fn(),
      updateTask: vi.fn(),
    }
  },
}))

vi.mock('@/lib/store/authStore', () => ({
  useAuthStore: (selector: (state: { user: { id: string } }) => unknown) => selector({ user: { id: 'u1' } }),
}))

vi.mock('./TaskList', () => ({ default: () => <div>List content</div> }))
vi.mock('./KanbanBoard', () => ({ default: () => <div>Kanban content</div> }))
vi.mock('./TimelineView', () => ({ default: () => <div>Timeline content</div> }))
vi.mock('./TaskDetailDialog', () => ({ default: () => null }))

function LocationProbe() {
  const location = useLocation()
  return <output aria-label="current search">{location.search}</output>
}

function renderWorkspace(path: string) {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/tasks" element={<><TasksPage /><LocationProbe /></>} />
          <Route path="/calendar" element={<><div>Calendar page</div><LocationProbe /></>} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  )
}

beforeEach(() => {
  useUIStore.setState({ lastTaskView: 'list' } as never)
  useProjectStore.setState({
    projects: [{ id: 'p1', name: 'CRM' }],
    selectedProject: null,
  } as never)
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('task workspace', () => {
  it('restores the last task view when the URL does not choose one', () => {
    useUIStore.setState({ lastTaskView: 'timeline' } as never)

    renderWorkspace('/tasks')

    expect(screen.getByRole('tab', { name: 'Timeline' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Timeline content')).toBeVisible()
  })

  it('shows active filters as removable chips and preserves unrelated URL parameters', async () => {
    renderWorkspace('/tasks?preset=overdue&project_id=p1&sort=priority')

    fireEvent.click(screen.getByRole('button', { name: 'Удалить фильтр Просрочено' }))

    await waitFor(() => {
      expect(screen.getByLabelText('current search')).toHaveTextContent('?project_id=p1&sort=priority')
    })
    expect(screen.getByRole('button', { name: 'Удалить фильтр CRM' })).toBeVisible()
  })

  it('persists a selected view and keeps existing filters in the URL', async () => {
    renderWorkspace('/tasks?preset=overdue')

    fireEvent.click(screen.getByRole('tab', { name: 'Kanban' }))

    await waitFor(() => {
      expect(screen.getByLabelText('current search')).toHaveTextContent('?preset=overdue&view=kanban')
    })
    expect((useUIStore.getState() as typeof useUIStore extends { getState: () => infer T } ? T : never).lastTaskView).toBe('kanban')
  })

  it('passes the active project filter to the task query', () => {
    renderWorkspace('/tasks?project_id=p1')

    expect(mocks.useTasksQuery).toHaveBeenCalledWith('p1', '')
  })

  it('opens the dedicated calendar route without replacing the saved task view', async () => {
    useUIStore.setState({ lastTaskView: 'timeline' } as never)
    renderWorkspace('/tasks?preset=overdue&project_id=p1&view=timeline')

    fireEvent.click(screen.getByRole('tab', { name: 'Календарь' }))

    expect(await screen.findByText('Calendar page')).toBeVisible()
    expect(screen.getByLabelText('current search')).toHaveTextContent('?preset=overdue&project_id=p1')
    expect(useUIStore.getState().lastTaskView).toBe('timeline')
  })

  it('redirects a direct calendar task view without rendering list content', async () => {
    useUIStore.setState({ lastTaskView: 'kanban' } as never)
    renderWorkspace('/tasks?view=calendar&preset=today&project_id=p1')

    expect(await screen.findByText('Calendar page')).toBeVisible()
    expect(screen.queryByText('List content')).not.toBeInTheDocument()
    expect(screen.getByLabelText('current search')).toHaveTextContent('?preset=today&project_id=p1')
    expect(useUIStore.getState().lastTaskView).toBe('kanban')
  })

  it('constrains and wraps header actions for narrow viewports', () => {
    renderWorkspace('/tasks')

    const actionsStyle = getComputedStyle(screen.getByTestId('page-header-actions'))
    const switcherStyle = getComputedStyle(screen.getByTestId('task-view-switcher'))

    expect(actionsStyle.width).toBe('100%')
    expect(actionsStyle.minWidth).toBe('0px')
    expect(actionsStyle.flexWrap).toBe('wrap')
    expect(switcherStyle.minWidth).toBe('0px')
  })
  it('focuses task search with slash unless the user is already editing', () => {
    renderWorkspace('/tasks')
    const search = screen.getByRole('textbox', { name: 'Поиск задач' })

    fireEvent.keyDown(document, { key: '/' })
    expect(search).toHaveFocus()

    const externalInput = document.createElement('input')
    document.body.appendChild(externalInput)
    externalInput.focus()
    fireEvent.keyDown(document, { key: '/' })

    expect(externalInput).toHaveFocus()
    externalInput.remove()
  })
})
