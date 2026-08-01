// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@mui/material/styles'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import theme from '@/lib/theme'
import type { Task } from '@/lib/types'
import TasksPage from '@/pages/TasksPage'
import TaskDetailDialog from '../TaskDetailDialog'
import { useTaskStore } from '@/lib/store/taskStore'
import { useUIStore } from '@/store/uiStore'

const mocks = vi.hoisted(() => ({
  tasks: [] as Task[], taskGet: vi.fn(), communicationList: vi.fn(),
  createTask: vi.fn(), updateTask: vi.fn(), deleteTask: vi.fn(),
}))

vi.mock('@/lib/api/taskApi', () => ({ taskApi: { get: mocks.taskGet } }))
vi.mock('@/lib/api/communicationApi', () => ({ communicationApi: { list: mocks.communicationList } }))
vi.mock('@/lib/hooks/useTasksQuery', () => ({ useTasksQuery: () => ({
  tasks: mocks.tasks, loading: false, error: null, fetchTasks: vi.fn(), deleteTask: vi.fn(), updateTask: vi.fn(),
}) }))
vi.mock('@/hooks/useTasks', () => ({ useTasks: () => ({
  createTask: mocks.createTask, updateTask: mocks.updateTask, deleteTask: mocks.deleteTask,
}) }))
vi.mock('@/hooks/useProjects', () => ({ useProjects: () => ({ projects: [] }) }))
vi.mock('@/lib/api/documentApi', () => ({ documentApi: { list: vi.fn() } }))
vi.mock('@/lib/api/testDataApi', () => ({ testDataApi: { list: vi.fn() } }))
vi.mock('@/lib/api/commentApi', () => ({ commentApi: { getByTask: vi.fn(), create: vi.fn() } }))
vi.mock('@/lib/api/workspaceLinkApi', () => ({ workspaceLinkApi: { listForTask: vi.fn(), list: vi.fn() } }))
vi.mock('@/lib/api/managerStatusApi', () => ({ managerStatusApi: { task: vi.fn() } }))
vi.mock('@/lib/store/authStore', () => ({ useAuthStore: (selector: (state: { user: { id: string; username: string } }) => unknown) => selector({ user: { id: 'manager-1', username: 'Manager' } }) }))

const task: Task = {
  id: 'crm-142', title: 'CRM-142', status: 'in_progress', priority: 'high', position: 0,
  workflow_status: 'in_progress', is_blocked: true, blocked_reason: 'Waiting for API contract',
  next_action_description: 'Confirm API contract', due_date: '2026-07-30T12:00:00Z', final_due_at: '2026-07-30T12:00:00Z',
  response_due_at: '2026-08-02T11:00:00Z', next_action_due_at: '2026-08-03T09:00:00Z',
  manager_id: 'manager-1', manager: { id: 'manager-1', username: 'manager', full_name: 'Manager' },
  assignee_id: 'developer-1', assignee: { id: 'developer-1', username: 'ivan', full_name: 'Ivan Developer' },
  next_action_owner_id: 'developer-1', next_action_owner: { id: 'developer-1', username: 'ivan', full_name: 'Ivan Developer' },
  waiting_for_user_id: 'lawyer-1', waiting_for_user: { id: 'lawyer-1', username: 'lawyer', full_name: 'Legal Team' },
  waiting_for_party: 'internal', risk_level: 'high', context: 'Long-form task context',
}

function Providers({ children, path = '/tasks' }: { children: React.ReactNode; path?: string }) {
  return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <ThemeProvider theme={theme}><MemoryRouter initialEntries={[path]}>{children}</MemoryRouter></ThemeProvider>
  </QueryClientProvider>
}
function LocationProbe() { const location = useLocation(); return <output aria-label="current search">{location.search}</output> }

const originalMatchMedia = window.matchMedia

function NavigationProbe() {
  const navigate = useNavigate()
  return <>
    <button onClick={() => navigate('/tasks?view=list&sort=priority')}>Remove task parameter</button>
    <button onClick={() => navigate('/tasks?task=second&view=list')}>Open second task</button>
  </>
}

beforeEach(() => {
  mocks.tasks = []
  useTaskStore.setState({ filter: {} })
  useUIStore.setState({ modal: { isOpen: false, type: null, data: null } })
  mocks.communicationList.mockResolvedValue({ data: { items: [], total: 0, groups: {}, page: 1, per_page: 50 } })
  mocks.taskGet.mockResolvedValue({ data: task })
  mocks.createTask.mockResolvedValue(task)
  mocks.updateTask.mockResolvedValue(task)
  mocks.deleteTask.mockResolvedValue(undefined)
})
afterEach(() => { cleanup(); vi.clearAllMocks(); window.matchMedia = originalMatchMedia })

describe('task drawer', () => {
  it('shows commitments and all three deadlines before long-form content', () => {
    render(<Providers><TaskDetailDialog open onClose={vi.fn()} task={task} mode="view" /></Providers>)
    const text = screen.getByTestId('task-drawer-paper').textContent || ''
    expect(text.indexOf('Следующее действие')).toBeLessThan(text.indexOf('Контекст'))
    expect(text.indexOf('Финальный срок')).toBeLessThan(text.indexOf('Контекст'))
    expect(text.indexOf('Срок ответа')).toBeLessThan(text.indexOf('Контекст'))
    expect(text.indexOf('Следующее действие до')).toBeLessThan(text.indexOf('Контекст'))
    expect(text).toContain('Ответственный')
    expect(text).toContain('Исполнитель')
  })

  it('keeps the stable five-tab order and loads communications by task id', async () => {
    render(<Providers><TaskDetailDialog open onClose={vi.fn()} task={task} mode="view" /></Providers>)
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent?.replace(/\s+\d+$/, ''))).toEqual(['Обзор', 'Документы', 'Коммуникации', 'Тестирование', 'Активность'])
    fireEvent.click(screen.getAllByRole('tab')[2])
    await waitFor(() => expect(mocks.communicationList).toHaveBeenCalledWith(expect.objectContaining({ task_id: 'crm-142' })))
    expect(await screen.findByText('Для задачи пока нет связанных коммуникаций.')).toBeVisible()
  })

  it('uses the API total for communication counts and discloses truncation', async () => {
    mocks.communicationList.mockResolvedValueOnce({ data: {
      items: [{ id: 'c1', subject: 'API reply', sender_name: 'Developer', body_preview: 'Ready', source_type: 'manual', action_status: 'done' }],
      total: 101, groups: {}, page: 1, per_page: 100,
    } })
    render(<Providers><TaskDetailDialog open onClose={vi.fn()} task={task} mode="view" /></Providers>)
    fireEvent.click(screen.getAllByRole('tab')[2])
    expect(await screen.findByRole('tab', { name: 'Коммуникации 101' })).toBeVisible()
    expect(screen.getByText('Показана 1 из 101 коммуникаций. Полная история доступна во входящих.')).toBeVisible()
  })
  it('uses the full viewport width on mobile', () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('max-width'), media: query, onchange: null,
      addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
    }))
    render(<Providers><TaskDetailDialog open onClose={vi.fn()} task={task} mode="view" /></Providers>)
    expect(screen.getByTestId('task-drawer-paper')).toHaveStyle({ width: '100%' })
    expect(screen.getByRole('button', { name: 'Закрыть' })).toHaveStyle({ minWidth: '44px', minHeight: '44px' })
    expect(screen.getByRole('button', { name: 'Статус' })).toHaveStyle({ minHeight: '44px' })
    expect(screen.getByRole('button', { name: 'Редактировать' })).toHaveStyle({ minWidth: '44px', minHeight: '44px' })
  })

  it('keeps every mobile edit action at least 44px high', async () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('max-width'), media: query, onchange: null,
      addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
    }))
    render(<Providers><TaskDetailDialog open onClose={vi.fn()} task={task} mode="edit" /></Providers>)
    for (const name of ['Удалить', 'Отмена', 'Сохранить']) {
      expect(await screen.findByRole('button', { name })).toHaveStyle({ minHeight: '44px' })
    }
  })

  it('shows the next-action owner and resolves known responsibility identities', () => {
    render(<Providers><TaskDetailDialog open onClose={vi.fn()} task={task} mode="view" /></Providers>)
    const paper = screen.getByTestId('task-drawer-paper')
    expect(paper).toHaveTextContent('Владелец действия')
    expect(paper).toHaveTextContent('Ivan Developer')
    expect(paper).toHaveTextContent('Manager')
    expect(paper).toHaveTextContent('Legal Team')
    expect(paper).not.toHaveTextContent('manager-1')
  })
  it('opens from List, preserves URL state, closes on Escape and restores focus', async () => {
    mocks.tasks = [task]
    render(<Providers path="/tasks?view=list&preset=overdue&sort=priority"><Routes><Route path="/tasks" element={<><TasksPage /><LocationProbe /></>} /></Routes></Providers>)
    const trigger = screen.getByRole('button', { name: 'Открыть задачу CRM-142' })
    trigger.focus()
    fireEvent.click(trigger)
    await waitFor(() => expect(screen.getByLabelText('current search')).toHaveTextContent('view=list&preset=overdue&sort=priority&task=crm-142'))
    fireEvent.keyDown(screen.getByTestId('task-drawer-paper'), { key: 'Escape', code: 'Escape' })
    await waitFor(() => expect(screen.getByLabelText('current search').textContent).toBe('?view=list&preset=overdue&sort=priority'))
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it('opens from Kanban without dropping workspace parameters', async () => {
    mocks.tasks = [task]
    render(<Providers path="/tasks?view=kanban&project_id=p1&sort=priority"><Routes><Route path="/tasks" element={<><TasksPage /><LocationProbe /></>} /></Routes></Providers>)
    fireEvent.click(screen.getByRole('button', { name: 'Открыть задачу CRM-142' }))
    await waitFor(() => expect(screen.getByLabelText('current search').textContent).toBe('?view=kanban&project_id=p1&sort=priority&task=crm-142'))
  })
  it('does not show the previous task while a new direct task is loading', async () => {
    mocks.tasks = [task]
    mocks.taskGet.mockImplementationOnce(() => new Promise(() => {}))
    render(<Providers path="/tasks?task=crm-142&view=list"><Routes><Route path="/tasks" element={<><TasksPage /><LocationProbe /><NavigationProbe /></>} /></Routes></Providers>)
    expect(await screen.findByTestId('task-drawer-paper')).toHaveTextContent('CRM-142')
    fireEvent.click(screen.getByRole('button', { name: 'Open second task', hidden: true }))
    await waitFor(() => expect(mocks.taskGet).toHaveBeenCalledWith('second'))
    await waitFor(() => expect(screen.queryByTestId('task-drawer-paper')).not.toBeInTheDocument())
  })
  it('loads a direct task URL when the task is outside the current list', async () => {
    render(<Providers path="/tasks?task=crm-142&preset=overdue"><Routes><Route path="/tasks" element={<TasksPage />} /></Routes></Providers>)
    await waitFor(() => expect(mocks.taskGet).toHaveBeenCalledWith('crm-142'))
    expect((await screen.findAllByText('CRM-142')).length).toBeGreaterThan(0)
  })
  it('closes when browser navigation removes task and preserves the remaining URL state', async () => {
    mocks.tasks = [task]
    render(<Providers path="/tasks?task=crm-142&view=list&sort=priority"><Routes><Route path="/tasks" element={<><TasksPage /><LocationProbe /><NavigationProbe /></>} /></Routes></Providers>)
    expect(await screen.findByTestId('task-drawer-paper')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Remove task parameter', hidden: true }))
    await waitFor(() => expect(screen.queryByTestId('task-drawer-paper')).not.toBeInTheDocument())
    expect(screen.getByLabelText('current search').textContent).toBe('?view=list&sort=priority')
  })

  it('removes only an invalid direct task id from the URL', async () => {
    mocks.taskGet.mockRejectedValueOnce(new Error('not found'))
    render(<Providers path="/tasks?task=missing&view=list&sort=priority"><Routes><Route path="/tasks" element={<><TasksPage /><LocationProbe /></>} /></Routes></Providers>)
    await waitFor(() => expect(mocks.taskGet).toHaveBeenCalledWith('missing'))
    await waitFor(() => expect(screen.getByLabelText('current search').textContent).toBe('?view=list&sort=priority'))
    expect(screen.queryByTestId('task-drawer-paper')).not.toBeInTheDocument()
  })
  it('removes a stale task parameter before opening create from the global modal flow', async () => {
    mocks.tasks = [task]
    render(<Providers path="/tasks?task=crm-142&view=list&sort=priority"><Routes><Route path="/tasks" element={<><TasksPage /><LocationProbe /></>} /></Routes></Providers>)
    expect(await screen.findByTestId('task-drawer-paper')).toHaveTextContent('CRM-142')
    act(() => useUIStore.getState().openModal('task.create'))
    await waitFor(() => expect(screen.getByLabelText('current search').textContent).toBe('?view=list&sort=priority'))
    expect(await screen.findByRole('textbox', { name: /Название/ })).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'CRM-142' })).not.toBeInTheDocument()
  })
  it('preserves create and save behavior in the drawer', async () => {
    const onClose = vi.fn()
    render(<Providers><TaskDetailDialog open onClose={onClose} task={null} mode="create" /></Providers>)
    fireEvent.change(screen.getByRole('textbox', { name: /Название/ }), { target: { value: 'New manager task' } })
    fireEvent.click(screen.getByRole('button', { name: /Сохранить/ }))
    await waitFor(() => expect(mocks.createTask).toHaveBeenCalledWith(expect.objectContaining({ title: 'New manager task' })))
    expect(onClose).toHaveBeenCalled()
  })

  it('preserves edit and save behavior in the drawer', async () => {
    render(<Providers><TaskDetailDialog open onClose={vi.fn()} task={task} mode="view" /></Providers>)
    fireEvent.click(screen.getByRole('button', { name: 'Редактировать' }))
    fireEvent.change(screen.getByRole('textbox', { name: /Название/ }), { target: { value: 'CRM-142 updated' } })
    fireEvent.click(screen.getByRole('button', { name: /Сохранить/ }))
    await waitFor(() => expect(mocks.updateTask).toHaveBeenCalledWith('crm-142', expect.objectContaining({ title: 'CRM-142 updated' })))
  })

  it('preserves delete behavior in the drawer', async () => {
    const onClose = vi.fn()
    render(<Providers><TaskDetailDialog open onClose={onClose} task={task} mode="edit" /></Providers>)
    fireEvent.click(screen.getByRole('button', { name: /Удалить/ }))
    await waitFor(() => expect(mocks.deleteTask).toHaveBeenCalledWith('crm-142'))
    expect(onClose).toHaveBeenCalled()
  })
})
