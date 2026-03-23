import { useState, useEffect, useCallback } from 'react'
import { taskApi } from '../lib/api/taskApi'
import { useTaskStore } from '../store/taskStore'
import type { Task } from '../lib/types'

export type TaskCreate = Partial<Task>
export type TaskUpdate = Partial<Task>

export function useTasks(projectId?: string) {
  const { tasks, setTasks, addTask, updateTask: updateTaskInStore, removeTask } = useTaskStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await taskApi.list(projectId ? { project_id: projectId } : undefined)
      setTasks(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks')
    } finally {
      setLoading(false)
    }
  }, [projectId, setTasks])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const createTask = useCallback(async (task: TaskCreate) => {
    setError(null)
    try {
      const newTask = await taskApi.create(task)
      addTask(newTask.data)
      return newTask.data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task')
    }
  }, [addTask])

  const updateTask = useCallback(async (id: string, task: TaskUpdate) => {
    setError(null)
    try {
      const updated = await taskApi.update(id, task)
      updateTaskInStore(updated.data)
      return updated.data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task')
    }
  }, [updateTaskInStore])

  const deleteTask = useCallback(async (id: string) => {
    setError(null)
    try {
      await taskApi.delete(id)
      removeTask(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task')
    }
  }, [removeTask])

  const reorderTask = useCallback(async (id: string, data: any) => {
    try {
      await taskApi.update(id, data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder task')
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
