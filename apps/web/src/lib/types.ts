// ─── Task ────────────────────────────────────────────────────────────────────
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'archived'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  due_date?: string       // ISO 8601
  start_date?: string     // ISO 8601 — used for Timeline / Gantt view
  completed_at?: string
  project_id?: string
  assignee_id?: string
  parent_id?: string
  position: number
  created_at?: string
  updated_at?: string
  labels?: Label[]
}

// ─── Strict API DTOs (replaces Record<string, any>) ──────────────────────────
export interface TaskCreate {
  title: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  due_date?: string       // ISO 8601
  start_date?: string     // ISO 8601
  project_id?: string
  parent_id?: string
  label_ids?: string[]
}

export interface TaskUpdate {
  title?: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  due_date?: string
  start_date?: string
  project_id?: string
  assignee_id?: string
  position?: number
}

export interface TaskListResponse {
  tasks: Task[]
  total: number
  page: number
  per_page: number
}

// ─── Project ─────────────────────────────────────────────────────────────────
export interface Project {
  id: string
  name: string
  description?: string
  color?: string
  icon?: string
  is_favorite?: boolean
  is_archived?: boolean
  owner_id?: string
  task_count?: number
  completed_count?: number
  created_at?: string
  updated_at?: string
}

// ─── Label ───────────────────────────────────────────────────────────────────
export interface Label {
  id: string
  name: string
  color: string
}

// ─── Notification ────────────────────────────────────────────────────────────
export interface AppNotification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  message: string
  is_read: boolean
  created_at: string
}

// ─── Subtask ─────────────────────────────────────────────────────────────────
export interface Subtask {
  id: string
  title: string
  completed: boolean
  task_id: string
}

// ─── Comment ─────────────────────────────────────────────────────────────────
export interface Comment {
  id: string
  text: string
  user_id: string
  task_id: string
  created_at: string
}

// ─── API generic wrapper ─────────────────────────────────────────────────────
export interface ApiResponse<T> {
  data: T
  message?: string
}
