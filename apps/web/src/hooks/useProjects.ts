import { useState, useEffect, useCallback } from 'react'
import { projectApi } from '../lib/api/projectApi'
import { useProjectStore } from '../store/projectStore'
import type { Project } from '../lib/types'

export type ProjectCreate = Partial<Project>

export function useProjects() {
  const { projects, setProjects, addProject, updateProject: updateProjectInStore, removeProject } = useProjectStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await projectApi.list()
      setProjects(data.data)
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
      const newProject = await projectApi.create(project)
      addProject(newProject.data)
      return newProject.data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project')
    }
  }, [addProject])

  const updateProject = useCallback(async (id: string, project: ProjectCreate) => {
    setError(null)
    try {
      const updated = await projectApi.update(id, project)
      updateProjectInStore(updated.data)
      return updated.data
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
