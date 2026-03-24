import React, { useState } from 'react'
import {
  Box, Container, Typography, TextField, Button,
  Avatar, Paper, Grid, Divider, Alert, CircularProgress,
} from '@mui/material'
import { PhotoCamera, Save } from '@mui/icons-material'
import { useAuth } from '../hooks/useAuth'
import { useRequireAuth } from '../hooks/useAuth'

export default function ProfilePage() {
  useRequireAuth()
  const { user, updateProfile, isLoading, error } = useAuth()
  const [fullName, setFullName] = useState(user?.full_name || '')
  const [username, setUsername] = useState(user?.username || '')
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    try {
      await updateProfile({ full_name: fullName, username } as any)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {/* handled */}
  }

  if (!user) return <Box display="flex" justifyContent="center" mt={8}><CircularProgress /></Box>

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>Profile</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {saved && <Alert severity="success" sx={{ mb: 2 }}>Profile updated!</Alert>}

      <Paper sx={{ p: 4 }}>
        <Box display="flex" alignItems="center" gap={3} mb={4}>
          <Avatar src={user.avatar_url} sx={{ width: 80, height: 80, fontSize: 32 }}>
            {user.full_name?.[0] || 'U'}
          </Avatar>
          <Box>
            <Typography variant="h6">{user.full_name}</Typography>
            <Typography color="text.secondary">@{user.username}</Typography>
            <Typography variant="caption" color="text.secondary">
              Member since {new Date(user.created_at).toLocaleDateString()}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Full Name" value={fullName}
              onChange={e => setFullName(e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Username" value={username}
              onChange={e => setUsername(e.target.value)} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="Email" value={user.email} disabled
              helperText="Email cannot be changed" />
          </Grid>
        </Grid>

        <Box mt={3} display="flex" justifyContent="flex-end">
          <Button variant="contained" startIcon={<Save />}
            onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>
      </Paper>
    </Container>
  )
}
