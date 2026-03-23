import { useState } from 'react'
import { useAuthStore } from '@/lib/store/authStore'
import api from '@/lib/api/client'
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Stack,
} from '@mui/material'
import { RocketLaunch as RocketIcon } from '@mui/icons-material'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const login = useAuthStore((s) => s.login)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { data } = await api.post('/auth/login', { email, password })
      const { data: user } = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${data.access_token}` },
      })
      login(data.access_token, user)
    } catch {
      setError('Неверный email или пароль')
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Card
        sx={{
          width: '100%',
          maxWidth: 400,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
        }}
        elevation={8}
      >
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={3} component="form" onSubmit={handleSubmit}>
            <Box sx={{ textAlign: 'center', mb: 1 }}>
              <RocketIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
                Task Manager
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Войдите в свой аккаунт
              </Typography>
            </Box>

            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              type="email"
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              required
            />

            <TextField
              type="password"
              label="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              required
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              sx={{ py: 1.5, fontSize: '1rem', fontWeight: 600 }}
            >
              Войти
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}
