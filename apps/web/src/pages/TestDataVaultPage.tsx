import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, FormControl, InputLabel, List, ListItemButton, ListItemText,
  MenuItem, Paper, Select, Stack, TextField, Typography,
} from '@mui/material'
import { Add, LockOutlined, Security, VerifiedUserOutlined } from '@mui/icons-material'
import { testDataApi, type TestDataSetInput } from '@/lib/api/testDataApi'
import { useProjectsQuery } from '@/lib/hooks/useProjectsQuery'
import type { TestDataItem, TestDataSet } from '@/lib/types'

const blankSet: TestDataSetInput = { name: '', category: 'integration', environment: 'sandbox', sensitivity: 'internal', description: '' }
const blankItem = { label: '', item_type: 'instruction' as const, display_value: '', vault_provider: '', vault_reference: '' }

const environmentLabels: Record<string, string> = { local: 'Local', dev: 'Dev', sandbox: 'Sandbox', staging: 'Staging', production: 'Production' }
const sensitivityLabels: Record<string, string> = { internal: 'Внутренние', confidential: 'Конфиденциальные', restricted: 'Ограниченные' }

export default function TestDataVaultPage() {
  const queryClient = useQueryClient()
  const { projects } = useProjectsQuery()
  const [environment, setEnvironment] = useState('')
  const [selected, setSelected] = useState<TestDataSet | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [itemOpen, setItemOpen] = useState(false)
  const [reauthOpen, setReauthOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [reauthToken, setReauthToken] = useState<string>()
  const [itemDraft, setItemDraft] = useState(blankItem)

  const query = useQuery({
    queryKey: ['test-data', environment],
    queryFn: async () => (await testDataApi.list(environment ? { environment } : undefined)).data.data_sets,
  })
  const create = useMutation({
    mutationFn: (data: TestDataSetInput) => testDataApi.create(data),
    onSuccess: ({ data }) => {
      setSelected(data)
      setCreateOpen(false)
      queryClient.invalidateQueries({ queryKey: ['test-data'] })
    },
  })
  const reauth = useMutation({
    mutationFn: () => testDataApi.reauthenticate(password),
    onSuccess: async ({ data }) => {
      setReauthToken(data.reauth_token)
      if (selected) setSelected((await testDataApi.get(selected.id, data.reauth_token)).data)
      setPassword('')
      setReauthOpen(false)
    },
  })
  const addItem = useMutation({
    mutationFn: () => testDataApi.addItem(selected!.id, { ...itemDraft, metadata_json: {} } as any, reauthToken),
    onSuccess: async () => {
      setSelected((await testDataApi.get(selected!.id, reauthToken)).data)
      setItemDraft(blankItem)
      setItemOpen(false)
      queryClient.invalidateQueries({ queryKey: ['test-data'] })
    },
  })

  const selectSet = async (dataSet: TestDataSet) => {
    setSelected(dataSet)
    if (dataSet.sensitivity === 'restricted' && !dataSet.items.length) {
      if (!reauthToken) setReauthOpen(true)
      else setSelected((await testDataApi.get(dataSet.id, reauthToken)).data)
    }
  }

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={2}>
        <Box><Typography variant="h4" fontWeight={750}>Тестовые данные</Typography><Typography color="text.secondary">Сценарии, aliases и ссылки на vault без открытых секретов</Typography></Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)}>Набор данных</Button>
      </Stack>

      <Alert severity="info" icon={<Security />}>
        Здесь хранятся только инструкции и vault references. Номера карт, CVV, пароли, JWT, API keys и production credentials блокируются до сохранения.
      </Alert>

      <Paper variant="outlined" sx={{ minHeight: 560, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '340px minmax(0, 1fr)' }, overflow: 'hidden' }}>
        <Box sx={{ borderRight: { md: '1px solid' }, borderColor: 'divider' }}>
          <Box sx={{ p: 1.5 }}><FormControl fullWidth size="small"><InputLabel>Окружение</InputLabel><Select label="Окружение" value={environment} onChange={(event) => setEnvironment(event.target.value)}><MenuItem value="">Все непроизводственные</MenuItem>{['local', 'dev', 'sandbox', 'staging'].map((value) => <MenuItem key={value} value={value}>{environmentLabels[value]}</MenuItem>)}</Select></FormControl></Box>
          <Divider />
          {query.isLoading && <Box sx={{ p: 3, textAlign: 'center' }}><CircularProgress size={24} /></Box>}
          {!query.isLoading && !query.data?.length && <Box sx={{ p: 3 }}><Typography fontWeight={650}>Наборов пока нет</Typography><Typography variant="body2" color="text.secondary">Создайте безопасный sandbox-сценарий.</Typography></Box>}
          <List disablePadding>{query.data?.map((dataSet) => <ListItemButton key={dataSet.id} selected={selected?.id === dataSet.id} onClick={() => void selectSet(dataSet)} sx={{ minHeight: 72, borderRadius: 0, mx: 0 }}><ListItemText primary={dataSet.name} secondary={`${environmentLabels[dataSet.environment]} · ${sensitivityLabels[dataSet.sensitivity]}`} primaryTypographyProps={{ fontWeight: 650 }} /></ListItemButton>)}</List>
        </Box>

        {selected ? <Box sx={{ p: { xs: 2, md: 3 }, minWidth: 0 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2}>
            <Box><Stack direction="row" alignItems="center" spacing={1}><Typography variant="h5" fontWeight={750}>{selected.name}</Typography>{selected.sensitivity === 'restricted' && <LockOutlined color="warning" fontSize="small" />}</Stack><Stack direction="row" gap={1} mt={1}><Chip size="small" label={environmentLabels[selected.environment]} /><Chip size="small" variant="outlined" icon={<VerifiedUserOutlined />} label={sensitivityLabels[selected.sensitivity]} /><Chip size="small" variant="outlined" label={selected.category} /></Stack></Box>
            <Button startIcon={<Add />} variant="outlined" onClick={() => selected.sensitivity === 'restricted' && !reauthToken ? setReauthOpen(true) : setItemOpen(true)}>Запись</Button>
          </Stack>
          {selected.description && <Typography sx={{ mt: 2, whiteSpace: 'pre-wrap' }}>{selected.description}</Typography>}
          <Divider sx={{ my: 3 }} />
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>Безопасные записи</Typography>
          {selected.sensitivity === 'restricted' && !selected.items.length ? <Alert severity="warning" action={<Button color="inherit" onClick={() => setReauthOpen(true)}>Подтвердить</Button>}>Для просмотра restricted-записей подтвердите пароль.</Alert> : !selected.items.length ? <Typography color="text.secondary">Добавьте инструкцию, fixture или ссылку на внешний vault.</Typography> : <Stack spacing={1.5}>{selected.items.map((item) => <SafeItem key={item.id} item={item} />)}</Stack>}
        </Box> : <Box sx={{ display: 'grid', placeItems: 'center', p: 4 }}><Typography color="text.secondary">Выберите набор тестовых данных</Typography></Box>}
      </Paper>

      <SetDialog open={createOpen} onClose={() => setCreateOpen(false)} projects={projects} onSubmit={(data) => create.mutate(data)} loading={create.isPending} />
      <Dialog open={reauthOpen} onClose={() => setReauthOpen(false)} fullWidth maxWidth="xs"><DialogTitle>Подтверждение доступа</DialogTitle><DialogContent><Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Restricted-записи доступны пять минут после повторной аутентификации.</Typography><TextField autoFocus fullWidth type="password" label="Текущий пароль" value={password} onChange={(event) => setPassword(event.target.value)} error={reauth.isError} helperText={reauth.isError ? 'Не удалось подтвердить пароль' : ''} /></DialogContent><DialogActions><Button onClick={() => setReauthOpen(false)}>Отмена</Button><Button variant="contained" disabled={password.length < 8 || reauth.isPending} onClick={() => reauth.mutate()}>Подтвердить</Button></DialogActions></Dialog>
      <Dialog open={itemOpen} onClose={() => setItemOpen(false)} fullWidth maxWidth="sm"><DialogTitle>Безопасная запись</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}><TextField label="Название / alias" value={itemDraft.label} onChange={(event) => setItemDraft({ ...itemDraft, label: event.target.value })} /><FormControl><InputLabel>Тип</InputLabel><Select label="Тип" value={itemDraft.item_type} onChange={(event) => setItemDraft({ ...itemDraft, item_type: event.target.value as typeof itemDraft.item_type })}><MenuItem value="instruction">Инструкция</MenuItem><MenuItem value="vault_reference">Vault reference</MenuItem><MenuItem value="external_link">Внешняя ссылка</MenuItem><MenuItem value="fixture">Fixture</MenuItem></Select></FormControl><TextField multiline minRows={4} label="Безопасная инструкция / ожидаемый результат" value={itemDraft.display_value} onChange={(event) => setItemDraft({ ...itemDraft, display_value: event.target.value })} /><TextField label="Vault reference" placeholder="vault://payments/sandbox/merchant-api-key" value={itemDraft.vault_reference} onChange={(event) => setItemDraft({ ...itemDraft, vault_reference: event.target.value })} /><TextField label="Провайдер vault" value={itemDraft.vault_provider} onChange={(event) => setItemDraft({ ...itemDraft, vault_provider: event.target.value })} />{addItem.isError && <Alert severity="error">Значение отклонено. Укажите только alias или vault reference.</Alert>}</Stack></DialogContent><DialogActions><Button onClick={() => setItemOpen(false)}>Отмена</Button><Button variant="contained" disabled={!itemDraft.label || addItem.isPending} onClick={() => addItem.mutate()}>Добавить</Button></DialogActions></Dialog>
    </Stack>
  )
}

function SafeItem({ item }: { item: TestDataItem }) {
  return <Paper variant="outlined" sx={{ p: 2, position: 'relative', overflow: 'hidden' }}><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1}><Box><Typography fontWeight={700}>{item.label}</Typography><Typography variant="caption" color="text.secondary">{item.item_type}</Typography></Box>{item.vault_reference && <Chip size="small" icon={<LockOutlined />} label={item.vault_reference} sx={{ maxWidth: { xs: '100%', sm: 380 } }} />}</Stack>{item.display_value && <Typography variant="body2" sx={{ mt: 1.5, whiteSpace: 'pre-wrap' }}>{item.display_value}</Typography>}{item.watermark && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>{item.watermark}</Typography>}</Paper>
}

function SetDialog({ open, onClose, projects, onSubmit, loading }: { open: boolean; onClose: () => void; projects: Array<{ id: string; name: string }>; onSubmit: (data: TestDataSetInput) => void; loading: boolean }) {
  const [form, setForm] = useState<TestDataSetInput>(blankSet)
  return <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm"><DialogTitle>Новый набор тестовых данных</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}><TextField autoFocus label="Название сценария" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /><Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><FormControl fullWidth><InputLabel>Категория</InputLabel><Select label="Категория" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as TestDataSet['category'] })}>{['payment', 'api', 'user', 'webhook', 'fixture', 'integration'].map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}</Select></FormControl><FormControl fullWidth><InputLabel>Окружение</InputLabel><Select label="Окружение" value={form.environment} onChange={(event) => setForm({ ...form, environment: event.target.value as TestDataSet['environment'] })}>{['local', 'dev', 'sandbox', 'staging'].map((value) => <MenuItem key={value} value={value}>{environmentLabels[value]}</MenuItem>)}</Select></FormControl></Stack><FormControl><InputLabel>Чувствительность</InputLabel><Select label="Чувствительность" value={form.sensitivity} onChange={(event) => setForm({ ...form, sensitivity: event.target.value as TestDataSet['sensitivity'] })}>{Object.entries(sensitivityLabels).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</Select></FormControl><FormControl><InputLabel>Проект</InputLabel><Select label="Проект" value={form.project_id || ''} onChange={(event) => setForm({ ...form, project_id: event.target.value || undefined })}><MenuItem value="">Личное пространство</MenuItem>{projects.map((project) => <MenuItem key={project.id} value={project.id}>{project.name}</MenuItem>)}</Select></FormControl><TextField multiline minRows={4} label="Сценарий и ожидаемый результат" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />{createHint(form.sensitivity)}</Stack></DialogContent><DialogActions><Button onClick={onClose}>Отмена</Button><Button variant="contained" disabled={!form.name.trim() || loading} onClick={() => onSubmit(form)}>Создать</Button></DialogActions></Dialog>
}

function createHint(sensitivity: string) {
  return sensitivity === 'restricted' ? <Alert severity="warning">Просмотр потребует повторной аутентификации и будет записан в audit log.</Alert> : null
}
