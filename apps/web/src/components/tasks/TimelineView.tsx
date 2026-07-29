import { useMemo } from 'react'
import {
  Box, Card, CardContent, Chip, LinearProgress,
  Stack, Typography,
} from '@mui/material'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import type { Task } from '@/lib/types'

const statusLabel: Record<string, string> = {
  todo: 'К выполнению',
  in_progress: 'В работе',
  done: 'Готово',
}
const statusProgress: Record<string, number> = { todo: 20, in_progress: 60, done: 100 }
const statusColor: Record<string, 'default' | 'info' | 'success'> = { todo: 'default', in_progress: 'info', done: 'success' }

function fmtDate(d?: string | null) {
  if (!d) return '—'
  return format(new Date(d), 'd MMM', { locale: ru })
}

interface TimelineViewProps {
  tasks: Task[]
}

export default function TimelineView({ tasks }: TimelineViewProps) {
  const sorted = useMemo(() =>
    [...tasks]
      .filter((t) => t.start_date || t.due_date)
      .sort((a, b) =>
        new Date(a.start_date || a.due_date!).getTime() -
        new Date(b.start_date || b.due_date!).getTime()
      ),
    [tasks]
  )

  const { minMs, totalRange } = useMemo(() => {
    if (!sorted.length) return { minMs: 0, totalRange: 1 }
    const minMs = new Date(sorted[0].start_date || sorted[0].due_date!).getTime()
    const maxMs = new Date(sorted[sorted.length - 1].due_date || sorted[sorted.length - 1].start_date!).getTime()
    return { minMs, totalRange: Math.max(1, maxMs - minMs) }
  }, [sorted])

  if (sorted.length === 0) {
    return (
      <Card sx={{ borderRadius: 4 }}>
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>Timeline</Typography>
          <Typography color="text.secondary">
            Нет задач с датами start_date / due_date. Укажите даты, чтобы увидеть timeline.
          </Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <Stack spacing={2}>
      {sorted.map((task) => {
        const start = new Date(task.start_date || task.due_date!)
        const end = new Date(task.due_date || task.start_date || task.created_at)
        const offset = ((start.getTime() - minMs) / totalRange) * 100
        const barWidth = Math.max(6, ((end.getTime() - start.getTime()) / totalRange) * 100)
        const progress = statusProgress[task.status] ?? 20
        const overdue = !!task.due_date && new Date(task.due_date).getTime() < Date.now() && task.status !== 'done'

        return (
          <Card
            key={task.id}
            sx={{
              borderRadius: 4,
              border: '1px solid',
              borderColor: overdue ? 'error.light' : 'divider',
              transition: 'box-shadow 0.2s',
              '&:hover': { boxShadow: 4 },
            }}
          >
            <CardContent>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                alignItems={{ xs: 'flex-start', md: 'center' }}
              >
                <Box sx={{ minWidth: { md: 260 }, flexShrink: 0 }}>
                  <Typography variant="subtitle1" fontWeight={700} noWrap>
                    {task.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {fmtDate(task.start_date)} → {fmtDate(task.due_date)}
                  </Typography>
                  {overdue && (
                    <Typography variant="caption" color="error.main" fontWeight={700}>
                      Просрочено
                    </Typography>
                  )}
                </Box>

                <Box sx={{ flex: 1, width: '100%' }}>
                  <Box
                    sx={{
                      position: 'relative',
                      height: 30,
                      borderRadius: 999,
                      bgcolor: 'action.hover',
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      sx={{
                        position: 'absolute',
                        left: `${offset}%`,
                        width: `${Math.min(barWidth, 100 - offset)}%`,
                        top: 5,
                        bottom: 5,
                        borderRadius: 999,
                        bgcolor:
                          task.status === 'done'
                            ? 'success.main'
                            : task.status === 'in_progress'
                            ? 'info.main'
                            : 'primary.main',
                        boxShadow: 2,
                        transition: 'width 0.4s',
                      }}
                    />
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={progress}
                    color={task.status === 'done' ? 'success' : task.status === 'in_progress' ? 'info' : 'primary'}
                    sx={{ mt: 1, height: 5, borderRadius: 999 }}
                  />
                </Box>

                <Chip
                  label={statusLabel[task.status] ?? task.status}
                  color={statusColor[task.status] ?? 'default'}
                  size="small"
                  sx={{ flexShrink: 0 }}
                />
              </Stack>
            </CardContent>
          </Card>
        )
      })}
    </Stack>
  )
}
