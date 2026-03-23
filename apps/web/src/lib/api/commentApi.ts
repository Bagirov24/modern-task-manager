import api from './client'

export interface Comment {
  id: string
  content: string
  task_id: string
  author_id: string
  created_at: string
}

export interface CommentCreate {
  content: string
  task_id: string
}

export const commentApi = {
  getByTask: (taskId: string) =>
    api.get<Comment[]>(`/comments/task/${taskId}`).then((r) => r.data),

  create: (data: CommentCreate) =>
    api.post<Comment>('/comments/', data).then((r) => r.data),

  delete: (commentId: string) =>
    api.delete(`/comments/${commentId}`),
}
