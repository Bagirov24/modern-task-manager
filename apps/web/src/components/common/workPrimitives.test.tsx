// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AttentionState from './AttentionState'
import DeadlineIndicator from './DeadlineIndicator'
import StatusBadge from './StatusBadge'
import type { WorkflowStatus } from '../../lib/types'

afterEach(cleanup)

const statusLabels: Array<[WorkflowStatus, string]> = [
  ['inbox', 'Входящие'],
  ['backlog', 'Backlog'],
  ['clarification_needed', 'Нужно уточнение'],
  ['planned', 'Запланировано'],
  ['ready', 'Ready'],
  ['in_progress', 'В работе'],
  ['waiting_for_internal', 'Ждём команду'],
  ['waiting_for_client', 'Ждём клиента'],
  ['review', 'На проверке'],
  ['ready_to_send', 'Готово к отправке'],
  ['done', 'Готово'],
  ['cancelled', 'Отменено'],
  ['blocked', 'Заблокировано'],
]

describe('workflow UI primitives', () => {
  it.each(statusLabels)('renders the readable label for %s', (status, label) => {
    render(<StatusBadge status={status} />)
    expect(screen.getByText(label)).toBeVisible()
  })

  it('labels the deadline type and overdue state', () => {
    render(<DeadlineIndicator type="response" value="2026-07-30T10:00:00Z" now={new Date('2026-07-31T10:00:00Z')} />)
    expect(screen.getByLabelText(/срок ответа.*просрочен/i)).toBeVisible()
  })

  it('labels a future deadline without marking it overdue', () => {
    render(<DeadlineIndicator type="response" value="2026-08-01T10:00:00Z" now={new Date('2026-07-31T10:00:00Z')} />)
    const indicator = screen.getByLabelText(/^срок ответа:/i)
    expect(indicator).toBeVisible()
    expect(indicator).not.toHaveAttribute('aria-label', expect.stringMatching(/просрочен/i))
  })

  it('labels an invalid deadline value instead of throwing', () => {
    render(<DeadlineIndicator type="task" value="not-a-date" now={new Date('2026-07-31T10:00:00Z')} />)
    expect(screen.getByLabelText(/срок задачи: дата не задана/i)).toBeVisible()
  })

  it('renders the loading attention state with a stable accessible label', () => {
    render(<AttentionState loading />)
    expect(screen.getByRole('status', { name: 'Загрузка' })).toBeVisible()
  })

  it('renders an error attention state and invokes retry', () => {
    const onRetry = vi.fn()
    render(<AttentionState error="Не удалось загрузить данные" onRetry={onRetry} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Не удалось загрузить данные')
    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('renders an empty attention state with title and description', () => {
    render(<AttentionState empty emptyTitle="Нет задач" emptyDescription="Создайте первую задачу" />)
    expect(screen.getByRole('status', { name: 'Пусто' })).toHaveTextContent('Нет задач')
    expect(screen.getByText('Создайте первую задачу')).toBeVisible()
  })

  it('passes through children when no attention state is active', () => {
    render(<AttentionState><span>Рабочий контент</span></AttentionState>)
    expect(screen.getByText('Рабочий контент')).toBeVisible()
  })
})