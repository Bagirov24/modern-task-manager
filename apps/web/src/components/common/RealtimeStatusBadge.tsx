import { Chip, Tooltip } from '@mui/material'
import { WifiOff as WifiOffIcon, Wifi as WifiIcon } from '@mui/icons-material'

interface Props {
  connected: boolean
}

export default function RealtimeStatusBadge({ connected }: Props) {
  return (
    <Tooltip title={connected ? 'Real-time соединение активно' : 'Нет соединения — данные могут быть устаревшими'}>
      <Chip
        icon={connected ? <WifiIcon fontSize="small" /> : <WifiOffIcon fontSize="small" />}
        label={connected ? 'Live' : 'Offline'}
        size="small"
        color={connected ? 'success' : 'error'}
        variant="outlined"
        sx={{ height: 24, '& .MuiChip-label': { fontWeight: 700, fontSize: '0.7rem' } }}
      />
    </Tooltip>
  )
}
