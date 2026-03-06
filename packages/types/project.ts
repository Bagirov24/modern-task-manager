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

export interface Section {
  id: string
  name: string
  position: number
  project_id: string
}
