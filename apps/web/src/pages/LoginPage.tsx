import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  Tab,
  Tabs,
  CircularProgress,
} from '@mui/material'
import { RocketLaunch as RocketIcon } from '@mui/icons-material'

export default function LoginPage() {
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { email, password })
      const { data: user } = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${data.access_token}` },
      })
      login(data.access_token, user)
      navigate('/tasks')
    } catch {
      setError('Неверный email или пароль')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/register', { email, password, full_name: name })
      const { data } = await api.post('/auth/login', { email, password })
      const { data: user } = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${data.access_token}` },
      })
      login(data.access_token, user)
      navigate('/tasks')
    } catch (err: any) {
      const msg = err?.response?.data?.detail
      setError(typeof msg === 'string' ? msg : 'Ошибка регистрации')
    } finally {
      setLoading(false)
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
          <Stack spacing={3}>
            <Box sx={{ textAlign: 'center', mb: 1 }}>
              <RocketIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
                Task Manager
              </Typography>
            </Box>

            <Tabs
              value={tab}
              onChange={(_, v) => { setTab(v); setError('') }}
              variant="fullWidth"
            >
              <Tab label="Войти" value="login" />
              <Tab label="Регистрация" value="register" />
            </Tabs>

            {error && <Alert severity="error">{error}</Alert>}

            <Stack
              component="form"
              onSubmit={tab === 'login' ? handleLogin : handleRegister}
              spacing={2}
            >
              {tab === 'register' && (
                <TextField
                  label="Имя"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  fullWidth
                />
              )}
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                required
              />
              <TextField
                label="Пароль"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
                required
              />
              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : undefined}
              >
                {tab === 'login' ? 'Войти' : 'Зарегистрироваться'}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}
