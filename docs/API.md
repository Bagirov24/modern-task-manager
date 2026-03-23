# API Documentation

## Base URL

```
http://localhost:8000/api/v1
```

## Authentication

All protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <access_token>
```

### POST /auth/register

Register a new user.

| Field | Type | Required |
|-------|------|----------|
| email | string | Yes |
| password | string | Yes |
| full_name | string | Yes |

### POST /auth/login

Login and receive access token.

| Field | Type | Required |
|-------|------|----------|
| email | string | Yes |
| password | string | Yes |

---

## Tasks

### GET /tasks

List tasks with filtering and pagination.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| skip | int | 0 | Offset |
| limit | int | 20 | Max results |
| status | string | - | Filter by status |
| priority | string | - | Filter by priority |
| project_id | uuid | - | Filter by project |

### POST /tasks

Create a new task.

| Field | Type | Required |
|-------|------|----------|
| title | string | Yes |
| description | string | No |
| status | enum | No |
| priority | enum | No |
| due_date | datetime | No |
| project_id | uuid | No |
| assignee_id | uuid | No |

### GET /tasks/{id}

Get task by ID.

### PUT /tasks/{id}

Update task.

### DELETE /tasks/{id}

Delete task.

### GET /tasks/{id}/subtasks

List subtasks for a task.

### POST /tasks/{id}/subtasks

Create subtask.

---

## Projects

### GET /projects

List all projects for the current user.

### POST /projects

Create a new project.

| Field | Type | Required |
|-------|------|----------|
| name | string | Yes |
| description | string | No |
| color | string | No |

### GET /projects/{id}

Get project by ID.

### PUT /projects/{id}

Update project.

### DELETE /projects/{id}

Delete project.

---

## Comments

### GET /tasks/{task_id}/comments

List comments for a task.

### POST /tasks/{task_id}/comments

Add comment to task.

| Field | Type | Required |
|-------|------|----------|
| content | string | Yes |

### DELETE /comments/{id}

Delete comment.

---

## Labels

### GET /labels

List all labels.

### POST /labels

Create label.

| Field | Type | Required |
|-------|------|----------|
| name | string | Yes |
| color | string | No |

### DELETE /labels/{id}

Delete label.

---

## Notifications

### GET /notifications

List notifications for the current user.

### PUT /notifications/{id}/read

Mark notification as read.

### PUT /notifications/read-all

Mark all notifications as read.

---

## Health

### GET /health

Basic health check. Returns status and uptime.

### GET /health/db

Database connectivity check.

### GET /health/redis

Redis connectivity check.

### GET /health/ready

Readiness probe (checks all dependencies).

---

## WebSocket

### WS /ws/{token}

Real-time updates. Events:

- `task.created` — new task created
- `task.updated` — task updated
- `task.deleted` — task deleted
- `comment.created` — new comment
- `notification` — new notification

---

## Error Responses

```json
{
  "detail": "Error message"
}
```

| Code | Description |
|------|-------------|
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 422 | Validation Error |
| 500 | Internal Server Error |
