import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AxiosError } from 'axios'
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

interface ApiValidationError {
  msg?: string
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const detail = (error as AxiosError<{
    detail?: string | ApiValidationError[]
  }>).response?.data?.detail

  if (typeof detail === 'string') {
    const translations: Record<string, string> = {
      'Email already registered': 'Этот email уже зарегистрирован',
      'Username already taken': 'Это имя пользователя уже занято',
      'Invalid credentials': 'Неверный email или пароль',
    }
    return translations[detail] ?? detail
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => item.msg)
      .filter(Boolean)
      .join('; ') || fallback
  }

  return fallback
}

export default function LoginPage() {
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email.trim(), password)
      navigate('/tasks')
    } catch (err) {
      setError(getApiErrorMessage(err, 'Неверный email или пароль'))
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const normalizedUsername = username.trim()
    if (!/^[a-zA-Z0-9_]{3,100}$/.test(normalizedUsername)) {
      setError('Имя пользователя: 3–100 латинских букв, цифр или символов _')
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/register', {
        email: email.trim(),
        username: normalizedUsername,
        password,
        full_name: name.trim() || null,
      })
      await login(email.trim(), password)
      navigate('/tasks')
    } catch (err) {
      setError(getApiErrorMessage(err, 'Ошибка регистрации'))
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
              onChange={(_, value) => { setTab(value); setError('') }}
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
                <>
                  <TextField
                    label="Имя"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    fullWidth
                  />
                  <TextField
                    label="Имя пользователя"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    inputProps={{
                      minLength: 3,
                      maxLength: 100,
                      pattern: '[a-zA-Z0-9_]+',
                    }}
                    fullWidth
                    required
                  />
                </>
              )}
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                fullWidth
                required
              />
              <TextField
                label="Пароль"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                inputProps={{ minLength: 8, maxLength: 128 }}
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
