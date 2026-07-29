import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getSocket, disconnectSocket } from '@/lib/socket/socketClient'
import { useAuthStore } from '@/lib/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { useTaskStore } from '@/store/taskStore'
import type { Task } from '@/lib/types'

/**
 * useRealtimeSync — подключает WebSocket и реагирует на серверные события.
 * - task_created / task_updated / task_deleted  →  invalidates ['tasks'] + обновляет Zustand store
 * - project_* events                            →  invalidates ['projects']
 * - notification                                →  показывает snackbar + invalidates ['notifications']
 * - connect / disconnect                        →  отображает статус в UI
 */
export function useRealtimeSync() {
  const queryClient = useQueryClient()
  const token = useAuthStore((s) => s.token)
  const addSnackbar = useUIStore((s) => s.addSnackbar)
  const { addTask, updateTask: updateTaskInStore, removeTask } = useTaskStore()
  const [connected, setConnected] = useState(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    if (!token) return

    const socket = getSocket()

    const set = (val: boolean) => { if (mountedRef.current) setConnected(val) }

    socket.on('connect', () => {
      set(true)
      addSnackbar({ message: 'Соединение установлено', type: 'success', duration: 2500 })
    })

    socket.on('disconnect', () => {
      set(false)
      addSnackbar({ message: 'Соединение потеряно — данные могут быть устаревшими', type: 'warning', duration: 4000 })
    })

    // ─── Task events ────────────────────────────────────────────────
    socket.on('task_created', (data: Task) => {
      addTask(data)
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      addSnackbar({ message: `Новая задача: «${data.title}»`, type: 'info', duration: 3000 })
    })

    socket.on('task_updated', (data: Task) => {
      updateTaskInStore(data)
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      if (data.id) queryClient.invalidateQueries({ queryKey: ['task', data.id] })
    })

    socket.on('task_deleted', (data: { id: string; title?: string }) => {
      removeTask(data.id)
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      if (data.title) addSnackbar({ message: `Задача «${data.title}» удалена`, type: 'warning', duration: 3000 })
    })

    // ─── Project events ─────────────────────────────────────────────
    socket.on('project_created', () => queryClient.invalidateQueries({ queryKey: ['projects'] }))
    socket.on('project_updated', () => queryClient.invalidateQueries({ queryKey: ['projects'] }))
    socket.on('project_deleted', () => queryClient.invalidateQueries({ queryKey: ['projects'] }))

    // ─── Notification event ─────────────────────────────────────────
    socket.on('notification', (data: { title?: string; message?: string; type?: 'info' | 'success' | 'warning' | 'error' }) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] })
      const text = data.title || data.message
      if (text) addSnackbar({ message: text, type: data.type ?? 'info', duration: 4500 })
    })

    return () => {
      mountedRef.current = false
      socket.off('connect')
      socket.off('disconnect')
      socket.off('task_created')
      socket.off('task_updated')
      socket.off('task_deleted')
      socket.off('project_created')
      socket.off('project_updated')
      socket.off('project_deleted')
      socket.off('notification')
      disconnectSocket()
    }
  }, [token, queryClient, addSnackbar, addTask, updateTaskInStore, removeTask])

  return { connected }
}

export function useSocketEmit() {
  const token = useAuthStore((s) => s.token)
  const emit = (event: string, data: unknown) => {
    if (!token) return
    const socket = getSocket()
    if (socket.connected) socket.emit(event, data)
  }
  return { emit }
}
