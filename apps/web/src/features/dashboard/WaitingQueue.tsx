import { Link as RouterLink } from 'react-router-dom'
import { HourglassTop } from '@mui/icons-material'
import { Box, Paper, Stack, Typography } from '@mui/material'
import AttentionState from '@/components/common/AttentionState'
import DeadlineIndicator from '@/components/common/DeadlineIndicator'
import type { ActionItem } from '@/features/work/types'
import ActionStatusChip from './ActionStatusChip'
import DashboardStateNotice from './DashboardStateNotice'
import { SectionHeader } from './ActionQueue'
import type { DashboardSectionState } from './useMyWork'

interface WaitingQueueProps {
  items: ActionItem[]
  state: DashboardSectionState
}

export default function WaitingQueue({ items, state }: WaitingQueueProps) {
  const visibleItems = items.slice(0, 4)
  return (
    <Box component="section" role="region" aria-labelledby="waiting-queue-heading">
      <SectionHeader id="waiting-queue-heading" title="Жду ответа" count={visibleItems.length} links={[
        { to: '/tasks?view=list&preset=my-waiting', label: 'Задачи в ожидании' },
        { to: '/inbox?scope=my-waiting', label: 'Ожидания во входящих' },
      ]} />
      <DashboardStateNotice warning={state.warning} onRetry={state.retry} />
      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        <AttentionState loading={state.loading} error={state.error} onRetry={state.retry} empty={!visibleItems.length} emptyTitle="Ожиданий нет" emptyDescription="Сейчас ни от кого не требуется ответ.">
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
                    <ActionStatusChip item={item} />
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
