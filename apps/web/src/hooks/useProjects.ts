import { useState, useEffect, useCallback } from 'react'
import { projectApi } from '../lib/api/projectApi'
import { useProjectStore } from '../store/projectStore'

export type ProjectCreate = Record<string, any>

export function useProjects() {
  const { projects, setProjects, addProject, updateProject: updateProjectInStore, removeProject } = useProjectStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data: any = await projectApi.list()
      const raw = data?.data ?? data
      let items: any[] = []
      if (Array.isArray(raw)) {
        items = raw
      } else if (raw?.projects && Array.isArray(raw.projects)) {
        items = raw.projects
      } else if (raw?.data && Array.isArray(raw.data)) {
        items = raw.data
      }
      setProjects(items as any)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch projects')
    } finally {
      setLoading(false)
    }
  }, [setProjects])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const createProject = useCallback(async (project: ProjectCreate) => {
    setError(null)
    try {
      const newProject: any = await projectApi.create(project)
      const item = newProject?.data ?? newProject
      addProject(item as any)
      return item
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project')
    }
  }, [addProject])

  const updateProject = useCallback(async (id: string, project: Partial<any>) => {
    setError(null)
    try {
      const updated: any = await projectApi.update(id, project)
      const item = updated?.data ?? updated
      updateProjectInStore(item as any)
      return item
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update project')
    }
  }, [updateProjectInStore])

  const deleteProject = useCallback(async (id: string) => {
    setError(null)
    try {
      await projectApi.delete(id)
      removeProject(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project')
    }
  }, [removeProject])

  return {
    projects,
    loading,
    error,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
  }
}
