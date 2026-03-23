import { apiClient } from './client'
import type { Task } from '@/lib/types'

export interface SubtaskCreate {
  title: string
  description?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  due_date?: string
}

export interface SubtaskProgress {
  total: number
  done: number
  progress: number
}

export const subtaskApi = {
  getSubtasks: async (taskId: string): Promise<Task[]> => {
    const { data } = await apiClient.get(`/tasks/${taskId}/subtasks`)
    return data
  },

  createSubtask: async (taskId: string, subtask: SubtaskCreate): Promise<Task> => {
    const { data } = await apiClient.post(`/tasks/${taskId}/subtasks`, subtask)
    return data
  },

  updateSubtask: async (
    taskId: string,
    subtaskId: string,
    update: Partial<Task>
  ): Promise<Task> => {
    const { data } = await apiClient.patch(
      `/tasks/${taskId}/subtasks/${subtaskId}`,
      update
    )
    return data
  },

  deleteSubtask: async (taskId: string, subtaskId: string): Promise<void> => {
    await apiClient.delete(`/tasks/${taskId}/subtasks/${subtaskId}`)
  },

  getProgress: async (taskId: string): Promise<SubtaskProgress> => {
    const { data } = await apiClient.get(`/tasks/${taskId}/subtasks/progress`)
    return data
  },
}
