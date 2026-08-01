export type ActionKind = 'task' | 'reply' | 'follow_up' | 'approval'
export type ActionState = 'actionable' | 'waiting' | 'done'
export type WaitingParty = 'internal' | 'client' | 'insurer' | 'vendor' | 'none'

export interface ActionItem {
  entityKey: `${'task' | 'communication'}:${string}`
  entityId: string
  kind: ActionKind
  state: ActionState
  title: string
  projectId: string | null
  ownerId: string | null
  dueAt: string | null
  finalDueAt: string | null
  priorityRank: number
  isBlocked: boolean
  nextAction: string | null
  sourceLabel: string
  sourceStatus: string
  waitingParty: WaitingParty | null
}

export interface FocusSelection {
  item: ActionItem
  reason: 'pinned' | 'in_progress' | 'overdue' | 'priority' | 'deadline'
}
