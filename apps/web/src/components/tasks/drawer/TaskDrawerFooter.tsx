import { Box, Button, CircularProgress, Stack } from '@mui/material'
import { DeleteOutline, Save } from '@mui/icons-material'

interface Props {
  hasTask: boolean
  saving: boolean
  saveDisabled: boolean
  onDelete: () => void
  onCancel: () => void
  onSave: () => void
}

export default function TaskDrawerFooter({ hasTask, saving, saveDisabled, onDelete, onCancel, onSave }: Props) {
  return <Stack direction="row" justifyContent="space-between" sx={{ px: 2, py: 1.25, borderTop: '1px solid', borderColor: 'divider' }}>
    {hasTask ? <Button color="error" startIcon={<DeleteOutline />} onClick={onDelete} sx={{ minHeight: 44 }}>Удалить</Button> : <Box />}
    <Stack direction="row" spacing={1}>
      <Button onClick={onCancel} sx={{ minHeight: 44 }}>Отмена</Button>
      <Button variant="contained" startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save />} disabled={saveDisabled || saving} onClick={onSave} sx={{ minHeight: 44 }}>Сохранить</Button>
    </Stack>
  </Stack>
}
