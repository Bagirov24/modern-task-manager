import React from 'react'
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
  Divider,
  Chip,
} from '@mui/material'
import {
  Close,
  Info,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  DoneAll,
  Delete,
  NotificationsNone,
} from '@mui/icons-material'
import { useNotifications, Notification } from '../../hooks/useNotifications'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'

interface NotificationPanelProps {
  open: boolean
  onClose: () => void
}

const getIcon = (type: Notification['type']) => {
  switch (type) {
    case 'success': return <CheckCircle color="success" />
    case 'warning': return <Warning color="warning" />
    case 'error': return <ErrorIcon color="error" />
    default: return <Info color="info" />
  }
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ open, onClose }) => {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications()

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 380, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6">Уведомления</Typography>
            {unreadCount > 0 && (
              <Chip label={unreadCount} color="primary" size="small" />
            )}
          </Box>
          <Box>
            {unreadCount > 0 && (
              <IconButton size="small" onClick={markAllAsRead} title="Прочитать все">
                <DoneAll fontSize="small" />
              </IconButton>
            )}
            <IconButton onClick={onClose}>
              <Close />
            </IconButton>
          </Box>
        </Box>

        <Divider />

        <List sx={{ flexGrow: 1, overflow: 'auto' }}>
          {notifications.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <NotificationsNone sx={{ fontSize: 64, color: 'text.disabled' }} />
              <Typography color="text.secondary">Нет уведомлений</Typography>
            </Box>
          ) : (
            notifications.map((notification) => (
              <ListItem
                key={notification.id}
                sx={{
                  backgroundColor: notification.read ? 'transparent' : 'action.hover',
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: 'action.selected' },
                }}
                onClick={() => markAsRead(notification.id)}
                secondaryAction={
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={(e) => { e.stopPropagation(); deleteNotification(notification.id) }}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                }
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {getIcon(notification.type)}
                </ListItemIcon>
                <ListItemText
                  primary={notification.title}
                  secondary={
                    <>
                      <Typography variant="body2" component="span">
                        {notification.message}
                      </Typography>
                      <br />
                      <Typography variant="caption" color="text.disabled">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                          locale: ru,
                        })}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
            ))
          )}
        </List>
      </Box>
    </Drawer>
  )
}
