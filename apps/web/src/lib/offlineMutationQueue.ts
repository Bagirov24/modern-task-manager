/**
 * Offline Mutation Queue
 *
 * Хранит незавершённые мутации в localStorage и воспроизводит их
 * при восстановлении соединения.
 *
 * Использование:
 *   offlineQueue.enqueue({ type: 'task.update', payload: { id, ...updates } })
 *   offlineQueue.flush(executor) — вызывается при window:online или reconnect
 */

export type OfflineMutationType =
  | 'task.create'
  | 'task.update'
  | 'task.delete'
  | 'task.status'

export interface OfflineMutation {
  id: string
  type: OfflineMutationType
  payload: Record<string, unknown>
  enqueuedAt: string
  retries: number
}

const STORAGE_KEY = 'offline_mutation_queue'
const MAX_RETRIES = 3

function load(): OfflineMutation[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function save(queue: OfflineMutation[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
}

export const offlineQueue = {
  /** Добавить мутацию в очередь */
  enqueue(item: Omit<OfflineMutation, 'id' | 'enqueuedAt' | 'retries'>) {
    const queue = load()
    queue.push({ ...item, id: crypto.randomUUID(), enqueuedAt: new Date().toISOString(), retries: 0 })
    save(queue)
  },

  /** Получить текущую очередь */
  get(): OfflineMutation[] {
    return load()
  },

  /** Удалить успешно завершённую мутацию */
  remove(id: string) {
    save(load().filter((m) => m.id !== id))
  },

  /** Сколько мутаций в очереди */
  size(): number {
    return load().length
  },

  /** Очистить всю очередь */
  clear() {
    save([])
  },

  /**
   * Воспроизвести всю очередь.
   * executor получает мутацию и должен вернуть Promise<void>.
   * При ошибке — инкрементирует retries. Если retries >= MAX_RETRIES — удаляет.
   */
  async flush(
    executor: (mutation: OfflineMutation) => Promise<void>,
    onSuccess?: (mutation: OfflineMutation) => void,
    onError?: (mutation: OfflineMutation, error: unknown) => void,
  ) {
    const queue = load()
    if (!queue.length) return

    for (const mutation of queue) {
      try {
        await executor(mutation)
        this.remove(mutation.id)
        onSuccess?.(mutation)
      } catch (err) {
        const updated = load().map((m) =>
          m.id === mutation.id ? { ...m, retries: m.retries + 1 } : m
        )
        // Отбрасываем «мёртвые» мутации
        save(updated.filter((m) => m.retries < MAX_RETRIES))
        onError?.(mutation, err)
      }
    }
  },
}
