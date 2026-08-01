import type { ReactNode } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Typography,
} from '@mui/material'
import {
  ErrorOutline,
  InboxOutlined,
  RefreshOutlined,
} from '@mui/icons-material'

interface AttentionStateProps {
  loading?: boolean
  error?: ReactNode
  empty?: boolean
  emptyTitle?: string
  emptyDescription?: string
  onRetry?: () => void
  retryLabel?: string
  children?: ReactNode
}

export default function AttentionState({
  loading = false,
  error,
  empty = false,
  emptyTitle = 'Ничего не найдено',
  emptyDescription,
  onRetry,
  retryLabel = 'Повторить',
  children,
}: AttentionStateProps) {
  if (loading) {
    return (
      <Box role="status" aria-label="Загрузка" sx={{ minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5 }}>
        <CircularProgress size={24} aria-label="Загрузка" />
        <Typography variant="body2" color="text.secondary">Загрузка...</Typography>
      </Box>
    )
  }

  if (error !== undefined && error !== null && error !== false) {
    const errorMessage = error === true ? 'Не удалось загрузить данные' : error

    return (
      <Alert
        severity="error"
        icon={<ErrorOutline />}
        role="alert"
        sx={{ minHeight: 48, alignItems: 'center' }}
        action={onRetry ? <Button color="inherit" size="small" startIcon={<RefreshOutlined />} onClick={onRetry}>{retryLabel}</Button> : undefined}
      >
        {errorMessage}
      </Alert>
    )
  }

  if (empty) {
    return (
      <Box role="status" aria-label="Пусто" sx={{ minHeight: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0.75, py: 3, px: 2, textAlign: 'center' }}>
        <InboxOutlined color="disabled" />
        <Typography variant="body2" fontWeight={600}>{emptyTitle}</Typography>
        {emptyDescription && <Typography variant="body2" color="text.secondary">{emptyDescription}</Typography>}
      </Box>
    )
  }

  return <>{children}</>
}
