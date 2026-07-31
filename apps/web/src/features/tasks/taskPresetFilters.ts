import type { Task } from '@/lib/types'

const waitingTaskStatuses = new Set(['waiting_for_internal', 'waiting_for_client'])
const closedTaskStatuses = new Set(['done', 'cancelled'])

export function matchesTaskPreset(task: Task, preset: string | null, currentUserId: string, now: Date): boolean {
  const ownerId = task.next_action_owner_id ?? task.assignee_id ?? null
  const isWaiting = waitingTaskStatuses.has(task.workflow_status) || Boolean(task.waiting_for_user_id) || Boolean(task.waiting_for_party && task.waiting_for_party !== 'none')
  const isClosed = task.status === 'done' || task.status === 'archived' || closedTaskStatuses.has(task.workflow_status)

  if (preset === 'my-actions') return Boolean(currentUserId) && ownerId === currentUserId && !isWaiting && !isClosed
  if (preset === 'my-waiting') return Boolean(currentUserId) && ownerId === currentUserId && isWaiting && !isClosed

  const today = now.toISOString().slice(0, 10)
  const due = task.due_date?.slice(0, 10)
  const weekEnd = new Date(now.getTime() + 7 * 86400000)
  if (preset === 'inbox' && task.workflow_status !== 'inbox' && task.project_id) return false
  if (preset === 'today' && due !== today) return false
  if (preset === 'overdue' && (!task.due_date || new Date(task.due_date) >= now || isClosed)) return false
  if (preset === 'blocked' && !task.is_blocked) return false
  if (preset === 'unassigned' && task.assignee_id) return false
  if (preset === 'needs-planning' && (!['urgent', 'high'].includes(task.priority) || (task.due_date && task.is_planning_complete))) return false
  if (preset === 'missing-documentation' && (task.documentation_count || 0) > 0) return false
  if (preset === 'missing-next-action' && (ownerId !== currentUserId || task.next_action || task.next_action_description || isClosed)) return false
  if (preset === 'due-this-week' && (!task.due_date || new Date(task.due_date) < now || new Date(task.due_date) > weekEnd)) return false
  if (preset === 'recently-completed' && (task.status !== 'done' || !task.completed_at || now.getTime() - new Date(task.completed_at).getTime() > 7 * 86400000)) return false
  return true
}
