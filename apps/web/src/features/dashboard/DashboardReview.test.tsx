// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { ThemeProvider } from '@mui/material/styles'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import theme from '@/lib/theme'
import type { ActionItem } from '@/features/work/types'
import ActionQueue from './ActionQueue'
import FocusNowCard from './FocusNowCard'
import TeamRadar from './TeamRadar'
import WaitingQueue from './WaitingQueue'

const state = { loading: false, error: null, warning: null, retry: vi.fn() }

afterEach(cleanup)

function item(values: Partial<ActionItem>): ActionItem {
  return {
    entityKey: 'task:review',
    entityId: 'review',
    kind: 'task',
    state: 'actionable',
    title: 'Проверить результат',
    projectId: null,
    ownerId: 'me',
    dueAt: null,
    finalDueAt: null,
    priorityRank: 2,
    isBlocked: false,
    nextAction: null,
    sourceLabel: 'Task',
    sourceStatus: 'review',
    waitingParty: null,
    ...values,
  } as ActionItem
}

function renderSections() {
  const review = item({})
  const ready = item({ entityKey: 'task:ready', entityId: 'ready', title: 'Начать задачу', sourceStatus: 'ready' })
  const clientWait = item({
    entityKey: 'communication:client-wait', entityId: 'client-wait', kind: 'reply', state: 'waiting',
    title: 'Получить ответ клиента', sourceLabel: 'email', sourceStatus: 'waiting_for_reply', waitingParty: 'client',
  })
  const replyWait = item({
    entityKey: 'communication:reply-wait', entityId: 'reply-wait', kind: 'reply', state: 'waiting',
    title: 'Получить обычный ответ', sourceLabel: 'email', sourceStatus: 'waiting_for_reply', waitingParty: 'none',
  })
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <FocusNowCard focus={{ item: review, reason: 'priority' }} candidates={[review]} state={state} />
        <ActionQueue items={[review, ready]} state={state} />
        <WaitingQueue items={[clientWait, replyWait]} state={state} />
        <TeamRadar attention={{ overdue: 1, blocked: 1, missingNextAction: 1 }} projects={[]} state={state} />
      </MemoryRouter>
    </ThemeProvider>,
  )
}

describe('dashboard review corrections', () => {
  it('renders source-accurate review, not-started, client-wait, and reply-wait statuses', () => {
    renderSections()

    expect(screen.getAllByLabelText('Статус: На проверке')).toHaveLength(2)
    expect(screen.getByLabelText('Статус: Ready')).toBeVisible()
    expect(screen.getByLabelText('Статус: Ждём клиента')).toBeVisible()
    expect(screen.getByLabelText('Статус: Ждём ответа')).toBeVisible()
  })

  it('links unified queues to truthful source-specific filtered views', () => {
    renderSections()

    expect(screen.getByRole('link', { name: 'Мои задачи' })).toHaveAttribute('href', '/tasks?view=list&preset=my-actions')
    expect(screen.getByRole('link', { name: 'Мои ответы' })).toHaveAttribute('href', '/inbox?scope=my-actions')
    expect(screen.getByRole('link', { name: 'Задачи в ожидании' })).toHaveAttribute('href', '/tasks?view=list&preset=my-waiting')
    expect(screen.getByRole('link', { name: 'Ожидания во входящих' })).toHaveAttribute('href', '/inbox?scope=my-waiting')
    expect(screen.getByText('Без следующего действия: 1').closest('a')).toBeNull()
  })

  it('keeps successful section content visible alongside a partial-source warning', () => {
    const review = item({})
    render(
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <ActionQueue items={[review]} state={{ ...state, warning: 'Сообщения недоступны' }} />
        </MemoryRouter>
      </ThemeProvider>,
    )

    expect(screen.getByText('Проверить результат')).toBeVisible()
    expect(screen.getByText(/Показаны неполные данные.*Сообщения недоступны/)).toBeVisible()
  })
})
