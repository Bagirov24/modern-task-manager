import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectApi } from '@/lib/api/projectApi'
import type { Project } from '@/lib/types'
import { useSnackbar } from 'notistack'

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data } = await projectApi.list()
      return data
    },
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()

  return useMutation({
    mutationFn: async (data: Partial<Project>) => {
      const { data: project } = await projectApi.create(data)
      return project
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      enqueueSnackbar('Проект создан', { variant: 'success' })
    },
    onError: () => {
      enqueueSnackbar('Ошибка при создании проекта', { variant: 'error' })
    },
  })
}

export function useUpdateProject() {
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Project> }) => {
      const { data: project } = await projectApi.update(id, data)
      return project
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      enqueueSnackbar('Проект обновлён', { variant: 'success' })
    },
    onError: () => {
      enqueueSnackbar('Ошибка при обновлении проекта', { variant: 'error' })
    },
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()

  return useMutation({
    mutationFn: async (id: string) => {
      await projectApi.delete(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      enqueueSnackbar('Проект удалён', { variant: 'info' })
    },
    onError: () => {
      enqueueSnackbar('Ошибка при удалении проекта', { variant: 'error' })
    },
  })
}
