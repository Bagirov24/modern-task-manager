export interface Task {
  id: string
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'done' | 'archived'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date?: string
  completed_at?: string
  project_id?: string
  assignee_id?: string
  parent_id?: string
  created_at: string
  updated_at: string
  labels?: Label[]
}

export interface Project {
  id: string
  name: string
  description?: string
  color: string
  icon?: string
  is_archived: boolean
  owner_id: string
  created_at: string
  task_count: number
}

export interface Label {
  id: string
  name: string
  color: string
}

export interface User {
  id: string
  email: string
  username: string
  full_name?: string
  avatar_url?: string

  export interface Notification {
  id: string
  type: 'task_assigned' | 'task_updated' | 'comment_added' | 'project_invited' | 'mention'
  title: string
  message: string
  is_read: boolean
  task_id?: string
  project_id?: string
  sender_id?: string
  created_at: string
}

export interface Comment {
  id: string
  content: string
  task_id: string
  author_id: string
  author?: User
  created_at: string
  updated_at: string
}
}
