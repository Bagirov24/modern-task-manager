import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { offlineQueue, type OfflineMutation } from '@/lib/offlineMutationQueue'
import { taskApi } from '@/lib/api/taskApi'
import { useUIStore } from '@/store/uiStore'

/**
 * useOfflineQueue — слушает window:online и при восстановлении сети
 * воспроизводит накопленные мутации из offlineQueue.
 *
 * Монтируется один раз внутри AuthGuard (через App.tsx).
 */
export function useOfflineQueue() {
  const queryClient = useQueryClient()
  const addSnackbar = useUIStore((s) => s.addSnackbar)
  const flushingRef = useRef(false)

  const executor = async (mutation: OfflineMutation) => {
    const p = mutation.payload
    switch (mutation.type) {
      case 'task.create':
        await taskApi.create(p as any)
        break
      case 'task.update':
      case 'task.status':
        await taskApi.update(p.id as string, p as any)
        break
      case 'task.delete':
        await taskApi.delete(p.id as string)
        break
    }
  }

  const flush = async () => {
    if (flushingRef.current || offlineQueue.size() === 0) return
    flushingRef.current = true
    const count = offlineQueue.size()

    await offlineQueue.flush(
      executor,
      () => {
        queryClient.invalidateQueries({ queryKey: ['tasks'] })
        queryClient.invalidateQueries({ queryKey: ['projects'] })
      },
      (mutation, err) => {
        console.error('[offline queue] failed mutation:', mutation.type, err)
      },
    )

    flushingRef.current = false
    if (count > 0) {
      addSnackbar({
        message: `${count} оффлайн-${count === 1 ? 'действие' : 'действия'} синхронизировано`,
        type: 'success',
        duration: 4000,
      })
    }
  }

  useEffect(() => {
    // Попытаться выполнить сразу при монтировании (если уже онлайн)
    if (navigator.onLine) flush()

    window.addEventListener('online', flush)
    return () => window.removeEventListener('online', flush)
  }, [])
}
