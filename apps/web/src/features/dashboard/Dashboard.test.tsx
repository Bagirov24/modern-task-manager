// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { ThemeProvider } from '@mui/material/styles'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import theme from '@/lib/theme'
import { useUIStore } from '@/store/uiStore'
import type { MyWorkViewModel } from './useMyWork'
import DashboardPage from '@/pages/DashboardPage'

const fixture = vi.hoisted(() => ({ current: null as MyWorkViewModel | null }))

vi.mock('./useMyWork', () => ({
  useMyWork: () => fixture.current,
}))

function action(entityKey: `task:${string}`, title: string) {
  const entityId = entityKey.replace('task:', '')
  return {
    entityKey,
    entityId,
    kind: 'task' as const,
    state: 'actionable' as const,
    title,
    projectId: 'project-1',
    ownerId: 'user-1',
    dueAt: '2026-08-01T09:00:00Z',
    finalDueAt: null,
    priorityRank: 1,
    isBlocked: false,
    nextAction: 'Выполнить следующий шаг',
    sourceLabel: 'Task',
  }
}

function renderDashboardWithFixtures() {
  const actions = [
    action('task:primary', 'Подготовить релиз'),
    action('task:staging', 'Проверить staging'),
    ...Array.from({ length: 6 }, (_, index) => action(`task:extra-${index}`, `Дополнительная задача ${index + 1}`)),
  ]
  fixture.current = {
    focus: { item: actions[0], reason: 'priority' },
    actions,
    waiting: Array.from({ length: 5 }, (_, index) => ({
      ...action(`task:waiting-${index}`, `Ожидание ${index + 1}`),
      state: 'waiting' as const,
    })),
    attention: { overdue: 2, blocked: 1, missingNextAction: 3 },
    projects: Array.from({ length: 7 }, (_, index) => ({
      projectId: `project-${index}`,
      name: `Проект ${index + 1}`,
      progress: 25 + index,
      healthLabel: 'On track' as const,
      reason: 'Работа идёт по плану',
      recommendedAction: 'Продолжать выполнение',
    })),
    loading: false,
    error: null,
    refetch: vi.fn(),
  }
  useUIStore.setState({ pinnedFocusEntityKey: null })

  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </ThemeProvider>,
  )
}

afterEach(() => {
  cleanup()
  fixture.current = null
  useUIStore.setState({ pinnedFocusEntityKey: null })
})

describe('command center dashboard', () => {
  it('orders the daily workflow before team metrics', () => {
    renderDashboardWithFixtures()

    const headings = screen.getAllByRole('heading', { level: 2 })
    expect(headings.map((heading) => heading.textContent)).toEqual([
      'Focus Now', 'Мои действия', 'Жду ответа', 'Команда и проекты',
    ])
  })

  it('lets the user replace and pin the proposed focus', () => {
    renderDashboardWithFixtures()

    fireEvent.click(screen.getByRole('button', { name: 'Сменить задачу' }))
    fireEvent.click(screen.getByRole('option', { name: /Проверить staging/ }))

    expect(useUIStore.getState().pinnedFocusEntityKey).toBe('task:staging')
    expect(screen.getByRole('heading', { level: 6, name: 'Проверить staging' })).toBeVisible()
  })

  it('keeps each command-center section intentionally compact', () => {
    renderDashboardWithFixtures()

    expect(within(screen.getByRole('region', { name: 'Мои действия' })).getAllByRole('listitem')).toHaveLength(7)
    expect(within(screen.getByRole('region', { name: 'Жду ответа' })).getAllByRole('listitem')).toHaveLength(4)
    expect(within(screen.getByRole('region', { name: 'Команда и проекты' })).getAllByRole('listitem')).toHaveLength(6)
  })
})
