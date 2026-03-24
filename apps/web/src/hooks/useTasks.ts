import { useState, useEffect, useCallback } from 'react'
import { taskApi } from '../lib/api/taskApi'
import { useTaskStore } from '../store/taskStore'
import type { Task } from '../lib/types'

export type TaskCreate = Record<string, any>
export type TaskUpdate = Record<string, any>

export function useTasks(projectId?: string) {
  const { tasks, setTasks, addTask, updateTask: updateTaskInStore, removeTask } = useTaskStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data: any = await taskApi.list(projectId ? { project_id: projectId } : undefined)
      const raw = data?.data ?? data
      let items: any[] = []
      if (Array.isArray(raw)) {
        items = raw
      } else if (raw?.tasks && Array.isArray(raw.tasks)) {
        items = raw.tasks
      } else if (raw?.data && Array.isArray(raw.data)) {
        items = raw.data
      }
      setTasks(items as Task[])
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
      const newTask: any = await taskApi.create(task)
      const item = newTask?.data ?? newTask
      addTask(item as Task)
      return item
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task')
    }
  }, [addTask])

  const updateTask = useCallback(async (id: string, task: TaskUpdate) => {
    setError(null)
    try {
      const updated: any = await taskApi.update(id, task)
      const item = updated?.data ?? updated
      updateTaskInStore(item as Task)
      return item
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

  const reorderTask = useCallback(async (id: string, position: number) => {
    try {
      await taskApi.update(id, { order: position })
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
