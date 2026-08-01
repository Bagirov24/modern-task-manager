import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, InputAdornment, InputLabel, MenuItem, Paper, Select, Stack, TextField, Typography,
} from '@mui/material'
import {
  Add, AlternateEmail, ArrowOutward, Check, EmailOutlined, ForumOutlined,
  InfoOutlined, PersonSearchOutlined, Search, TaskAltOutlined, Telegram,
} from '@mui/icons-material'
import { communicationApi } from '@/lib/api/communicationApi'
import { classifyCommunicationState } from '@/features/work/selectors'
import { projectApi } from '@/lib/api/projectApi'
import { useAuthStore } from '@/lib/store/authStore'
import type { CommunicationActionStatus, CommunicationItem, CommunicationItemInput } from '@/lib/types'

const groups: Array<{ value: CommunicationActionStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Все' }, { value: 'needs_my_reply', label: 'Нужно ответить мне' },
  { value: 'need_customer_input', label: 'Спросить заказчика' }, { value: 'need_internal_input', label: 'Уточнить у команды' },
  { value: 'waiting_for_reply', label: 'Жду ответа' }, { value: 'ready_to_respond', label: 'Готово к ответу' },
  { value: 'fyi', label: 'FYI' },
]

const communicationStatuses = new Set<CommunicationActionStatus>([
  'new', 'needs_my_reply', 'need_customer_input', 'need_internal_input', 'waiting_for_reply',
  'ready_to_respond', 'fyi', 'done', 'archived',
])

export type InboxScope = 'all' | 'my-actions' | 'my-waiting'

export function readInboxFilters(searchParams: URLSearchParams): { scope: InboxScope; status: CommunicationActionStatus | 'all'; itemId: string | null } {
  const requestedScope = searchParams.get('scope')
  const requestedStatus = searchParams.get('action_status')
  return {
    scope: requestedScope === 'my-actions' || requestedScope === 'my-waiting' ? requestedScope : 'all',
    status: requestedStatus && communicationStatuses.has(requestedStatus as CommunicationActionStatus) ? requestedStatus as CommunicationActionStatus : 'all',
    itemId: searchParams.get('item'),
  }
}

export function matchesInboxScope(item: CommunicationItem, scope: InboxScope, currentUserId: string): boolean {
  if (scope === 'all') return true
  if (!currentUserId || item.action_owner_id !== currentUserId) return false
  const state = classifyCommunicationState(item)
  return scope === 'my-actions' ? state === 'actionable' : state === 'waiting'
}

const emptyInput: CommunicationItemInput = {
  source_type: 'manual', sender_name: '', sender_role: 'other', direction: 'incoming',
  body_preview: '', action_status: 'new', waiting_for_party: 'none', needs_reply: false, importance: 'normal',
}

export default function ActionInboxPage() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = readInboxFilters(searchParams)
  const currentUserId = useAuthStore((state) => state.user?.id ?? '')
  const [status, setStatus] = useState<(typeof groups)[number]['value']>(filters.status)
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  useEffect(() => setStatus(filters.status), [filters.status])

  const projects = useQuery({ queryKey: ['projects', 'action-inbox'], queryFn: async () => (await projectApi.list()).data.projects })
  const inbox = useQuery({
    queryKey: ['communication-items', status, search, filters.scope],
    queryFn: async () => (await communicationApi.list({ action_status: status === 'all' ? undefined : status, search: search || undefined, active_only: filters.scope !== 'all' || undefined, per_page: 100 })).data,
  })
  const selectedItem = useQuery({
    queryKey: ['communication-items', 'detail', filters.itemId],
    queryFn: async () => (await communicationApi.get(filters.itemId!)).data,
    enabled: Boolean(filters.itemId),
  })
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['communication-items'] })
  const update = useMutation({ mutationFn: ({ item, values }: { item: CommunicationItem; values: Partial<CommunicationItemInput> }) => communicationApi.update(item.id, values), onSuccess: () => void refresh() })
  const createTask = useMutation({ mutationFn: (item: CommunicationItem) => communicationApi.createTask(item.id), onSuccess: () => void refresh() })
  const create = useMutation({ mutationFn: (values: CommunicationItemInput) => communicationApi.create(values), onSuccess: () => { setCreateOpen(false); void refresh() } })
  const projectMap = new Map((projects.data || []).map((project) => [project.id, project.name]))
  const items = useMemo(() => {
    const listed = inbox.data?.items ?? []
    const withSelected = selectedItem.data && !listed.some((item) => item.id === selectedItem.data!.id) ? [selectedItem.data, ...listed] : listed
    return withSelected.filter((item) => matchesInboxScope(item, filters.scope, currentUserId))
  }, [currentUserId, filters.scope, inbox.data?.items, selectedItem.data])

  const selectStatus = (value: (typeof groups)[number]['value']) => {
    setStatus(value)
    const next = new URLSearchParams(searchParams)
    if (value === 'all') next.delete('action_status')
    else next.set('action_status', value)
    setSearchParams(next, { replace: true })
  }

  return <Stack spacing={2.5} sx={{ maxWidth: 1400, mx: 'auto' }}>
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2}><Box><Typography variant="h4" fontWeight={760}>Входящие действия</Typography><Typography color="text.secondary">Только сообщения, где нужно решение, ответ или следующий шаг.</Typography></Box><Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)}>Добавить вручную</Button></Stack>
    <Paper variant="outlined" sx={{ p: 1.5 }}><Stack gap={1.25}><TextField size="small" placeholder="Поиск по отправителю, теме и содержанию" value={search} onChange={(event) => setSearch(event.target.value)} InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }} /><Stack direction="row" gap={0.75} flexWrap="wrap">{groups.map((group) => <Chip key={group.value} clickable color={status === group.value ? 'primary' : 'default'} variant={status === group.value ? 'filled' : 'outlined'} label={`${group.label}${group.value !== 'all' && inbox.data?.groups[group.value] ? ` ${inbox.data.groups[group.value]}` : ''}`} onClick={() => selectStatus(group.value)} />)}</Stack></Stack></Paper>
    {(inbox.isError || selectedItem.isError) && <Alert severity="error">Не удалось загрузить входящие действия.</Alert>}
    {!inbox.isLoading && !items.length ? <Paper variant="outlined" sx={{ py: 8, textAlign: 'center' }}><ForumOutlined sx={{ fontSize: 44, color: 'text.disabled' }} /><Typography variant="h6" fontWeight={700} mt={1}>Входящих действий нет</Typography><Typography color="text.secondary">Добавляйте только сообщения, где действительно требуется действие.</Typography></Paper> : <Stack spacing={1}>{items.map((item) => <InboxCard key={item.id} item={item} selected={filters.itemId === item.id} projectName={item.project_id ? projectMap.get(item.project_id) : undefined} onStatus={(value) => update.mutate({ item, values: { action_status: value } })} onCreateTask={() => createTask.mutate(item)} />)}</Stack>}
    <CreateCommunicationDialog open={createOpen} projects={projects.data || []} saving={create.isPending} onClose={() => setCreateOpen(false)} onSave={(values) => create.mutate(values)} />
  </Stack>
}

function InboxCard({ item, selected, projectName, onStatus, onCreateTask }: { item: CommunicationItem; selected: boolean; projectName?: string; onStatus: (value: CommunicationActionStatus) => void; onCreateTask: () => void }) {
  const SourceIcon = item.source_type === 'telegram' ? Telegram : item.source_type === 'email' ? EmailOutlined : AlternateEmail
  const overdue = item.response_due_at && new Date(item.response_due_at) < new Date()
  return <Paper id={`communication-${item.id}`} aria-current={selected ? 'true' : undefined} variant="outlined" sx={{ p: 2, borderLeft: '4px solid', borderLeftColor: selected ? 'primary.main' : overdue ? 'error.main' : item.importance === 'critical' ? 'warning.main' : 'divider', bgcolor: selected ? 'action.selected' : undefined }}>
    <Stack direction={{ xs: 'column', md: 'row' }} gap={2} alignItems={{ md: 'flex-start' }}>
      <Box sx={{ width: 40, height: 40, bgcolor: 'action.hover', borderRadius: 1, display: 'grid', placeItems: 'center', flexShrink: 0 }}><SourceIcon color="action" /></Box>
      <Box sx={{ flex: 1, minWidth: 0 }}><Stack direction="row" gap={1} alignItems="center" flexWrap="wrap"><Typography fontWeight={750}>{item.subject || item.sender_name}</Typography><Chip size="small" label={item.sender_role} variant="outlined" /><Chip size="small" label={projectName || 'Общее'} /></Stack><Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{item.body_preview}</Typography>{item.next_action && <Typography variant="body2" sx={{ mt: 1 }}><strong>Следующее действие:</strong> {item.next_action}</Typography>}<Stack direction="row" gap={1} mt={1} flexWrap="wrap"><Chip size="small" label={groups.find((group) => group.value === item.action_status)?.label || item.action_status} />{item.response_due_at && <Chip size="small" color={overdue ? 'error' : 'default'} variant="outlined" label={`Ответ до ${new Date(item.response_due_at).toLocaleString('ru-RU')}`} />}{item.waiting_for_party !== 'none' && <Chip size="small" icon={<PersonSearchOutlined />} variant="outlined" label={`Ждём: ${item.waiting_for_party}`} />}</Stack></Box>
      <Stack direction="row" gap={0.5} flexWrap="wrap" sx={{ maxWidth: { md: 410 }, justifyContent: { md: 'flex-end' } }}><Button size="small" startIcon={<AlternateEmail />} onClick={() => onStatus('needs_my_reply')}>Ответить</Button><Button size="small" onClick={() => onStatus('need_customer_input')}>Спросить заказчика</Button><Button size="small" onClick={() => onStatus('need_internal_input')}>Спросить команду</Button>{!item.task_id && <Button size="small" startIcon={<TaskAltOutlined />} onClick={onCreateTask}>Создать задачу</Button>}<Button size="small" startIcon={<InfoOutlined />} onClick={() => onStatus('fyi')}>FYI</Button><Button size="small" startIcon={<Check />} onClick={() => onStatus('done')}>Закрыть</Button>{item.source_url && <Button component="a" href={item.source_url} target="_blank" rel="noopener noreferrer" size="small" endIcon={<ArrowOutward />}>Источник</Button>}</Stack>
    </Stack>
  </Paper>
}

function CreateCommunicationDialog({ open, projects, saving, onClose, onSave }: { open: boolean; projects: Array<{ id: string; name: string }>; saving: boolean; onClose: () => void; onSave: (values: CommunicationItemInput) => void }) {
  const [form, setForm] = useState<CommunicationItemInput>(emptyInput)
  return <Dialog open={open} onClose={onClose} fullWidth maxWidth="md"><DialogTitle>Добавить входящее действие</DialogTitle><DialogContent><Stack spacing={2} mt={1}><Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}><TextField required fullWidth label="Отправитель" value={form.sender_name} onChange={(e) => setForm({ ...form, sender_name: e.target.value })} /><FormControl fullWidth><InputLabel>Роль</InputLabel><Select label="Роль" value={form.sender_role} onChange={(e) => setForm({ ...form, sender_role: e.target.value as CommunicationItemInput['sender_role'] })}>{['developer', 'designer', 'manager', 'lawyer', 'client', 'insurer', 'other'].map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}</Select></FormControl><FormControl fullWidth><InputLabel>Проект</InputLabel><Select label="Проект" value={form.project_id || ''} onChange={(e) => setForm({ ...form, project_id: e.target.value || null })}><MenuItem value="">Общее</MenuItem>{projects.map((project) => <MenuItem key={project.id} value={project.id}>{project.name}</MenuItem>)}</Select></FormControl></Stack><TextField fullWidth label="Тема" value={form.subject || ''} onChange={(e) => setForm({ ...form, subject: e.target.value })} /><TextField required multiline minRows={4} label="Краткое содержание" value={form.body_preview} onChange={(e) => setForm({ ...form, body_preview: e.target.value })} /><TextField multiline minRows={2} label="Следующее действие" value={form.next_action || ''} onChange={(e) => setForm({ ...form, next_action: e.target.value })} /><Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}><FormControl fullWidth><InputLabel>Статус</InputLabel><Select label="Статус" value={form.action_status} onChange={(e) => setForm({ ...form, action_status: e.target.value as CommunicationActionStatus })}>{groups.filter((group) => group.value !== 'all').map((group) => <MenuItem key={group.value} value={group.value}>{group.label}</MenuItem>)}</Select></FormControl><TextField fullWidth type="datetime-local" label="Ответ до" InputLabelProps={{ shrink: true }} onChange={(e) => setForm({ ...form, response_due_at: e.target.value ? new Date(e.target.value).toISOString() : null })} /><FormControl fullWidth><InputLabel>Важность</InputLabel><Select label="Важность" value={form.importance} onChange={(e) => setForm({ ...form, importance: e.target.value as CommunicationItemInput['importance'] })}>{['low', 'normal', 'high', 'critical'].map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}</Select></FormControl></Stack></Stack></DialogContent><DialogActions><Button onClick={onClose}>Отмена</Button><Button variant="contained" disabled={saving || !form.sender_name.trim() || !form.body_preview.trim()} onClick={() => onSave(form)}>Добавить</Button></DialogActions></Dialog>
}
