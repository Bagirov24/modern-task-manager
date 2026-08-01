// в”Ђв”Ђв”Ђ Task в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'archived'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type WorkflowStatus = 'inbox' | 'backlog' | 'clarification_needed' | 'planned' | 'ready' | 'in_progress' | 'waiting_for_internal' | 'waiting_for_client' | 'review' | 'ready_to_send' | 'done' | 'cancelled' | 'blocked'

export interface UserSummary {
  id: string
  username: string
  full_name?: string | null
  avatar_url?: string | null
}

export interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  due_date?: string       // ISO 8601
  start_date?: string     // ISO 8601 вЂ” used for Timeline / Gantt view
  completed_at?: string
  project_id?: string
  assignee_id?: string
  parent_id?: string
  position: number
  created_at?: string
  updated_at?: string
  labels?: Label[]
  assignee?: UserSummary | null
  workflow_status: WorkflowStatus
  is_blocked: boolean
  blocked_reason?: string | null
  blocked_by_task_id?: string | null
  context?: string | null
  expected_result?: string | null
  acceptance_criteria?: string | null
  next_action?: string | null
  estimate_minutes?: number | null
  milestone?: string | null
  sprint?: string
  is_planning_complete?: boolean
  documentation_count?: number
  comment_count?: number
  task_type?: 'task' | 'bug' | 'request' | 'approval' | 'contract_approval' | 'incident' | 'release' | 'meeting' | 'follow_up' | 'requirement_clarification'
  manager_id?: string | null
  manager?: UserSummary | null
  final_due_at?: string | null
  response_due_at?: string | null
  next_action_owner_id?: string | null
  next_action_owner?: UserSummary | null
  next_action_description?: string | null
  next_action_due_at?: string | null
  waiting_for_user_id?: string | null
  waiting_for_user?: UserSummary | null
  waiting_for_party?: 'internal' | 'client' | 'insurer' | 'vendor' | 'none'
  follow_up_action_description?: string | null
  risk_level?: 'low' | 'medium' | 'high' | 'critical'
  last_activity_at?: string | null
  last_external_communication_at?: string | null
  communication_channel?: string | null
}

// в”Ђв”Ђв”Ђ Strict API DTOs (replaces Record<string, any>) в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
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
  assignee_id?: string
  workflow_status?: WorkflowStatus
  is_blocked?: boolean
  blocked_reason?: string
  context?: string
  expected_result?: string
  acceptance_criteria?: string
  next_action?: string
  estimate_minutes?: number
  milestone?: string
  sprint?: string
  task_type?: Task['task_type']
  manager_id?: string
  final_due_at?: string
  response_due_at?: string
  next_action_owner_id?: string
  next_action_description?: string
  next_action_due_at?: string
  waiting_for_user_id?: string
  waiting_for_party?: Task['waiting_for_party']
  follow_up_action_description?: string
  risk_level?: Task['risk_level']
  last_external_communication_at?: string
  communication_channel?: string
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
  workflow_status?: WorkflowStatus
  is_blocked?: boolean
  blocked_reason?: string | null
  blocked_by_task_id?: string | null
  context?: string | null
  expected_result?: string | null
  acceptance_criteria?: string | null
  next_action?: string | null
  estimate_minutes?: number | null
  milestone?: string | null
  sprint?: string | null
  task_type?: Task['task_type']
  manager_id?: string | null
  final_due_at?: string | null
  response_due_at?: string | null
  next_action_owner_id?: string | null
  next_action_description?: string | null
  next_action_due_at?: string | null
  waiting_for_user_id?: string | null
  waiting_for_party?: Task['waiting_for_party']
  follow_up_action_description?: string | null
  risk_level?: Task['risk_level']
  last_external_communication_at?: string | null
  communication_channel?: string | null
}

export interface TaskListResponse {
  tasks: Task[]
  total: number
  page: number
  per_page: number
}

// в”Ђв”Ђв”Ђ Project в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
export interface Project {
  id: string
  name: string
  description?: string
  color?: string
  icon?: string
  is_favorite?: boolean
  is_archived?: boolean
  is_pinned?: boolean
  status?: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'
  start_date?: string
  due_date?: string
  is_overdue?: boolean
  owner_id?: string
  task_count?: number
  completed_count?: number
  created_at?: string
  updated_at?: string
}

// в”Ђв”Ђв”Ђ Label в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
export interface Label {
  id: string
  name: string
  color: string
}

// в”Ђв”Ђв”Ђ Notification в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
export interface AppNotification {
  id: string
  type:
    | 'task_assigned'
    | 'task_completed'
    | 'task_updated'
    | 'task_comment'
    | 'project_invite'
    | 'mention'
    | 'deadline'
    | 'system'
  title?: string
  message: string | null
  is_read: boolean
  user_id?: string
  task_id?: string | null
  project_id?: string | null
  created_at: string
}

// в”Ђв”Ђв”Ђ Subtask в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
export interface Subtask {
  id: string
  title: string
  completed: boolean
  task_id: string
}

// в”Ђв”Ђв”Ђ Comment в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
export interface Comment {
  id: string
  text: string
  user_id: string
  task_id: string
  created_at: string
}

// в”Ђв”Ђв”Ђ API generic wrapper в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
export interface ApiResponse<T> {
  data: T
  message?: string
}
export type DocumentType = 'brief' | 'product-requirements' | 'technical-specification' | 'architecture' | 'api-documentation' | 'decision-record' | 'test-plan' | 'runbook' | 'release-note' | 'retrospective' | 'meeting-notes' | 'contract' | 'integration-guide'

export interface DocumentLink {
  id: string
  document_id: string
  link_type: string
  title: string
  url: string
  metadata_json: Record<string, unknown>
}

export interface WorkspaceDocument {
  id: string
  project_id?: string | null
  task_id?: string | null
  parent_document_id?: string | null
  title: string
  slug: string
  content_markdown: string
  document_type: DocumentType
  status: 'draft' | 'published' | 'archived'
  owner_id: string
  version: number
  is_template: boolean
  confidentiality_level: 'public' | 'internal' | 'confidential' | 'restricted'
  source_communication_id?: string | null
  links: DocumentLink[]
  attachments: Array<{ id: string; original_name: string; mime_type: string; size_bytes: number }>
  created_at: string
  updated_at: string
}

export interface TestDataItem {
  id: string
  test_data_set_id: string
  label: string
  item_type: 'instruction' | 'vault_reference' | 'external_link' | 'fixture'
  display_value?: string | null
  vault_provider?: string | null
  vault_reference?: string | null
  metadata_json: Record<string, unknown>
  watermark?: string | null
}

export interface TestDataSet {
  id: string
  project_id?: string | null
  name: string
  category: 'payment' | 'api' | 'user' | 'webhook' | 'fixture' | 'integration'
  environment: 'local' | 'dev' | 'staging' | 'sandbox' | 'production'
  sensitivity: 'internal' | 'confidential' | 'restricted'
  description?: string | null
  owner_id: string
  expires_at?: string | null
  last_verified_at?: string | null
  items: TestDataItem[]
  created_at: string
  updated_at: string
}

export interface SearchResult {
  type: 'task' | 'project' | 'document' | 'comment' | 'test_data' | 'attachment' | 'link'
  id: string
  title: string
  path: string
  context: string
  status?: string | null
  updated_at?: string | null
  url: string
}
export type WorkspaceLinkCategory = 'development' | 'logs' | 'monitoring' | 'communication' | 'documentation' | 'testing' | 'design' | 'infrastructure' | 'analytics' | 'other'
export type WorkspaceLinkAccessStatus = 'has_access' | 'request_access' | 'no_access'

export interface WorkspaceLink {
  id: string
  workspace_id?: string | null
  project_id?: string | null
  project_name?: string | null
  title: string
  description: string
  url: string
  category: WorkspaceLinkCategory
  environment?: string | null
  login?: string | null
  access_status: WorkspaceLinkAccessStatus
  access_hint?: string | null
  notes?: string | null
  tags: string[]
  is_favorite: boolean
  sort_order: number
  created_by: string
  created_at: string
  updated_at: string
}

export type WorkspaceLinkInput = Omit<WorkspaceLink, 'id' | 'project_name' | 'created_by' | 'created_at' | 'updated_at'>
export type CommunicationActionStatus = 'new' | 'needs_my_reply' | 'need_customer_input' | 'need_internal_input' | 'waiting_for_reply' | 'ready_to_respond' | 'fyi' | 'done' | 'archived'
export interface CommunicationItem {
  id: string
  workspace_id?: string | null
  project_id?: string | null
  task_id?: string | null
  parent_communication_id?: string | null
  source_type: 'telegram' | 'email' | 'manual'
  source_message_id?: string | null
  source_thread_id?: string | null
  sender_name: string
  sender_role: 'developer' | 'designer' | 'manager' | 'lawyer' | 'client' | 'insurer' | 'other'
  direction: 'incoming' | 'outgoing'
  subject?: string | null
  body_preview: string
  source_url?: string | null
  received_at: string
  action_status: CommunicationActionStatus
  action_owner_id?: string | null
  response_due_at?: string | null
  waiting_for_user_id?: string | null
  waiting_for_party: 'internal' | 'client' | 'insurer' | 'vendor' | 'none'
  next_action?: string | null
  needs_reply: boolean
  importance: 'low' | 'normal' | 'high' | 'critical'
  ai_summary?: string | null
  created_by: string
  created_at: string
  updated_at: string
  closed_at?: string | null
}
export type CommunicationItemInput = Omit<CommunicationItem, 'id' | 'created_by' | 'created_at' | 'updated_at' | 'closed_at' | 'ai_summary' | 'received_at'> & { received_at?: string }
