import { describe, expect, it } from 'vitest'
import { buildActionItems } from './selectors'

describe('personal work ownership and source semantics', () => {
  it('includes only tasks and communications explicitly owned by the current user', () => {
    const tasks = [
      { id: 'task-mine', title: 'Моя задача', status: 'todo', workflow_status: 'ready', priority: 'medium', next_action_owner_id: 'me' },
      { id: 'task-other', title: 'Чужая задача', status: 'todo', workflow_status: 'ready', priority: 'high', next_action_owner_id: 'other' },
      { id: 'task-unassigned', title: 'Неназначенная задача', status: 'todo', workflow_status: 'ready', priority: 'urgent', next_action_owner_id: null, assignee_id: null },
    ] as any
    const communications = [
      { id: 'comm-mine', body_preview: 'Мой ответ', source_type: 'email', action_status: 'needs_my_reply', action_owner_id: 'me', waiting_for_party: 'none' },
      { id: 'comm-other', body_preview: 'Ответ коллеги', source_type: 'email', action_status: 'needs_my_reply', action_owner_id: 'other', waiting_for_party: 'none' },
      { id: 'comm-unassigned', body_preview: 'Неназначенный ответ', source_type: 'email', action_status: 'needs_my_reply', action_owner_id: null, waiting_for_party: 'none' },
    ] as any

    expect(buildActionItems(tasks, communications, 'me').map((item) => item.entityKey).sort()).toEqual([
      'communication:comm-mine',
      'task:task-mine',
    ])
  })

  it('preserves task workflow and communication waiting-party status', () => {
    const items = buildActionItems(
      [{ id: 'review', title: 'Проверить результат', status: 'todo', workflow_status: 'review', priority: 'medium', assignee_id: 'me' }] as any,
      [{ id: 'client-wait', body_preview: 'Ответ клиента', source_type: 'email', action_status: 'waiting_for_reply', action_owner_id: 'me', waiting_for_party: 'client' }] as any,
      'me',
    )

    expect(items.find((item) => item.entityKey === 'task:review')).toMatchObject({ sourceStatus: 'review', waitingParty: null })
    expect(items.find((item) => item.entityKey === 'communication:client-wait')).toMatchObject({ sourceStatus: 'waiting_for_reply', waitingParty: 'client' })
  })
})
