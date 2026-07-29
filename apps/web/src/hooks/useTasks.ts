import { useState, useEffect, useCallback } from 'react'
import { taskApi } from '../lib/api/taskApi'
import { useTaskStore } from '../store/taskStore'
import type { Task, TaskCreate, TaskUpdate } from '../lib/types'

export type { TaskCreate, TaskUpdate }

export function useTasks(projectId?: string) {
  const { tasks, setTasks, addTask, updateTask: updateTaskInStore, removeTask } = useTaskStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await taskApi.list(projectId ? { project_id: projectId } : undefined)
      // BUG FIX: API now always returns { tasks, total, page, per_page } — no triple-format guessing
      setTasks(response.data.tasks)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks')
    } finally {
      setLoading(false)
    }
  }, [projectId, setTasks])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const createTask = useCallback(async (task: TaskCreate): Promise<Task | undefined> => {
    setError(null)
    try {
      const response = await taskApi.create(task)
      addTask(response.data)
      return response.data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task')
    }
  }, [addTask])

  const updateTask = useCallback(async (id: string, updates: TaskUpdate): Promise<Task | undefined> => {
    setError(null)

    // Optimistic update: apply changes immediately, roll back on error
    const previousTask = tasks.find(t => t.id === id)
    if (previousTask) {
      updateTaskInStore({ ...previousTask, ...updates } as Task)
    }

    try {
      const response = await taskApi.update(id, updates)
      updateTaskInStore(response.data)  // sync with server response
      return response.data
    } catch (err) {
      // Roll back to previous state
      if (previousTask) updateTaskInStore(previousTask)
      setError(err instanceof Error ? err.message : 'Failed to update task')
    }
  }, [tasks, updateTaskInStore])

  const deleteTask = useCallback(async (id: string): Promise<void> => {
    setError(null)
    // Optimistic remove
    removeTask(id)
    try {
      await taskApi.delete(id)
    } catch (err) {
      // Restore task on failure by re-fetching
      await fetchTasks()
      setError(err instanceof Error ? err.message : 'Failed to delete task')
    }
  }, [removeTask, fetchTasks])

  const reorderTask = useCallback(async (id: string, position: number): Promise<void> => {
    try {
      await taskApi.update(id, { position })
    } catch (err) {
      console.error('Failed to reorder task:', err)
    }
  }, [])

  return {
    tasks,
    loading,
    error,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    reorderTask,
  }
}
