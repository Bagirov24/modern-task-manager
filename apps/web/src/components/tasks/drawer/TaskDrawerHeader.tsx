import { Box, Button, CircularProgress, IconButton, Stack, Typography } from '@mui/material'
import { Close, EditOutlined, Summarize } from '@mui/icons-material'

interface Props {
  title: string
  contextLabel: string
  canEdit: boolean
  statusLoading: boolean
  onStatus: () => void
  onEdit: () => void
  onClose: () => void
}

export default function TaskDrawerHeader({ title, contextLabel, canEdit, statusLoading, onStatus, onEdit, onClose }: Props) {
  return <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1.25, minHeight: 64, borderBottom: '1px solid', borderColor: 'divider' }}>
    <Box sx={{ minWidth: 0 }}><Typography variant="caption" color="text.secondary">{contextLabel}</Typography><Typography fontWeight={750} noWrap>{title}</Typography></Box>
    <Stack direction="row" spacing={0.5}>
      {canEdit && <Button size="small" startIcon={statusLoading ? <CircularProgress size={16} /> : <Summarize />} onClick={onStatus}>Статус</Button>}
      {canEdit && <IconButton aria-label="Редактировать" onClick={onEdit} sx={{ minWidth: 44, minHeight: 44 }}><EditOutlined /></IconButton>}
      <IconButton aria-label="Закрыть" onClick={onClose} sx={{ minWidth: 44, minHeight: 44 }}><Close /></IconButton>
    </Stack>
  </Stack>
}
