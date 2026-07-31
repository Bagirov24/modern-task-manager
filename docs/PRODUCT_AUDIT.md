# Modern Task Manager: product and architecture audit

## Current state

| Current state | Problem | Proposed improvement | Affected files |
|---|---|---|---|
| React 18, MUI 5, TanStack Query, Zustand and Vite are already established | UI logic is split between duplicate `hooks`, `stores` and `lib/*` folders | Keep the existing stack, consolidate new work in `src/lib`, and migrate duplicate entry points incrementally | `apps/web/src/lib/**`, `apps/web/src/hooks/**`, `apps/web/src/store/**` |
| FastAPI, async SQLAlchemy, Alembic, PostgreSQL and Redis are established | New modules must use the same ownership, pagination and validation patterns | Add additive models, schemas and routers; preserve current response fields and URLs | `apps/api/app/**`, `apps/api/alembic/versions/**` |
| Tasks support title, rich description, priority, dates, project, labels, comments and subtasks | Workflow is limited to `todo`, `in_progress`, `done`, `archived`; no blocked state, planning quality, estimate, milestone or next action | Keep legacy `status` for compatibility and add an independent workflow status plus planning and blocking metadata | `models/task.py`, `schemas/task.py`, `api/v1/tasks.py`, migration |
| Project README, members, tags, templates, activity and project detail already exist | README is useful but cannot provide structured document ownership, hierarchy, versions, links, permissions or attachments | Retain README and introduce Documents as the structured module; allow gradual conversion | `models/document.py`, `schemas/document.py`, `api/v1/documents.py`, web Documents UI |
| Project roles are `viewer`, `editor`, `admin` | No workspace role model or security-specific role exists | Map existing roles to minimum Vault capabilities now and keep policy checks centralized for future workspace roles | `api/v1/test_data.py`, `services/access_policy.py` |
| Task API currently scopes rows to the signed-in assignee | Project assignees and shared work are not fully represented | Preserve personal scope by default; add explicit project/member-aware queries only where required | `api/v1/tasks.py`, `services/task_service.py` |
| Dashboard shows summary data | It does not answer focus, today, next week, attention and project-risk questions in one scan | Rebuild Dashboard as My Work with Focus Now, Today, next 7 days, attention and project health | `pages/DashboardPage.tsx`, task/project hooks |
| Tasks have list, Kanban and timeline views | Calendar is separate, the last view is not consistently persisted, and filters are shallow | Add Calendar entry, saved presets, persistent last view and denser task metadata | `pages/TasksPage.tsx`, `store/taskStore.ts`, task components |
| Task details open in a dialog | The dialog removes list context and has no Docs, Testing or Activity tabs | Use a right drawer on desktop and a full-screen view on mobile | `components/tasks/TaskDetailDialog.tsx` |
| Header command palette searches tasks and projects | No global entity search or structured quick task input | Add unified search and a correctable parser for project, priority, assignee, date and labels | `api/v1/search.py`, `CommandPalette.tsx`, quick task components |
| There is no Test Data Vault | Test instructions and access references have no safe, auditable home | Add sets, safe items, environment separation, restricted re-authentication and audit logs | new Vault models, API, migration and web page |
| Existing text fields only enforce length and shape | Cards, tokens, private keys and credentials can be persisted and later logged or exported | Add a server-side Sensitive Data Guard before every text write and reuse it before export | `core/sensitive_data.py`, schemas/routes, tests |
| Theme and layout are responsive but use decorative gradients and oversized cards in operational screens | Density, hierarchy, focus visibility and status semantics are inconsistent | Apply the B2B palette, 8-12 px radii, explicit status labels/icons, AA contrast and 44 px mobile targets | `lib/theme.ts`, layout and page components |
| Backend API tests and frontend unit tests exist | Critical Docs, Vault, guard, quick input and side-panel flows are uncovered | Add API integration tests, parser unit tests and browser smoke coverage where the local runtime permits | `apps/api/tests/**`, `apps/web/src/**/*.test.ts(x)` |

## Delivery order

1. **P0 - data safety:** Sensitive Data Guard, non-leaking errors, coverage, and integration into every current text write.
2. **P1 - shared context:** additive task workflow fields, Documents with versions/links/attachments, Test Data Vault with access policy and audit.
3. **P2 - daily workflow:** My Work, complete navigation, saved views, quick task input, global search, task drawer, design-system and accessibility pass.

## Compatibility decisions

- The existing task `status` enum remains in place. `workflow_status` is additive and mapped to legacy status where appropriate.
- Project README remains supported and can be linked or migrated to a document later.
- The current installation is single-workspace. New `workspace_id` columns are nullable and indexed so a workspace entity can be introduced without rewriting records.
- Binary attachments are never stored in PostgreSQL. Development uses a storage adapter; production can replace it with an S3-compatible implementation without changing document records.
- Secret matches are represented only by detector categories. The matched value is never included in errors, application logs, analytics or history.
