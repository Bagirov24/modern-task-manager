import { useEffect } from 'react'
import { getSocket } from '@/lib/socket/socketClient'
import { useTaskStore } from '@/lib/store/taskStore'

export function useSocket() {
  const updateTask = useTaskStore((s) => s.updateTask)

  useEffect(() => {
    const socket = getSocket()

    socket.on('task_updated', (data: any) => {
      updateTask(data.id, data)
    })

    return () => {
      socket.off('task_updated')
    }
  }, [updateTask])
}
