import { useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Box,
  Button,
  Chip,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { ArrowOutward, SwapHoriz } from '@mui/icons-material'
import AttentionState from '@/components/common/AttentionState'
import DeadlineIndicator from '@/components/common/DeadlineIndicator'
import StatusBadge from '@/components/common/StatusBadge'
import type { ActionItem, FocusSelection } from '@/features/work/types'
import { useUIStore } from '@/store/uiStore'

interface FocusNowCardProps {
  focus: FocusSelection | null
  candidates: ActionItem[]
  loading: boolean
  error: string | null
  onRetry: () => void
}

export default function FocusNowCard({ focus, candidates, loading, error, onRetry }: FocusNowCardProps) {
  const setPinnedFocusEntityKey = useUIStore((state) => state.setPinnedFocusEntityKey)
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [selected, setSelected] = useState(focus?.item ?? null)

  useEffect(() => setSelected(focus?.item ?? null), [focus])

  const choose = (item: ActionItem) => {
    setSelected(item)
    setPinnedFocusEntityKey(item.entityKey)
    setAnchorEl(null)
  }

  return (
    <Paper component="section" aria-labelledby="focus-now-heading" variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, borderLeft: '4px solid', borderLeftColor: selected?.isBlocked ? 'error.main' : 'primary.main' }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography id="focus-now-heading" component="h2" variant="h5" fontWeight={750}>Focus Now</Typography>
          <AttentionState loading={loading} error={error} onRetry={onRetry} empty={!selected} emptyTitle="Фокус не выбран" emptyDescription="В очереди пока нет доступных действий.">
            {selected && <Stack spacing={1.25} sx={{ mt: 1.5 }}>
              <Typography variant="h6" fontWeight={750}>{selected.title}</Typography>
              <Stack direction="row" gap={1} flexWrap="wrap">
                <StatusBadge status={selected.isBlocked ? 'blocked' : 'in_progress'} />
                <Chip size="small" variant="outlined" label={kindLabel(selected)} />
                {selected.dueAt && <DeadlineIndicator type="next_action" value={selected.dueAt} />}
                {selected.finalDueAt && <DeadlineIndicator type="final" value={selected.finalDueAt} />}
              </Stack>
              {selected.nextAction && <Typography variant="body2"><strong>Следующее действие:</strong> {selected.nextAction}</Typography>}
              <Typography variant="caption" color="text.secondary">{focusReason(focus?.reason)}</Typography>
            </Stack>}
          </AttentionState>
        </Box>
        <Stack direction="row" gap={1} alignItems="flex-start" flexWrap="wrap">
          <Button variant="outlined" startIcon={<SwapHoriz />} disabled={!candidates.length} onClick={(event) => setAnchorEl(event.currentTarget)}>Сменить задачу</Button>
          {selected && <Button component={RouterLink} to={entityPath(selected)} variant="contained" endIcon={<ArrowOutward />}>Открыть</Button>}
        </Stack>
      </Stack>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)} MenuListProps={{ role: 'listbox', 'aria-label': 'Выбор фокуса' }}>
        {candidates.map((item) => <MenuItem key={item.entityKey} role="option" selected={item.entityKey === selected?.entityKey} onClick={() => choose(item)}>{item.title}</MenuItem>)}
      </Menu>
    </Paper>
  )
}

function kindLabel(item: ActionItem) {
  return ({ task: 'Задача', reply: 'Ответ', follow_up: 'Контроль', approval: 'Согласование' } as const)[item.kind]
}

function focusReason(reason: FocusSelection['reason'] | undefined) {
  return ({ pinned: 'Закреплено вами', in_progress: 'Уже в работе', overdue: 'Просрочено', priority: 'Высокий приоритет', deadline: 'Ближайший срок' } as const)[reason ?? 'priority']
}

function entityPath(item: ActionItem) {
  return item.entityKey.startsWith('task:') ? `/tasks?task=${item.entityId}` : `/inbox?item=${item.entityId}`
}
