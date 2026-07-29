/**
 * React Query hooks for tasks — replaces manual useState/useEffect pattern in useTasks.ts.
 *
 * Benefits over old useTasks:
 *  - Automatic cache invalidation after mutations
 *  - Background refetch, staleTime, retry
 *  - No manual loading/error state management per component
 *  - Optimistic updates with automatic rollback built into react-query
 *  - Deduplication: multiple components sharing the same query key share one request
 */
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query'
import { taskApi } from '../lib/api/taskApi'
import type { Task, TaskCreate, TaskUpdate } from '../lib/types'

// ── Query Keys ────────────────────────────────────────────────────────────────
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (params?: object) => [...taskKeys.lists(), params] as const,
  detail: (id: string) => [...taskKeys.all, 'detail', id] as const,
} as const

// ── List ─────────────────────────────────────────────────────────────────────
interface UseTasksParams {
  projectId?: string
  status?: string
  priority?: string
  search?: string
  page?: number
  per_page?: number
}

export function useTasksQuery(
  params?: UseTasksParams,
  options?: Omit<UseQueryOptions<Task[]>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: taskKeys.list(params),
    queryFn: async () => {
      const res = await taskApi.list(
        params?.projectId ? { ...params, project_id: params.projectId } : params,
      )
      return res.data.tasks
    },
    ...options,
  })
}

// ── Single task ───────────────────────────────────────────────────────────────
export function useTaskQuery(
  id: string,
  options?: Omit<UseQueryOptions<Task>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: async () => {
      const res = await taskApi.get(id)
      return res.data
    },
    enabled: !!id,
    ...options,
  })
}

// ── Create ────────────────────────────────────────────────────────────────────
export function useCreateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: TaskCreate) => taskApi.create(data).then((r) => r.data),
    onSuccess: (newTask) => {
      // Invalidate all task lists so they refetch with the new task
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
      // Pre-populate detail cache
      queryClient.setQueryData(taskKeys.detail(newTask.id), newTask)
    },
  })
}

// ── Update ────────────────────────────────────────────────────────────────────
export function useUpdateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TaskUpdate }) =>
      taskApi.update(id, data).then((r) => r.data),

    // Optimistic update — react-query handles rollback automatically
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() })
      const previousLists = queryClient.getQueriesData({ queryKey: taskKeys.lists() })

      queryClient.setQueriesData(
        { queryKey: taskKeys.lists() },
        (old: Task[] | undefined) =>
          old?.map((t) => (t.id === id ? { ...t, ...data } : t)) ?? old,
      )

      return { previousLists }
    },

    onError: (_err, _vars, context) => {
      // Roll back all list queries
      context?.previousLists.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data)
      })
    },

    onSuccess: (updatedTask) => {
      queryClient.setQueryData(taskKeys.detail(updatedTask.id), updatedTask)
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
    },
  })
}

// ── Delete ────────────────────────────────────────────────────────────────────
export function useDeleteTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => taskApi.delete(id),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() })
      const previousLists = queryClient.getQueriesData({ queryKey: taskKeys.lists() })

      // Optimistically remove from all lists
      queryClient.setQueriesData(
        { queryKey: taskKeys.lists() },
        (old: Task[] | undefined) => old?.filter((t) => t.id !== id) ?? old,
      )

      return { previousLists }
    },

    onError: (_err, _id, context) => {
      context?.previousLists.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data)
      })
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
    },
  })
}

// ── Reorder (position) ────────────────────────────────────────────────────────
export function useReorderTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, position }: { id: string; position: number }) =>
      taskApi.update(id, { position }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
    },
  })
}
