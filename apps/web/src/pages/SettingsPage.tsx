import { useState } from 'react'
import { useAuthStore } from '@/lib/store/authStore'
import { useThemeStore } from '@/lib/store/themeStore'
import api from '@/lib/api/client'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  FormControlLabel,
  Snackbar,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import {
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  NotificationsOutlined as NotifIcon,
  Palette as PaletteIcon,
  PersonOutline as PersonIcon,
  Save as SaveIcon,
  SecurityOutlined as SecurityIcon,
} from '@mui/icons-material'

interface NotificationPreferences {
  email: boolean
  push: boolean
  sound: boolean
}

const defaultNotifications: NotificationPreferences = { email: true, push: false, sound: true }

function loadNotifications(): NotificationPreferences {
  try {
    const saved = localStorage.getItem('notification-preferences')
    return saved ? { ...defaultNotifications, ...JSON.parse(saved) } : defaultNotifications
  } catch {
    return defaultNotifications
  }
}

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user)
  const updateProfile = useAuthStore((state) => state.updateProfile)
  const { mode, setMode } = useThemeStore()
  const [username, setUsername] = useState(user?.username || '')
  const [fullName, setFullName] = useState(user?.full_name || '')
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '')
  const [notifications, setNotifications] = useState(loadNotifications)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    setError('')
    if (!username.trim()) {
      setError('Укажите имя пользователя.')
      return
    }
    if (newPassword && newPassword.length < 8) {
      setError('Новый пароль должен содержать не менее 8 символов.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Подтверждение пароля не совпадает.')
      return
    }
    if ((currentPassword && !newPassword) || (!currentPassword && newPassword)) {
      setError('Для смены пароля заполните текущий и новый пароль.')
      return
    }

    setSaving(true)
    try {
      await updateProfile({
        username: username.trim(),
        full_name: fullName.trim(),
        avatar_url: avatarUrl.trim() || undefined,
      })
      localStorage.setItem('notification-preferences', JSON.stringify(notifications))

      if (currentPassword && newPassword) {
        await api.post('/auth/change-password', {
          current_password: currentPassword,
          new_password: newPassword,
        })
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      }
      setSaved(true)
    } catch (requestError: any) {
      setError(requestError.response?.data?.detail || 'Не удалось сохранить настройки.')
    } finally {
      setSaving(false)
    }
  }

  const userInitial = username.charAt(0) || user?.email?.charAt(0) || 'U'

  return (
    <Container maxWidth="md" disableGutters>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800}>Настройки</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Профиль, внешний вид, уведомления и безопасность
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Stack spacing={2.5}>
        <Card elevation={0}>
          <CardContent sx={{ p: 3 }}>
            <Stack direction="row" alignItems="center" spacing={1.5} mb={3}>
              <PersonIcon color="primary" />
              <Typography variant="h6">Профиль</Typography>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ sm: 'center' }} mb={3}>
              <Avatar src={avatarUrl || undefined} sx={{ width: 64, height: 64, bgcolor: 'primary.main', fontSize: 24 }}>
                {userInitial.toUpperCase()}
              </Avatar>
              <Typography variant="body2" color="text.secondary">
                Аватар можно указать ссылкой на изображение. Email аккаунта изменить нельзя.
              </Typography>
            </Stack>
            <Stack spacing={2}>
              <TextField label="Полное имя" value={fullName} onChange={(event) => setFullName(event.target.value)} fullWidth />
              <TextField label="Имя пользователя" value={username} onChange={(event) => setUsername(event.target.value)} fullWidth required />
              <TextField label="Email" value={user?.email || ''} fullWidth disabled helperText="Email используется для входа" />
              <TextField label="URL аватара" value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} fullWidth placeholder="https://..." />
            </Stack>
          </CardContent>
        </Card>

        <Card elevation={0}>
          <CardContent sx={{ p: 3 }}>
            <Stack direction="row" alignItems="center" spacing={1.5} mb={3}>
              <PaletteIcon color="primary" />
              <Typography variant="h6">Оформление</Typography>
            </Stack>
            <ToggleButtonGroup value={mode} exclusive onChange={(_, value) => value && setMode(value)}>
              <ToggleButton value="light"><LightModeIcon sx={{ mr: 1 }} />Светлая</ToggleButton>
              <ToggleButton value="dark"><DarkModeIcon sx={{ mr: 1 }} />Тёмная</ToggleButton>
            </ToggleButtonGroup>
          </CardContent>
        </Card>

        <Card elevation={0}>
          <CardContent sx={{ p: 3 }}>
            <Stack direction="row" alignItems="center" spacing={1.5} mb={2}>
              <NotifIcon color="primary" />
              <Typography variant="h6">Уведомления</Typography>
            </Stack>
            <Stack spacing={0.5}>
              <FormControlLabel control={<Switch checked={notifications.email} onChange={(event) => setNotifications({ ...notifications, email: event.target.checked })} />} label="Email-уведомления" />
              <FormControlLabel control={<Switch checked={notifications.push} onChange={(event) => setNotifications({ ...notifications, push: event.target.checked })} />} label="Push-уведомления" />
              <FormControlLabel control={<Switch checked={notifications.sound} onChange={(event) => setNotifications({ ...notifications, sound: event.target.checked })} />} label="Звуковые уведомления" />
            </Stack>
          </CardContent>
        </Card>

        <Card elevation={0}>
          <CardContent sx={{ p: 3 }}>
            <Stack direction="row" alignItems="center" spacing={1.5} mb={3}>
              <SecurityIcon color="primary" />
              <Typography variant="h6">Сменить пароль</Typography>
            </Stack>
            <Stack spacing={2}>
              <TextField label="Текущий пароль" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} fullWidth autoComplete="current-password" />
              <TextField label="Новый пароль" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} fullWidth autoComplete="new-password" />
              <TextField label="Подтвердите пароль" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} fullWidth autoComplete="new-password" />
            </Stack>
          </CardContent>
        </Card>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', pb: 4 }}>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={saving} size="large">
            {saving ? 'Сохранение...' : 'Сохранить изменения'}
          </Button>
        </Box>
      </Stack>

      <Snackbar open={saved} autoHideDuration={3000} onClose={() => setSaved(false)}>
        <Alert severity="success" onClose={() => setSaved(false)}>Настройки сохранены</Alert>
      </Snackbar>
    </Container>
  )
}