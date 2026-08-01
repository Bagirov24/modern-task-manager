# Workflow-first UX P1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the P0 work surface with explainable project health, a fast Action Inbox, a distinct Knowledge Hub, and consistent metadata across Board, Calendar, and Timeline.

**Architecture:** Build feature-level read models over existing project, task, communication, document, search, and workspace-link APIs. Keep authoring in Documents and discovery in Knowledge. Reuse the P0 workflow primitives instead of adding page-specific status components.

**Tech Stack:** React 18, TypeScript, Material UI 5, React Query 5, React Router, Vitest, Testing Library, Playwright; existing FastAPI endpoints remain unchanged unless a missing aggregate is proven by tests.

## Global Constraints

- UX-P0 must be complete and passing before starting this plan.
- Do not add a second project, communication, document, or search API.
- Project health always returns a value, textual reasons, affected entity ids, and a recommended action.
- Action Inbox stores preview and source URL, not a complete mail or chat client.
- AI drafts are read-only suggestions until explicit confirmation.
- Knowledge search respects existing permissions before returning snippets.
- Board, Calendar, and Timeline render the same status, deadline, block, documentation, and assignee semantics.

## File Map

| File | Responsibility |
|---|---|
| `apps/web/src/features/projects/health.ts` | Explainable project health selector |
| `apps/web/src/features/projects/ProjectTable.tsx` | Scannable project comparison |
| `apps/web/src/features/projects/ProjectOverview.tsx` | Reasons, milestones, team, and action |
| `apps/web/src/features/inbox/*.tsx` | Inbox groups, queue, detail panel, and actions |
| `apps/web/src/features/knowledge/*.tsx` | Search filters, result list, and context preview |
| `apps/web/src/features/tasks/taskPresentation.ts` | Shared card/calendar/timeline presentation model |

---

### Task 1: Explainable Project Health Read Model

**Files:**
- Create: `apps/web/src/features/projects/health.ts`
- Test: `apps/web/src/features/projects/health.test.ts`

**Interfaces:**
- Consumes: `Project`, related `Task[]`, and current time.
- Produces: `calculateProjectHealth(project, tasks, now): ProjectHealthSummary`.

- [ ] **Step 1: Write failing health tests**

```ts
it('returns reasons and action for an at-risk project', () => {
  const result = calculateProjectHealth(project, [overdueTask, blockedTask], NOW)
  expect(result.level).toBe('at_risk')
  expect(result.reasons).toEqual(expect.arrayContaining([
    expect.objectContaining({ code: 'overdue_tasks', count: 1 }),
    expect.objectContaining({ code: 'blocked_tasks', count: 1 }),
  ]))
  expect(result.recommendedAction).toMatch(/разблокировать|уточнить/i)
})

it('never returns a color without a text label', () => {
  expect(calculateProjectHealth(project, [], NOW).label).toBe('On track')
})
```

- [ ] **Step 2: Verify RED**

Run: `cd apps/web && npm test -- src/features/projects/health.test.ts`  
Expected: FAIL because `health.ts` does not exist.

- [ ] **Step 3: Implement deterministic health**

```ts
export interface ProjectHealthSummary {
  level: 'on_track' | 'needs_attention' | 'at_risk' | 'off_track'
  label: 'On track' | 'Needs attention' | 'At risk' | 'Off track'
  reasons: Array<{ code: string; label: string; count: number; entityIds: string[] }>
  nearestMilestone: string | null
  recommendedAction: string
}
```

Rules: `off_track` for overdue milestone or 3+ critical blockers; `at_risk` for any critical blocker, 3+ overdue tasks, or milestone due within 3 days with less than 70% completion; `needs_attention` for missing owner/next action; otherwise `on_track`.

- [ ] **Step 4: Run tests**

Run: `cd apps/web && npm test -- src/features/projects/health.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/projects
git commit -m "feat(web): add explainable project health"
```

---

### Task 2: Project Catalog and Project Overview

**Files:**
- Create: `apps/web/src/features/projects/ProjectTable.tsx`
- Create: `apps/web/src/features/projects/ProjectOverview.tsx`
- Create: `apps/web/src/features/projects/ProjectsExperience.test.tsx`
- Modify: `apps/web/src/pages/ProjectsPage.tsx`
- Modify: `apps/web/src/pages/ProjectDetailPage.tsx`

**Interfaces:**
- Consumes: `ProjectHealthSummary` from Task 1 and existing project/task hooks.
- Produces: sortable catalog and tabbed project detail.

- [ ] **Step 1: Write failing experience tests**

```tsx
it('compares health, milestone, signals, reason, and next action in rows', async () => {
  renderProjects()
  expect(await screen.findByRole('columnheader', { name: 'Health' })).toBeVisible()
  expect(screen.getByRole('columnheader', { name: 'Причина / Next action' })).toBeVisible()
  expect(screen.getByText('At risk')).toBeVisible()
})

it('explains risk on project overview', () => {
  renderProjectDetail('crm')
  expect(screen.getByRole('heading', { name: 'Почему проект под риском' })).toBeVisible()
  expect(screen.getByText(/Рекомендуемое действие/)).toBeVisible()
})
```

- [ ] **Step 2: Verify RED**

Run: `cd apps/web && npm test -- src/features/projects/ProjectsExperience.test.tsx`  
Expected: FAIL because the table and overview do not exist.

- [ ] **Step 3: Implement catalog and detail tabs**

Use a MUI `Table` at desktop and priority-preserving rows below 700 px. Project detail tabs are `overview`, `tasks`, `milestones`, `team`, `documents`, `activity`. Reuse `managerStatusApi.project(id)` for the one-click status dialog.

```tsx
<StatusBadge status={health.level} label={health.label} />
<Typography variant="body2">{health.reasons[0]?.label ?? 'Критичных рисков нет'}</Typography>
<Button onClick={() => openRecommendedAction(health)}>Выполнить действие</Button>
```

- [ ] **Step 4: Verify projects and build**

Run: `cd apps/web && npm test -- src/features/projects/ProjectsExperience.test.tsx`  
Expected: PASS.

Run: `cd apps/web && npm run build`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/projects apps/web/src/pages/ProjectsPage.tsx apps/web/src/pages/ProjectDetailPage.tsx
git commit -m "feat(web): redesign project control surfaces"
```

---

### Task 3: Action Inbox Master-Detail Workflow

**Files:**
- Create: `apps/web/src/features/inbox/InboxGroups.tsx`
- Create: `apps/web/src/features/inbox/InboxQueue.tsx`
- Create: `apps/web/src/features/inbox/InboxDetailPanel.tsx`
- Create: `apps/web/src/features/inbox/inboxViewModel.ts`
- Create: `apps/web/src/features/inbox/ActionInbox.test.tsx`
- Modify: `apps/web/src/pages/ActionInboxPage.tsx`

**Interfaces:**
- Consumes: `communicationApi.list`, `update`, `createTask`, and archive.
- Produces: URL-driven selection `?item=<id>` and explicit transition commands.

- [ ] **Step 1: Write failing Inbox tests**

```tsx
it('groups items by required decision instead of source', async () => {
  renderInbox()
  expect(await screen.findByText('Нужно ответить мне')).toBeVisible()
  expect(screen.getByText('Спросить заказчика')).toBeVisible()
  expect(screen.queryByRole('heading', { name: 'Email' })).not.toBeInTheDocument()
})

it('updates action status without creating a task', async () => {
  const user = userEvent.setup()
  renderInbox()
  await user.click(await screen.findByText('Уточнение по API'))
  await user.click(screen.getByRole('button', { name: 'Спросить команду' }))
  expect(mockUpdate).toHaveBeenCalledWith('c1', expect.objectContaining({ action_status: 'need_internal_input' }))
  expect(mockCreateTask).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: Verify RED**

Run: `cd apps/web && npm test -- src/features/inbox/ActionInbox.test.tsx`  
Expected: FAIL because master-detail modules are absent.

- [ ] **Step 3: Implement grouping, queue, and detail actions**

```ts
export const inboxGroups = [
  'new', 'needs_my_reply', 'need_customer_input', 'need_internal_input',
  'waiting_for_reply', 'ready_to_respond', 'fyi', 'done',
] as const

export const inboxCommands = {
  askTeam: { action_status: 'need_internal_input', waiting_for_party: 'internal' },
  askCustomer: { action_status: 'need_customer_input', waiting_for_party: 'client' },
  markWaiting: { action_status: 'waiting_for_reply' },
  markFyi: { action_status: 'fyi', needs_reply: false },
} as const
```

The source opens in a new tab. Show a draft as read-only until the user selects «Редактировать черновик»; sending remains disabled until an integration endpoint exists.

- [ ] **Step 4: Verify Inbox and build**

Run: `cd apps/web && npm test -- src/features/inbox/ActionInbox.test.tsx`  
Expected: PASS.

Run: `cd apps/web && npm run build`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/inbox apps/web/src/pages/ActionInboxPage.tsx
git commit -m "feat(web): make inbox decision oriented"
```

---

### Task 4: Distinct Knowledge Hub

**Files:**
- Create: `apps/web/src/pages/KnowledgePage.tsx`
- Create: `apps/web/src/features/knowledge/useKnowledgeSearch.ts`
- Create: `apps/web/src/features/knowledge/KnowledgeFilters.tsx`
- Create: `apps/web/src/features/knowledge/KnowledgeResults.tsx`
- Create: `apps/web/src/features/knowledge/KnowledgeContextPanel.tsx`
- Create: `apps/web/src/features/knowledge/KnowledgePage.test.tsx`
- Modify: `apps/web/src/App.tsx`

**Interfaces:**
- Consumes: existing `searchApi`, `documentApi`, tasks, projects, and source links.
- Produces: discovery-only `/knowledge`; `/documents` remains the authoring route.

- [ ] **Step 1: Write failing Knowledge tests**

```tsx
it('renders source path, verification status, and context snippet', async () => {
  renderKnowledge('/knowledge?q=service+account')
  expect(await screen.findByText('Авторизация service account')).toBeVisible()
  expect(screen.getByText('Workspace → CRM → API Integration')).toBeVisible()
  expect(screen.getByText('Подтверждено')).toBeVisible()
})

it('opens the source document in the authoring route', async () => {
  renderKnowledge('/knowledge?q=api')
  await userEvent.click(await screen.findByRole('link', { name: 'API specification v3' }))
  expect(mockNavigate).toHaveBeenCalledWith('/documents?document=doc-3')
})
```

- [ ] **Step 2: Verify RED**

Run: `cd apps/web && npm test -- src/features/knowledge/KnowledgePage.test.tsx`  
Expected: FAIL because `/knowledge` still renders `DocumentsPage`.

- [ ] **Step 3: Implement Knowledge read model and page**

```ts
export interface KnowledgeResult {
  id: string
  entityType: 'requirement' | 'decision' | 'document' | 'meeting' | 'question'
  title: string
  path: string[]
  snippet: string
  verification: 'confirmed' | 'needs_review' | 'stale' | 'open_question'
  updatedAt: string
  sourceHref: string
}
```

Map current search response types into this read model. If an entity lacks verification metadata, label it `needs_review`; never infer `confirmed` from recency alone.

- [ ] **Step 4: Verify Knowledge and route separation**

Run: `cd apps/web && npm test -- src/features/knowledge/KnowledgePage.test.tsx`  
Expected: PASS.

Run: `cd apps/web && npm run build`  
Expected: `/knowledge` and `/documents` compile as distinct pages.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/knowledge apps/web/src/pages/KnowledgePage.tsx apps/web/src/App.tsx
git commit -m "feat(web): separate knowledge discovery from documents"
```

---

### Task 5: Shared Task Presentation Across Views

**Files:**
- Create: `apps/web/src/features/tasks/taskPresentation.ts`
- Test: `apps/web/src/features/tasks/taskPresentation.test.ts`
- Modify: `apps/web/src/components/tasks/TaskList.tsx`
- Modify: `apps/web/src/components/tasks/KanbanBoard.tsx`
- Modify: `apps/web/src/pages/CalendarPage.tsx`
- Modify: `apps/web/src/components/tasks/TimelineView.tsx`

**Interfaces:**
- Consumes: `Task`.
- Produces: `toTaskPresentation(task, now): TaskPresentation` for every view.

- [ ] **Step 1: Write failing parity tests**

```ts
it('exposes the same semantic signals to every view', () => {
  const view = toTaskPresentation(taskFixture, NOW)
  expect(view).toMatchObject({
    statusLabel: 'Ждём клиента',
    blocked: true,
    finalDeadline: expect.any(Object),
    responseDeadline: expect.any(Object),
    nextActionDeadline: expect.any(Object),
    documentationCount: 2,
  })
})
```

- [ ] **Step 2: Verify RED**

Run: `cd apps/web && npm test -- src/features/tasks/taskPresentation.test.ts`  
Expected: FAIL because the presentation adapter does not exist.

- [ ] **Step 3: Implement adapter and replace page-specific formatting**

```ts
export interface TaskPresentation {
  title: string
  statusLabel: string
  priorityLabel: 'P0' | 'P1' | 'P2' | 'P3'
  blocked: boolean
  assigneeLabel: string
  finalDeadline: DeadlineView | null
  responseDeadline: DeadlineView | null
  nextActionDeadline: DeadlineView | null
  documentationCount: number
  commentCount: number
}
```

Board uses only title, priority, assignee, final due, block, docs, and subtask progress. Calendar shows deadline-type text. Timeline omits undated tasks and retains dependency text.

- [ ] **Step 4: Verify parity and build**

Run: `cd apps/web && npm test -- src/features/tasks/taskPresentation.test.ts`  
Expected: PASS.

Run: `cd apps/web && npm test && npm run build`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/tasks apps/web/src/components/tasks apps/web/src/pages/CalendarPage.tsx
git commit -m "feat(web): align task metadata across views"
```

---

### Task 6: P1 End-to-End Gate

**Files:**
- Create: `apps/web/e2e/workflow-first-p1.spec.ts`

**Interfaces:**
- Consumes: all P1 features.
- Produces: acceptance coverage for projects, Inbox, Knowledge, and view parity.

- [ ] **Step 1: Write E2E scenarios**

```ts
test('explains project risk before navigating to reports', async ({ page }) => {
  await login(page)
  await page.goto('/projects')
  await page.getByRole('row', { name: /CRM Platform/ }).click()
  await expect(page.getByRole('heading', { name: 'Почему проект под риском' })).toBeVisible()
  await expect(page.getByText(/Рекомендуемое действие/)).toBeVisible()
})

test('triages an inbox item without creating a task', async ({ page }) => {
  await login(page)
  await page.goto('/inbox')
  await page.getByText('Уточнение по API').click()
  await page.getByRole('button', { name: 'Спросить команду' }).click()
  await expect(page.getByText('Уточнить у команды')).toBeVisible()
})

test('finds knowledge and opens its source', async ({ page }) => {
  await login(page)
  await page.goto('/knowledge?q=service%20account')
  await page.getByText('Авторизация service account').click()
  await page.getByRole('link', { name: 'API specification v3' }).click()
  await expect(page).toHaveURL(/\/documents\?document=/)
})
```

- [ ] **Step 2: Run E2E and verify failures are actionable**

Run: `cd apps/web && npx playwright test e2e/workflow-first-p1.spec.ts --project=chromium`  
Expected: PASS after Tasks 1-5; any failure names the missing workflow behavior.

- [ ] **Step 3: Run accessibility spot checks**

Use keyboard only for each scenario. Confirm project rows, Inbox actions, result links, tabs, and close buttons have visible focus and accessible names.

- [ ] **Step 4: Run full P1 quality gate**

Run: `cd apps/web && npm test && npm run lint && npm run build`  
Expected: PASS.

Run: `cd apps/web && npx playwright test e2e/workflow-first-p0.spec.ts e2e/workflow-first-p1.spec.ts --project=chromium`  
Expected: PASS.

- [ ] **Step 5: Commit P1 gate**

```bash
git add apps/web/e2e/workflow-first-p1.spec.ts
git commit -m "test(web): cover workflow-first P1 journeys"
```

## P1 Manual Review

1. Compare three projects without opening them and identify the highest risk with its cause.
2. Open the risky project and verify milestone, team load, source documents, and recommended action.
3. Triage one Inbox message into each action group without accidental task creation.
4. Search Knowledge, inspect source/version/verification, and navigate to the source document.
5. Open the same task in List, Board, Calendar, and Timeline; verify semantic metadata agrees.
