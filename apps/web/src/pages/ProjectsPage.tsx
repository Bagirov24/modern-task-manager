import { useState } from 'react'
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
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
} from '@mui/material'
import {
  FolderOutlined as FolderIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Archive as ArchiveIcon,
} from '@mui/icons-material'
import { useProjectStore } from '@/lib/store/projectStore'
import type { Project } from '@/lib/types'

const colorOptions = ['#2196F3', '#4CAF50', '#FF9800', '#F44336', '#9C27B0', '#00BCD4', '#795548', '#607D8B']

export default function ProjectsPage() {
  const { projects, addProject, updateProject, removeProject } = useProjectStore()
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
      updateProject(editProject.id, { name: form.name.trim(), description: form.description, color: form.color })
    } else {
      addProject({
        id: crypto.randomUUID(),
        name: form.name.trim(),
        description: form.description,
        color: form.color,
        is_archived: false,
        owner_id: '1',
        created_at: new Date().toISOString(),
        task_count: 0,
      })
    }
    setDialogOpen(false)
  }

  const confirmDelete = () => {
    if (deleteConfirm) {
      removeProject(deleteConfirm.id)
      setDeleteConfirm(null)
    }
  }

  return (
    <Container maxWidth="lg" disableGutters>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Проекты
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Организуйте задачи по проектам
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Новый проект
        </Button>
      </Box>

      <Grid container spacing={3}>
        {activeProjects.map((project) => (
          <Grid item xs={12} sm={6} md={4} key={project.id}>
            <Card
              sx={{
                height: '100%',
                border: '1px solid',
                borderColor: 'divider',
                borderTop: `4px solid ${project.color}`,
                transition: 'all 0.2s',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 },
                '&:hover .project-actions': { opacity: 1 },
              }}
              elevation={0}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <Avatar sx={{ bgcolor: project.color, width: 40, height: 40 }}>
                      <FolderIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {project.name}
                      </Typography>
                      <Chip label={`${project.task_count} задач`} size="small" variant="outlined" />
                    </Box>
                  </Box>
                  <Stack
                    direction="row"
                    className="project-actions"
                    sx={{ opacity: 0, transition: 'opacity 0.2s' }}
                  >
                    <Tooltip title="Редактировать">
                      <IconButton size="small" onClick={() => openEdit(project)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Удалить">
                      <IconButton size="small" color="error" onClick={() => setDeleteConfirm(project)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Box>
                {project.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {project.description}
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                  Создан: {new Date(project.created_at).toLocaleDateString('ru-RU')}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}

        <Grid item xs={12} sm={6} md={4}>
          <Card
            sx={{
              height: '100%',
              minHeight: 160,
              border: '2px dashed',
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
            }}
            elevation={0}
            onClick={openCreate}
          >
            <CardContent sx={{ textAlign: 'center' }}>
              <AddIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
              <Typography color="text.secondary">Создать проект</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editProject ? 'Редактировать проект' : 'Новый проект'}</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
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
              <Typography variant="body2" sx={{ mb: 1 }}>Цвет проекта</Typography>
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
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleSave} variant="contained" disabled={!form.name.trim()}>
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
          <Button onClick={confirmDelete} color="error" variant="contained">Удалить</Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
