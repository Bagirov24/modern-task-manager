import { Component, type ReactNode } from 'react'
import { Box, Button, Container, Typography } from '@mui/material'
import { ErrorOutline as ErrorIcon } from '@mui/icons-material'

interface Props { children: ReactNode }
interface State { hasError: boolean; error: Error | null }

export default class GlobalErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <Container maxWidth="sm" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', textAlign: 'center', gap: 3 }}>
        <ErrorIcon sx={{ fontSize: 72, color: 'error.main' }} />
        <Box>
          <Typography variant="h4" fontWeight={800} gutterBottom>Что-то пошло не так</Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            {this.state.error?.message || 'Неизвестная ошибка'}
          </Typography>
        </Box>
        <Button variant="contained" size="large" onClick={() => window.location.reload()}>
          Перезагрузить страницу
        </Button>
      </Container>
    )
  }
}
