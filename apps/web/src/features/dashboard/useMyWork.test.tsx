// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildProjectSummaries, useMyWork } from './useMyWork'

const mocks = vi.hoisted(() => ({
  tasks: vi.fn(),
  projects: vi.fn(),
  communications: vi.fn(),
  projectStats: vi.fn(),
}))

vi.mock('@/lib/hooks/useTasksQuery', () => ({ useTasksQuery: mocks.tasks }))
vi.mock('@/lib/hooks/useProjectsQuery', () => ({ useProjectsQuery: mocks.projects }))
vi.mock('@/lib/api/communicationApi', () => ({ communicationApi: { list: mocks.communications } }))
vi.mock('@/lib/api/projectApi', () => ({ projectApi: { stats: mocks.projectStats } }))
vi.mock('@/lib/store/authStore', () => ({
  useAuthStore: (selector: (state: { user: { id: string } }) => unknown) => selector({ user: { id: 'me' } }),
}))

const task = (id: string, ownerId: string | null, workflow_status = 'ready') => ({
  id,
  title: id,
  status: 'todo',
  workflow_status,
  priority: 'medium',
  next_action_owner_id: ownerId,
  is_blocked: false,
})

const communication = (id: string, ownerId: string | null, action_status = 'needs_my_reply') => ({
  id,
  body_preview: id,
  source_type: 'email',
  action_status,
  action_owner_id: ownerId,
  waiting_for_party: action_status === 'waiting_for_reply' ? 'client' : 'none',
  importance: 'normal',
})

function wrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

function taskQuery(overrides: Record<string, unknown> = {}) {
  return { tasks: [], loading: false, error: null, fetchTasks: vi.fn(), ...overrides }
}

function projectQuery(overrides: Record<string, unknown> = {}) {
  return { projects: [], loading: false, error: null, fetchProjects: vi.fn(), ...overrides }
}

beforeEach(() => {
  mocks.tasks.mockReset()
  mocks.projects.mockReset()
  mocks.communications.mockReset()
  mocks.projectStats.mockReset()
  mocks.tasks.mockReturnValue(taskQuery())
  mocks.projects.mockReturnValue(projectQuery())
  mocks.communications.mockResolvedValue({ data: { items: [], total: 0, groups: {}, page: 1, per_page: 100 } })
  mocks.projectStats.mockResolvedValue({ data: { total_tasks: 0, completed_tasks: 0, overdue_count: 0, progress: 0, by_status: {}, by_priority: {} } })
})

describe('useMyWork query composition', () => {
  it('scopes actions, waiting, and focus to explicitly owned task and communication work', async () => {
    mocks.tasks.mockReturnValue(taskQuery({ tasks: [
      task('task-mine', 'me'),
      task('task-waiting', 'me', 'waiting_for_client'),
      task('task-other', 'other'),
      task('task-unassigned', null),
    ] }))
    mocks.communications.mockResolvedValue({ data: { items: [
      communication('comm-mine', 'me'),
      communication('comm-waiting', 'me', 'waiting_for_reply'),
      communication('comm-other', 'other'),
      communication('comm-unassigned', null),
    ], total: 4, groups: {}, page: 1, per_page: 100 } })

    const { result } = renderHook(() => useMyWork(), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.actions).toHaveLength(2))

    expect(result.current.actions.map((item) => item.entityKey).sort()).toEqual(['communication:comm-mine', 'task:task-mine'])
    expect(result.current.waiting.map((item) => item.entityKey).sort()).toEqual(['communication:comm-waiting', 'task:task-waiting'])
    expect(result.current.focus?.item.ownerId).toBe('me')
  })

  it('keeps successful communication work visible when tasks fail', async () => {
    mocks.tasks.mockReturnValue(taskQuery({ error: 'Задачи недоступны' }))
    mocks.communications.mockResolvedValue({ data: { items: [communication('comm-mine', 'me')], total: 1, groups: {}, page: 1, per_page: 100 } })

    const { result } = renderHook(() => useMyWork(), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.actions).toHaveLength(1))

    expect(result.current.states.actions.error).toBeNull()
    expect(result.current.states.actions.warning).toContain('Задачи недоступны')
    expect(result.current.states.projects.error).toBeNull()
  })

  it('isolates a project failure from personal work sections', async () => {
    mocks.tasks.mockReturnValue(taskQuery({ tasks: [task('task-mine', 'me')] }))
    mocks.projects.mockReturnValue(projectQuery({ error: 'Проекты недоступны' }))

    const { result } = renderHook(() => useMyWork(), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.actions).toHaveLength(1))

    expect(result.current.states.actions.error).toBeNull()
    expect(result.current.states.projects.error).toBe('Проекты недоступны')
  })

  it('keeps the project section loading until authoritative stats arrive', async () => {
    mocks.projects.mockReturnValue(projectQuery({ projects: [
      { id: 'large', name: 'Большой проект', task_count: 150, is_overdue: false, status: 'active' },
    ] }))
    mocks.projectStats.mockReturnValue(new Promise(() => undefined))

    const { result } = renderHook(() => useMyWork(), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.states.projects.loading).toBe(true))
  })

  it('loads complete project stats instead of deriving progress from the task list page', async () => {
    mocks.projects.mockReturnValue(projectQuery({ projects: [
      { id: 'large', name: 'Большой проект', task_count: 150, is_overdue: false, status: 'active' },
    ] }))
    mocks.projectStats.mockResolvedValue({ data: { total_tasks: 150, completed_tasks: 120, overdue_count: 0, progress: 80, by_status: {}, by_priority: {} } })

    const { result } = renderHook(() => useMyWork(), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.projects[0]?.progress).toBe(80))

    expect(mocks.projectStats).toHaveBeenCalledWith('large')
    expect(result.current.projects[0].healthLabel).toBe('On track')
  })
})

describe('project summary completeness', () => {
  it('uses complete project aggregates instead of risk counts from a partial 100-task page', () => {
    const project = { id: 'large', name: 'Большой проект', task_count: 150, is_overdue: false, status: 'active' } as any
    const stats = { large: { total_tasks: 150, completed_tasks: 120, overdue_count: 0, progress: 80, by_status: {}, by_priority: {} } }

    const [summary] = buildProjectSummaries([project], stats)

    expect(summary.progress).toBe(80)
    expect(summary.healthLabel).toBe('On track')
    expect(summary.reason).toBe('Критических отклонений по сводке проекта нет')
  })

  it('names an overdue project deadline as the off-track reason', () => {
    const [summary] = buildProjectSummaries([
      { id: 'late', name: 'Просроченный проект', task_count: 0, is_overdue: true } as any,
    ], {})

    expect(summary.healthLabel).toBe('Off track')
    expect(summary.reason).toContain('Срок проекта просрочен')
  })
})
