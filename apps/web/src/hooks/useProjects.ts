import { useState, useEffect, useCallback } from 'react'
import { projectApi } from '../lib/api/projectApi'
import { useProjectStore } from '../store/projectStore'
import type { Project } from '../lib/types'

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
      setProjects(items as Project[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch projects')
    } finally {
      setLoading(false)
    }
  }, [setProjects])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const createProject = useCallback(async (project: Partial<Project>) => {
    setError(null)
    try {
      const newProject: any = await projectApi.create(project)
      const item = newProject?.data ?? newProject
      addProject(item as Project)
      return item as Project
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project')
      throw err
    }
  }, [addProject])

  const updateProject = useCallback(async (id: string, project: Partial<Project>) => {
    setError(null)
    try {
      const updated: any = await projectApi.update(id, project)
      const item = updated?.data ?? updated
      updateProjectInStore(item as Project)
      return item as Project
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update project')
      throw err
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
