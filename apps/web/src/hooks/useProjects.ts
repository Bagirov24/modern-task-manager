import { useState, useEffect, useCallback } from 'react'
import { projectApi } from '../lib/api/projectApi'
import { useProjectStore } from '../store/projectStore'
import type { Project, ProjectCreate } from '../lib/api/projectApi'

export function useProjects() {
  const { projects, setProjects, addProject, updateProject: updateProjectInStore, removeProject } = useProjectStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await projectApi.getProjects()
      setProjects(data)
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
      const newProject = await projectApi.createProject(project)
      addProject(newProject)
      return newProject
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project')
      throw err
    }
  }, [addProject])

  const editProject = useCallback(async (projectId: string, update: Partial<Project>) => {
    setError(null)
    try {
      const updated = await projectApi.updateProject(projectId, update)
      updateProjectInStore(updated)
      return updated
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update project')
      throw err
    }
  }, [updateProjectInStore])

  const deleteProject = useCallback(async (projectId: string) => {
    setError(null)
    try {
      await projectApi.deleteProject(projectId)
      removeProject(projectId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project')
      throw err
    }
  }, [removeProject])

  return {
    projects,
    loading,
    error,
    fetchProjects,
    createProject,
    editProject,
    deleteProject,
  }
}
