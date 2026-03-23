import { useState, useEffect } from 'react'
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Chip,
  Tooltip,
  Alert,
  Skeleton,
  CircularProgress,
} from '@mui/material'
import {
  FolderOutlined as FolderIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material'
import { useProjects } from '../hooks/useProjects'
import type { Project } from '../lib/types'

const colorOptions = ['#2196F3', '#4CAF50', '#FF9800', '#F44336', '#9C27B0', '#00BCD4', '#795548', '#607D8B']

type ProjectForm = { name: string; description: string; color: string }

export default function ProjectsPage() {
  const { projects: rawProjects, loading, error, fetchProjects, createProject, updateProject, deleteProject } = useProjects()
  const projects = Array.isArray(rawProjects) ? rawProjects : []

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editProject, setEditProject] = useState<Project | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Project | null>(null)
  const [form, setForm] = useState<ProjectForm>({ name: '', description: '', color: '#2196F3' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchProjects()
  }, [])

  const activeProjects = projects.filter((p) => !p.is_archived)

  const openCreate = () => {
    setEditProject(null)
    setForm({ name: '', description: '', color: '#2196F3' })
    setDialogOpen(true)
  }

  const openEdit = (project: Project) => {
    setEditProject(project)
    setForm({ name: project.name, description: project.description || '', color: project.color || '#2196F3' })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (editProject) {
        await updateProject(editProject.id, { name: form.name.trim(), description: form.description, color: form.color })
      } else {
        await createProject({ name: form.name.trim(), description: form.description, color: form.color })
      }
      setDialogOpen(false)
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteConfirm) return
    await deleteProject(deleteConfirm.id)
    setDeleteConfirm(null)
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Проекты</Typography>
          <Typography variant="body2" color="text.secondary">Организуйте задачи по проектам</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Обновить">
            <IconButton onClick={() => fetchProjects()}><RefreshIcon /></IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Новый проект
          </Button>
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>Не удалось загрузить проекты с сервера.</Alert>
      )}

      {loading ? (
        <Grid container spacing={3}>
          {[1, 2, 3].map((i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Grid container spacing={3}>
          {activeProjects.map((project) => (
            <Grid item xs={12} sm={6} md={4} key={project.id}>
              <Card sx={{ height: '100%', borderLeft: 4, borderColor: project.color || 'primary.main' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <FolderIcon sx={{ color: project.color || 'primary.main' }} />
                      <Typography variant="h6" fontWeight={600}>{project.name}</Typography>
                    </Box>
                    <Stack direction="row">
                      <Tooltip title="Редактировать">
                        <IconButton size="small" onClick={() => openEdit(project)}><EditIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title="Удалить">
                        <IconButton size="small" color="error" onClick={() => setDeleteConfirm(project)}><DeleteIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    </Stack>
                  </Box>
                  {project.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{project.description}</Typography>
                  )}
                  <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                    {project.task_count !== undefined && (
                      <Chip label={`${project.task_count} задач`} size="small" />
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
          {activeProjects.length === 0 && (
            <Grid item xs={12}>
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <FolderIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">Нет проектов</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Создайте первый проект для организации задач</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Создать проект</Button>
              </Box>
            </Grid>
          )}
        </Grid>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editProject ? 'Редактировать проект' : 'Новый проект'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Название"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              fullWidth required autoFocus
            />
            <TextField
              label="Описание"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              fullWidth multiline rows={2}
            />
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>Цвет проекта</Typography>
              <Stack direction="row" spacing={1}>
                {colorOptions.map((c) => (
                  <Box
                    key={c}
                    onClick={() => setForm({ ...form, color: c })}
                    sx={{
                      width: 32, height: 32, borderRadius: '50%', bgcolor: c, cursor: 'pointer',
                      border: form.color === c ? '3px solid' : '2px solid transparent',
                      borderColor: form.color === c ? 'text.primary' : 'transparent',
                      transition: 'all 0.2s',
                    }}
                  />
                ))}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : editProject ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle>Удалить проект?</DialogTitle>
        <DialogContent>
          <Typography>Вы уверены, что хотите удалить проект "{deleteConfirm?.name}"?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Отмена</Button>
          <Button color="error" variant="contained" onClick={confirmDelete}>Удалить</Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
