import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Alert, Avatar, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, LinearProgress, Paper, Stack, TextField, Typography,
} from '@mui/material'
import {
  Block, CalendarToday, CheckCircleOutline, DescriptionOutlined, FlagOutlined,
  FolderOutlined, InboxOutlined, Launch, LinkOutlined, PlayArrow, PriorityHigh, SwapHoriz, WarningAmber,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useTasksQuery } from '@/lib/hooks/useTasksQuery'
import { useProjectsQuery } from '@/lib/hooks/useProjectsQuery'
import { useAuthStore } from '@/lib/store/authStore'
import { useUIStore } from '@/store/uiStore'
import type { Project, Task } from '@/lib/types'
import { workspaceLinkApi } from '@/lib/api/workspaceLinkApi'
import { communicationApi } from '@/lib/api/communicationApi'

const dayMs = 86400000
const closed = (task: Task) => task.status === 'done' || task.status === 'archived' || task.workflow_status === 'done' || task.workflow_status === 'cancelled'
const dateKey = (value: Date) => value.getFullYear() + '-' + String(value.getMonth() + 1).padStart(2, '0') + '-' + String(value.getDate()).padStart(2, '0')
const priorityRank: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }

export default function DashboardPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const addSnackbar = useUIStore((state) => state.addSnackbar)
  const { tasks: rawTasks, loading, updateTask } = useTasksQuery()
  const { projects } = useProjectsQuery()
  const tasks = Array.isArray(rawTasks) ? rawTasks : []
  const [blockedTask, setBlockedTask] = useState<Task | null>(null)
  const [blockedReason, setBlockedReason] = useState('')
  const favoriteLinks = useQuery({
    queryKey: ['workspace-links', 'dashboard-favorites'],
    queryFn: async () => (await workspaceLinkApi.list({ favorites_only: true, per_page: 6 })).data.links,
  })
  const inbox = useQuery({
    queryKey: ['communication-items', 'dashboard'],
    queryFn: async () => (await communicationApi.list({ per_page: 6 })).data,
  })
  const now = new Date()
  const today = dateKey(now)
  const projectMap = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects])
  const activeTasks = useMemo(() => tasks.filter((task) => !closed(task)), [tasks])

  const focusTask = useMemo(() => [...activeTasks].sort((a, b) => {
    const aFocus = a.workflow_status === 'in_progress' || a.status === 'in_progress' ? 0 : 1
    const bFocus = b.workflow_status === 'in_progress' || b.status === 'in_progress' ? 0 : 1
    const aDue = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER
    const bDue = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER
    return aFocus - bFocus || priorityRank[a.priority] - priorityRank[b.priority] || aDue - bDue
  })[0], [activeTasks])

  const todayTasks = useMemo(() => activeTasks.filter((task) => {
    if (!task.due_date) return task.priority === 'urgent' || task.priority === 'high'
    return dateKey(new Date(task.due_date)) <= today
  }).sort((a, b) => {
    const aOverdue = a.due_date && dateKey(new Date(a.due_date)) < today ? 0 : 1
    const bOverdue = b.due_date && dateKey(new Date(b.due_date)) < today ? 0 : 1
    return Number(aOverdue) - Number(bOverdue) || priorityRank[a.priority] - priorityRank[b.priority]
  }), [activeTasks, today])

  const nextDays = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + index + 1)
    return {
      key: dateKey(date),
      label: new Intl.DateTimeFormat('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' }).format(date),
      tasks: activeTasks.filter((task) => task.due_date && dateKey(new Date(task.due_date)) === dateKey(date)).slice(0, 5),
    }
  }), [activeTasks, today])

  const attention = useMemo(() => ({
    overdue: activeTasks.filter((task) => task.due_date && new Date(task.due_date) < now),
    blocked: activeTasks.filter((task) => task.is_blocked),
    unassigned: activeTasks.filter((task) => !task.assignee_id),
    needsPlanning: activeTasks.filter((task) => ['urgent', 'high'].includes(task.priority) && (!task.due_date || task.is_planning_complete === false)),
    stale: activeTasks.filter((task) => task.updated_at && now.getTime() - new Date(task.updated_at).getTime() > 7 * dayMs),
    responseOverdue: activeTasks.filter((task) => task.response_due_at && new Date(task.response_due_at) < now),
    noNextAction: activeTasks.filter((task) => !task.next_action_description && !task.next_action),
  }), [activeTasks, today])

  const complete = async (task: Task) => {
    await updateTask(task.id, { workflow_status: 'done' })
    addSnackbar({ message: 'Задача завершена', type: 'success', duration: 2500 })
  }
  const start = async (task: Task) => {
    await updateTask(task.id, { workflow_status: 'in_progress' })
    addSnackbar({ message: 'Задача в работе', type: 'success', duration: 2500 })
  }
  const blockTask = async () => {
    if (!blockedTask || !blockedReason.trim()) return
    await updateTask(blockedTask.id, { is_blocked: true, blocked_reason: blockedReason.trim() })
    setBlockedTask(null)
    setBlockedReason('')
  }

  const todayLabel = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }).format(now)
  return <Stack spacing={3} sx={{ maxWidth: 1440, mx: 'auto' }}>
    <Box>
      <Typography variant="h4" fontWeight={760}>Здравствуйте, {user?.full_name || user?.username || 'коллега'}</Typography>
      <Typography color="text.secondary" sx={{ textTransform: 'capitalize' }}>{todayLabel}. Вот рабочий контекст, который требует внимания.</Typography>
    </Box>

    <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, borderLeft: '4px solid', borderLeftColor: focusTask?.is_blocked ? 'warning.main' : 'primary.main' }}>
      <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent="space-between" gap={2}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="overline" color="text.secondary" fontWeight={700}>Focus Now</Typography>
          {loading ? <LinearProgress sx={{ width: 260, mt: 2 }} /> : focusTask ? <>
            <Typography variant="h5" fontWeight={750} sx={{ mt: 0.25 }}>{focusTask.title}</Typography>
            <Stack direction="row" gap={1} flexWrap="wrap" mt={1.25}>
              <Chip size="small" icon={<FolderOutlined />} label={projectMap.get(focusTask.project_id || '')?.name || 'Без проекта'} />
              <StatusChip task={focusTask} />
              <PriorityChip priority={focusTask.priority} />
              {(focusTask.final_due_at || focusTask.due_date) && <Chip size="small" icon={<CalendarToday />} variant="outlined" label={'Финально: ' + new Date(focusTask.final_due_at || focusTask.due_date!).toLocaleString('ru-RU')} />}
              {focusTask.estimate_minutes != null && <Chip size="small" variant="outlined" label={String(focusTask.estimate_minutes) + ' мин'} />}
              <Chip size="small" icon={<DescriptionOutlined />} variant="outlined" label={focusTask.documentation_count ? 'Документы ' + focusTask.documentation_count : 'Документация'} onClick={() => navigate('/documents?task_id=' + focusTask.id)} />
            </Stack>
            {(focusTask.next_action_description || focusTask.next_action) && <Typography sx={{ mt: 1.5 }}><strong>Следующее действие:</strong> {focusTask.next_action_description || focusTask.next_action}</Typography>}
            {focusTask.is_blocked && <Alert severity="warning" icon={<Block />} sx={{ mt: 1.5 }}><strong>Заблокирована:</strong> {focusTask.blocked_reason || 'Причина не указана'}</Alert>}
          </> : <><Typography variant="h6" fontWeight={700}>Фокус не выбран</Typography><Typography color="text.secondary">Создайте задачу или выберите приоритет из списка на сегодня.</Typography></>}
        </Box>
        {focusTask && <Stack direction="row" gap={1} flexWrap="wrap" alignContent="flex-start">
          <Button variant="contained" startIcon={<PlayArrow />} onClick={() => void start(focusTask)}>Начать</Button>
          <Button variant="outlined" startIcon={<CheckCircleOutline />} onClick={() => void complete(focusTask)}>Завершить</Button>
          <Button variant="outlined" color="warning" startIcon={<Block />} onClick={() => setBlockedTask(focusTask)}>Заблокировать</Button>
          <Button variant="text" startIcon={<SwapHoriz />} onClick={() => navigate('/tasks?view=list')}>Сменить</Button>
        </Stack>}
      </Stack>
    </Paper>

    <Box component="section">
      <SectionHeading title="Избранные ссылки" action={() => navigate('/links')} />
      {!favoriteLinks.data?.length ? <Paper variant="outlined" sx={{ p: 2 }}><Stack direction="row" alignItems="center" gap={1.5}><LinkOutlined color="action" /><Box sx={{ flex: 1 }}><Typography fontWeight={700}>Быстрых ссылок пока нет</Typography><Typography variant="body2" color="text.secondary">Закрепите GitHub, Kibana, почту, Staging или другие рабочие программы.</Typography></Box><Button onClick={() => navigate('/links')}>Открыть каталог</Button></Stack></Paper> :
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))', xl: 'repeat(6, minmax(0, 1fr))' }, gap: 1 }}>
          {favoriteLinks.data.map((link) => <Button key={link.id} component="a" href={link.url} target="_blank" rel="noopener noreferrer" color="inherit" variant="outlined" endIcon={<Launch fontSize="small" />} sx={{ minHeight: 52, justifyContent: 'space-between', overflow: 'hidden' }}><Typography variant="body2" fontWeight={700} noWrap>{link.title}</Typography></Button>)}
        </Box>}
    </Box>

    <Box component="section">
      <SectionHeading title="Входящие действия" count={inbox.data?.total || 0} action={() => navigate('/inbox')} />
      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        {!inbox.data?.items.length ? <EmptyLine text="Новых сообщений и обязательств нет" /> : inbox.data.items.map((item, index) => <Stack key={item.id} direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} gap={1.25} sx={{ minHeight: 62, px: 1.5, py: 1, borderBottom: index === inbox.data!.items.length - 1 ? 0 : '1px solid', borderColor: 'divider' }}>
          <InboxOutlined color={item.importance === 'critical' || item.importance === 'high' ? 'error' : 'action'} />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="body2" fontWeight={700} noWrap>{item.subject || item.body_preview}</Typography>
            <Typography variant="caption" color="text.secondary" noWrap>{item.sender_name} · {communicationStatusLabel(item.action_status)}{item.next_action ? ' · ' + item.next_action : ''}</Typography>
          </Box>
          {item.response_due_at && <Chip size="small" variant="outlined" icon={<CalendarToday />} label={new Date(item.response_due_at).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })} />}
          <Button size="small" onClick={() => navigate('/inbox')}>Открыть</Button>
        </Stack>)}
      </Paper>
    </Box>

    <Box component="section">
      <SectionHeading title="Мой фокус на сегодня" count={todayTasks.length} action={() => navigate('/tasks?view=list&preset=today')} />
      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        {!todayTasks.length ? <EmptyLine text="На сегодня обязательных задач нет" /> : todayTasks.map((task, index) => <TaskRow key={task.id} task={task} project={projectMap.get(task.project_id || '')} last={index === todayTasks.length - 1} onComplete={() => void complete(task)} onOpen={() => navigate('/tasks?task=' + task.id)} />)}
      </Paper>
    </Box>

    <Box component="section">
      <SectionHeading title="Следующие 7 дней" action={() => navigate('/calendar')} />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(7, 1fr)' }, border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden' }}>
        {nextDays.map((day) => <Box key={day.key} sx={{ p: 1.5, minHeight: 132, borderRight: { xl: '1px solid' }, borderBottom: { xs: '1px solid', xl: 0 }, borderColor: 'divider' }}><Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'capitalize' }}>{day.label}</Typography><Stack spacing={0.75} mt={1}>{day.tasks.map((task) => <Button key={task.id} size="small" color="inherit" onClick={() => navigate('/tasks?task=' + task.id)} sx={{ justifyContent: 'flex-start', textAlign: 'left', px: 0.75, minHeight: 32 }}><Typography variant="caption" noWrap>{task.title}</Typography></Button>)}{!day.tasks.length && <Typography variant="caption" color="text.disabled">Нет сроков</Typography>}</Stack></Box>)}
      </Box>
    </Box>

    <Box component="section">
      <SectionHeading title="Требует внимания" />
      <Stack direction="row" gap={1} flexWrap="wrap">
        <AttentionChip icon={<WarningAmber />} label="Просрочено" count={attention.overdue.length} color="error" onClick={() => navigate('/tasks?preset=overdue')} />
        <AttentionChip icon={<Block />} label="Заблокировано" count={attention.blocked.length} color="warning" onClick={() => navigate('/tasks?preset=blocked')} />
        <AttentionChip icon={<Avatar sx={{ width: 18, height: 18 }}>?</Avatar>} label="Без исполнителя" count={attention.unassigned.length} onClick={() => navigate('/tasks?preset=unassigned')} />
        <AttentionChip icon={<FlagOutlined />} label="Нужно спланировать" count={attention.needsPlanning.length} color="warning" onClick={() => navigate('/tasks?preset=needs-planning')} />
        <AttentionChip icon={<CalendarToday />} label="Без обновлений 7+ дней" count={attention.stale.length} onClick={() => navigate('/tasks?preset=stale')} />
        <AttentionChip icon={<WarningAmber />} label="Просрочен ответ" count={attention.responseOverdue.length} color="error" onClick={() => navigate('/tasks?view=list')} />
        <AttentionChip icon={<SwapHoriz />} label="Нет следующего действия" count={attention.noNextAction.length} color="warning" onClick={() => navigate('/tasks?view=list')} />
      </Stack>
    </Box>

    <Box component="section">
      <SectionHeading title="Мои проекты" action={() => navigate('/projects')} />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' }, gap: 1.5 }}>
        {projects.slice(0, 6).map((project) => <ProjectHealth key={project.id} project={project} tasks={tasks.filter((task) => task.project_id === project.id)} onOpen={() => navigate('/projects/' + project.id)} />)}
        {!projects.length && <Paper variant="outlined"><EmptyLine text="Создайте первый проект, чтобы видеть его health и milestones" /></Paper>}
      </Box>
    </Box>

    <Dialog open={Boolean(blockedTask)} onClose={() => setBlockedTask(null)} fullWidth maxWidth="sm">
      <DialogTitle>Почему задача заблокирована?</DialogTitle>
      <DialogContent><TextField autoFocus fullWidth multiline minRows={3} label="Причина блокировки" value={blockedReason} onChange={(event) => setBlockedReason(event.target.value)} sx={{ mt: 1 }} /></DialogContent>
      <DialogActions><Button onClick={() => setBlockedTask(null)}>Отмена</Button><Button variant="contained" color="warning" disabled={!blockedReason.trim()} onClick={() => void blockTask()}>Заблокировать</Button></DialogActions>
    </Dialog>
  </Stack>
}

function communicationStatusLabel(status: string) {
  return ({
    new: 'Новое', needs_my_reply: 'Нужно ответить мне', need_customer_input: 'Спросить заказчика',
    need_internal_input: 'Уточнить у команды', waiting_for_reply: 'Жду ответа',
    ready_to_respond: 'Готово к моему ответу', fyi: 'Информация',
  } as Record<string, string>)[status] || status
}

function SectionHeading({ title, count, action }: { title: string; count?: number; action?: () => void }) {
  return <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}><Stack direction="row" spacing={1} alignItems="center"><Typography variant="h6" fontWeight={750}>{title}</Typography>{count != null && <Chip size="small" label={count} />}</Stack>{action && <Button size="small" onClick={action}>Показать все</Button>}</Stack>
}

function TaskRow({ task, project, last, onComplete, onOpen }: { task: Task; project?: Project; last: boolean; onComplete: () => void; onOpen: () => void }) {
  const overdue = task.due_date && new Date(task.due_date) < new Date()
  return <Stack direction="row" alignItems="center" gap={1} sx={{ minHeight: 54, px: 1.5, borderBottom: last ? 0 : '1px solid', borderColor: 'divider', '&:hover': { bgcolor: 'action.hover' } }}>
    <Checkbox aria-label={'Завершить ' + task.title} onChange={onComplete} />
    <PriorityChip priority={task.priority} compact />
    <Box onClick={onOpen} sx={{ minWidth: 0, flex: 1, cursor: 'pointer' }}><Typography variant="body2" fontWeight={650} noWrap>{task.title}</Typography><Typography variant="caption" color="text.secondary" noWrap>{project?.name || 'Без проекта'} · {task.workflow_status || task.status}</Typography></Box>
    {task.is_blocked && <Block color="warning" fontSize="small" />}
    {(task.documentation_count || 0) > 0 && <DescriptionOutlined color="action" fontSize="small" />}
    {task.due_date && <Typography variant="caption" color={overdue ? 'error.main' : 'text.secondary'}>{new Date(task.due_date).toLocaleDateString('ru-RU')}</Typography>}
  </Stack>
}

function PriorityChip({ priority, compact = false }: { priority: Task['priority']; compact?: boolean }) {
  const labels = { urgent: 'P0', high: 'P1', medium: 'P2', low: 'P3' }
  const color = priority === 'urgent' ? 'error' : priority === 'high' ? 'warning' : 'default'
  return <Chip size="small" color={color} variant={compact ? 'outlined' : 'filled'} icon={priority === 'urgent' ? <PriorityHigh /> : undefined} label={labels[priority]} sx={{ minWidth: compact ? 42 : undefined }} />
}

function StatusChip({ task }: { task: Task }) {
  const labels: Record<string, string> = { inbox: 'Входящие', backlog: 'Backlog', ready: 'Ready', in_progress: 'В работе', review: 'Review', done: 'Готово', cancelled: 'Отменено' }
  return <Chip size="small" variant="outlined" icon={task.is_blocked ? <Block /> : <CheckCircleOutline />} label={task.is_blocked ? 'Заблокирована' : labels[task.workflow_status || ''] || task.status} />
}

function AttentionChip({ icon, label, count, color = 'default', onClick }: { icon: React.ReactElement; label: string; count: number; color?: 'default' | 'error' | 'warning'; onClick: () => void }) {
  return <Chip clickable onClick={onClick} icon={icon} color={color} variant={count ? 'filled' : 'outlined'} label={label + ': ' + count} sx={{ minHeight: 40 }} />
}

function ProjectHealth({ project, tasks, onOpen }: { project: Project; tasks: Task[]; onOpen: () => void }) {
  const done = tasks.filter(closed).length
  const active = tasks.filter((task) => !closed(task))
  const overdue = active.filter((task) => task.due_date && new Date(task.due_date) < new Date()).length
  const blocked = active.filter((task) => task.is_blocked).length
  const progress = tasks.length ? Math.round(done / tasks.length * 100) : 0
  const health = overdue > 2 || blocked > 2 ? { label: 'Off track', color: 'error' as const, icon: <WarningAmber /> } : overdue || blocked ? { label: 'At risk', color: 'warning' as const, icon: <FlagOutlined /> } : { label: 'On track', color: 'success' as const, icon: <CheckCircleOutline /> }
  return <Paper variant="outlined" onClick={onOpen} sx={{ p: 2, cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } }}><Stack direction="row" justifyContent="space-between" alignItems="flex-start"><Box><Typography fontWeight={750}>{project.name}</Typography><Typography variant="caption" color="text.secondary">{project.due_date ? 'Ближайший milestone: ' + new Date(project.due_date).toLocaleDateString('ru-RU') : 'Milestone не задан'}</Typography></Box><Chip size="small" color={health.color} variant="outlined" icon={health.icon} label={health.label} /></Stack><Stack direction="row" alignItems="center" spacing={1} mt={2}><LinearProgress variant="determinate" value={progress} sx={{ flex: 1, height: 6, borderRadius: 1 }} /><Typography variant="caption" fontWeight={700}>{progress}%</Typography></Stack><Typography variant="caption" color={overdue || blocked ? 'warning.main' : 'text.secondary'} sx={{ display: 'block', mt: 1 }}>{overdue} просрочено · {blocked} заблокировано</Typography></Paper>
}

function EmptyLine({ text }: { text: string }) {
  return <Box sx={{ p: 3, textAlign: 'center' }}><Typography color="text.secondary">{text}</Typography></Box>
}