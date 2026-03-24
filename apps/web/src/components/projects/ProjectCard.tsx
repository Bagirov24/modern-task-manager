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
  onSelect?: (project: Project) => void
  onEdit?: (project: Project) => void
  onDelete?: (projectId: string) => void
  onArchive?: () => void
  onClick?: () => void
  variant?: 'grid' | 'list'
  onToggleFavorite?: (projectId: string) => void
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onSelect,
  onEdit,
  onDelete,
  onToggleFavorite,
}) => {
  const progress = (project.task_count ?? 0) > 0
    ? Math.round(((project.completed_count ?? 0) / (project.task_count ?? 1)) * 100)
    : 0

  return (
    <Card
      sx={{
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        borderLeft: `4px solid ${project.color || '#1976d2'}`,
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 4,
        },
      }}
      onClick={() => onSelect?.(project)}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Folder sx={{ color: project.color || '#1976d2', mr: 1 }} />
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
            {project.name}
          </Typography>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite?.(project.id)
            }}
          >
            {project.is_favorite ? <Star color="warning" /> : <StarBorder />}
          </IconButton>
        </Box>

        {project.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {project.description}
          </Typography>
        )}

        <Typography variant="caption" color="text.secondary">
          \u041f\u0440\u043e\u0433\u0440\u0435\u0441\u0441
        </Typography>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{ mb: 1, borderRadius: 1 }}
        />
        <Typography variant="caption" color="text.secondary">
          {project.completed_count ?? 0}/{project.task_count ?? 0} \u0437\u0430\u0434\u0430\u0447
        </Typography>
      </CardContent>
      <CardActions sx={{ justifyContent: 'flex-end' }}>
        <Tooltip title="\u0420\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u0442\u044c">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(project)
            }}
          >
            <Edit fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="\u0423\u0434\u0430\u043b\u0438\u0442\u044c">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(project.id)
            }}
          >
            <Delete fontSize="small" />
          </IconButton>
        </Tooltip>
      </CardActions>
    </Card>
  )
}
