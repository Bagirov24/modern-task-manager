import { describe, expect, it } from 'vitest'
import { buildActionItems, selectFocusNow, splitMyWork } from './selectors'

describe('workflow-first selectors', () => {
  it('normalizes tasks and replies into one ordered action queue', () => {
    const items = buildActionItems(
      [{ id: 't1', title: 'Review staging', priority: 'high', status: 'todo', workflow_status: 'ready', next_action_owner_id: 'u1', next_action_due_at: '2026-07-31T09:30:00Z' } as any],
      [{ id: 'c1', body_preview: 'Reply to client', source_type: 'email', action_status: 'needs_my_reply', action_owner_id: 'u1', response_due_at: '2026-07-31T09:00:00Z' } as any],
      'u1',
    )
    expect(items.map((item) => item.entityKey)).toEqual(['communication:c1', 'task:t1'])
  })

  it('ranks overdue actionable work before future urgent work', () => {
    const result = splitMyWork([
      { entityKey: 'task:overdue', title: 'Overdue low', priorityRank: 3, state: 'actionable', dueAt: '2026-07-30T09:00:00Z', finalDueAt: null },
      { entityKey: 'task:future', title: 'Future urgent', priorityRank: 0, state: 'actionable', dueAt: '2026-08-01T09:00:00Z', finalDueAt: null },
    ] as any, new Date('2026-07-31T08:00:00Z'))
    expect(result.actions.map((item) => item.entityKey)).toEqual(['task:overdue', 'task:future'])
  })

  it('keeps waiting items out of active actions', () => {
    const result = splitMyWork([{ entityKey: 'task:t1', kind: 'task', state: 'waiting', dueAt: null } as any], new Date('2026-07-31T08:00:00Z'))
    expect(result.actions).toHaveLength(0)
    expect(result.waiting).toHaveLength(1)
  })

  it('prefers a pinned item over the automatic candidate', () => {
    const items = [
      { entityKey: 'task:auto', priorityRank: 0, state: 'actionable' },
      { entityKey: 'task:pinned', priorityRank: 3, state: 'actionable' },
    ] as any
    expect(selectFocusNow(items, 'task:pinned', new Date())?.item.entityKey).toBe('task:pinned')
  })
})
