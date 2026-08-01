import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, FormControl, IconButton, InputAdornment, InputLabel,
  List, ListItemButton, ListItemText, MenuItem, Paper, Select, Stack, TextField,
  Tooltip, Typography,
} from '@mui/material'
import {
  Add, AttachFile, DescriptionOutlined, History, Link as LinkIcon, Save,
  Search, UploadFile,
} from '@mui/icons-material'
import { useLocation, useSearchParams } from 'react-router-dom'
import { documentApi, type DocumentInput } from '@/lib/api/documentApi'
import { useProjectsQuery } from '@/lib/hooks/useProjectsQuery'
import type { DocumentType, WorkspaceDocument } from '@/lib/types'

const documentTypes: Array<{ value: DocumentType; label: string }> = [
  { value: 'brief', label: 'Brief' },
  { value: 'product-requirements', label: 'Product requirements' },
  { value: 'technical-specification', label: 'Техническая спецификация' },
  { value: 'architecture', label: 'Архитектура' },
  { value: 'api-documentation', label: 'API документация' },
  { value: 'decision-record', label: 'Decision record' },
  { value: 'test-plan', label: 'Test plan' },
  { value: 'runbook', label: 'Runbook' },
  { value: 'release-note', label: 'Release note' },
  { value: 'retrospective', label: 'Ретроспектива' },
  { value: 'meeting-notes', label: 'Заметки встречи' },
  { value: 'contract', label: 'Договор' },
  { value: 'integration-guide', label: 'Руководство по интеграции' },
]

const blankDocument: DocumentInput = { title: '', content_markdown: '', document_type: 'brief', status: 'draft' }

export default function DocumentsPage() {
  const queryClient = useQueryClient()
  const knowledgeMode = useLocation().pathname === '/knowledge'
  const [params, setParams] = useSearchParams()
  const { projects } = useProjectsQuery()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<WorkspaceDocument | null>(null)
  const [draft, setDraft] = useState<DocumentInput>(blankDocument)
  const [createOpen, setCreateOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkDraft, setLinkDraft] = useState({ title: '', url: '', link_type: 'related' })

  const query = useQuery({
    queryKey: ['documents', search],
    queryFn: async () => (await documentApi.list(search ? { search } : undefined)).data.documents,
  })
  const versions = useQuery({
    queryKey: ['document-versions', selected?.id],
    queryFn: async () => (await documentApi.versions(selected!.id)).data,
    enabled: Boolean(selected && historyOpen),
  })

  useEffect(() => {
    const requested = params.get('document')
    if (!query.data?.length) return
    const next = query.data.find((item) => item.id === requested) || selected || query.data[0]
    if (next?.id !== selected?.id) {
      setSelected(next)
      setDraft(next)
    }
  }, [query.data, params])

  const save = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error('Документ не выбран')
      return (await documentApi.update(selected.id, { ...draft, expected_version: selected.version })).data
    },
    onSuccess: (document) => {
      setSelected(document)
      setDraft(document)
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
  })
  const create = useMutation({
    mutationFn: async (data: DocumentInput) => (await documentApi.create(data)).data,
    onSuccess: (document) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      setSelected(document)
      setDraft(document)
      setParams({ document: document.id })
      setCreateOpen(false)
    },
  })
  const restore = useMutation({
    mutationFn: async (version: number) => (await documentApi.restore(selected!.id, version)).data,
    onSuccess: (document) => {
      setSelected(document)
      setDraft(document)
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['document-versions'] })
    },
  })
  const addLink = useMutation({
    mutationFn: () => documentApi.addLink(selected!.id, linkDraft),
    onSuccess: async () => {
      const refreshed = (await documentApi.get(selected!.id)).data
      setSelected(refreshed)
      setDraft(refreshed)
      setLinkDraft({ title: '', url: '', link_type: 'related' })
      setLinkOpen(false)
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
  })

  const projectName = useMemo(() => new Map(projects.map((project) => [project.id, project.name])), [projects])

  return (
    <Stack spacing={2} sx={{ height: { md: 'calc(100vh - 112px)' } }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="h4" fontWeight={750}>{knowledgeMode ? 'Требования и знания' : 'Документы'}</Typography>
          <Typography color="text.secondary">{knowledgeMode ? 'Требования, решения, открытые вопросы и проверенные знания' : 'Требования, решения, архитектура и тест-планы рядом с работой'}</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)}>Документ</Button>
      </Stack>

      <Paper variant="outlined" sx={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '320px minmax(0, 1fr)' }, overflow: 'hidden' }}>
        <Box sx={{ borderRight: { md: '1px solid' }, borderColor: 'divider', minHeight: 0, overflow: 'auto' }}>
          <Box sx={{ p: 1.5, position: 'sticky', top: 0, bgcolor: 'background.paper', zIndex: 1 }}>
            <TextField fullWidth size="small" placeholder="Поиск документов" value={search} onChange={(event) => setSearch(event.target.value)} InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }} />
          </Box>
          <Divider />
          {query.isLoading && <Box sx={{ p: 3, textAlign: 'center' }}><CircularProgress size={24} /></Box>}
          {!query.isLoading && !query.data?.length && <Box sx={{ p: 3 }}><Typography fontWeight={650}>Документов пока нет</Typography><Typography variant="body2" color="text.secondary">Создайте brief или техническую спецификацию.</Typography></Box>}
          <List disablePadding>
            {query.data?.map((document) => (
              <ListItemButton key={document.id} selected={selected?.id === document.id} onClick={() => { setSelected(document); setDraft(document); setParams({ document: document.id }) }} sx={{ minHeight: 64, borderRadius: 0, mx: 0 }}>
                <ListItemText primary={document.title} secondary={`${documentTypes.find((item) => item.value === document.document_type)?.label || document.document_type} · v${document.version}${document.project_id ? ` · ${projectName.get(document.project_id) || 'Проект'}` : ''}`} primaryTypographyProps={{ fontWeight: 650, noWrap: true }} secondaryTypographyProps={{ noWrap: true }} />
              </ListItemButton>
            ))}
          </List>
        </Box>

        {selected ? (
          <Box sx={{ minWidth: 0, overflow: 'auto' }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', position: 'sticky', top: 0, bgcolor: 'background.paper', zIndex: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center"><DescriptionOutlined color="primary" /><Chip size="small" label={`v${selected.version}`} /><Chip size="small" variant="outlined" label={selected.status === 'published' ? 'Опубликован' : 'Черновик'} /></Stack>
              <Stack direction="row" spacing={0.5}>
                <Tooltip title="История версий"><IconButton aria-label="История версий" onClick={() => setHistoryOpen(true)} sx={{ minWidth: 44, minHeight: 44 }}><History /></IconButton></Tooltip>
                <Tooltip title="Добавить ссылку"><IconButton aria-label="Добавить ссылку" onClick={() => setLinkOpen(true)} sx={{ minWidth: 44, minHeight: 44 }}><LinkIcon /></IconButton></Tooltip>
                <Tooltip title="Загрузить файл"><IconButton component="label" aria-label="Загрузить файл" sx={{ minWidth: 44, minHeight: 44 }}><UploadFile /><input hidden type="file" onChange={(event) => { const file = event.target.files?.[0]; if (file) documentApi.upload(selected.id, file).then(() => queryClient.invalidateQueries({ queryKey: ['documents'] })) }} /></IconButton></Tooltip>
                <Button variant="contained" startIcon={save.isPending ? <CircularProgress size={16} color="inherit" /> : <Save />} onClick={() => save.mutate()} disabled={save.isPending}>Сохранить</Button>
              </Stack>
            </Stack>
            {(save.error || create.error) && <Alert severity="error" sx={{ m: 2 }}>Не удалось сохранить. Проверьте поля: секреты и платёжные реквизиты здесь запрещены.</Alert>}
            <Stack spacing={2} sx={{ p: { xs: 2, md: 3 }, maxWidth: 980 }}>
              <TextField value={draft.title || ''} onChange={(event) => setDraft({ ...draft, title: event.target.value })} variant="standard" placeholder="Название документа" InputProps={{ disableUnderline: true, sx: { fontSize: '1.75rem', fontWeight: 750 } }} />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <FormControl size="small" sx={{ minWidth: 220 }}><InputLabel>Тип</InputLabel><Select label="Тип" value={draft.document_type || 'brief'} onChange={(event) => setDraft({ ...draft, document_type: event.target.value as DocumentType })}>{documentTypes.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}</Select></FormControl>
                <FormControl size="small" sx={{ minWidth: 180 }}><InputLabel>Статус</InputLabel><Select label="Статус" value={draft.status || 'draft'} onChange={(event) => setDraft({ ...draft, status: event.target.value as DocumentInput['status'] })}><MenuItem value="draft">Черновик</MenuItem><MenuItem value="published">Опубликован</MenuItem></Select></FormControl>
                <FormControl size="small" sx={{ minWidth: 190 }}><InputLabel>Конфиденциальность</InputLabel><Select label="Конфиденциальность" value={draft.confidentiality_level || 'internal'} onChange={(event) => setDraft({ ...draft, confidentiality_level: event.target.value as DocumentInput['confidentiality_level'] })}><MenuItem value="public">Public</MenuItem><MenuItem value="internal">Internal</MenuItem><MenuItem value="confidential">Confidential</MenuItem><MenuItem value="restricted">Restricted</MenuItem></Select></FormControl>
                <FormControl size="small" sx={{ minWidth: 220 }}><InputLabel>Проект</InputLabel><Select label="Проект" value={draft.project_id || ''} onChange={(event) => setDraft({ ...draft, project_id: event.target.value || undefined })}><MenuItem value="">Workspace</MenuItem>{projects.map((project) => <MenuItem key={project.id} value={project.id}>{project.name}</MenuItem>)}</Select></FormControl>
              </Stack>
              <TextField multiline minRows={18} fullWidth value={draft.content_markdown || ''} onChange={(event) => setDraft({ ...draft, content_markdown: event.target.value })} placeholder={'## Контекст\nКакую проблему решаем и почему это важно?\n\n## Ожидаемый результат\n\n## Acceptance criteria\n- [ ]'} inputProps={{ 'aria-label': 'Содержание документа' }} />
              {(selected.links.length > 0 || selected.attachments.length > 0) && <Box><Divider sx={{ mb: 2 }} /><Typography variant="subtitle2" gutterBottom>Материалы</Typography><Stack direction="row" flexWrap="wrap" gap={1}>{selected.links.map((link) => <Chip key={link.id} component="a" clickable href={link.url} target="_blank" rel="noreferrer" icon={<LinkIcon />} label={link.title} />)}{selected.attachments.map((file) => <Chip key={file.id} icon={<AttachFile />} label={file.original_name} />)}</Stack></Box>}
            </Stack>
          </Box>
        ) : <Box sx={{ display: 'grid', placeItems: 'center', p: 4 }}><Typography color="text.secondary">Выберите документ</Typography></Box>}
      </Paper>

      <DocumentDialog open={createOpen} onClose={() => setCreateOpen(false)} projects={projects} onSubmit={(data) => create.mutate({ ...data, task_id: params.get('task_id') || undefined })} loading={create.isPending} />
      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="sm" fullWidth><DialogTitle>История версий</DialogTitle><DialogContent dividers><List>{versions.data?.map((item) => <ListItemButton key={item.id} onClick={() => restore.mutate(item.version)}><ListItemText primary={`Версия ${item.version}`} secondary={`${item.change_summary || 'Изменение документа'} · ${new Date(item.created_at).toLocaleString('ru-RU')}`} /></ListItemButton>)}</List></DialogContent><DialogActions><Button onClick={() => setHistoryOpen(false)}>Закрыть</Button></DialogActions></Dialog>
      <Dialog open={linkOpen} onClose={() => setLinkOpen(false)} fullWidth maxWidth="sm"><DialogTitle>Связанная ссылка</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}><TextField label="Название" value={linkDraft.title} onChange={(event) => setLinkDraft({ ...linkDraft, title: event.target.value })} /><TextField label="HTTPS URL" value={linkDraft.url} onChange={(event) => setLinkDraft({ ...linkDraft, url: event.target.value })} /></Stack></DialogContent><DialogActions><Button onClick={() => setLinkOpen(false)}>Отмена</Button><Button variant="contained" onClick={() => addLink.mutate()} disabled={!linkDraft.title || !linkDraft.url}>Добавить</Button></DialogActions></Dialog>
    </Stack>
  )
}

function DocumentDialog({ open, onClose, projects, onSubmit, loading }: { open: boolean; onClose: () => void; projects: Array<{ id: string; name: string }>; onSubmit: (data: DocumentInput) => void; loading: boolean }) {
  const [form, setForm] = useState<DocumentInput>(blankDocument)
  return <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm"><DialogTitle>Новый документ</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}><TextField autoFocus required label="Название" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /><FormControl><InputLabel>Тип</InputLabel><Select label="Тип" value={form.document_type} onChange={(event) => setForm({ ...form, document_type: event.target.value as DocumentType })}>{documentTypes.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}</Select></FormControl><FormControl><InputLabel>Проект</InputLabel><Select label="Проект" value={form.project_id || ''} onChange={(event) => setForm({ ...form, project_id: event.target.value || undefined })}><MenuItem value="">Workspace</MenuItem>{projects.map((project) => <MenuItem key={project.id} value={project.id}>{project.name}</MenuItem>)}</Select></FormControl></Stack></DialogContent><DialogActions><Button onClick={onClose}>Отмена</Button><Button variant="contained" disabled={!form.title.trim() || loading} onClick={() => onSubmit(form)}>Создать</Button></DialogActions></Dialog>
}
