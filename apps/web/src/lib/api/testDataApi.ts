import api from './client'
import type { TestDataItem, TestDataSet } from '@/lib/types'

export interface TestDataSetInput {
  name: string
  category: TestDataSet['category']
  environment: TestDataSet['environment']
  sensitivity: TestDataSet['sensitivity']
  description?: string
  project_id?: string
  last_verified_at?: string
}

const reauthHeaders = (token?: string) => token ? { 'X-Reauth-Token': token } : undefined

export const testDataApi = {
  list: (params?: Record<string, string | boolean>) => api.get<{ data_sets: TestDataSet[]; total: number }>('/test-data/sets', { params }),
  get: (id: string, token?: string) => api.get<TestDataSet>(`/test-data/sets/${id}`, { headers: reauthHeaders(token) }),
  create: (data: TestDataSetInput) => api.post<TestDataSet>('/test-data/sets', data),
  update: (id: string, data: Partial<TestDataSetInput>, token?: string) => api.patch<TestDataSet>(`/test-data/sets/${id}`, data, { headers: reauthHeaders(token) }),
  addItem: (id: string, data: Omit<TestDataItem, 'id' | 'test_data_set_id' | 'metadata_json'> & { metadata_json?: Record<string, unknown> }, token?: string) => api.post<TestDataItem>(`/test-data/sets/${id}/items`, data, { headers: reauthHeaders(token) }),
  reauthenticate: (password: string) => api.post<{ reauth_token: string; expires_in: number }>('/test-data/reauth', { password }),
}
