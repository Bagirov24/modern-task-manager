import { useState } from 'react'
import { useAuthStore } from '@/lib/store/authStore'
import { useThemeStore } from '@/lib/store/themeStore'
import {
  Container, Typography, Box, Card, CardContent, TextField,
  Button, Switch, FormControlLabel, Stack, Avatar, Alert, Snackbar,
  ToggleButtonGroup, ToggleButton,
} from '@mui/material'
import {
  PersonOutline as PersonIcon, NotificationsOutlined as NotifIcon,
  SecurityOutlined as SecurityIcon, Save as SaveIcon,
  DarkMode as DarkModeIcon, LightMode as LightModeIcon,
  Palette as PaletteIcon,
} from '@mui/icons-material'

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user)
  const { mode, setMode } = useThemeStore()
  const [username, setUsername] = useState(user?.username || '')
  const [email, setEmail] = useState(user?.email || '')
  const [notifications, setNotifications] = useState({ email: true, push: false, sound: true })
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const userInitial = username?.charAt(0) || user?.username?.charAt(0) || 'U'

  return (
    <Container maxWidth="md" disableGutters>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Настройки
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Управляйте своим аккаунтом и предпочтениями
        </Typography>
      </Box>

      <Stack spacing={3}>
        {/* Профиль */}
        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
              <PersonIcon sx={{ color: 'primary.main' }} />
              <Typography variant="h6">Профиль</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
              <Avatar sx={{ width: 64, height: 64, bgcolor: 'primary.main', fontSize: 24 }}>
                {userInitial.toUpperCase()}
              </Avatar>
              <Button variant="outlined" size="small">Изменить аватар</Button>
            </Box>
            <Stack spacing={2.5}>
              <TextField label="Имя пользователя" value={username} onChange={(e) => setUsername(e.target.value)} fullWidth />
              <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth />
            </Stack>
          </CardContent>
        </Card>

        {/* Тема оформления */}
        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
              <PaletteIcon sx={{ color: 'primary.main' }} />
              <Typography variant="h6">Тема оформления</Typography>
            </Box>
            <ToggleButtonGroup
              value={mode}
              exclusive
              onChange={(_, v) => v && setMode(v)}
              sx={{ gap: 1 }}
            >
              <ToggleButton value="light" sx={{ px: 3, gap: 1 }}>
                <LightModeIcon /> Светлая
              </ToggleButton>
              <ToggleButton value="dark" sx={{ px: 3, gap: 1 }}>
                <DarkModeIcon /> Тёмная
              </ToggleButton>
            </ToggleButtonGroup>
          </CardContent>
        </Card>

        {/* Уведомления */}
        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
              <NotifIcon sx={{ color: 'primary.main' }} />
              <Typography variant="h6">Уведомления</Typography>
            </Box>
            <Stack spacing={1}>
              <FormControlLabel control={<Switch checked={notifications.email} onChange={(e) => setNotifications({ ...notifications, email: e.target.checked })} color="primary" />} label="Email-уведомления" />
              <FormControlLabel control={<Switch checked={notifications.push} onChange={(e) => setNotifications({ ...notifications, push: e.target.checked })} color="primary" />} label="Push-уведомления" />
              <FormControlLabel control={<Switch checked={notifications.sound} onChange={(e) => setNotifications({ ...notifications, sound: e.target.checked })} color="primary" />} label="Звуковые уведомления" />
            </Stack>
          </CardContent>
        </Card>

        {/* Безопасность */}
        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
              <SecurityIcon sx={{ color: 'primary.main' }} />
              <Typography variant="h6">Безопасность</Typography>
            </Box>
            <Stack spacing={2.5}>
              <TextField label="Текущий пароль" type="password" fullWidth />
              <TextField label="Новый пароль" type="password" fullWidth />
              <TextField label="Подтвердите пароль" type="password" fullWidth />
            </Stack>
          </CardContent>
        </Card>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} size="large">
            Сохранить изменения
          </Button>
        </Box>
      </Stack>

      <Snackbar open={saved} autoHideDuration={3000} onClose={() => setSaved(false)}>
        <Alert severity="success" onClose={() => setSaved(false)}>
          Настройки сохранены
        </Alert>
      </Snackbar>
    </Container>
  )
}
