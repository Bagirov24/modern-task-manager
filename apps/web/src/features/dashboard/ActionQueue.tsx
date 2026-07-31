import { Link as RouterLink } from 'react-router-dom'
import { ArrowForward, CheckCircleOutline } from '@mui/icons-material'
import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material'
import AttentionState from '@/components/common/AttentionState'
import DeadlineIndicator from '@/components/common/DeadlineIndicator'
import StatusBadge from '@/components/common/StatusBadge'
import type { ActionItem } from '@/features/work/types'

interface ActionQueueProps {
  items: ActionItem[]
  loading: boolean
  error: string | null
  onRetry: () => void
}

export default function ActionQueue({ items, loading, error, onRetry }: ActionQueueProps) {
  const visibleItems = items.slice(0, 7)
  return (
    <Box component="section" role="region" aria-labelledby="action-queue-heading">
      <SectionHeader id="action-queue-heading" title="Мои действия" count={visibleItems.length} to="/tasks?view=list&preset=my-actions" linkLabel="Все действия" />
      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        <AttentionState loading={loading} error={error} onRetry={onRetry} empty={!visibleItems.length} emptyTitle="Действий нет" emptyDescription="Очередь на сегодня разобрана.">
          <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
            {visibleItems.map((item) => <ActionRow key={item.entityKey} item={item} />)}
          </Box>
        </AttentionState>
      </Paper>
    </Box>
  )
}

function ActionRow({ item }: { item: ActionItem }) {
  return (
    <Box component="li" sx={{ px: 1.5, py: 1.25, borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 0 } }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.25} alignItems={{ sm: 'center' }}>
        <CheckCircleOutline color="action" fontSize="small" />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography component={RouterLink} to={entityPath(item)} color="text.primary" fontWeight={700} sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>{item.title}</Typography>
          {item.nextAction && <Typography variant="body2" color="text.secondary" noWrap>{item.nextAction}</Typography>}
        </Box>
        <Stack direction="row" gap={0.75} alignItems="center" flexWrap="wrap">
          <Chip size="small" variant="outlined" label={item.sourceLabel === 'Task' ? 'Задача' : item.sourceLabel} />
          <StatusBadge status={item.isBlocked ? 'blocked' : 'ready'} />
          {item.dueAt && <DeadlineIndicator type="next_action" value={item.dueAt} />}
        </Stack>
      </Stack>
    </Box>
  )
}

export function SectionHeader({ id, title, count, to, linkLabel }: { id: string; title: string; count: number; to: string; linkLabel: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2} sx={{ mb: 1 }}>
      <Stack direction="row" alignItems="center" gap={1}>
        <Typography id={id} component="h2" variant="h5" fontWeight={750}>{title}</Typography>
        <Chip size="small" label={count} />
      </Stack>
      <Button component={RouterLink} to={to} size="small" endIcon={<ArrowForward />}>{linkLabel}</Button>
    </Stack>
  )
}

function entityPath(item: ActionItem) {
  return item.entityKey.startsWith('task:') ? `/tasks?task=${item.entityId}` : `/inbox?item=${item.entityId}`
}
