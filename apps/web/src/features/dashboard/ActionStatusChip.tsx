import { Chip } from '@mui/material'
import type { WorkflowStatus } from '@/lib/types'
import StatusBadge from '@/components/common/StatusBadge'
import type { ActionItem } from '@/features/work/types'

const communicationLabels: Record<string, string> = {
  new: 'Новое',
  needs_my_reply: 'Нужно ответить',
  need_customer_input: 'Ждём клиента',
  need_internal_input: 'Ждём команду',
  waiting_for_reply: 'Ждём ответа',
  ready_to_respond: 'Готово к ответу',
  fyi: 'Информация',
  done: 'Готово',
  archived: 'В архиве',
}

const waitingPartyLabels: Record<string, string> = {
  internal: 'Ждём команду',
  client: 'Ждём клиента',
  insurer: 'Ждём страховщика',
  vendor: 'Ждём поставщика',
}

export default function ActionStatusChip({ item }: { item: ActionItem }) {
  if (item.entityKey.startsWith('task:')) {
    return <StatusBadge status={(item.isBlocked ? 'blocked' : item.sourceStatus) as WorkflowStatus} />
  }

  const label = item.state === 'waiting' && item.waitingParty && item.waitingParty !== 'none'
    ? waitingPartyLabels[item.waitingParty]
    : communicationLabels[item.sourceStatus] || 'Статус не указан'
  const color = item.isBlocked ? 'error' : item.state === 'waiting' ? 'warning' : item.sourceStatus === 'needs_my_reply' ? 'primary' : 'default'

  return <Chip size="small" color={color} variant="outlined" label={label} aria-label={`Статус: ${label}`} />
}
