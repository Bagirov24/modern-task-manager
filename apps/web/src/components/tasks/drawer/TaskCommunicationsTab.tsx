import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Alert, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material'
import { Launch } from '@mui/icons-material'
import { communicationApi } from '@/lib/api/communicationApi'
import type { Task } from '@/lib/types'

export default function TaskCommunicationsTab({ task, onCountChange }: { task: Task; onCountChange?: (count: number) => void }) {
  const communications = useQuery({
    queryKey: ['communication-items', 'task', task.id],
    queryFn: async () => (await communicationApi.list({ task_id: task.id, active_only: false, per_page: 100 })).data.items,
  })
  useEffect(() => {
    if (communications.data) onCountChange?.(communications.data.length)
  }, [communications.data, onCountChange])
  if (communications.isLoading) return <Stack alignItems="center" py={4}><CircularProgress size={24} aria-label="Загрузка коммуникаций" /></Stack>
  if (communications.isError) return <Alert severity="error">Не удалось загрузить связанные коммуникации.</Alert>
  if (!communications.data?.length) return <Alert severity="info">Для задачи пока нет связанных коммуникаций.</Alert>
  return <Stack spacing={1.25}>
    {communications.data.map((item) => <Paper key={item.id} variant="outlined" sx={{ p: 1.5 }}>
      <Stack direction="row" justifyContent="space-between" gap={2}>
        <Stack spacing={0.5} sx={{ minWidth: 0 }}><Typography fontWeight={700}>{item.subject || item.sender_name}</Typography><Typography variant="body2">{item.body_preview}</Typography><Typography variant="caption" color="text.secondary">{item.source_type} · {item.sender_name} · {item.action_status}</Typography>{item.next_action && <Typography variant="caption">Следующее действие: {item.next_action}</Typography>}</Stack>
        {item.source_url && <Button component="a" href={item.source_url} target="_blank" rel="noopener noreferrer" size="small" endIcon={<Launch />}>Источник</Button>}
      </Stack>
    </Paper>)}
    <Button component="a" href={`/inbox?task_id=${task.id}`} size="small">Открыть во входящих</Button>
  </Stack>
}
