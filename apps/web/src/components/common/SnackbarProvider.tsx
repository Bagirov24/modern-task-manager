import { Alert, Snackbar, Stack } from '@mui/material'
import { useUIStore } from '@/store/uiStore'

export default function SnackbarProvider() {
  const snackbars = useUIStore((s) => s.snackbars)
  const removeSnackbar = useUIStore((s) => s.removeSnackbar)

  return (
    <Stack
      spacing={1}
      sx={{
        position: 'fixed',
        bottom: 72,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 2000,
        minWidth: 320,
        maxWidth: 480,
        pointerEvents: 'none',
      }}
    >
      {snackbars.map((snack) => (
        <Snackbar
          key={snack.id}
          open
          autoHideDuration={snack.duration || 4000}
          onClose={() => removeSnackbar(snack.id)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          sx={{ position: 'relative', pointerEvents: 'all' }}
        >
          <Alert
            onClose={() => removeSnackbar(snack.id)}
            severity={snack.type}
            variant="filled"
            sx={{ borderRadius: 3, boxShadow: 6, width: '100%' }}
          >
            {snack.message}
          </Alert>
        </Snackbar>
      ))}
    </Stack>
  )
}
