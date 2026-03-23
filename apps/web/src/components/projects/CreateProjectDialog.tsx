import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  ToggleButtonGroup,
  ToggleButton,
  Typography,
} from '@mui/material'
import { useProjects } from '../../hooks/useProjects'

const PROJECT_COLORS = [
  '#1976d2', '#388e3c', '#d32f2f', '#f57c00',
  '#7b1fa2', '#0097a7', '#5d4037', '#455a64',
  '#c2185b', '#00796b', '#303f9f', '#689f38',
]

interface CreateProjectDialogProps {
  open: boolean
  onClose: () => void
  editProject?: { id: string; name: string; description: string; color: string } | null
}

export const CreateProjectDialog: React.FC<CreateProjectDialogProps> = ({
  open,
  onClose,
  editProject,
}) => {
    const { createProject, updateProject } = useProjects()
  const [name, setName] = useState(editProject?.name || '')
  const [description, setDescription] = useState(editProject?.description || '')
  const [color, setColor] = useState(editProject?.color || '#1976d2')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Название проекта обязательно')
      return
    }
    setLoading(true)
    try {
      if (editProject) {
        await updateProject(editProject.id, { name, description, color })
      } else {
        await createProject({ name, description, color })
      }
      onClose()
    } catch (err) {
      setError('Ошибка при сохранении проекта')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {editProject ? 'Редактировать проект' : 'Новый проект'}
      </DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          label="Название"
          value={name}
          onChange={(e) => { setName(e.target.value); setError('') }}
          error={!!error}
          helperText={error}
          sx={{ mt: 1, mb: 2 }}
        />
        <TextField
          fullWidth
          multiline
          rows={3}
          label="Описание"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          sx={{ mb: 2 }}
        />
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Цвет проекта</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {PROJECT_COLORS.map((c) => (
            <Box
              key={c}
              onClick={() => setColor(c)}
              sx={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                backgroundColor: c,
                cursor: 'pointer',
                border: color === c ? '3px solid' : '2px solid transparent',
                borderColor: color === c ? 'text.primary' : 'transparent',
                transition: 'all 0.2s',
                '&:hover': { transform: 'scale(1.15)' },
              }}
            />
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Отмена</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
          sx={{ backgroundColor: color }}
        >
          {loading ? 'Сохранение...' : editProject ? 'Сохранить' : 'Создать'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
