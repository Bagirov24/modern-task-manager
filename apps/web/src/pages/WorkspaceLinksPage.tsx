import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, IconButton, InputAdornment, InputLabel, MenuItem, Paper, Select,
  Stack, TextField, Tooltip, Typography,
} from '@mui/material'
import {
  Add, AnalyticsOutlined, ArticleOutlined, BrushOutlined, CloudOutlined,
  CodeOutlined, DeleteOutline, EditOutlined, EmailOutlined, FolderOpenOutlined,
  KeyOutlined, Launch, MonitorHeartOutlined, MoreHoriz, ScienceOutlined,
  Search, Star, StarBorder, TerminalOutlined,
} from '@mui/icons-material'
import { workspaceLinkApi } from '@/lib/api/workspaceLinkApi'
import { projectApi } from '@/lib/api/projectApi'
import type { WorkspaceLink, WorkspaceLinkCategory, WorkspaceLinkInput } from '@/lib/types'

const categories: Array<{ value: WorkspaceLinkCategory; label: string }> = [
  { value: 'development', label: 'Разработка' },
  { value: 'logs', label: 'Логи' },
  { value: 'monitoring', label: 'Мониторинг' },
  { value: 'communication', label: 'Коммуникация' },
  { value: 'documentation', label: 'Документация' },
  { value: 'testing', label: 'Тестирование' },
  { value: 'design', label: 'Дизайн' },
  { value: 'infrastructure', label: 'Инфраструктура' },
  { value: 'analytics', label: 'Аналитика' },
  { value: 'other', label: 'Другое' },
]

const categoryLabels = Object.fromEntries(categories.map((item) => [item.value, item.label]))
const accessLabels = { has_access: 'Есть доступ', request_access: 'Нужно запросить', no_access: 'Нет доступа' }
const accessColors = { has_access: 'success', request_access: 'warning', no_access: 'error' } as const

const emptyForm: WorkspaceLinkInput = {
  title: '', description: '', url: '', category: 'development', environment: '', login: '',
  access_status: 'has_access', access_hint: '', notes: '', tags: [], is_favorite: false, sort_order: 0,
}

export default function WorkspaceLinksPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [projectFilter, setProjectFilter] = useState('all')
  const [category, setCategory] = useState('all')
  const [editing, setEditing] = useState<WorkspaceLink | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [error, setError] = useState('')

  const projects = useQuery({ queryKey: ['projects', 'workspace-links'], queryFn: async () => (await projectApi.list()).data.projects })
  const links = useQuery({
    queryKey: ['workspace-links', search, projectFilter, category],
    queryFn: async () => (await workspaceLinkApi.list({
      search: search || undefined,
      project_id: !['all', 'general'].includes(projectFilter) ? projectFilter : undefined,
      general_only: projectFilter === 'general' || undefined,
      category: category === 'all' ? undefined : category,
      per_page: 100,
    })).data,
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['workspace-links'] })
  const save = useMutation({
    mutationFn: async (value: WorkspaceLinkInput) => editing
      ? (await workspaceLinkApi.update(editing.id, value)).data
      : (await workspaceLinkApi.create(value)).data,
    onSuccess: () => { setDialogOpen(false); setEditing(null); setError(''); void refresh() },
    onError: () => setError('Не удалось сохранить ссылку. Проверьте URL и убедитесь, что в полях нет секретов.'),
  })
  const remove = useMutation({
    mutationFn: (id: string) => workspaceLinkApi.delete(id),
    onSuccess: () => void refresh(),
  })
  const favorite = useMutation({
    mutationFn: (link: WorkspaceLink) => workspaceLinkApi.update(link.id, { is_favorite: !link.is_favorite }),
    onSuccess: () => void refresh(),
  })

  const openCreate = () => { setEditing(null); setError(''); setDialogOpen(true) }
  const openEdit = (link: WorkspaceLink) => { setEditing(link); setError(''); setDialogOpen(true) }
  const items = links.data?.links || []

  return <Stack spacing={2.5} sx={{ maxWidth: 1440, mx: 'auto' }}>
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={2}>
      <Box><Typography variant="h4" fontWeight={760}>Полезные ссылки</Typography><Typography color="text.secondary">Рабочие программы и понятные подсказки по доступу в одном месте.</Typography></Box>
      <Button variant="contained" startIcon={<Add />} onClick={openCreate}>Добавить ссылку</Button>
    </Stack>

    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} gap={1.25}>
        <TextField fullWidth size="small" placeholder="Поиск по названию, описанию и тегам" value={search} onChange={(event) => setSearch(event.target.value)} InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }} />
        <FormControl size="small" sx={{ minWidth: { md: 220 } }}><InputLabel>Проект</InputLabel><Select label="Проект" value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}><MenuItem value="all">Все проекты</MenuItem><MenuItem value="general">Общее</MenuItem>{projects.data?.map((project) => <MenuItem key={project.id} value={project.id}>{project.name}</MenuItem>)}</Select></FormControl>
        <FormControl size="small" sx={{ minWidth: { md: 200 } }}><InputLabel>Категория</InputLabel><Select label="Категория" value={category} onChange={(event) => setCategory(event.target.value)}><MenuItem value="all">Все категории</MenuItem>{categories.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}</Select></FormControl>
      </Stack>
    </Paper>

    {links.isError && <Alert severity="error">Не удалось загрузить каталог ссылок.</Alert>}
    {!links.isLoading && !items.length ? <Paper variant="outlined" sx={{ py: 8, textAlign: 'center' }}><FolderOpenOutlined sx={{ fontSize: 44, color: 'text.disabled', mb: 1 }} /><Typography variant="h6" fontWeight={700}>Добавьте первую полезную ссылку</Typography><Typography color="text.secondary" sx={{ mb: 2 }}>Например, GitHub, Kibana, защищённую почту или Staging.</Typography><Button variant="contained" startIcon={<Add />} onClick={openCreate}>Добавить ссылку</Button></Paper> :
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
        {items.map((link) => <LinkCard key={link.id} link={link} onEdit={() => openEdit(link)} onDelete={() => { if (window.confirm(`Удалить ссылку «${link.title}»?`)) remove.mutate(link.id) }} onFavorite={() => favorite.mutate(link)} />)}
      </Box>}

    <WorkspaceLinkDialog open={dialogOpen} link={editing} projects={projects.data || []} error={error} saving={save.isPending} onClose={() => setDialogOpen(false)} onSave={(value) => save.mutate(value)} />
  </Stack>
}

export function LinkCard({ link, onEdit, onDelete, onFavorite }: { link: WorkspaceLink; onEdit: () => void; onDelete: () => void; onFavorite: () => void }) {
  const Icon = categoryIcon(link.category)
  return <Paper variant="outlined" sx={{ p: 2, minHeight: 238, display: 'flex', flexDirection: 'column', '&:hover': { borderColor: 'primary.main' } }}>
    <Stack direction="row" alignItems="flex-start" gap={1.5}>
      <Box sx={{ width: 40, height: 40, borderRadius: 1, display: 'grid', placeItems: 'center', bgcolor: 'action.hover', color: 'primary.main', flexShrink: 0 }}><Icon /></Box>
      <Box sx={{ minWidth: 0, flex: 1 }}><Typography variant="h6" fontWeight={750} noWrap>{link.title}</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>{link.description}</Typography></Box>
      <Tooltip title={link.is_favorite ? 'Убрать из избранного' : 'Закрепить сверху'}><IconButton aria-label={link.is_favorite ? 'Убрать из избранного' : 'Закрепить сверху'} color={link.is_favorite ? 'warning' : 'default'} onClick={onFavorite}>{link.is_favorite ? <Star /> : <StarBorder />}</IconButton></Tooltip>
    </Stack>
    <Stack direction="row" gap={0.75} flexWrap="wrap" mt={1.5}>
      <Chip size="small" label={link.project_name || 'Общее'} />
      <Chip size="small" variant="outlined" label={categoryLabels[link.category]} />
      {link.environment && <Chip size="small" variant="outlined" label={environmentLabel(link.environment)} />}
      <Chip size="small" color={accessColors[link.access_status]} variant="outlined" label={accessLabels[link.access_status]} />
    </Stack>
    <Stack spacing={0.5} mt={1.5} sx={{ flex: 1 }}>
      {link.login && <Typography variant="body2"><strong>Логин:</strong> {link.login}</Typography>}
      {link.access_hint && <Stack direction="row" gap={0.75} alignItems="flex-start"><KeyOutlined fontSize="small" color="action" /><Typography variant="body2">{link.access_hint}</Typography></Stack>}
      {link.notes && <Typography variant="body2" color="text.secondary">{link.notes}</Typography>}
    </Stack>
    <Stack direction="row" justifyContent="space-between" alignItems="center" mt={1.5}>
      <Typography variant="caption" color="text.secondary">Изменено {new Date(link.updated_at).toLocaleDateString('ru-RU')}</Typography>
      <Stack direction="row" gap={0.5}><Button component="a" href={link.url} target="_blank" rel="noopener noreferrer" variant="contained" size="small" endIcon={<Launch />}>Открыть</Button><Tooltip title="Редактировать"><IconButton size="small" aria-label="Редактировать" onClick={onEdit}><EditOutlined fontSize="small" /></IconButton></Tooltip><Tooltip title="Удалить"><IconButton size="small" aria-label="Удалить" color="error" onClick={onDelete}><DeleteOutline fontSize="small" /></IconButton></Tooltip></Stack>
    </Stack>
  </Paper>
}

function WorkspaceLinkDialog({ open, link, projects, error, saving, onClose, onSave }: { open: boolean; link: WorkspaceLink | null; projects: Array<{ id: string; name: string }>; error: string; saving: boolean; onClose: () => void; onSave: (value: WorkspaceLinkInput) => void }) {
  const initial = useMemo<WorkspaceLinkInput>(() => link ? {
    workspace_id: link.workspace_id, project_id: link.project_id, title: link.title, description: link.description,
    url: link.url, category: link.category, environment: link.environment || '', login: link.login || '',
    access_status: link.access_status, access_hint: link.access_hint || '', notes: link.notes || '', tags: link.tags,
    is_favorite: link.is_favorite, sort_order: link.sort_order,
  } : emptyForm, [link])
  const [form, setForm] = useState<WorkspaceLinkInput>(initial)
  const [tags, setTags] = useState(initial.tags.join(', '))
  useEffect(() => { setForm(initial); setTags(initial.tags.join(', ')) }, [initial, open])
  return <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
    <DialogTitle>{link ? 'Редактировать ссылку' : 'Добавить полезную ссылку'}</DialogTitle>
    <DialogContent><Stack spacing={2} sx={{ mt: 1 }}>
      {error && <Alert severity="error">{error}</Alert>}
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}><TextField required fullWidth label="Название программы" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /><TextField required fullWidth label="Ссылка" placeholder="https://..." value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} /></Stack>
      <TextField required fullWidth multiline minRows={2} label="Для чего нужна программа" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
        <FormControl fullWidth><InputLabel>Проект</InputLabel><Select label="Проект" value={form.project_id || ''} onChange={(e) => setForm({ ...form, project_id: e.target.value || null })}><MenuItem value="">Общее</MenuItem>{projects.map((project) => <MenuItem key={project.id} value={project.id}>{project.name}</MenuItem>)}</Select></FormControl>
        <FormControl required fullWidth><InputLabel>Категория</InputLabel><Select label="Категория" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as WorkspaceLinkCategory })}>{categories.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}</Select></FormControl>
        <TextField fullWidth label="Окружение" placeholder="production" value={form.environment || ''} onChange={(e) => setForm({ ...form, environment: e.target.value })} />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}><TextField fullWidth label="Логин" placeholder="manager@company.com" value={form.login || ''} onChange={(e) => setForm({ ...form, login: e.target.value })} /><FormControl fullWidth><InputLabel>Статус доступа</InputLabel><Select label="Статус доступа" value={form.access_status} onChange={(e) => setForm({ ...form, access_status: e.target.value as WorkspaceLinkInput['access_status'] })}><MenuItem value="has_access">Есть доступ</MenuItem><MenuItem value="request_access">Нужно запросить</MenuItem><MenuItem value="no_access">Нет доступа</MenuItem></Select></FormControl></Stack>
      <TextField fullWidth label="Безопасная подсказка по доступу" placeholder="Пароль в 1Password: CRM / Kibana Production" helperText="Не вставляйте пароль, токен или API key. Укажите только место хранения или способ входа." value={form.access_hint || ''} onChange={(e) => setForm({ ...form, access_hint: e.target.value })} />
      <TextField fullWidth multiline minRows={2} label="Комментарий или инструкция" value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      <TextField fullWidth label="Теги" placeholder="api, ошибки, релиз" value={tags} onChange={(e) => setTags(e.target.value)} />
    </Stack></DialogContent>
    <DialogActions><Button onClick={onClose}>Отмена</Button><Button variant="contained" disabled={saving || !form.title.trim() || !form.description.trim() || !form.url.trim()} onClick={() => onSave({ ...form, tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean) })}>{saving ? 'Сохранение...' : 'Сохранить'}</Button></DialogActions>
  </Dialog>
}

function categoryIcon(category: WorkspaceLinkCategory) {
  return ({ development: CodeOutlined, logs: TerminalOutlined, monitoring: MonitorHeartOutlined, communication: EmailOutlined, documentation: ArticleOutlined, testing: ScienceOutlined, design: BrushOutlined, infrastructure: CloudOutlined, analytics: AnalyticsOutlined, other: MoreHoriz } as const)[category]
}

function environmentLabel(value: string) {
  const labels: Record<string, string> = { production: 'Production', staging: 'Staging', development: 'Development', dev: 'Development' }
  return labels[value.toLowerCase()] || value
}
