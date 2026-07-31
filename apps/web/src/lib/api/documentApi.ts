import api from './client'
import type { DocumentType, WorkspaceDocument } from '@/lib/types'

export interface DocumentInput {
  title: string
  content_markdown?: string
  document_type?: DocumentType
  status?: 'draft' | 'published' | 'archived'
  project_id?: string
  task_id?: string
  parent_document_id?: string
  confidentiality_level?: 'public' | 'internal' | 'confidential' | 'restricted'
  source_communication_id?: string
}

export const documentApi = {
  list: (params?: Record<string, string>) => api.get<{ documents: WorkspaceDocument[]; total: number }>('/documents/', { params }),
  get: (id: string) => api.get<WorkspaceDocument>(`/documents/${id}`),
  create: (data: DocumentInput) => api.post<WorkspaceDocument>('/documents/', data),
  update: (id: string, data: Partial<DocumentInput> & { change_summary?: string; expected_version?: number }) => api.patch<WorkspaceDocument>(`/documents/${id}`, data),
  archive: (id: string) => api.delete(`/documents/${id}`),
  versions: (id: string) => api.get<Array<{ id: string; version: number; change_summary?: string; created_at: string }>>(`/documents/${id}/versions`),
  restore: (id: string, version: number) => api.post<WorkspaceDocument>(`/documents/${id}/versions/${version}/restore`, {}),
  addLink: (id: string, data: { title: string; url: string; link_type?: string }) => api.post(`/documents/${id}/links`, data),
  upload: (id: string, file: File) => {
    const body = new FormData()
    body.append('file', file)
    return api.post(`/documents/${id}/attachments`, body, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
}
