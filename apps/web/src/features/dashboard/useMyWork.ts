import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { communicationApi } from '@/lib/api/communicationApi'
import { projectApi, type ProjectStats } from '@/lib/api/projectApi'
import { useProjectsQuery } from '@/lib/hooks/useProjectsQuery'
import { useTasksQuery } from '@/lib/hooks/useTasksQuery'
import { useAuthStore } from '@/lib/store/authStore'
import type { Project } from '@/lib/types'
import { useUIStore } from '@/store/uiStore'
import { buildActionItems, selectFocusNow, splitMyWork } from '@/features/work/selectors'
import type { ActionItem, FocusSelection } from '@/features/work/types'

const ACTION_LIMIT = 7
const WAITING_LIMIT = 4
const PROJECT_LIMIT = 6

export interface DashboardProjectSummary {
  projectId: string
  name: string
  progress: number
  healthLabel: 'On track' | 'Needs attention' | 'At risk' | 'Off track'
  reason: string
  recommendedAction: string
}

export interface DashboardSectionState {
  loading: boolean
  error: string | null
  warning: string | null
  retry: () => void
}

export interface MyWorkViewModel {
  focus: FocusSelection | null
  actions: ActionItem[]
  waiting: ActionItem[]
  attention: { overdue: number; blocked: number; missingNextAction: number }
  projects: DashboardProjectSummary[]
  states: {
    focus: DashboardSectionState
    actions: DashboardSectionState
    waiting: DashboardSectionState
    projects: DashboardSectionState
  }
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useMyWork(): MyWorkViewModel {
  const currentUserId = useAuthStore((state) => state.user?.id ?? '')
  const pinnedFocusEntityKey = useUIStore((state) => state.pinnedFocusEntityKey)
  const tasksQuery = useTasksQuery()
  const projectsQuery = useProjectsQuery()
  const communicationsQuery = useQuery({
    queryKey: ['communication-items', 'dashboard-work'],
    queryFn: async () => (await communicationApi.list({ active_only: true, per_page: 100 })).data,
  })

  const tasks = Array.isArray(tasksQuery.tasks) ? tasksQuery.tasks : []
  const projects = Array.isArray(projectsQuery.projects) ? projectsQuery.projects : []
  const communications = communicationsQuery.data?.items ?? []
  const dashboardProjectIds = projects.slice(0, PROJECT_LIMIT).map((project) => project.id)
  const projectStatsQuery = useQuery({
    queryKey: ['projects', 'dashboard-stats', dashboardProjectIds],
    queryFn: async () => {
      const entries = await Promise.all(dashboardProjectIds.map(async (projectId) => {
        const response = await projectApi.stats(projectId)
        return [projectId, response.data] as const
      }))
      return Object.fromEntries(entries) as Record<string, ProjectStats>
    },
    enabled: dashboardProjectIds.length > 0 && !projectsQuery.error,
  })

  const model = useMemo(() => {
    const now = new Date()
    const items = buildActionItems(tasks, communications, currentUserId)
    const work = splitMyWork(items, now)
    const activeItems = items.filter((item) => item.state !== 'done')

    return {
      focus: selectFocusNow(items, pinnedFocusEntityKey, now),
      actions: work.actions.slice(0, ACTION_LIMIT),
      waiting: work.waiting.slice(0, WAITING_LIMIT),
      attention: {
        overdue: activeItems.filter((item) => isOverdue(item, now)).length,
        blocked: activeItems.filter((item) => item.isBlocked).length,
        missingNextAction: work.actions.filter((item) => !item.nextAction).length,
      },
      projects: buildProjectSummaries(projects, projectStatsQuery.data).slice(0, PROJECT_LIMIT),
    }
  }, [communications, currentUserId, pinnedFocusEntityKey, projectStatsQuery.data, projects, tasks])

  const retryWork = () => {
    void Promise.allSettled([tasksQuery.fetchTasks(), communicationsQuery.refetch()])
  }
  const retryProjects = () => {
    void Promise.allSettled([projectsQuery.fetchProjects(), projectStatsQuery.refetch()])
  }
  const workState = combineSourceStates([
    { loading: tasksQuery.loading, error: tasksQuery.error },
    { loading: communicationsQuery.isLoading, error: queryError(communicationsQuery.error) },
  ], retryWork)
  const projectStatsError = queryError(projectStatsQuery.error)
  const projectsState = !dashboardProjectIds.length || projectsQuery.loading || projectsQuery.error
    ? singleSourceState(projectsQuery.loading, projectsQuery.error, retryProjects)
    : projectStatsQuery.isLoading
      ? singleSourceState(true, null, retryProjects)
      : projectStatsError
        ? { loading: false, error: null, warning: projectStatsError, retry: retryProjects }
        : singleSourceState(false, null, retryProjects)

  return {
    ...model,
    states: {
      focus: workState,
      actions: workState,
      waiting: workState,
      projects: projectsState,
    },
    loading: workState.loading || projectsState.loading,
    error: workState.error || projectsState.error,
    refetch: () => {
      retryWork()
      retryProjects()
    },
  }
}

export function buildProjectSummaries(projects: Project[], statsByProject: Record<string, ProjectStats> = {}): DashboardProjectSummary[] {
  return projects.map((project) => {
    const stats = statsByProject[project.id]
    const progress = stats?.progress ?? 0

    if (project.is_overdue) {
      return summary(project, progress, 'Off track', 'Срок проекта просрочен', 'Пересобрать план и согласовать новый срок')
    }
    if (stats && stats.overdue_count >= 3) {
      return summary(project, progress, 'Off track', `${stats.overdue_count} просроченных задач по полной сводке`, 'Пересобрать план и снять критические просрочки')
    }
    if (stats?.overdue_count) {
      return summary(project, progress, 'At risk', `${stats.overdue_count} просроченных задач по полной сводке`, 'Разобрать просрочки и назначить ответственных')
    }
    if (project.status === 'on_hold') {
      return summary(project, progress, 'At risk', 'Проект приостановлен', 'Определить условие и владельца возобновления')
    }
    if (project.status === 'planning') {
      return summary(project, progress, 'Needs attention', 'Проект находится на этапе планирования', 'Зафиксировать план, сроки и ответственных')
    }
    return summary(project, progress, 'On track', 'Критических отклонений по сводке проекта нет', 'Продолжать выполнение по плану')
  })
}

function combineSourceStates(sources: Array<{ loading: boolean; error: string | null }>, retry: () => void): DashboardSectionState {
  const errors = sources.map((source) => source.error).filter((error): error is string => Boolean(error))
  const hasSuccessfulSource = sources.some((source) => !source.loading && !source.error)

  return {
    loading: !hasSuccessfulSource && !errors.length && sources.some((source) => source.loading),
    error: !hasSuccessfulSource && errors.length ? errors.join('. ') : null,
    warning: hasSuccessfulSource && errors.length ? errors.join('. ') : null,
    retry,
  }
}

function singleSourceState(loading: boolean, error: string | null, retry: () => void): DashboardSectionState {
  return { loading, error, warning: null, retry }
}

function queryError(error: unknown) {
  return error instanceof Error ? error.message : error ? String(error) : null
}

function summary(project: Project, progress: number, healthLabel: DashboardProjectSummary['healthLabel'], reason: string, recommendedAction: string): DashboardProjectSummary {
  return { projectId: project.id, name: project.name, progress, healthLabel, reason, recommendedAction }
}

function isOverdue(item: ActionItem, now: Date) {
  const dueAt = item.dueAt ?? item.finalDueAt
  return Boolean(dueAt && new Date(dueAt).getTime() < now.getTime())
}
