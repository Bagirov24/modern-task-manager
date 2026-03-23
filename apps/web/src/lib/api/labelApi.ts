import api from './client'

export interface Label {
  id: string
  name: string
  color: string
  created_at: string
}

export interface LabelCreate {
  name: string
  color?: string
}

export const labelApi = {
  getAll: () =>
    api.get<Label[]>('/labels/').then((r) => r.data),

  create: (data: LabelCreate) =>
    api.post<Label>('/labels/', data).then((r) => r.data),

  delete: (labelId: string) =>
    api.delete(`/labels/${labelId}`),
}
