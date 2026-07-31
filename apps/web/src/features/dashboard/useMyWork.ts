import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { communicationApi } from '@/lib/api/communicationApi'
import { useProjectsQuery } from '@/lib/hooks/useProjectsQuery'
import { useTasksQuery } from '@/lib/hooks/useTasksQuery'
import { useAuthStore } from '@/lib/store/authStore'
import type { Project, Task } from '@/lib/types'
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

export interface MyWorkViewModel {
  focus: FocusSelection | null
  actions: ActionItem[]
  waiting: ActionItem[]
  attention: { overdue: number; blocked: number; missingNextAction: number }
  projects: DashboardProjectSummary[]
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
      projects: buildProjectSummaries(projects, tasks, now).slice(0, PROJECT_LIMIT),
    }
  }, [communications, currentUserId, pinnedFocusEntityKey, projects, tasks])

  const error = tasksQuery.error || projectsQuery.error || (communicationsQuery.error instanceof Error ? communicationsQuery.error.message : null)

  return {
    ...model,
    loading: tasksQuery.loading || projectsQuery.loading || communicationsQuery.isLoading,
    error,
    refetch: () => {
      void Promise.all([
        tasksQuery.fetchTasks(),
        projectsQuery.fetchProjects(),
        communicationsQuery.refetch(),
      ])
    },
  }
}

export function buildProjectSummaries(projects: Project[], tasks: Task[], now: Date): DashboardProjectSummary[] {
  return projects.map((project) => {
    const projectTasks = tasks.filter((task) => task.project_id === project.id)
    const completed = projectTasks.filter(isTaskClosed).length
    const active = projectTasks.filter((task) => !isTaskClosed(task))
    const overdue = active.filter((task) => Boolean(task.due_date && new Date(task.due_date).getTime() < now.getTime())).length
    const blocked = active.filter((task) => Boolean(task.is_blocked || task.workflow_status === 'blocked')).length
    const missingNextAction = active.filter((task) => !task.next_action && !task.next_action_description).length
    const total = project.task_count ?? projectTasks.length
    const completedCount = project.completed_count ?? completed
    const progress = total ? Math.min(100, Math.round((completedCount / total) * 100)) : 0

    if (project.is_overdue || overdue >= 3 || blocked >= 3) {
      return summary(project, progress, 'Off track', `${overdue} просрочено, ${blocked} заблокировано`, 'Пересобрать план и снять критические блокировки')
    }
    if (overdue || blocked) {
      return summary(project, progress, 'At risk', `${overdue} просрочено, ${blocked} заблокировано`, 'Разобрать риски и назначить ответственных')
    }
    if (missingNextAction) {
      return summary(project, progress, 'Needs attention', `${missingNextAction} задач без следующего действия`, 'Уточнить следующие действия по активным задачам')
    }
    return summary(project, progress, 'On track', 'Критических отклонений нет', 'Продолжать выполнение по плану')
  })
}

function summary(project: Project, progress: number, healthLabel: DashboardProjectSummary['healthLabel'], reason: string, recommendedAction: string): DashboardProjectSummary {
  return { projectId: project.id, name: project.name, progress, healthLabel, reason, recommendedAction }
}

function isTaskClosed(task: Task) {
  return task.status === 'done' || task.status === 'archived' || task.workflow_status === 'done' || task.workflow_status === 'cancelled'
}

function isOverdue(item: ActionItem, now: Date) {
  const dueAt = item.dueAt ?? item.finalDueAt
  return Boolean(dueAt && new Date(dueAt).getTime() < now.getTime())
}
