import { describe, expect, it } from 'vitest'
import { matchesTaskPreset } from './TasksPage'
import { matchesInboxScope, readInboxFilters } from './ActionInboxPage'

const task = (owner: string | null, workflowStatus: string) => ({
  status: 'todo',
  workflow_status: workflowStatus,
  priority: 'medium',
  next_action_owner_id: owner,
  assignee_id: null,
  is_blocked: false,
}) as any

describe('Dashboard destination URL filters', () => {
  it('consumes personal action and waiting presets on Tasks', () => {
    const now = new Date('2026-07-31T10:00:00Z')
    expect(matchesTaskPreset(task('me', 'ready'), 'my-actions', 'me', now)).toBe(true)
    expect(matchesTaskPreset(task('other', 'ready'), 'my-actions', 'me', now)).toBe(false)
    expect(matchesTaskPreset(task(null, 'ready'), 'my-actions', 'me', now)).toBe(false)
    expect(matchesTaskPreset(task('me', 'waiting_for_client'), 'my-waiting', 'me', now)).toBe(true)
    expect(matchesTaskPreset(task('me', 'ready'), 'my-waiting', 'me', now)).toBe(false)
  })

  it('reads Inbox scope, status, and item deep-link parameters', () => {
    const filters = readInboxFilters(new URLSearchParams('scope=my-waiting&action_status=waiting_for_reply&item=comm-1'))
    expect(filters).toEqual({ scope: 'my-waiting', status: 'waiting_for_reply', itemId: 'comm-1' })
  })

  it('applies current-user ownership to Inbox scopes', () => {
    const mine = { action_owner_id: 'me', action_status: 'needs_my_reply' } as any
    const other = { action_owner_id: 'other', action_status: 'needs_my_reply' } as any
    const unassigned = { action_owner_id: null, action_status: 'needs_my_reply' } as any
    const waiting = { action_owner_id: 'me', action_status: 'waiting_for_reply' } as any

    expect(matchesInboxScope(mine, 'my-actions', 'me')).toBe(true)
    expect(matchesInboxScope(other, 'my-actions', 'me')).toBe(false)
    expect(matchesInboxScope(unassigned, 'my-actions', 'me')).toBe(false)
    expect(matchesInboxScope(waiting, 'my-waiting', 'me')).toBe(true)
  })

  it('uses Dashboard waiting markers even when the Inbox status looks actionable', () => {
    const waitingForParty = {
      action_owner_id: 'me', action_status: 'needs_my_reply',
      waiting_for_party: 'internal', waiting_for_user_id: null,
    } as any
    const waitingForUser = {
      action_owner_id: 'me', action_status: 'needs_my_reply',
      waiting_for_party: 'none', waiting_for_user_id: 'colleague',
    } as any

    expect(matchesInboxScope(waitingForParty, 'my-waiting', 'me')).toBe(true)
    expect(matchesInboxScope(waitingForParty, 'my-actions', 'me')).toBe(false)
    expect(matchesInboxScope(waitingForUser, 'my-waiting', 'me')).toBe(true)
    expect(matchesInboxScope(waitingForUser, 'my-actions', 'me')).toBe(false)
  })
})
