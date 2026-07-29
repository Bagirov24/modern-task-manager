/**
 * React Query hooks for projects — mirrors useTasksQuery pattern.
 * Replaces the manual useState/useEffect pattern in useProjects.ts.
 */
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { projectApi } from '../lib/api/projectApi'
import type { Project } from '../lib/types'

// ── Query Keys ────────────────────────────────────────────────────────────────
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (params?: object) => [...projectKeys.lists(), params] as const,
  detail: (id: string) => [...projectKeys.all, 'detail', id] as const,
} as const

// ── List ─────────────────────────────────────────────────────────────────────
export function useProjectsQuery() {
  return useQuery({
    queryKey: projectKeys.list(),
    queryFn: async () => {
      const res = await projectApi.list()
      return res.data
    },
  })
}

// ── Create ────────────────────────────────────────────────────────────────────
export interface ProjectCreate {
  name: string
  description?: string
  color?: string
  icon?: string
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: ProjectCreate) =>
      projectApi.create(data).then((r) => r.data),
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
      queryClient.setQueryData(projectKeys.detail(newProject.id), newProject)
    },
  })
}

// ── Update ────────────────────────────────────────────────────────────────────
export function useUpdateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Project> }) =>
      projectApi.update(id, data).then((r) => r.data),

    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: projectKeys.lists() })
      const previousList = queryClient.getQueryData<Project[]>(projectKeys.list())

      queryClient.setQueryData<Project[]>(
        projectKeys.list(),
        (old) => old?.map((p) => (p.id === id ? { ...p, ...data } : p)) ?? old,
      )

      return { previousList }
    },

    onError: (_err, _vars, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(projectKeys.list(), context.previousList)
      }
    },

    onSuccess: (updated) => {
      queryClient.setQueryData(projectKeys.detail(updated.id), updated)
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
    },
  })
}

// ── Delete ────────────────────────────────────────────────────────────────────
export function useDeleteProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => projectApi.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: projectKeys.lists() })
      const previousList = queryClient.getQueryData<Project[]>(projectKeys.list())
      queryClient.setQueryData<Project[]>(
        projectKeys.list(),
        (old) => old?.filter((p) => p.id !== id) ?? old,
      )
      return { previousList }
    },
    onError: (_err, _id, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(projectKeys.list(), context.previousList)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
    },
  })
}

// ── Toggle favorite (local optimistic + server sync) ──────────────────────────
export function useToggleFavorite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isFavorite }: { id: string; isFavorite: boolean }) =>
      projectApi.update(id, { is_favorite: isFavorite }).then((r) => r.data),
    onMutate: async ({ id, isFavorite }) => {
      await queryClient.cancelQueries({ queryKey: projectKeys.lists() })
      const previousList = queryClient.getQueryData<Project[]>(projectKeys.list())
      queryClient.setQueryData<Project[]>(
        projectKeys.list(),
        (old) =>
          old?.map((p) => (p.id === id ? { ...p, is_favorite: isFavorite } : p)) ?? old,
      )
      return { previousList }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(projectKeys.list(), context.previousList)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
    },
  })
}
