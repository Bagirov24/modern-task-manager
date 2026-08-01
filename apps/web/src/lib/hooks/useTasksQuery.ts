import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { taskApi } from '@/lib/api/taskApi'
import { useTaskStore } from '@/store/taskStore'
import type { Task, TaskCreate, TaskUpdate } from '@/lib/types'

export type { TaskCreate, TaskUpdate }

export function useTasksQuery(projectId?: string, search?: string) {
  const queryClient = useQueryClient()
  const { tasks, setTasks, addTask, updateTask: updateTaskInStore, removeTask } = useTaskStore()

  const query = useQuery({
    queryKey: ['tasks', { projectId: projectId ?? null, search: search ?? '' }],
    queryFn: async () => {
      const response = await taskApi.list({
        ...(projectId ? { project_id: projectId } : {}),
        ...(search ? { search } : {}),
        per_page: 100,
      })
      return response.data.tasks
    },
  })

  const resolvedTasks = query.data ?? tasks

  const createMutation = useMutation({
    mutationFn: async (task: TaskCreate) => {
      const response = await taskApi.create(task)
      return response.data
    },
    onSuccess: (createdTask) => {
      addTask(createdTask)
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: TaskUpdate }) => {
      const previousTask = resolvedTasks.find((t) => t.id === id)
      if (previousTask) updateTaskInStore({ ...previousTask, ...updates } as Task)
      try {
        const response = await taskApi.update(id, updates)
        return { task: response.data, previousTask }
      } catch (error) {
        if (previousTask) updateTaskInStore(previousTask)
        throw error
      }
    },
    onSuccess: ({ task }) => {
      updateTaskInStore(task)
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const previousTask = resolvedTasks.find((t) => t.id === id)
      removeTask(id)
      try {
        await taskApi.delete(id)
        return previousTask
      } catch (error) {
        queryClient.invalidateQueries({ queryKey: ['tasks'] })
        throw error
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const reorderMutation = useMutation({
    mutationFn: async ({ id, position }: { id: string; position: number }) => {
      await taskApi.update(id, { position })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })

  useEffect(() => {
    if (query.data) setTasks(query.data)
  }, [query.data, setTasks])

  return {
    tasks: resolvedTasks,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    fetchTasks: query.refetch,
    createTask: createMutation.mutateAsync,
    updateTask: async (id: string, updates: TaskUpdate) => {
      const result = await updateMutation.mutateAsync({ id, updates })
      return result.task
    },
    deleteTask: deleteMutation.mutateAsync,
    reorderTask: async (id: string, position: number) => reorderMutation.mutateAsync({ id, position }),
  }
}
