import { useNavigate } from 'react-router-dom'
import { Box, Typography, Button } from '@mui/material'
import { HomeOutlined as HomeIcon, SearchOff as NotFoundIcon } from '@mui/icons-material'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', gap: 2 }}>
      <NotFoundIcon sx={{ fontSize: 80, color: 'text.secondary', opacity: 0.5 }} />
      <Typography variant="h2" sx={{ fontWeight: 700, color: 'text.primary' }}>404</Typography>
      <Typography variant="h6" color="text.secondary">Страница не найдена</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Запрашиваемая страница не существует или была удалена
      </Typography>
      <Button variant="contained" startIcon={<HomeIcon />} onClick={() => navigate('/tasks')} size="large">
        На главную
      </Button>
    </Box>
  )
}
