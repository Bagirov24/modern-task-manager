export interface Task {
  id: string
  title: string
  description: string
  status: 'todo' | 'in_progress' | 'done' | 'archived'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date?: string
  completed_at?: string
  project_id: string
  assignee_id?: string
  parent_id?: string
  created_at: string
  updated_at: string
  labels: string[]
  order: number
}

export interface Project {
  id: string
  name: string
  description: string
  color: string
  icon: string
  is_favorite: boolean
  is_archived?: boolean
  owner_id?: string
  task_count: number
  completed_count: number
  created_at: string
  updated_at: string
}

export interface Label {
  id: string
  name: string
  color: string
}

export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  message: string
  is_read: boolean
  created_at: string
}

export interface Subtask {
  id: string
  title: string
  completed: boolean
  task_id: string
}

export interface Comment {
  id: string
  text: string
  user_id: string
  task_id: string
  created_at: string
}
