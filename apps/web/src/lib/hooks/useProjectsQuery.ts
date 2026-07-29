import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectApi, type ProjectCreate } from '@/lib/api/projectApi'
import { useProjectStore } from '@/store/projectStore'
import type { Project } from '@/lib/types'

export function useProjectsQuery() {
  const queryClient = useQueryClient()
  const { projects, setProjects, addProject, updateProject: updateProjectInStore, removeProject } = useProjectStore()

  const query = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await projectApi.list()
      return response.data
    },
  })

  const resolvedProjects = query.data ?? projects

  const createMutation = useMutation({
    mutationFn: async (data: ProjectCreate) => {
      const response = await projectApi.create(data)
      return response.data
    },
    onSuccess: (project) => {
      addProject(project)
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Project> }) => {
      const response = await projectApi.update(id, data)
      return response.data
    },
    onSuccess: (project) => {
      updateProjectInStore(project)
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      removeProject(id)
      await projectApi.delete(id)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  })

  if (query.data) setProjects(query.data)

  return {
    projects: resolvedProjects,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    fetchProjects: query.refetch,
    createProject: createMutation.mutateAsync,
    updateProject: async (id: string, data: Partial<Project>) => updateMutation.mutateAsync({ id, data }),
    deleteProject: deleteMutation.mutateAsync,
  }
}
