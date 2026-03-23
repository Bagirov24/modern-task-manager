import React, { useEffect } from 'react'
import { Snackbar, Alert, Stack } from '@mui/material'
import { useUIStore } from '../../store/uiStore'

export const SnackbarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const snackbars = useUIStore((s) => s.snackbars)
  const removeSnackbar = useUIStore((s) => s.removeSnackbar)

  return (
    <>
      {children}
      <Stack spacing={1} sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 2000 }}>
        {snackbars.map((snackbar) => (
          <SnackbarItem
            key={snackbar.id}
            id={snackbar.id}
            message={snackbar.message}
            type={snackbar.type}
            duration={snackbar.duration}
            onClose={removeSnackbar}
          />
        ))}
      </Stack>
    </>
  )
}

interface SnackbarItemProps {
  id: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  duration: number
  onClose: (id: string) => void
}

const SnackbarItem: React.FC<SnackbarItemProps> = ({ id, message, type, duration, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => onClose(id), duration)
    return () => clearTimeout(timer)
  }, [id, duration, onClose])

  return (
    <Alert
      severity={type}
      onClose={() => onClose(id)}
      variant="filled"
      elevation={6}
      sx={{
        minWidth: 300,
        borderRadius: 2,
        animation: 'slideIn 0.3s ease-out',
        '@keyframes slideIn': {
          from: { transform: 'translateX(100%)', opacity: 0 },
          to: { transform: 'translateX(0)', opacity: 1 },
        },
      }}
    >
      {message}
    </Alert>
  )
}
