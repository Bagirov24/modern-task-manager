import { Chip } from '@mui/material'
import {
  BlockOutlined,
  CancelOutlined,
  CheckCircleOutline,
  EventAvailableOutlined,
  GroupsOutlined,
  HelpOutlineOutlined,
  InboxOutlined,
  PersonOutlineOutlined,
  PlayArrowOutlined,
  PlaylistAddCheckOutlined,
  RateReviewOutlined,
  SendOutlined,
  ViewListOutlined,
} from '@mui/icons-material'
import type { WorkflowStatus } from '../../lib/types'

const statusConfig: Record<WorkflowStatus, { label: string; color: 'default' | 'primary' | 'info' | 'success' | 'warning' | 'error'; icon: JSX.Element }> = {
  inbox: { label: 'Входящие', color: 'info', icon: <InboxOutlined /> },
  backlog: { label: 'Backlog', color: 'default', icon: <ViewListOutlined /> },
  clarification_needed: { label: 'Нужно уточнение', color: 'warning', icon: <HelpOutlineOutlined /> },
  planned: { label: 'Запланировано', color: 'info', icon: <EventAvailableOutlined /> },
  ready: { label: 'Ready', color: 'primary', icon: <PlaylistAddCheckOutlined /> },
  in_progress: { label: 'В работе', color: 'primary', icon: <PlayArrowOutlined /> },
  waiting_for_internal: { label: 'Ждём команду', color: 'warning', icon: <GroupsOutlined /> },
  waiting_for_client: { label: 'Ждём клиента', color: 'warning', icon: <PersonOutlineOutlined /> },
  review: { label: 'На проверке', color: 'info', icon: <RateReviewOutlined /> },
  ready_to_send: { label: 'Готово к отправке', color: 'primary', icon: <SendOutlined /> },
  done: { label: 'Готово', color: 'success', icon: <CheckCircleOutline /> },
  cancelled: { label: 'Отменено', color: 'default', icon: <CancelOutlined /> },
  blocked: { label: 'Заблокировано', color: 'error', icon: <BlockOutlined /> },
}

interface StatusBadgeProps {
  status: WorkflowStatus
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <Chip
      size="small"
      icon={config.icon}
      label={config.label}
      color={config.color}
      aria-label={`Статус: ${config.label}`}
      sx={{ minHeight: 28 }}
    />
  )
}
