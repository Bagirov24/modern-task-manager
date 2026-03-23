import React from 'react'
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  IconButton,
  LinearProgress,
  Box,
  Chip,
  Tooltip,
} from '@mui/material'
import {
  Star,
  StarBorder,
  MoreVert,
  Folder,
  Edit,
  Delete,
} from '@mui/icons-material'
import type { Project } from '../../store/projectStore'

interface ProjectCardProps {
  project: Project
  onSelect: (project: Project) => void
  onEdit: (project: Project) => void
  onDelete: (projectId: string) => void
  onToggleFavorite: (projectId: string) => void
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onSelect,
  onEdit,
  onDelete,
  onToggleFavorite,
}) => {
  const progress = project.task_count > 0
    ? Math.round((project.completed_count / project.task_count) * 100)
    : 0

  return (
    <Card
      sx={{
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        borderLeft: `4px solid ${project.color}`,
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 4,
        },
      }}
      onClick={() => onSelect(project)}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Folder sx={{ color: project.color, mr: 1 }} />
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
            {project.name}
          </Typography>
          <Tooltip title={project.is_favorite ? 'Убрать из избранного' : 'Добавить в избранное'}>
            <IconButton
              size="small"
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(project.id) }}
            >
              {project.is_favorite ? <Star color="warning" /> : <StarBorder />}
            </IconButton>
          </Tooltip>
        </Box>

        {project.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {project.description}
          </Typography>
        )}

        <Box sx={{ mb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Прогресс
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {project.completed_count}/{project.task_count} задач
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 6,
              borderRadius: 3,
              backgroundColor: 'action.hover',
              '& .MuiLinearProgress-bar': {
                backgroundColor: project.color,
                borderRadius: 3,
              },
            }}
          />
        </Box>
      </CardContent>

      <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
        <Tooltip title="Редактировать">
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); onEdit(project) }}
          >
            <Edit fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Удалить">
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); onDelete(project.id) }}
          >
            <Delete fontSize="small" />
          </IconButton>
        </Tooltip>
      </CardActions>
    </Card>
  )
}
