# Workflow-first UX P0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a coherent daily-work experience with grouped navigation, hybrid Focus Now, a unified action queue, consistent task views, and a context-preserving task drawer.

**Architecture:** Keep the existing React Query APIs and Zustand UI store. Introduce a frontend read model that normalizes tasks and communication items into `ActionItem`, then compose focused UI modules from pure tested selectors. Split oversized pages by responsibility without changing backend contracts.

**Tech Stack:** React 18, TypeScript, Material UI 5, React Query 5, Zustand 4, React Router, Vitest, Testing Library, Playwright.

## Global Constraints

- Preserve all existing backend API contracts and routes.
- Reuse `useTasksQuery`, `communicationApi`, `useProjectsQuery`, and `useUIStore`.
- Do not create a second task or communication store.
- Desktop rows are 48-52 px; mobile touch targets are at least 44 x 44 px.
- Statuses use icon, text, and color; color is never the only signal.
- `Ctrl/Cmd + K` opens global search, `C` opens quick creation, `/` focuses current search, and `Esc` closes overlays.
- External links use `target="_blank"` and `rel="noopener noreferrer"`.
- Every task ends with independently passing tests and a focused commit.

## File Map

| File | Responsibility |
|---|---|
| `apps/web/src/features/work/types.ts` | Shared `ActionItem`, deadline, and focus types |
| `apps/web/src/features/work/selectors.ts` | Pure normalization, sorting, and Focus Now selection |
| `apps/web/src/features/dashboard/useMyWork.ts` | React Query composition for Dashboard data |
| `apps/web/src/features/dashboard/*.tsx` | Focus, action queue, waiting queue, and team radar modules |
| `apps/web/src/components/common/PageHeader.tsx` | Shared page title, breadcrumb, summary, and actions |
| `apps/web/src/components/common/ViewSwitcher.tsx` | Accessible task view selector |
| `apps/web/src/components/common/FilterBar.tsx` | Search, saved views, and active filter chips |
| `apps/web/src/components/common/StatusBadge.tsx` | Text, icon, and color status presentation |
| `apps/web/src/components/common/DeadlineIndicator.tsx` | Three deadline types and overdue state |
| `apps/web/src/components/layout/MobileNavigation.tsx` | Five-item mobile bottom navigation |
| `apps/web/src/components/tasks/drawer/*.tsx` | Focused task drawer sections |

---

### Task 1: Unified Work Read Model

**Files:**
- Create: `apps/web/src/features/work/types.ts`
- Create: `apps/web/src/features/work/selectors.ts`
- Test: `apps/web/src/features/work/selectors.test.ts`

**Interfaces:**
- Consumes: `Task`, `CommunicationItem`, and current user id.
- Produces: `buildActionItems(tasks, communications, currentUserId): ActionItem[]`.
- Produces: `selectFocusNow(items, pinnedEntityKey, now): FocusSelection | null`.
- Produces: `splitMyWork(items, now): { actions: ActionItem[]; waiting: ActionItem[] }`.

- [ ] **Step 1: Write failing selector tests**

```ts
import { describe, expect, it } from 'vitest'
import { buildActionItems, selectFocusNow, splitMyWork } from './selectors'

describe('workflow-first selectors', () => {
  it('normalizes tasks and replies into one ordered action queue', () => {
    const items = buildActionItems(
      [{ id: 't1', title: 'Review staging', priority: 'high', status: 'todo', workflow_status: 'ready', next_action_owner_id: 'u1', next_action_due_at: '2026-07-31T09:30:00Z' } as any],
      [{ id: 'c1', body_preview: 'Reply to client', source_type: 'email', action_status: 'needs_my_reply', action_owner_id: 'u1', response_due_at: '2026-07-31T09:00:00Z' } as any],
      'u1',
    )
    expect(items.map((item) => item.entityKey)).toEqual(['communication:c1', 'task:t1'])
  })

  it('keeps waiting items out of active actions', () => {
    const result = splitMyWork([{ entityKey: 'task:t1', kind: 'task', state: 'waiting', dueAt: null } as any], new Date('2026-07-31T08:00:00Z'))
    expect(result.actions).toHaveLength(0)
    expect(result.waiting).toHaveLength(1)
  })

  it('prefers a pinned item over the automatic candidate', () => {
    const items = [
      { entityKey: 'task:auto', priorityRank: 0, state: 'actionable' },
      { entityKey: 'task:pinned', priorityRank: 3, state: 'actionable' },
    ] as any
    expect(selectFocusNow(items, 'task:pinned', new Date())?.item.entityKey).toBe('task:pinned')
  })
})
```

- [ ] **Step 2: Run the test and verify RED**

Run: `cd apps/web && npm test -- src/features/work/selectors.test.ts`  
Expected: FAIL because `types.ts` and `selectors.ts` do not exist.

- [ ] **Step 3: Implement the read model and deterministic ranking**

```ts
export type ActionKind = 'task' | 'reply' | 'follow_up' | 'approval'
export type ActionState = 'actionable' | 'waiting' | 'done'

export interface ActionItem {
  entityKey: `${'task' | 'communication'}:${string}`
  entityId: string
  kind: ActionKind
  state: ActionState
  title: string
  projectId: string | null
  ownerId: string | null
  dueAt: string | null
  finalDueAt: string | null
  priorityRank: number
  isBlocked: boolean
  nextAction: string | null
  sourceLabel: string
}

export interface FocusSelection {
  item: ActionItem
  reason: 'pinned' | 'in_progress' | 'overdue' | 'priority' | 'deadline'
}
```

Implement sorting in this order: overdue actionable item, priority rank, action deadline, final deadline, title. Treat `waiting_for_internal`, `waiting_for_client`, and `waiting_for_reply` as `waiting`.

- [ ] **Step 4: Run selector tests and full frontend tests**

Run: `cd apps/web && npm test -- src/features/work/selectors.test.ts`  
Expected: PASS.

Run: `cd apps/web && npm test`  
Expected: all existing and new tests pass.

- [ ] **Step 5: Commit the read model**

```bash
git add apps/web/src/features/work
git commit -m "feat(web): add unified work read model"
```

---

### Task 2: Shared Workflow UI Primitives

**Files:**
- Create: `apps/web/src/components/common/StatusBadge.tsx`
- Create: `apps/web/src/components/common/DeadlineIndicator.tsx`
- Create: `apps/web/src/components/common/AttentionState.tsx`
- Create: `apps/web/src/components/common/workPrimitives.test.tsx`
- Modify: `apps/web/src/lib/theme.ts`

**Interfaces:**
- Consumes: workflow status, deadline type/value, loading/error/empty state.
- Produces: reusable components used by Dashboard, Tasks, Projects, and Inbox.

- [ ] **Step 1: Write failing component tests**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import StatusBadge from './StatusBadge'
import DeadlineIndicator from './DeadlineIndicator'

it('renders status text instead of relying on color', () => {
  render(<StatusBadge status="waiting_for_client" />)
  expect(screen.getByText('Ждём клиента')).toBeVisible()
})

it('labels the deadline type and overdue state', () => {
  render(<DeadlineIndicator type="response" value="2026-07-30T10:00:00Z" now={new Date('2026-07-31T10:00:00Z')} />)
  expect(screen.getByLabelText(/срок ответа.*просрочен/i)).toBeVisible()
})
```

- [ ] **Step 2: Verify RED**

Run: `cd apps/web && npm test -- src/components/common/workPrimitives.test.tsx`  
Expected: FAIL because the components do not exist.

- [ ] **Step 3: Implement primitives and theme overrides**

```tsx
const labels: Record<WorkflowStatus, string> = {
  inbox: 'Входящие', backlog: 'Backlog', clarification_needed: 'Нужно уточнение',
  planned: 'Запланировано', ready: 'Ready', in_progress: 'В работе',
  waiting_for_internal: 'Ждём команду', waiting_for_client: 'Ждём клиента',
  review: 'На проверке', ready_to_send: 'Готово к отправке', done: 'Готово',
  cancelled: 'Отменено', blocked: 'Заблокировано',
}
```

Use MUI icons, `Chip size="small"`, explicit `aria-label`, and a stable minimum height. Add theme defaults for visible `:focus-visible`, 8-10 px radii, 48 px list rows, and restrained shadows.

- [ ] **Step 4: Verify components and production build**

Run: `cd apps/web && npm test -- src/components/common/workPrimitives.test.tsx`  
Expected: PASS.

Run: `cd apps/web && npm run build`  
Expected: TypeScript and Vite build succeed.

- [ ] **Step 5: Commit primitives**

```bash
git add apps/web/src/components/common apps/web/src/lib/theme.ts
git commit -m "feat(web): add workflow UI primitives"
```

---

### Task 3: Grouped App Shell and Mobile Navigation

**Files:**
- Modify: `apps/web/src/components/layout/Sidebar.tsx`
- Modify: `apps/web/src/components/layout/Header.tsx`
- Modify: `apps/web/src/components/layout/Layout.tsx`
- Create: `apps/web/src/components/layout/MobileNavigation.tsx`
- Create: `apps/web/src/components/layout/AppShell.test.tsx`
- Modify: `apps/web/src/store/uiStore.ts`
- Modify: `apps/web/src/main.tsx`
- Modify: `apps/web/src/pages/SettingsPage.tsx`
- Delete after import migration: `apps/web/src/lib/store/themeStore.ts`

**Interfaces:**
- Consumes: router location, `useUIStore`, auth user, notification count.
- Produces: grouped desktop navigation, global header, mobile bottom navigation, one creation entry point.

- [ ] **Step 1: Write failing shell tests**

```tsx
it('groups navigation by user intent', () => {
  renderShell('/tasks', 1440)
  expect(screen.getByText('Моя работа')).toBeVisible()
  expect(screen.getByText('Планирование')).toBeVisible()
  expect(screen.getByText('Знания')).toBeVisible()
  expect(screen.getByText('Управление')).toBeVisible()
  expect(screen.getByRole('link', { name: 'Мои задачи' })).toHaveAttribute('aria-current', 'page')
})

it('renders five mobile destinations', () => {
  renderShell('/', 390)
  expect(screen.getByRole('navigation', { name: 'Основная навигация' }).querySelectorAll('a')).toHaveLength(5)
})
```

- [ ] **Step 2: Verify RED**

Run: `cd apps/web && npm test -- src/components/layout/AppShell.test.tsx`  
Expected: FAIL because sections and `MobileNavigation` are absent.

- [ ] **Step 3: Implement grouped navigation and remove floating duplicate controls**

```ts
export const navigationGroups = [
  { label: 'Моя работа', items: ['/', '/inbox', '/tasks'] },
  { label: 'Планирование', items: ['/projects', '/boards', '/calendar'] },
  { label: 'Знания', items: ['/knowledge', '/documents', '/links'] },
  { label: 'Управление', items: ['/analytics', '/settings'] },
] as const
```

Move global creation into Header. Remove the two fixed floating FABs from `Layout`. Keep `C` and `Ctrl/Cmd + K`. Add persisted `sidebarCollapsed` only; do not persist transient mobile open state.

- [ ] **Step 4: Verify shell behavior**

Run: `cd apps/web && npm test -- src/components/layout/AppShell.test.tsx`  
Expected: PASS.

Run: `cd apps/web && npm run build`  
Expected: PASS with no imports from `lib/store/themeStore.ts`.

- [ ] **Step 5: Commit app shell**

```bash
git add apps/web/src/components/layout apps/web/src/store/uiStore.ts apps/web/src/main.tsx apps/web/src/pages/SettingsPage.tsx apps/web/src/lib/store/themeStore.ts
git commit -m "feat(web): organize workflow-first app shell"
```

---

### Task 4: Command Center Dashboard

**Files:**
- Create: `apps/web/src/features/dashboard/useMyWork.ts`
- Create: `apps/web/src/features/dashboard/FocusNowCard.tsx`
- Create: `apps/web/src/features/dashboard/ActionQueue.tsx`
- Create: `apps/web/src/features/dashboard/WaitingQueue.tsx`
- Create: `apps/web/src/features/dashboard/TeamRadar.tsx`
- Create: `apps/web/src/features/dashboard/Dashboard.test.tsx`
- Modify: `apps/web/src/pages/DashboardPage.tsx`
- Modify: `apps/web/src/store/uiStore.ts`

**Interfaces:**
- Consumes: selectors from Task 1, primitives from Task 2, existing task/project/communication queries.
- Produces: `useMyWork(): MyWorkViewModel` and four independent Dashboard sections.

- [ ] **Step 1: Write failing Dashboard tests**

```tsx
it('orders the daily workflow before team metrics', async () => {
  renderDashboardWithFixtures()
  const headings = await screen.findAllByRole('heading', { level: 2 })
  expect(headings.map((heading) => heading.textContent)).toEqual([
    'Focus Now', 'Мои действия', 'Жду ответа', 'Команда и проекты',
  ])
})

it('lets the user replace and pin the proposed focus', async () => {
  const user = userEvent.setup()
  renderDashboardWithFixtures()
  await user.click(await screen.findByRole('button', { name: 'Сменить задачу' }))
  await user.click(screen.getByRole('option', { name: /Проверить staging/ }))
  expect(useUIStore.getState().pinnedFocusEntityKey).toBe('task:staging')
})
```

- [ ] **Step 2: Verify RED**

Run: `cd apps/web && npm test -- src/features/dashboard/Dashboard.test.tsx`  
Expected: FAIL because the Dashboard modules and pinned preference are absent.

- [ ] **Step 3: Implement view model and modules**

```ts
export interface MyWorkViewModel {
  focus: FocusSelection | null
  actions: ActionItem[]
  waiting: ActionItem[]
  attention: { overdue: number; blocked: number; missingNextAction: number }
  projects: DashboardProjectSummary[]
}

export interface DashboardProjectSummary {
  projectId: string
  name: string
  progress: number
  healthLabel: 'On track' | 'Needs attention' | 'At risk' | 'Off track'
  reason: string
  recommendedAction: string
}
```

Persist only `pinnedFocusEntityKey` in `uiStore`. Cap Dashboard rows at 7 actions, 4 waiting items, and 6 projects. Each section links to the corresponding filtered full view.

- [ ] **Step 4: Verify Dashboard**

Run: `cd apps/web && npm test -- src/features/dashboard/Dashboard.test.tsx`  
Expected: PASS.

Run: `cd apps/web && npm run build`  
Expected: PASS and `DashboardPage.tsx` contains orchestration only.

- [ ] **Step 5: Commit Dashboard**

```bash
git add apps/web/src/features/dashboard apps/web/src/pages/DashboardPage.tsx apps/web/src/store/uiStore.ts
git commit -m "feat(web): turn dashboard into command center"
```

---

### Task 5: Consistent Task Workspace Shell

**Files:**
- Create: `apps/web/src/components/common/PageHeader.tsx`
- Create: `apps/web/src/components/common/ViewSwitcher.tsx`
- Create: `apps/web/src/components/common/FilterBar.tsx`
- Create: `apps/web/src/components/tasks/TaskWorkspace.test.tsx`
- Modify: `apps/web/src/pages/TasksPage.tsx`
- Modify: `apps/web/src/store/uiStore.ts`

**Interfaces:**
- Consumes: current URL search params and existing view components.
- Produces: `TaskView = 'list' | 'kanban' | 'calendar' | 'timeline'` and accessible shared controls.

- [ ] **Step 1: Write failing workspace tests**

```tsx
it('restores the last task view when URL has no view', () => {
  useUIStore.setState({ lastTaskView: 'timeline' })
  renderTasks('/tasks')
  expect(screen.getByRole('tab', { name: 'Timeline' })).toHaveAttribute('aria-selected', 'true')
})

it('shows active filters as removable chips', async () => {
  renderTasks('/tasks?preset=overdue&project_id=p1')
  expect(screen.getByRole('button', { name: /Удалить фильтр Просрочено/ })).toBeVisible()
  expect(screen.getByRole('button', { name: /Удалить фильтр CRM/ })).toBeVisible()
})
```

- [ ] **Step 2: Verify RED**

Run: `cd apps/web && npm test -- src/components/tasks/TaskWorkspace.test.tsx`  
Expected: FAIL because shared controls and `lastTaskView` do not exist.

- [ ] **Step 3: Implement shell controls and persistence**

```ts
export type TaskView = 'list' | 'kanban' | 'calendar' | 'timeline'

const setView = (view: TaskView) => {
  setLastTaskView(view)
  setSearchParams((current) => {
    current.set('view', view)
    return current
  })
}
```

Use MUI `Tabs` with icons and text. Keep `/boards` as a redirect to `view=kanban`. Pressing `/` focuses the task search unless an input is already active.

- [ ] **Step 4: Verify workspace and build**

Run: `cd apps/web && npm test -- src/components/tasks/TaskWorkspace.test.tsx`  
Expected: PASS.

Run: `cd apps/web && npm run build`  
Expected: PASS.

- [ ] **Step 5: Commit workspace shell**

```bash
git add apps/web/src/components/common apps/web/src/components/tasks/TaskWorkspace.test.tsx apps/web/src/pages/TasksPage.tsx apps/web/src/store/uiStore.ts
git commit -m "feat(web): unify task workspace controls"
```

---

### Task 6: Context-preserving Task Drawer

**Files:**
- Create: `apps/web/src/components/tasks/drawer/TaskDrawerHeader.tsx`
- Create: `apps/web/src/components/tasks/drawer/TaskOverviewTab.tsx`
- Create: `apps/web/src/components/tasks/drawer/TaskCommunicationsTab.tsx`
- Create: `apps/web/src/components/tasks/drawer/TaskDrawerFooter.tsx`
- Create: `apps/web/src/components/tasks/drawer/TaskDrawer.test.tsx`
- Modify: `apps/web/src/components/tasks/TaskDetailDialog.tsx`
- Modify: `apps/web/src/pages/TasksPage.tsx`

**Interfaces:**
- Consumes: selected task id from `?task=<id>`, current list state, documents, links, comments, and communication APIs.
- Produces: stable drawer tabs and URL-driven open state.

- [ ] **Step 1: Write failing drawer tests**

```tsx
it('shows responsibility and all three deadlines before long-form content', () => {
  renderTaskDrawer(taskFixture)
  expect(screen.getByText('Следующее действие')).toBeVisible()
  expect(screen.getByText('Финальный срок')).toBeVisible()
  expect(screen.getByText('Срок ответа')).toBeVisible()
  expect(screen.getByText('Следующее действие до')).toBeVisible()
})

it('restores focus to the originating row when closed', async () => {
  const user = userEvent.setup()
  renderTasks('/tasks?task=t1')
  await user.keyboard('{Escape}')
  expect(screen.getByRole('button', { name: /Открыть задачу CRM-142/ })).toHaveFocus()
})
```

- [ ] **Step 2: Verify RED**

Run: `cd apps/web && npm test -- src/components/tasks/drawer/TaskDrawer.test.tsx`  
Expected: FAIL because drawer sections and focus restoration are absent.

- [ ] **Step 3: Split the drawer and add the Communications tab**

```tsx
const tabs = [
  { id: 'overview', label: 'Обзор' },
  { id: 'documents', label: `Документы ${documentCount}` },
  { id: 'communications', label: `Коммуникации ${communicationCount}` },
  { id: 'testing', label: 'Тестирование' },
  { id: 'activity', label: 'Активность' },
] as const
```

Keep save/delete orchestration in `TaskDetailDialog`. Move display-only sections into focused files. Use `fullScreen={isMobile}` behavior through Drawer width `100%` on mobile.

- [ ] **Step 4: Verify drawer and regression suite**

Run: `cd apps/web && npm test -- src/components/tasks/drawer/TaskDrawer.test.tsx`  
Expected: PASS.

Run: `cd apps/web && npm test && npm run build`  
Expected: all tests and build pass.

- [ ] **Step 5: Commit drawer**

```bash
git add apps/web/src/components/tasks apps/web/src/pages/TasksPage.tsx
git commit -m "feat(web): focus task drawer on commitments"
```

---

### Task 7: P0 Accessibility and End-to-End Gate

**Files:**
- Modify: `apps/web/package.json`
- Modify: `apps/web/package-lock.json`
- Create: `apps/web/e2e/workflow-first-p0.spec.ts`
- Modify: `apps/web/playwright.config.ts`
- Modify: `apps/web/src/lib/hooks/useKeyboardShortcuts.ts`

**Interfaces:**
- Consumes: completed P0 UI.
- Produces: automated desktop/mobile workflow gate and complete shortcut behavior.

- [ ] **Step 1: Add Playwright test dependency and write failing E2E scenario**

Run: `cd apps/web && npm install -D @playwright/test`.

```ts
test('manager completes the daily-work loop without losing task context', async ({ page }) => {
  await login(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Focus Now' })).toBeVisible()
  await page.getByRole('button', { name: /Открыть задачу/ }).click()
  await expect(page.getByRole('tab', { name: /Коммуникации/ })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('heading', { name: 'Мои действия' })).toBeVisible()
})

test.describe('mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } })
  test('uses bottom navigation and fullscreen task view', async ({ page }) => {
    await login(page)
    await expect(page.getByRole('navigation', { name: 'Основная навигация' })).toBeVisible()
    await page.getByRole('link', { name: 'Задачи' }).click()
    await page.getByRole('button', { name: /Открыть задачу/ }).first().click()
    await expect(page.getByRole('dialog')).toHaveCSS('width', '390px')
  })
})
```

- [ ] **Step 2: Run E2E and verify RED where behavior is incomplete**

Run: `cd apps/web && npx playwright test e2e/workflow-first-p0.spec.ts --project=chromium`  
Expected: FAIL on any missing focus label, mobile navigation, or focus restoration.

- [ ] **Step 3: Complete keyboard and responsive behavior**

Implement `/` search focus, `Esc` overlay close, and arrow-key navigation without intercepting keys inside inputs, textareas, or editors. Ensure all icon-only buttons have tooltips and `aria-label`.

Change `playwright.config.ts` web server command from `pnpm run dev` to `npm run dev`, matching the repository package manager.

- [ ] **Step 4: Run the complete P0 quality gate**

Run: `cd apps/web && npm test`  
Expected: PASS.

Run: `cd apps/web && npm run lint && npm run build`  
Expected: PASS.

Run: `cd apps/web && npx playwright test e2e/workflow-first-p0.spec.ts --project=chromium`  
Expected: PASS at desktop and 390 px mobile viewport.

- [ ] **Step 5: Commit P0 quality gate**

```bash
git add apps/web/package.json apps/web/package-lock.json apps/web/playwright.config.ts apps/web/e2e apps/web/src/lib/hooks/useKeyboardShortcuts.ts
git commit -m "test(web): cover workflow-first P0 journeys"
```

## P0 Manual Review

1. Open Dashboard at 1440 px, 1024 px, and 390 px.
2. Identify Focus Now, three actions, and two waiting responses within 10 seconds.
3. Replace and pin Focus Now, refresh, and verify the selection persists.
4. Open a task from List, close it, and confirm filters, scroll, and keyboard focus remain.
5. Switch List, Board, Calendar, and Timeline; refresh and verify the last view persists.
6. Complete the daily loop using keyboard only.
7. Disable network and confirm stable error/empty geometry with a retry action.
