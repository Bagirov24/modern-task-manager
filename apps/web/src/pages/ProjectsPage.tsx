import { useState } from 'react'
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
  Avatar,
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
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject } from '@/lib/hooks/useProjects'
import type { Project } from '@/lib/types'

const colorOptions = ['#2196F3', '#4CAF50', '#FF9800', '#F44336', '#9C27B0', '#00BCD4', '#795548', '#607D8B']

export default function ProjectsPage() {
  const { data: projects = [], isLoading, isError, refetch } = useProjects()
  const createMutation = useCreateProject()
  const updateMutation = useUpdateProject()
  const deleteMutation = useDeleteProject()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editProject, setEditProject] = useState<Project | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Project | null>(null)
  const [form, setForm] = useState({ name: '', description: '', color: '#2196F3' })

  const activeProjects = projects.filter((p) => !p.is_archived)

  const openCreate = () => {
    setEditProject(null)
    setForm({ name: '', description: '', color: '#2196F3' })
    setDialogOpen(true)
  }

  const openEdit = (project: Project) => {
    setEditProject(project)
    setForm({ name: project.name, description: project.description || '', color: project.color })
    setDialogOpen(true)
  }

  const handleSave = () => {
    if (!form.name.trim()) return
    if (editProject) {
      updateMutation.mutate(
        { id: editProject.id, data: { name: form.name.trim(), description: form.description, color: form.color } },
        { onSuccess: () => setDialogOpen(false) }
      )
    } else {
      createMutation.mutate(
        { name: form.name.trim(), description: form.description, color: form.color },
        { onSuccess: () => setDialogOpen(false) }
      )
    }
  }

  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteMutation.mutate(deleteConfirm.id, {
        onSuccess: () => setDeleteConfirm(null),
      })
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Проекты
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Организуйте задачи по проектам
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Обновить">
            <IconButton onClick={() => refetch()}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Новый проект
          </Button>
        </Stack>
      </Box>

      {isError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Не удалось загрузить проекты с сервера.
        </Alert>
      )}

      {isLoading ? (
        <Grid container spacing={3}>
          {[1, 2, 3].map((i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rounded" height={180} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Grid container spacing={3}>
          {activeProjects.map((project) => (
            <Grid item xs={12} sm={6} md={4} key={project.id}>
              <Card
                sx={{
                  borderTop: `4px solid ${project.color}`,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 },
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ bgcolor: project.color, width: 36, height: 36 }}>
                        <FolderIcon fontSize="small" />
                      </Avatar>
                      <Typography variant="h6" fontWeight="bold">
                        {project.name}
                      </Typography>
                    </Box>
                    <Box>
                      <IconButton size="small" onClick={() => openEdit(project)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => setDeleteConfirm(project)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                  {project.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {project.description}
                    </Typography>
                  )}
                  <Chip
                    size="small"
                    label={`Создан: ${new Date(project.created_at).toLocaleDateString('ru-RU')}`}
                    variant="outlined"
                  />
                </CardContent>
              </Card>
            </Grid>
          ))}

          {activeProjects.length === 0 && (
            <Grid item xs={12}>
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <FolderIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  Нет проектов
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Создайте первый проект для организации задач
                </Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
                  Создать проект
                </Button>
              </Box>
            </Grid>
          )}
        </Grid>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editProject ? 'Редактировать проект' : 'Новый проект'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Название"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              fullWidth
              required
              autoFocus
            />
            <TextField
              label="Описание"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Цвет проекта</Typography>
              <Stack direction="row" spacing={1}>
                {colorOptions.map((c) => (
                  <Box
                    key={c}
                    onClick={() => setForm({ ...form, color: c })}
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      bgcolor: c,
                      cursor: 'pointer',
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
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!form.name.trim() || isSaving}
            startIcon={isSaving ? <CircularProgress size={16} /> : undefined}
          >
            {editProject ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle>Удалить проект?</DialogTitle>
        <DialogContent>
          <Typography>
            Вы уверены, что хотите удалить проект "{deleteConfirm?.name}"?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Отмена</Button>
          <Button
            onClick={confirmDelete}
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending}
          >
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
