import { useState, useEffect, useCallback } from 'react'
import { taskApi } from '../lib/api/taskApi'
import { useTaskStore } from '../store/taskStore'
import type { Task, TaskCreate, TaskUpdate } from '../lib/api/taskApi'

export function useTasks(projectId?: string) {
  const { tasks, setTasks, addTask, updateTask: updateTaskInStore, removeTask } = useTaskStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await taskApi.getTasks(projectId)
      setTasks(data)
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
      const newTask = await taskApi.createTask(task)
      addTask(newTask)
      return newTask
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task')
      throw err
    }
  }, [addTask])

  const editTask = useCallback(async (taskId: string, update: TaskUpdate) => {
    setError(null)
    try {
      const updated = await taskApi.updateTask(taskId, update)
      updateTaskInStore(updated)
      return updated
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task')
      throw err
    }
  }, [updateTaskInStore])

  const deleteTask = useCallback(async (taskId: string) => {
    setError(null)
    try {
      await taskApi.deleteTask(taskId)
      removeTask(taskId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task')
      throw err
    }
  }, [removeTask])

  const toggleComplete = useCallback(async (task: Task) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done'
    return editTask(task.id, { status: newStatus })
  }, [editTask])

  const reorderTasks = useCallback(async (taskId: string, newOrder: number) => {
    try {
      await taskApi.reorderTask(taskId, newOrder)
      await fetchTasks()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder task')
    }
  }, [fetchTasks])

  return {
    tasks,
    loading,
    error,
    fetchTasks,
    createTask,
    editTask,
    deleteTask,
    toggleComplete,
    reorderTasks,
  }
}
