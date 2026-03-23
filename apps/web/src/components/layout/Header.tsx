import {
  AppBar, Toolbar, TextField, IconButton, Badge, Avatar,
  Typography, Box, InputAdornment, Menu, MenuItem, Tooltip,
} from '@mui/material'
import {
  Search as SearchIcon, NotificationsOutlined as BellIcon,
  Logout as LogoutIcon, DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
} from '@mui/icons-material'
import { useAuthStore } from '@/lib/store/authStore'
import { useThemeStore } from '@/lib/store/themeStore'
import { useState } from 'react'

export default function Header() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { mode, toggleTheme } = useThemeStore()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Toolbar sx={{ gap: 2 }}>
        <TextField
          placeholder="Поиск задач..."
          size="small"
          sx={{ flexGrow: 1, maxWidth: 480 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
        />

        <Box sx={{ flexGrow: 1 }} />

        <Tooltip title={mode === 'dark' ? 'Светлая тема' : 'Тёмная тема'}>
          <IconButton size="small" onClick={toggleTheme} sx={{ color: 'text.secondary' }}>
            {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Tooltip>

        <IconButton size="small" sx={{ color: 'text.secondary' }}>
          <Badge badgeContent={3} color="primary" variant="dot">
            <BellIcon />
          </Badge>
        </IconButton>

        <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 14 }}>
            {user?.username?.charAt(0)?.toUpperCase() || 'U'}
          </Avatar>
        </IconButton>
        <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>
          {user?.username || 'Пользователь'}
        </Typography>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          PaperProps={{ sx: { mt: 1, minWidth: 160 } }}
        >
          <MenuItem onClick={() => { logout(); setAnchorEl(null) }} sx={{ gap: 1.5, color: 'error.main' }}>
            <LogoutIcon fontSize="small" /> Выйти
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  )
}
