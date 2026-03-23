import React, { useState } from 'react';
import {
  Box,
  Grid,
  ToggleButtonGroup,
  ToggleButton,
  TextField,
  InputAdornment,
  Typography,
  Tooltip,
  Chip,
} from '@mui/material';
import {
  ViewModule as GridIcon,
  ViewList as ListIcon,
  Search as SearchIcon,
  FolderOpen as FolderIcon,
} from '@mui/icons-material';
import { ProjectCard } from './ProjectCard';
import { EmptyState } from '../common/EmptyState';
import { LoadingScreen } from '../common/LoadingScreen';

interface Project {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  is_archived?: boolean;
    is_favorite?: boolean;
  created_at?: string;
  owner_id?: string;
  task_count?: number;
  completed_count?: number;
  updated_at?: string;
}

interface ProjectListProps {
  projects: Project[];
  loading?: boolean;
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
  onArchive?: (project: Project) => void;
  onSelect?: (project: Project) => void;
  onCreate?: () => void;
}

export const ProjectList: React.FC<ProjectListProps> = ({
  projects,
  loading = false,
  onEdit,
  onDelete,
  onArchive,
  onSelect,
  onCreate,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'archived'>('all');

  const filtered = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === 'all' ||
      (filter === 'active' && !p.is_archived) ||
      (filter === 'archived' && p.is_archived);
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return <LoadingScreen fullScreen={false} message="Загрузка проектов..." />;
  }

  return (
    <Box>
      {/* Toolbar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          mb: 3,
          flexWrap: 'wrap',
        }}
      >
        <TextField
          size="small"
          placeholder="Поиск проектов..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 240 }}
        />

        <Box sx={{ display: 'flex', gap: 1 }}>
          {(['all', 'active', 'archived'] as const).map((f) => (
            <Chip
              key={f}
              label={f === 'all' ? 'Все' : f === 'active' ? 'Активные' : 'Архив'}
              variant={filter === f ? 'filled' : 'outlined'}
              color={filter === f ? 'primary' : 'default'}
              onClick={() => setFilter(f)}
              size="small"
            />
          ))}
        </Box>

        <Box sx={{ ml: 'auto' }}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, v) => v && setViewMode(v)}
            size="small"
          >
            <ToggleButton value="grid">
              <Tooltip title="Сетка">
                <GridIcon fontSize="small" />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="list">
              <Tooltip title="Список">
                <ListIcon fontSize="small" />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Typography variant="body2" color="text.secondary">
          {filtered.length} проектов
        </Typography>
      </Box>

      {/* Content */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<FolderIcon />}
          title={search ? 'Ничего не найдено' : 'Нет проектов'}
          description={
            search
              ? 'Попробуйте изменить поисковый запрос'
              : 'Создайте первый проект для организации задач'
          }
          actionLabel={!search ? 'Создать проект' : undefined}
          onAction={!search ? onCreate : undefined}
        />
      ) : viewMode === 'grid' ? (
        <Grid container spacing={2}>
          {filtered.map((project) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={project.id}>
              <ProjectCard
                project={project}
                onEdit={() => onEdit?.(project)}
                onDelete={() => onDelete?.(project)}
                onArchive={() => onArchive?.(project)}
                onClick={() => onSelect?.(project)}
              />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {filtered.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              variant="list"
              onEdit={() => onEdit?.(project)}
              onDelete={() => onDelete?.(project)}
              onArchive={() => onArchive?.(project)}
              onClick={() => onSelect?.(project)}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

export default ProjectList;
