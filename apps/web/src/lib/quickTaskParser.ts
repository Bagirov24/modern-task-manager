import type { TaskPriority } from './types'

export interface ParsedQuickTask {
  title: string
  project: string
  priority: TaskPriority
  assignee: string
  dueDate: string
  labels: string[]
}

const priorityMap: Record<string, TaskPriority> = {
  p0: 'urgent', critical: 'urgent', urgent: 'urgent', критичный: 'urgent', срочный: 'urgent',
  p1: 'high', high: 'high', высокий: 'high',
  p2: 'medium', medium: 'medium', средний: 'medium',
  p3: 'low', low: 'low', низкий: 'low',
}

function localDate(offsetDays: number, now: Date): string {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseQuickTask(input: string, now = new Date()): ParsedQuickTask {
  const projects = [...input.matchAll(/#([\p{L}\d_-]+)/gu)].map((match) => match[1])
  const assignee = input.match(/@([\p{L}\d._-]+)/u)?.[1] || ''
  const priorityToken = input.match(/!([\p{L}\d_-]+)/u)?.[1].toLowerCase() || ''
  const dateToken = input.match(/(?:^|\s)(сегодня|завтра|послезавтра|today|tomorrow)(?=\s|$)/iu)?.[1].toLowerCase()
  const dueDate = dateToken
    ? localDate(dateToken === 'сегодня' || dateToken === 'today' ? 0 : dateToken === 'послезавтра' ? 2 : 1, now)
    : ''
  const title = input
    .replace(/#[\p{L}\d_-]+/gu, '')
    .replace(/![\p{L}\d_-]+/gu, '')
    .replace(/@[\p{L}\d._-]+/gu, '')
    .replace(/(?:^|\s)(сегодня|завтра|послезавтра|today|tomorrow)(?=\s|$)/giu, '')
    .replace(/\s+/g, ' ')
    .trim()
  return {
    title,
    project: projects[0] || '',
    labels: projects.slice(1),
    priority: priorityMap[priorityToken] || 'medium',
    assignee,
    dueDate,
  }
}
