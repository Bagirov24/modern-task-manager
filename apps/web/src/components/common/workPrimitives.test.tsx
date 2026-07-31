// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it } from 'vitest'
import AttentionState from './AttentionState'
import DeadlineIndicator from './DeadlineIndicator'
import StatusBadge from './StatusBadge'

describe('workflow UI primitives', () => {
  it('renders status text instead of relying on color', () => {
    render(<StatusBadge status="waiting_for_client" />)
    expect(screen.getByText('Ждём клиента')).toBeVisible()
  })

  it('labels the deadline type and overdue state', () => {
    render(<DeadlineIndicator type="response" value="2026-07-30T10:00:00Z" now={new Date('2026-07-31T10:00:00Z')} />)
    expect(screen.getByLabelText(/срок ответа.*просрочен/i)).toBeVisible()
  })

  it('renders a loading attention state with a stable accessible label', () => {
    render(<AttentionState loading />)
    expect(screen.getByRole('status', { name: 'Загрузка' })).toBeVisible()
  })
})