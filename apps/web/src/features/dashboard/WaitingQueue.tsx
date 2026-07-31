import { Link as RouterLink } from 'react-router-dom'
import { HourglassTop } from '@mui/icons-material'
import { Box, Paper, Stack, Typography } from '@mui/material'
import AttentionState from '@/components/common/AttentionState'
import DeadlineIndicator from '@/components/common/DeadlineIndicator'
import StatusBadge from '@/components/common/StatusBadge'
import type { ActionItem } from '@/features/work/types'
import { SectionHeader } from './ActionQueue'

interface WaitingQueueProps {
  items: ActionItem[]
  loading: boolean
  error: string | null
  onRetry: () => void
}

export default function WaitingQueue({ items, loading, error, onRetry }: WaitingQueueProps) {
  const visibleItems = items.slice(0, 4)
  return (
    <Box component="section" role="region" aria-labelledby="waiting-queue-heading">
      <SectionHeader id="waiting-queue-heading" title="Жду ответа" count={visibleItems.length} to="/inbox?action_status=waiting_for_reply" linkLabel="Все ожидания" />
      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        <AttentionState loading={loading} error={error} onRetry={onRetry} empty={!visibleItems.length} emptyTitle="Ожиданий нет" emptyDescription="Сейчас ни от кого не требуется ответ.">
          <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
            {visibleItems.map((item) => (
              <Box component="li" key={item.entityKey} sx={{ px: 1.5, py: 1.25, borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 0 } }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} gap={1.25}>
                  <HourglassTop color="action" fontSize="small" />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography component={RouterLink} to={entityPath(item)} color="text.primary" fontWeight={700} sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>{item.title}</Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>{item.nextAction || 'Ожидаем следующий контакт'}</Typography>
                  </Box>
                  <Stack direction="row" gap={0.75} alignItems="center" flexWrap="wrap">
                    <StatusBadge status="waiting_for_internal" />
                    {item.dueAt && <DeadlineIndicator type="response" value={item.dueAt} />}
                  </Stack>
                </Stack>
              </Box>
            ))}
          </Box>
        </AttentionState>
      </Paper>
    </Box>
  )
}

function entityPath(item: ActionItem) {
  return item.entityKey.startsWith('task:') ? `/tasks?task=${item.entityId}` : `/inbox?item=${item.entityId}`
}
