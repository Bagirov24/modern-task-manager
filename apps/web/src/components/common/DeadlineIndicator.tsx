import { Chip } from '@mui/material'
import { EventOutlined, WarningAmberOutlined } from '@mui/icons-material'

export type DeadlineType = 'response' | 'task' | 'final' | 'next_action' | (string & {})

interface DeadlineIndicatorProps {
  type: DeadlineType
  value: string | Date
  now?: Date
}

const deadlineLabels: Record<string, string> = {
  response: 'Срок ответа',
  task: 'Срок задачи',
  final: 'Финальный срок',
  next_action: 'Срок следующего действия',
}

function formatDeadline(value: Date) {
  return value.toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })
}

export default function DeadlineIndicator({ type, value, now = new Date() }: DeadlineIndicatorProps) {
  const deadline = value instanceof Date ? value : new Date(value)
  const label = deadlineLabels[type] || 'Срок'
  const isValid = !Number.isNaN(deadline.getTime())
  const overdue = isValid && deadline.getTime() < now.getTime()
  const text = isValid
    ? `${label}: ${overdue ? 'просрочен' : formatDeadline(deadline)}`
    : `${label}: дата не задана`

  return (
    <Chip
      size="small"
      icon={overdue ? <WarningAmberOutlined /> : <EventOutlined />}
      label={text}
      color={overdue ? 'error' : 'default'}
      variant="outlined"
      aria-label={text}
      sx={{ minHeight: 28 }}
    />
  )
}
