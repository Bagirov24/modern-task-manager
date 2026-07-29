/**
 * Offline Mutation Queue
 *
 * Хранит незавершённые мутации в localStorage и воспроизводит их
 * при восстановлении соединения.
 *
 * Security:
 *  - После JSON.parse выполняется строгая валидация каждой записи.
 *  - Разрешённые типы жёстко ограничены ALLOWED_TYPES (allowlist).
 *  - __proto__ / constructor ключи в payload отклоняются (prototype pollution).
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

/** Allowlist допустимых типов мутаций */
const ALLOWED_TYPES = new Set<string>([
  'task.create',
  'task.update',
  'task.delete',
  'task.status',
])

/** Опасные ключи, которые могут вызвать prototype pollution */
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

/**
 * Проверяет, что запись из localStorage соответствует OfflineMutation.
 * Отклоняет null, массивы, неизвестные типы и опасные ключи в payload.
 */
function isValidMutation(m: unknown): m is OfflineMutation {
  if (m === null || typeof m !== 'object' || Array.isArray(m)) return false
  const rec = m as Record<string, unknown>

  if (typeof rec.id !== 'string' || !rec.id) return false
  if (typeof rec.type !== 'string' || !ALLOWED_TYPES.has(rec.type)) return false
  if (typeof rec.retries !== 'number') return false
  if (typeof rec.enqueuedAt !== 'string') return false

  const payload = rec.payload
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) return false

  // Отклоняем prototype-pollution ключи
  for (const key of Object.keys(payload as object)) {
    if (DANGEROUS_KEYS.has(key)) return false
  }

  return true
}

function load(): OfflineMutation[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    if (!Array.isArray(raw)) return []
    return raw.filter(isValidMutation)
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
        save(updated.filter((m) => m.retries < MAX_RETRIES))
        onError?.(mutation, err)
      }
    }
  },
}
