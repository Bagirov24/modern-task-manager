import type { CommunicationItem, Task } from '@/lib/types'
import type { ActionItem, ActionKind, FocusSelection } from './types'

const priorityRank: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
const importanceRank: Record<string, number> = { critical: 0, high: 1, normal: 2, low: 3 }
const waitingWorkflowStatuses = new Set(['waiting_for_internal', 'waiting_for_client'])
const waitingCommunicationStatuses = new Set(['need_customer_input', 'need_internal_input', 'waiting_for_reply'])
const closedTaskStatuses = new Set(['done', 'archived'])
const closedWorkflowStatuses = new Set(['done', 'cancelled'])
const closedCommunicationStatuses = new Set(['done', 'archived'])

export function buildActionItems(tasks: Task[], communications: CommunicationItem[], currentUserId: string): ActionItem[] {
  const items = [
    ...tasks.map((task) => taskToActionItem(task, currentUserId)),
    ...communications.map((communication) => communicationToActionItem(communication)),
  ].filter((item) => Boolean(currentUserId) && item.ownerId === currentUserId)

  return sortItems(items, new Date())
}

export function selectFocusNow(items: ActionItem[], pinnedEntityKey: string | null | undefined, now: Date): FocusSelection | null {
  const actionableItems = items.filter((item) => item.state === 'actionable')
  if (!actionableItems.length) return null

  const pinned = pinnedEntityKey ? actionableItems.find((item) => item.entityKey === pinnedEntityKey) : undefined
  if (pinned) return { item: pinned, reason: 'pinned' }

  const item = sortItems(actionableItems, now)[0]
  if (!item) return null

  if (isOverdue(item, now)) return { item, reason: 'overdue' }
  if (item.priorityRank === 0) return { item, reason: 'priority' }
  if (item.dueAt || item.finalDueAt) return { item, reason: 'deadline' }
  return { item, reason: 'priority' }
}

export function splitMyWork(items: ActionItem[], now: Date): { actions: ActionItem[]; waiting: ActionItem[] } {
  return {
    actions: sortItems(items.filter((item) => item.state === 'actionable'), now),
    waiting: sortItems(items.filter((item) => item.state === 'waiting'), now),
  }
}

function taskToActionItem(task: Task, currentUserId: string): ActionItem {
  const ownerId = task.next_action_owner_id ?? task.assignee_id ?? null
  const state = taskState(task, ownerId, currentUserId)
  const kind: ActionKind = task.task_type === 'approval' || task.task_type === 'contract_approval'
    ? 'approval'
    : task.task_type === 'follow_up' ? 'follow_up' : 'task'

  return {
    entityKey: `task:${task.id}`,
    entityId: task.id,
    kind,
    state,
    title: task.title,
    projectId: task.project_id ?? null,
    ownerId,
    dueAt: task.next_action_due_at ?? task.response_due_at ?? task.due_date ?? null,
    finalDueAt: task.final_due_at ?? null,
    priorityRank: priorityRank[task.priority] ?? 3,
    isBlocked: Boolean(task.is_blocked || task.workflow_status === 'blocked'),
    nextAction: task.next_action_description ?? task.next_action ?? task.follow_up_action_description ?? null,
    sourceLabel: 'Task',
    sourceStatus: task.workflow_status,
    waitingParty: task.waiting_for_party ?? null,
  }
}

function communicationToActionItem(communication: CommunicationItem): ActionItem {
  const ownerId = communication.action_owner_id ?? null
  const state = classifyCommunicationState(communication)

  return {
    entityKey: `communication:${communication.id}`,
    entityId: communication.id,
    kind: 'reply',
    state,
    title: communication.subject || communication.body_preview,
    projectId: communication.project_id ?? null,
    ownerId,
    dueAt: communication.response_due_at ?? null,
    finalDueAt: null,
    priorityRank: communication.importance ? (importanceRank[communication.importance] ?? 3) : 0,
    isBlocked: Boolean(communication.waiting_for_user_id),
    nextAction: communication.next_action ?? null,
    sourceLabel: communication.source_type,
    sourceStatus: communication.action_status,
    waitingParty: communication.waiting_for_party ?? null,
  }
}

function taskState(task: Task, ownerId: string | null, currentUserId: string): ActionItem['state'] {
  if (closedTaskStatuses.has(task.status) || closedWorkflowStatuses.has(task.workflow_status)) return 'done'
  if (waitingWorkflowStatuses.has(task.workflow_status) || task.waiting_for_user_id || (task.waiting_for_party && task.waiting_for_party !== 'none')) return 'waiting'
  if (ownerId && ownerId !== currentUserId) return 'waiting'
  return 'actionable'
}

export function classifyCommunicationState(communication: CommunicationItem): ActionItem['state'] {
  if (closedCommunicationStatuses.has(communication.action_status)) return 'done'
  if (waitingCommunicationStatuses.has(communication.action_status) || communication.waiting_for_user_id || (communication.waiting_for_party && communication.waiting_for_party !== 'none')) return 'waiting'
  if (communication.action_status === 'fyi') return 'done'
  return 'actionable'
}

function sortItems(items: ActionItem[], now: Date): ActionItem[] {
  return [...items].sort((a, b) => {
    const stateRank = stateOrder(a) - stateOrder(b)
    if (stateRank) return stateRank

    const overdueRank = Number(isOverdue(b, now)) - Number(isOverdue(a, now))
    if (overdueRank) return overdueRank

    const priorityComparison = a.priorityRank - b.priorityRank
    if (priorityComparison) return priorityComparison

    const dueComparison = compareDates(a.dueAt, b.dueAt)
    if (dueComparison) return dueComparison

    const finalDueComparison = compareDates(a.finalDueAt, b.finalDueAt)
    if (finalDueComparison) return finalDueComparison

    const titleComparison = a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
    return titleComparison || a.entityKey.localeCompare(b.entityKey)
  })
}

function stateOrder(item: ActionItem): number {
  return item.state === 'actionable' ? 0 : item.state === 'waiting' ? 1 : 2
}

function isOverdue(item: ActionItem, now: Date): boolean {
  const dueAt = item.dueAt ?? item.finalDueAt
  return item.state === 'actionable' && Boolean(dueAt && new Date(dueAt).getTime() < now.getTime())
}

function compareDates(left: string | null, right: string | null): number {
  const leftTime = left ? new Date(left).getTime() : Number.POSITIVE_INFINITY
  const rightTime = right ? new Date(right).getTime() : Number.POSITIVE_INFINITY
  return leftTime - rightTime
}
