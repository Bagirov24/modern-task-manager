import api from './client'
import type { SearchResult } from '@/lib/types'

export const searchApi = {
  search: (query: string) => api.get<{ results: SearchResult[]; total: number }>('/search/', { params: { q: query } }),
}
