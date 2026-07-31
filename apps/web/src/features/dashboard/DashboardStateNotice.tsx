import { Alert, Button } from '@mui/material'
import { RefreshOutlined } from '@mui/icons-material'

export default function DashboardStateNotice({ warning, onRetry }: { warning: string | null; onRetry: () => void }) {
  if (!warning) return null

  return (
    <Alert severity="warning" action={<Button color="inherit" size="small" startIcon={<RefreshOutlined />} onClick={onRetry}>Повторить</Button>} sx={{ mb: 1 }}>
      Показаны неполные данные. {warning}
    </Alert>
  )
}
