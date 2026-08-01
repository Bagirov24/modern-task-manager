import { BlockOutlined, EventBusyOutlined, PlaylistRemoveOutlined } from '@mui/icons-material'
import { Box, Chip, LinearProgress, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import AttentionState from '@/components/common/AttentionState'
import DashboardStateNotice from './DashboardStateNotice'
import type { DashboardProjectSummary, DashboardSectionState } from './useMyWork'
import { SectionHeader } from './ActionQueue'

interface TeamRadarProps {
  attention: { overdue: number; blocked: number; missingNextAction: number }
  projects: DashboardProjectSummary[]
  state: DashboardSectionState
}

const healthColor = {
  'On track': 'success',
  'Needs attention': 'info',
  'At risk': 'warning',
  'Off track': 'error',
} as const

export default function TeamRadar({ attention, projects, state }: TeamRadarProps) {
  const visibleProjects = projects.slice(0, 6)
  return (
    <Box component="section" role="region" aria-labelledby="team-radar-heading">
      <SectionHeader id="team-radar-heading" title="Команда и проекты" count={visibleProjects.length} links={[{ to: '/projects', label: 'Все проекты' }]} />
      <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 1.5 }}>
        <Chip icon={<EventBusyOutlined />} color={attention.overdue ? 'error' : 'default'} variant={attention.overdue ? 'filled' : 'outlined'} label={`Просрочено: ${attention.overdue}`} />
        <Chip icon={<BlockOutlined />} color={attention.blocked ? 'warning' : 'default'} variant={attention.blocked ? 'filled' : 'outlined'} label={`Заблокировано: ${attention.blocked}`} />
        <Chip icon={<PlaylistRemoveOutlined />} color={attention.missingNextAction ? 'info' : 'default'} variant={attention.missingNextAction ? 'filled' : 'outlined'} label={`Без следующего действия: ${attention.missingNextAction}`} />
      </Stack>
      <DashboardStateNotice warning={state.warning} onRetry={state.retry} />
      <AttentionState loading={state.loading} error={state.error} onRetry={state.retry} empty={!visibleProjects.length} emptyTitle="Проектов нет" emptyDescription="Активные проекты появятся здесь после создания.">
        <Box component="ul" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(3, minmax(0, 1fr))' }, gap: 1.5, m: 0, p: 0, listStyle: 'none' }}>
          {visibleProjects.map((project) => (
            <Paper component="li" key={project.projectId} variant="outlined" sx={{ p: 2, minWidth: 0 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
                <Typography component={RouterLink} to={`/projects/${project.projectId}`} color="text.primary" fontWeight={750} sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>{project.name}</Typography>
                <Chip size="small" color={healthColor[project.healthLabel]} variant="outlined" label={project.healthLabel} />
              </Stack>
              <Stack direction="row" alignItems="center" gap={1} sx={{ mt: 1.5 }}>
                {project.progress === null ? (
                  <>
                    <Box aria-label="Прогресс недоступен" sx={{ flex: 1, height: 6, borderRadius: 1, bgcolor: 'action.disabledBackground' }} />
                    <Typography variant="caption" fontWeight={700}>Нет данных</Typography>
                  </>
                ) : (
                  <>
                    <LinearProgress variant="determinate" value={project.progress} sx={{ flex: 1, height: 6, borderRadius: 1 }} />
                    <Typography variant="caption" fontWeight={700}>{project.progress}%</Typography>
                  </>
                )}
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25 }}>{project.reason}</Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}><strong>Дальше:</strong> {project.recommendedAction}</Typography>
            </Paper>
          ))}
        </Box>
      </AttentionState>
    </Box>
  )
}
