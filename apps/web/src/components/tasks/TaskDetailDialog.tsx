import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Drawer, FormControl,
  IconButton, InputLabel, List, ListItem, ListItemText, MenuItem, Paper, Select, Stack,
  Tab, Tabs, TextField, Typography, useMediaQuery, useTheme,
} from '@mui/material'
import {
  Add, ArticleOutlined, Block, Close, DeleteOutline, EditOutlined, Launch, LinkOutlined, OpenInNew,
  Save, ScienceOutlined, Send, Summarize, TimelineOutlined,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useTasks } from '../../hooks/useTasks'
import { useProjects } from '../../hooks/useProjects'
import { documentApi } from '@/lib/api/documentApi'
import { testDataApi } from '@/lib/api/testDataApi'
import { commentApi } from '@/lib/api/commentApi'
import { workspaceLinkApi } from '@/lib/api/workspaceLinkApi'
import { managerStatusApi } from '@/lib/api/managerStatusApi'
import type { Task, TaskCreate, TaskPriority, TaskStatus, WorkflowStatus } from '../../lib/types'
import TaskDrawerHeader from './drawer/TaskDrawerHeader'
import TaskOverviewTab from './drawer/TaskOverviewTab'
import TaskCommunicationsTab from './drawer/TaskCommunicationsTab'
import TaskDrawerFooter from './drawer/TaskDrawerFooter'

interface Props {
  open: boolean
  onClose: () => void
  task: Task | null
  mode: 'view' | 'edit' | 'create'
  initialValues?: Partial<TaskCreate>
}

const priorities: Array<{ value: TaskPriority; label: string }> = [
  { value: 'urgent', label: 'P0 · Критичный' },
  { value: 'high', label: 'P1 · Высокий' },
  { value: 'medium', label: 'P2 · Средний' },
  { value: 'low', label: 'P3 · Низкий' },
]
const workflows: Array<{ value: WorkflowStatus; label: string }> = [
  { value: 'inbox', label: 'Входящие' }, { value: 'backlog', label: 'Backlog' },
  { value: 'clarification_needed', label: 'Нужно уточнение' }, { value: 'planned', label: 'Запланировано' },
  { value: 'ready', label: 'Ready' }, { value: 'in_progress', label: 'В работе' },
  { value: 'waiting_for_internal', label: 'Ждём команду' }, { value: 'waiting_for_client', label: 'Ждём клиента' },
  { value: 'review', label: 'На проверке' }, { value: 'ready_to_send', label: 'Готово к отправке' },
  { value: 'done', label: 'Готово' }, { value: 'cancelled', label: 'Отменено' },
  { value: 'blocked', label: 'Заблокировано' },
]
const emptyForm: TaskCreate = { title: '', description: '', priority: 'medium', status: 'todo', workflow_status: 'backlog', due_date: '' }

export default function TaskDetailDialog({ open, onClose, task, mode, initialValues }: Props) {
  const theme = useTheme()
  const mobile = useMediaQuery(theme.breakpoints.down('sm'))
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { createTask, updateTask, deleteTask } = useTasks()
  const { projects } = useProjects()
  const projectOptions = Array.isArray(projects) ? projects : []
  const [form, setForm] = useState<TaskCreate>(emptyForm)
  const [editing, setEditing] = useState(mode !== 'view')
  const [tab, setTab] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [comment, setComment] = useState('')
  const [statusSummary, setStatusSummary] = useState('')
  const [statusLoading, setStatusLoading] = useState(false)
  const [communicationCount, setCommunicationCount] = useState(0)

  useEffect(() => {
    if (task && mode !== 'create') {
      setForm({
        title: task.title, description: task.description || '', priority: task.priority,
        status: task.status, workflow_status: task.workflow_status || 'backlog',
        due_date: task.due_date?.slice(0, 10) || '', start_date: task.start_date?.slice(0, 10) || '',
        project_id: task.project_id || '', is_blocked: task.is_blocked,
        blocked_reason: task.blocked_reason || '', context: task.context || '',
        expected_result: task.expected_result || '', acceptance_criteria: task.acceptance_criteria || '',
        next_action: task.next_action || '', next_action_description: task.next_action_description || task.next_action || '',
        estimate_minutes: task.estimate_minutes || undefined, milestone: task.milestone || '', sprint: task.sprint || '',
        task_type: task.task_type || 'task', manager_id: task.manager_id || undefined,
        final_due_at: task.final_due_at?.slice(0, 16) || '', response_due_at: task.response_due_at?.slice(0, 16) || '',
        next_action_owner_id: task.next_action_owner_id || undefined, next_action_due_at: task.next_action_due_at?.slice(0, 16) || '',
        waiting_for_user_id: task.waiting_for_user_id || undefined, waiting_for_party: task.waiting_for_party || 'none',
        follow_up_action_description: task.follow_up_action_description || '', risk_level: task.risk_level || 'low',
        communication_channel: task.communication_channel || '',
      })
      setEditing(mode === 'edit')
    } else {
      setForm({ ...emptyForm, ...initialValues })
      setEditing(true)
    }
    setTab(0)
    setSaveError('')
    setCommunicationCount(0)
  }, [task, mode, open, initialValues])

  const documents = useQuery({
    queryKey: ['documents', 'task', task?.id],
    queryFn: async () => (await documentApi.list({ task_id: task!.id })).data.documents,
    enabled: open && Boolean(task) && tab === 1,
  })
  const testData = useQuery({
    queryKey: ['test-data', 'project', task?.project_id],
    queryFn: async () => (await testDataApi.list(task?.project_id ? { project_id: task.project_id } : undefined)).data.data_sets,
    enabled: open && Boolean(task) && tab === 3,
  })
  const comments = useQuery({
    queryKey: ['comments', task?.id],
    queryFn: () => commentApi.getByTask(task!.id),
    enabled: open && Boolean(task) && tab === 4,
  })
  const documentCount = documents.data?.length ?? task?.documentation_count ?? 0

  const handleSave = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    setSaveError('')
    const payload: TaskCreate = {
      ...form,
      start_date: form.start_date ? new Date(form.start_date + 'T00:00:00').toISOString() : undefined,
      due_date: form.due_date ? new Date(form.due_date + 'T23:59:00').toISOString() : undefined,
      project_id: form.project_id || undefined,
      estimate_minutes: form.estimate_minutes ? Number(form.estimate_minutes) : undefined,
    }
    try {
      if (mode === 'create') await createTask(payload)
      else if (task) await updateTask(task.id, payload)
      setEditing(false)
      if (mode === 'create') onClose()
    } catch (error: any) {
      const detail = error.response?.data?.detail
      setSaveError(typeof detail === 'string' ? detail : detail?.message || 'Не удалось сохранить задачу. Проверьте постановку и отсутствие секретов.')
    } finally {
      setSaving(false)
    }
  }
  const handleDelete = async () => {
    if (!task) return
    await deleteTask(task.id)
    onClose()
  }
  const generateStatus = async () => {
    if (!task) return
    setStatusLoading(true)
    try {
      const response = await managerStatusApi.task(task.id)
      setStatusSummary(response.data.markdown)
    } catch {
      setStatusSummary('Не удалось сформировать статус. Проверьте доступность API.')
    } finally {
      setStatusLoading(false)
    }
  }

  const addComment = async () => {
    if (!task || !comment.trim()) return
    await commentApi.create({ task_id: task.id, content: comment.trim() })
    setComment('')
    queryClient.invalidateQueries({ queryKey: ['comments', task.id] })
  }

  return <Drawer
    anchor="right"
    open={open}
    onClose={onClose}
    transitionDuration={180}
    ModalProps={{ keepMounted: false }}
    PaperProps={{ 'data-testid': 'task-drawer-paper', sx: { width: mobile ? '100%' : 720, maxWidth: '100vw', borderRadius: 0 } }}
  >
    <Stack sx={{ height: '100%' }}>
      <TaskDrawerHeader
        title={mode === 'create' ? 'Создание задачи' : task?.title || 'Задача'}
        contextLabel={mode === 'create' ? 'Новая задача' : task?.project_id ? projectOptions.find((project: any) => project.id === task.project_id)?.name || 'Проект' : 'Личная задача'}
        canEdit={Boolean(task) && !editing}
        statusLoading={statusLoading}
        onStatus={() => void generateStatus()}
        onEdit={() => setEditing(true)}
        onClose={onClose}
      />
      {task && <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" sx={{ px: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Tab label="Обзор" /><Tab label={`Документы ${documentCount}`} /><Tab label={`Коммуникации ${communicationCount}`} /><Tab label="Тестирование" /><Tab label={`Активность ${task.comment_count ?? 0}`} />
      </Tabs>}

      <Box sx={{ flex: 1, overflowY: 'auto', p: { xs: 2, sm: 2.5 } }}>
        {saveError && <Alert severity="error" sx={{ mb: 2 }}>{saveError}</Alert>}
        {tab === 0 && <Stack spacing={3}>{editing || !task ? <TaskOverviewForm form={form} setForm={setForm} projects={projectOptions} /> : <TaskOverviewTab task={task} />}{task && <RelatedPrograms task={task} />}</Stack>}
        {tab === 1 && <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center"><Typography variant="h6" fontWeight={750}>Документация задачи</Typography><Button startIcon={<Add />} onClick={() => navigate('/documents?task_id=' + task?.id)}>Документ</Button></Stack>
          {documents.isLoading ? <CircularProgress size={24} /> : !documents.data?.length ? <Alert severity="info">Brief, acceptance criteria и test plan ещё не привязаны.</Alert> : <List disablePadding>{documents.data.map((document) => <ListItem key={document.id} divider secondaryAction={<IconButton onClick={() => navigate('/documents?document=' + document.id)}><OpenInNew /></IconButton>}><ArticleOutlined sx={{ mr: 1.5 }} /><ListItemText primary={document.title} secondary={document.document_type + ' · v' + document.version} /></ListItem>)}</List>}
        </Stack>}
        {tab === 2 && task && <TaskCommunicationsTab task={task} onCountChange={setCommunicationCount} />}
        {tab === 3 && <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center"><Typography variant="h6" fontWeight={750}>Тестирование</Typography><Button startIcon={<ScienceOutlined />} onClick={() => navigate('/test-data')}>Test Data Vault</Button></Stack>
          <Alert severity="info">Секреты и платёжные реквизиты здесь не показываются. Используйте только сценарии и vault references.</Alert>
          {!testData.data?.length ? <Typography color="text.secondary">Для проекта нет безопасных тестовых наборов.</Typography> : testData.data.map((dataSet) => <Paper key={dataSet.id} variant="outlined" sx={{ p: 1.5 }}><Stack direction="row" justifyContent="space-between"><Box><Typography fontWeight={700}>{dataSet.name}</Typography><Typography variant="caption" color="text.secondary">{dataSet.environment} · {dataSet.category}</Typography></Box><Chip size="small" label={dataSet.sensitivity} /></Stack></Paper>)}
        </Stack>}
        {tab === 4 && <Stack spacing={2}>
          <Typography variant="h6" fontWeight={750}>Комментарии и изменения</Typography>
          <Stack direction="row" spacing={1}><TextField fullWidth multiline maxRows={4} placeholder="Добавить комментарий" value={comment} onChange={(event) => setComment(event.target.value)} /><IconButton color="primary" aria-label="Отправить комментарий" onClick={() => void addComment()}><Send /></IconButton></Stack>
          {comments.isLoading ? <CircularProgress size={24} /> : !(comments.data as any)?.comments?.length ? <Typography color="text.secondary">Активности пока нет.</Typography> : (comments.data as any).comments.map((item: any) => <Paper key={item.id} variant="outlined" sx={{ p: 1.5 }}><Typography variant="body2">{item.content}</Typography><Typography variant="caption" color="text.secondary">{new Date(item.created_at).toLocaleString('ru-RU')}</Typography></Paper>)}
        </Stack>}
      </Box>

      {(editing || mode === 'create') && <TaskDrawerFooter
        hasTask={Boolean(task)} saving={saving} saveDisabled={!form.title.trim()}
        onDelete={() => void handleDelete()} onCancel={mode === 'create' ? onClose : () => setEditing(false)} onSave={() => void handleSave()}
      />}
      <Dialog open={Boolean(statusSummary)} onClose={() => setStatusSummary('')} fullWidth maxWidth="sm">
        <DialogTitle>Краткий статус задачи</DialogTitle>
        <DialogContent dividers><Typography component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', m: 0 }}>{statusSummary}</Typography></DialogContent>
        <DialogActions><Button onClick={() => navigator.clipboard.writeText(statusSummary)}>Копировать</Button><Button variant="contained" onClick={() => setStatusSummary('')}>Закрыть</Button></DialogActions>
      </Dialog>
    </Stack>
  </Drawer>
}

function TaskOverviewForm({ form, setForm, projects }: { form: TaskCreate; setForm: (value: TaskCreate) => void; projects: any[] }) {
  return <Stack spacing={2}>
    <TextField label="Название" required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      <FormControl fullWidth><InputLabel>Workflow</InputLabel><Select label="Workflow" value={form.workflow_status || 'backlog'} onChange={(event) => setForm({ ...form, workflow_status: event.target.value as WorkflowStatus })}>{workflows.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}</Select></FormControl>
      <FormControl fullWidth><InputLabel>Приоритет</InputLabel><Select label="Приоритет" value={form.priority || 'medium'} onChange={(event) => setForm({ ...form, priority: event.target.value as TaskPriority })}>{priorities.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}</Select></FormControl>
    </Stack>
    <FormControl fullWidth><InputLabel>Проект</InputLabel><Select label="Проект" value={form.project_id || ''} onChange={(event) => setForm({ ...form, project_id: event.target.value || undefined })}><MenuItem value="">Без проекта</MenuItem>{projects.map((project) => <MenuItem key={project.id} value={project.id}>{project.name}</MenuItem>)}</Select></FormControl>
    {form.workflow_status === 'ready' && <Alert severity="info">Для Ready обязательны контекст, результат, acceptance criteria, ответственный, приоритет и проект.</Alert>}
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      <FormControl fullWidth><InputLabel>Тип задачи</InputLabel><Select label="Тип задачи" value={form.task_type || 'task'} onChange={(event) => setForm({ ...form, task_type: event.target.value as Task['task_type'] })}><MenuItem value="task">Задача</MenuItem><MenuItem value="bug">Ошибка</MenuItem><MenuItem value="request">Запрос</MenuItem><MenuItem value="approval">Согласование</MenuItem><MenuItem value="contract_approval">Согласование договора</MenuItem><MenuItem value="incident">Инцидент</MenuItem><MenuItem value="release">Релиз</MenuItem><MenuItem value="meeting">Встреча</MenuItem><MenuItem value="follow_up">Follow-up</MenuItem><MenuItem value="requirement_clarification">Уточнение требования</MenuItem></Select></FormControl>
      <FormControl fullWidth><InputLabel>Риск</InputLabel><Select label="Риск" value={form.risk_level || 'low'} onChange={(event) => setForm({ ...form, risk_level: event.target.value as Task['risk_level'] })}><MenuItem value="low">Низкий</MenuItem><MenuItem value="medium">Средний</MenuItem><MenuItem value="high">Высокий</MenuItem><MenuItem value="critical">Критичный</MenuItem></Select></FormControl>
    </Stack>
    <TextField label="Следующее действие" value={form.next_action_description || ''} onChange={(event) => setForm({ ...form, next_action_description: event.target.value })} />
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      <TextField fullWidth type="datetime-local" label="Финальный срок" value={form.final_due_at || ''} InputLabelProps={{ shrink: true }} onChange={(event) => setForm({ ...form, final_due_at: event.target.value })} />
      <TextField fullWidth type="datetime-local" label="Ответ исполнителя до" value={form.response_due_at || ''} InputLabelProps={{ shrink: true }} onChange={(event) => setForm({ ...form, response_due_at: event.target.value })} />
      <TextField fullWidth type="datetime-local" label="Следующее действие до" value={form.next_action_due_at || ''} InputLabelProps={{ shrink: true }} onChange={(event) => setForm({ ...form, next_action_due_at: event.target.value })} />
    </Stack>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      <FormControl fullWidth><InputLabel>Кого ждём</InputLabel><Select label="Кого ждём" value={form.waiting_for_party || 'none'} onChange={(event) => setForm({ ...form, waiting_for_party: event.target.value as Task['waiting_for_party'] })}><MenuItem value="none">Никого</MenuItem><MenuItem value="internal">Команду</MenuItem><MenuItem value="client">Клиента</MenuItem><MenuItem value="insurer">Страховую</MenuItem><MenuItem value="vendor">Подрядчика</MenuItem></Select></FormControl>
      <TextField fullWidth label="Канал коммуникации" placeholder="email, telegram, meeting" value={form.communication_channel || ''} onChange={(event) => setForm({ ...form, communication_channel: event.target.value })} />
    </Stack>
    <TextField label="Что сделать после ответа" value={form.follow_up_action_description || ''} onChange={(event) => setForm({ ...form, follow_up_action_description: event.target.value })} />
    <TextField multiline minRows={3} label="Контекст" value={form.context || ''} onChange={(event) => setForm({ ...form, context: event.target.value })} />
    <TextField multiline minRows={2} label="Ожидаемый результат" value={form.expected_result || ''} onChange={(event) => setForm({ ...form, expected_result: event.target.value })} />
    <TextField multiline minRows={4} label="Acceptance criteria" placeholder="- [ ] Критерий 1" value={form.acceptance_criteria || ''} onChange={(event) => setForm({ ...form, acceptance_criteria: event.target.value })} />
    <TextField multiline minRows={3} label="Описание / технические заметки" value={form.description || ''} onChange={(event) => setForm({ ...form, description: event.target.value })} />
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><TextField fullWidth type="date" label="Начало" value={form.start_date || ''} InputLabelProps={{ shrink: true }} onChange={(event) => setForm({ ...form, start_date: event.target.value })} /><TextField fullWidth type="date" label="Срок" value={form.due_date || ''} InputLabelProps={{ shrink: true }} onChange={(event) => setForm({ ...form, due_date: event.target.value })} /><TextField fullWidth type="number" label="Оценка, мин" value={form.estimate_minutes || ''} onChange={(event) => setForm({ ...form, estimate_minutes: Number(event.target.value) || undefined })} /></Stack>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><TextField fullWidth label="Milestone" value={form.milestone || ''} onChange={(event) => setForm({ ...form, milestone: event.target.value })} /><TextField fullWidth label="Sprint" value={form.sprint || ''} onChange={(event) => setForm({ ...form, sprint: event.target.value })} /></Stack>
    <FormControl fullWidth><InputLabel>Блокировка</InputLabel><Select label="Блокировка" value={form.is_blocked ? 'blocked' : 'clear'} onChange={(event) => setForm({ ...form, is_blocked: event.target.value === 'blocked', blocked_reason: event.target.value === 'blocked' ? form.blocked_reason : '' })}><MenuItem value="clear">Не заблокирована</MenuItem><MenuItem value="blocked">Заблокирована</MenuItem></Select></FormControl>
    {form.is_blocked && <TextField required multiline minRows={2} label="Причина блокировки" value={form.blocked_reason || ''} onChange={(event) => setForm({ ...form, blocked_reason: event.target.value })} />}
  </Stack>
}

function RelatedPrograms({ task }: { task: Task }) {
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState('')
  const linked = useQuery({ queryKey: ['workspace-links', 'task', task.id], queryFn: async () => (await workspaceLinkApi.listForTask(task.id)).data })
  const catalog = useQuery({ queryKey: ['workspace-links', 'catalog', task.project_id], queryFn: async () => (await workspaceLinkApi.list({ per_page: 100 })).data.links })
  const linkedIds = new Set((linked.data || []).map((link) => link.id))
  const options = (catalog.data || []).filter((link) => !linkedIds.has(link.id) && (!link.project_id || link.project_id === task.project_id))
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['workspace-links', 'task', task.id] })
  const attach = async () => { if (!selectedId) return; await workspaceLinkApi.attachToTask(task.id, selectedId); setSelectedId(''); await refresh() }
  const detach = async (linkId: string) => { await workspaceLinkApi.detachFromTask(task.id, linkId); await refresh() }
  return <Box><Divider sx={{ mb: 2 }} /><Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.25}><Stack direction="row" gap={1} alignItems="center"><LinkOutlined color="action" /><Typography variant="h6" fontWeight={750}>Связанные программы</Typography></Stack><Button size="small" onClick={() => window.open('/links', '_blank', 'noopener,noreferrer')}>Каталог</Button></Stack>
    <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} mb={1.5}><FormControl fullWidth size="small"><InputLabel>Добавить программу</InputLabel><Select label="Добавить программу" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>{options.map((link) => <MenuItem key={link.id} value={link.id}>{link.title} · {link.project_name || 'Общее'}</MenuItem>)}</Select></FormControl><Button variant="outlined" disabled={!selectedId} onClick={() => void attach()}>Связать</Button></Stack>
    {!linked.data?.length ? <Typography variant="body2" color="text.secondary">Программы не привязаны. Добавьте Kibana, Swagger, Staging или другую полезную ссылку.</Typography> : <Stack spacing={0.75}>{linked.data.map((link) => <Paper key={link.id} variant="outlined" sx={{ px: 1.5, py: 1 }}><Stack direction="row" alignItems="center" gap={1}><Box sx={{ minWidth: 0, flex: 1 }}><Typography variant="body2" fontWeight={700} noWrap>{link.title}</Typography><Typography variant="caption" color="text.secondary">{link.project_name || 'Общее'} · {link.environment || link.category}</Typography></Box><Button component="a" href={link.url} target="_blank" rel="noopener noreferrer" size="small" endIcon={<Launch />}>Открыть</Button><IconButton size="small" aria-label="Отвязать программу" onClick={() => void detach(link.id)}><Close fontSize="small" /></IconButton></Stack></Paper>)}</Stack>}
  </Box>
}