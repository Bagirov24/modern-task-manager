import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { taskApi } from '@/lib/api/taskApi'
import type { Task } from '@/lib/types'
import { useSnackbar } from 'notistack'

interface TaskFilters {
  status?: string
  priority?: string
  search?: string
  project_id?: string
  page?: number
  per_page?: number
}

export function useTasks(filters: TaskFilters = {}) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: async () => {
      const params: Record<string, any> = {}
      if (filters.status) params.status = filters.status
      if (filters.priority) params.priority = filters.priority
      if (filters.search) params.search = filters.search
      if (filters.project_id) params.project_id = filters.project_id
      if (filters.page) params.page = filters.page
      if (filters.per_page) params.per_page = filters.per_page
      const { data } = await taskApi.list(params)
      return data
    },
  })
}

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: ['task', id],
    queryFn: async () => {
      const { data } = await taskApi.get(id!)
      return data
    },
    enabled: !!id,
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()

  return useMutation({
    mutationFn: async (data: Partial<Task>) => {
      const { data: task } = await taskApi.create(data)
      return task
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      enqueueSnackbar('Задача создана', { variant: 'success' })
    },
    onError: () => {
      enqueueSnackbar('Ошибка при создании задачи', { variant: 'error' })
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Task> }) => {
      const { data: task } = await taskApi.update(id, data)
      return task
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      enqueueSnackbar('Задача обновлена', { variant: 'success' })
    },
    onError: () => {
      enqueueSnackbar('Ошибка при обновлении задачи', { variant: 'error' })
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()

  return useMutation({
    mutationFn: async (id: string) => {
      await taskApi.delete(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      enqueueSnackbar('Задача удалена', { variant: 'info' })
    },
    onError: () => {
      enqueueSnackbar('Ошибка при удалении задачи', { variant: 'error' })
    },
  })
}
