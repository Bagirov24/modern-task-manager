import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getSocket, disconnectSocket } from '@/lib/socket/socketClient'
import { useAuthStore } from '@/lib/store/authStore'
import { useSnackbar } from 'notistack'

export function useRealtimeSync() {
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const token = useAuthStore((s) => s.token)
  const [connected, setConnected] = useState(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    if (!token) return

    const socket = getSocket()

    socket.on('connect', () => {
      if (mountedRef.current) setConnected(true)
    })

    socket.on('disconnect', () => {
      if (mountedRef.current) setConnected(false)
    })

    // Task events
    socket.on('task_created', (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] })
      enqueueSnackbar(`Задача создана: ${data.title || 'Новая задача'}`, { variant: 'info', autoHideDuration: 3000 })
    })

    socket.on('task_updated', (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] })
      if (data.id) {
        queryClient.invalidateQueries({ queryKey: ['task', data.id] })
      }
    })

    socket.on('task_deleted', (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] })
      enqueueSnackbar('Задача удалена', { variant: 'warning', autoHideDuration: 2000 })
    })

    // Project events
    socket.on('project_created', () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] })
    })

    socket.on('project_updated', () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] })
    })

    socket.on('project_deleted', () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] })
    })

    // Notification events
    socket.on('notification', (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] })
      if (data.title) {
        enqueueSnackbar(data.title, { variant: 'info', autoHideDuration: 4000 })
      }
    })

    // Online users
    socket.on('user_online', (data: any) => {
      enqueueSnackbar('Пользователь онлайн', { variant: 'default', autoHideDuration: 2000 })
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
      socket.off('user_online')
      disconnectSocket()
    }
  }, [token, queryClient, enqueueSnackbar])

  return { connected }
}

export function useSocketEmit() {
  const token = useAuthStore((s) => s.token)

  const emit = (event: string, data: any) => {
    if (!token) return
    const socket = getSocket()
    if (socket.connected) {
      socket.emit(event, data)
    }
  }

  return { emit }
}
