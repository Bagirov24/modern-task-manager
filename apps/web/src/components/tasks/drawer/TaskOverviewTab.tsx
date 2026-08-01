import { Alert, Box, Chip, Divider, Stack, Typography } from '@mui/material'
import { Block } from '@mui/icons-material'
import type { Task } from '@/lib/types'
import { useAuthStore } from '@/lib/store/authStore'

const workflowLabels: Record<string, string> = { inbox: 'Входящие', backlog: 'Backlog', clarification_needed: 'Нужно уточнение', planned: 'Запланировано', ready: 'Ready', in_progress: 'В работе', waiting_for_internal: 'Ждём команду', waiting_for_client: 'Ждём клиента', review: 'На проверке', ready_to_send: 'Готово к отправке', done: 'Готово', cancelled: 'Отменено', blocked: 'Заблокировано' }
const priorityLabels = { urgent: 'P0 · Критичный', high: 'P1 · Высокий', medium: 'P2 · Средний', low: 'P3 · Низкий' } as const

export default function TaskOverviewTab({ task }: { task: Task }) {
  const currentUser = useAuthStore((state) => state.user)
  const identities = [
    currentUser,
    task.assignee,
    task.manager,
    task.next_action_owner,
    task.waiting_for_user,
  ]

  return <Stack spacing={2}>
    {!task.is_planning_complete && <Alert severity="warning">Неполная постановка: заполните контекст, ожидаемый результат, acceptance criteria, проект и ответственного до Ready.</Alert>}
    <Typography variant="h5" fontWeight={750}>{task.title}</Typography>
    <Stack direction="row" gap={1} flexWrap="wrap"><Chip label={workflowLabels[task.workflow_status] || task.status} /><Chip variant="outlined" label={priorityLabels[task.priority]} />{task.is_blocked && <Chip color="warning" icon={<Block />} label="Заблокирована" />}</Stack>
    <Field title="Следующее действие" value={task.next_action_description || task.next_action} />
    {task.follow_up_action_description && <Field title="После получения ответа" value={task.follow_up_action_description} />}
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
      <Field title="Финальный срок" value={formatDate(task.final_due_at || task.due_date)} />
      <Field title="Срок ответа" value={formatDate(task.response_due_at)} />
      <Field title="Следующее действие до" value={formatDate(task.next_action_due_at)} />
    </Stack>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
      <Field title="Владелец действия" value={assignedPersonLabel(task.next_action_owner_id, identities)} />
      <Field title="Ответственный за результат" value={assignedPersonLabel(task.manager_id, identities)} />
      <Field title="Исполнитель" value={assignedPersonLabel(task.assignee_id, identities)} />
      <Field title="Ожидаем от" value={identityLabel(task.waiting_for_user_id, identities) || waitingLabel(task.waiting_for_party)} />
    </Box>
    <Stack direction="row" gap={1} flexWrap="wrap">
      <Chip size="small" variant="outlined" label={`Риск: ${riskLabel(task.risk_level)}`} />
      {task.waiting_for_party && task.waiting_for_party !== 'none' && <Chip size="small" variant="outlined" label={`Ожидаем: ${waitingLabel(task.waiting_for_party)}`} />}
      {task.communication_channel && <Chip size="small" variant="outlined" label={`Канал: ${task.communication_channel}`} />}
    </Stack>
    {task.is_blocked && <Alert severity="warning"><strong>Причина блокировки:</strong> {task.blocked_reason || 'не указана'}</Alert>}
    <Divider />
    <Field title="Контекст" value={task.context || task.description} />
    <Field title="Ожидаемый результат" value={task.expected_result} />
    <Field title="Acceptance criteria" value={task.acceptance_criteria} />
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}><Field title="Milestone / Sprint" value={[task.milestone, task.sprint].filter(Boolean).join(' · ')} /><Field title="Оценка" value={task.estimate_minutes ? `${task.estimate_minutes} мин` : undefined} /></Stack>
  </Stack>
}

function Field({ title, value }: { title: string; value?: string | null }) { return <Box><Typography variant="caption" color="text.secondary" fontWeight={700}>{title}</Typography><Typography sx={{ whiteSpace: 'pre-wrap' }}>{value || 'Не указано'}</Typography></Box> }
type Identity = { id: string; username?: string | null; full_name?: string | null }

function identityLabel(id: string | null | undefined, identities: Array<Identity | null | undefined>) {
  if (!id) return undefined
  const identity = identities.find((candidate) => candidate?.id === id)
  return identity ? identity.full_name || identity.username || 'Пользователь' : undefined
}

function assignedPersonLabel(id: string | null | undefined, identities: Array<Identity | null | undefined>) {
  return id ? identityLabel(id, identities) || 'Пользователь не найден' : undefined
}

function formatDate(value?: string | null) { return value ? new Date(value).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }) : undefined }
function riskLabel(value?: Task['risk_level']) { return ({ low: 'низкий', medium: 'средний', high: 'высокий', critical: 'критичный' } as const)[value || 'low'] }
function waitingLabel(value?: Task['waiting_for_party']) { return value ? ({ internal: 'команду', client: 'клиента', insurer: 'страховую', vendor: 'подрядчика', none: 'никого' } as const)[value] : undefined }
