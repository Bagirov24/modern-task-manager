import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { offlineQueue, type OfflineMutation } from '@/lib/offlineMutationQueue'
import { taskApi } from '@/lib/api/taskApi'
import type { TaskCreate, TaskUpdate } from '@/lib/types'
import { useUIStore } from '@/store/uiStore'

/**
 * useOfflineQueue — слушает window:online и при восстановлении сети
 * воспроизводит накопленные мутации из offlineQueue.
 *
 * Security:
 *  - Payload деструктурируется явно; as-any не используется.
 *  - id проверяется как строка перед передачей в API.
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
      case 'task.create': {
        // Убираем служебные поля, оставляем только поля TaskCreate
        const { id: _id, type: _type, enqueuedAt: _eq, retries: _r, ...rest } = p as Record<string, unknown>
        if (typeof rest.title !== 'string' || !rest.title.trim()) {
          throw new Error('[offline queue] task.create: missing or invalid title')
        }
        await taskApi.create(rest as unknown as TaskCreate)
        break
      }
      case 'task.update':
      case 'task.status': {
        const id = typeof p.id === 'string' && p.id ? p.id : null
        if (!id) throw new Error(`[offline queue] task.update: missing or invalid id`)
        const { id: _id, ...rest } = p
        await taskApi.update(id, rest as TaskUpdate)
        break
      }
      case 'task.delete': {
        const id = typeof p.id === 'string' && p.id ? p.id : null
        if (!id) throw new Error(`[offline queue] task.delete: missing or invalid id`)
        await taskApi.delete(id)
        break
      }
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
    if (navigator.onLine) flush()
    window.addEventListener('online', flush)
    return () => window.removeEventListener('online', flush)
  }, [])
}
