# Manager Workspace audit and delivery map

## P0 audit

| Requirement | Already implemented | Status | Decision |
|---|---|---|---|
| My Work | Focus Now, Today, next 7 days, attention and project health exist | extend | Add manager obligations and Action Inbox groups to the current Dashboard |
| Task workflow | Legacy status plus additive workflow status, blocking, next action, milestone and planning fields exist | extend | Add responsibility chain, three independent deadlines, risk, party and communication timestamps to `tasks` |
| List / Board / Calendar / Timeline | All four views exist | reuse | Extend their task metadata; do not create new views |
| Task context | Right drawer with Overview, Documents, Testing, Activity and useful links exists | extend | Add commitments, response/final deadlines and deterministic status action |
| Notifications | Async CRUD API, websocket delivery and frontend panel exist | extend | Add manager-specific event types and quiet/digest preferences later; keep one notification stream |
| Background automation | Redis, Celery worker and Celery Beat exist | extend | Add deadline/digest jobs to the existing worker in P1; do not introduce another scheduler |
| Communications / Action Inbox | Comments and notifications cannot represent source threads, direction or reply lifecycle | create | Add one `communication_items` entity and connect it to project, task and user |
| Documents | Markdown, versions, hierarchy, project/task links, permissions, attachments and object storage exist | extend | Add requirement/contract types and confidentiality; reuse the Documents API and editor |
| Requirements and knowledge | Documents cover the storage and versioning mechanics | extend | Add a filtered route/mode over Documents instead of a duplicate knowledge table |
| Useful links | Catalog, filters, favorites, Sensitive Data Guard and task links exist | reuse | Keep unchanged and surface links in task/Dashboard context |
| Search | Global project/task/document/comment/test-data/attachment/link search exists | extend | Include communications and knowledge without a second search engine |
| Status summaries | Project/task data exists, but no compact summary contract | create | Add deterministic read-only summary endpoints; AI suggestions may consume the same contract later |
| Sensitive data protection | Server-side card/token/key detection and non-reflecting validation errors exist | reuse | Apply the same guard to communications, AI inputs and integration previews |

## P1 audit

| Requirement | Already implemented | Status | Decision |
|---|---|---|---|
| Telegram | No adapter or webhook exists | create | Telegram Bot API adapter for explicitly mapped chats and selected events only |
| Email | SMTP placeholders exist; OAuth import does not | create | Provider-neutral OAuth adapter; store thread links and previews, never passwords or tokens in domain tables |
| Draft confirmation | No outbound draft workflow exists | extend | Use communication items with explicit draft/confirmed transitions; never auto-send |
| Digests | Celery Beat exists; cleanup task is incomplete | extend | Add morning/evening digest jobs to the current Celery app |
| Knowledge capture | Documents already provide versioned storage | extend | Save communication summaries as documents linked to their source item |
| Cloud AI | `AIService` exists but uses an old fixed model and has no permission-aware context builder | extend | Replace prompt-only methods with provider adapter and suggestion-only API |
| Whisper | Stub exists and is disabled | extend | Keep disabled until an approved local/cloud provider is configured |

## P2 audit

| Requirement | Already implemented | Status | Decision |
|---|---|---|---|
| AI modes | Only optional OpenAI key exists | extend | Add `off/local/cloud`; default sensitive context to local |
| Local LLM | No runtime adapter exists | create | Add an OpenAI-compatible local adapter, configurable for Ollama-compatible endpoints |
| Vector search / RAG | PostgreSQL full-text indexes exist; no vectors | extend | Keep full-text fallback, add pgvector only when local embedding provider is configured |
| Risk analytics | Dashboard has deterministic health heuristics | extend | Preserve explainable rules first; add suggestions and confidence later |
| Workflow templates | Project workflow JSON and project templates exist | extend | Extend existing configuration, not a new workflow engine |

## Compatibility and security boundaries

- Existing `status`, `due_date`, `next_action` and document URLs remain supported.
- New responsibility fields are additive; `final_due_at` falls back to `due_date` for old records.
- Integration messages enter Action Inbox before task creation.
- Outbound Telegram/email actions require an explicit confirmed draft.
- Secrets are rejected before persistence and never copied into AI prompts, logs, history or analytics.
- Access-controlled context is selected before any AI provider call.
