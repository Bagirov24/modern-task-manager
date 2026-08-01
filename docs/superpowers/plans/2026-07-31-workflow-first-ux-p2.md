# Workflow-first UX P2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Workflow-first UX with trend-based Reports, structured Settings, polished mobile behavior, full keyboard/accessibility coverage, and stable visual regression checks.

**Architecture:** Reuse existing task/project aggregates for explainable reporting, keep personal preferences in the existing UI store, and keep workspace/security settings behind current APIs. Finish the system through shared responsive primitives and automated accessibility/visual gates instead of page-specific CSS patches.

**Tech Stack:** React 18, TypeScript, Material UI 5, React Query 5, Zustand 4, Vitest, Testing Library, Playwright, `@axe-core/playwright`.

## Global Constraints

- UX-P0 and UX-P1 must pass before this plan begins.
- Reports answer trend and cause questions; they do not repeat Dashboard counts.
- Settings separate personal, workspace, integration, security, and AI scope.
- Dangerous or production-affecting changes require explicit confirmation and explain impact.
- Mobile daily work requires no horizontal scrolling.
- WCAG AA contrast, visible focus, semantic names, and keyboard completion are release gates.
- Visual snapshots cover light and dark themes at 1440, 1024, and 390 px.

## File Map

| File | Responsibility |
|---|---|
| `apps/web/src/features/reports/reportModel.ts` | Period comparison, causes, and report conclusion |
| `apps/web/src/features/reports/*.tsx` | Metrics, trends, causes, and status export |
| `apps/web/src/features/settings/sections/*.tsx` | Focused settings sections by scope |
| `apps/web/src/components/layout/MobileNavigation.tsx` | Final mobile navigation and safe-area behavior |
| `apps/web/src/lib/hooks/useKeyboardShortcuts.ts` | Complete keyboard contract |
| `apps/web/e2e/accessibility.spec.ts` | Axe and keyboard release gate |
| `apps/web/e2e/visual.spec.ts` | Stable desktop/laptop/mobile snapshots |

---

### Task 1: Trend-based Reports Read Model

**Files:**
- Create: `apps/web/src/features/reports/reportModel.ts`
- Test: `apps/web/src/features/reports/reportModel.test.ts`
- Create: `apps/web/src/features/reports/ReportMetrics.tsx`
- Create: `apps/web/src/features/reports/RiskCauses.tsx`
- Create: `apps/web/src/features/reports/ReportConclusion.tsx`
- Modify: `apps/web/src/pages/AnalyticsPage.tsx`

**Interfaces:**
- Consumes: current and previous period tasks/projects.
- Produces: `buildReportModel(input): ReportModel`.

- [ ] **Step 1: Write failing report-model tests**

```ts
it('compares periods and explains the dominant delay cause', () => {
  const report = buildReportModel({ current: currentFixtures, previous: previousFixtures, now: NOW })
  expect(report.metrics.onTime.delta).toBe(6)
  expect(report.riskCauses[0]).toMatchObject({ code: 'waiting_for_reply', percentage: 38 })
  expect(report.conclusion).toMatch(/ожидание ответа/i)
})

it('does not present a conclusion without evidence', () => {
  const report = buildReportModel({ current: [], previous: [], now: NOW })
  expect(report.conclusion).toBe('Недостаточно данных для вывода за выбранный период.')
})
```

- [ ] **Step 2: Verify RED**

Run: `cd apps/web && npm test -- src/features/reports/reportModel.test.ts`  
Expected: FAIL because `reportModel.ts` does not exist.

- [ ] **Step 3: Implement report types and calculations**

```ts
export interface MetricComparison {
  value: number
  previousValue: number
  delta: number
  direction: 'better' | 'worse' | 'neutral'
}

export interface ReportModel {
  metrics: {
    onTime: MetricComparison
    cycleTimeDays: MetricComparison
    overdue: MetricComparison
    waitingHours: MetricComparison
  }
  riskCauses: Array<{ code: string; label: string; count: number; percentage: number }>
  conclusion: string
}
```

Calculate completion timeliness from `completed_at <= final_due_at || due_date`. Waiting duration uses `response_due_at` and `last_external_communication_at`; if timestamps are incomplete, exclude the item and expose excluded count in an accessible tooltip.

- [ ] **Step 4: Verify reports and build**

Run: `cd apps/web && npm test -- src/features/reports/reportModel.test.ts`  
Expected: PASS.

Run: `cd apps/web && npm run build`  
Expected: PASS and Analytics renders trend metrics, cause distribution, and conclusion.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/reports apps/web/src/pages/AnalyticsPage.tsx
git commit -m "feat(web): make reports trend and cause driven"
```

---

### Task 2: Structured Settings and Minimal Profile

**Files:**
- Create: `apps/web/src/features/settings/SettingsNavigation.tsx`
- Create: `apps/web/src/features/settings/sections/GeneralSettings.tsx`
- Create: `apps/web/src/features/settings/sections/WorkflowSettings.tsx`
- Create: `apps/web/src/features/settings/sections/NotificationSettings.tsx`
- Create: `apps/web/src/features/settings/sections/IntegrationSettings.tsx`
- Create: `apps/web/src/features/settings/sections/SecuritySettings.tsx`
- Create: `apps/web/src/features/settings/sections/AISettings.tsx`
- Create: `apps/web/src/features/settings/SettingsPage.test.tsx`
- Modify: `apps/web/src/pages/SettingsPage.tsx`
- Modify: `apps/web/src/pages/ProfilePage.tsx`

**Interfaces:**
- Consumes: current settings APIs and `useUIStore` personal preferences.
- Produces: URL-addressable section `?section=general|workflow|notifications|integrations|security|ai`.

- [ ] **Step 1: Write failing settings tests**

```tsx
it('separates personal and workspace scope', () => {
  renderSettings('/settings?section=notifications')
  expect(screen.getByText('Личные уведомления')).toBeVisible()
  expect(screen.getByText('Workspace defaults')).toBeVisible()
})

it('confirms production-impacting changes', async () => {
  const user = userEvent.setup()
  renderSettings('/settings?section=integrations')
  await user.click(screen.getByRole('switch', { name: 'Production интеграция' }))
  expect(screen.getByRole('dialog', { name: 'Подтвердите изменение production' })).toBeVisible()
})
```

- [ ] **Step 2: Verify RED**

Run: `cd apps/web && npm test -- src/features/settings/SettingsPage.test.tsx`  
Expected: FAIL because settings are not split into scoped sections.

- [ ] **Step 3: Implement section routing and safety confirmation**

```ts
export type SettingsSection =
  | 'general' | 'workflow' | 'notifications' | 'integrations' | 'security' | 'ai'

export interface SettingDescriptor {
  key: string
  scope: 'personal' | 'workspace' | 'project'
  impact: 'normal' | 'sensitive' | 'production'
  requiresConfirmation: boolean
}
```

General includes time zone and working hours. Notifications includes quiet hours and digest cadence. AI shows `off`, `local`, and `cloud`, with local selected for sensitive context. Profile contains identity, role, time zone, working hours, password/security actions, and no duplicate workspace settings.

- [ ] **Step 4: Verify settings and build**

Run: `cd apps/web && npm test -- src/features/settings/SettingsPage.test.tsx`  
Expected: PASS.

Run: `cd apps/web && npm run build`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/settings apps/web/src/pages/SettingsPage.tsx apps/web/src/pages/ProfilePage.tsx
git commit -m "feat(web): structure settings by scope and risk"
```

---

### Task 3: Mobile Daily-work Refinement

**Files:**
- Modify: `apps/web/src/components/layout/MobileNavigation.tsx`
- Modify: `apps/web/src/components/layout/Layout.tsx`
- Modify: `apps/web/src/components/tasks/TaskDetailDialog.tsx`
- Create: `apps/web/src/components/layout/MobileExperience.test.tsx`
- Modify: `apps/web/src/index.css`

**Interfaces:**
- Consumes: current route and safe-area environment variables.
- Produces: bottom navigation, fullscreen overlays, stable responsive lists.

- [ ] **Step 1: Write failing mobile tests**

```tsx
it('keeps daily navigation visible above the safe area', () => {
  renderAppAtWidth(390)
  const nav = screen.getByRole('navigation', { name: 'Основная навигация' })
  expect(nav).toHaveStyle({ paddingBottom: 'env(safe-area-inset-bottom)' })
})

it('turns task drawer into a fullscreen dialog on mobile', () => {
  renderTaskDrawerAtWidth(390)
  expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
  expect(screen.getByRole('button', { name: 'Назад к задачам' })).toBeVisible()
})
```

- [ ] **Step 2: Verify RED**

Run: `cd apps/web && npm test -- src/components/layout/MobileExperience.test.tsx`  
Expected: FAIL on safe-area and fullscreen semantics.

- [ ] **Step 3: Implement responsive behavior**

```css
.mobile-navigation {
  min-height: 56px;
  padding-bottom: env(safe-area-inset-bottom);
}

@media (max-width: 700px) {
  .desktop-only-column { display: none; }
  .mobile-priority-list { overflow-x: hidden; }
}
```

Use bottom destinations Overview, Inbox, Tasks, Projects, More. Do not render both mobile and desktop navigation in the accessibility tree. Preserve minimum 44 px controls and scroll the drawer body independently of its header/footer.

- [ ] **Step 4: Verify mobile behavior**

Run: `cd apps/web && npm test -- src/components/layout/MobileExperience.test.tsx`  
Expected: PASS.

Run: `cd apps/web && npm run build`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/layout apps/web/src/components/tasks/TaskDetailDialog.tsx apps/web/src/index.css
git commit -m "feat(web): refine mobile daily work"
```

---

### Task 4: Complete Keyboard Contract

**Files:**
- Modify: `apps/web/src/lib/hooks/useKeyboardShortcuts.ts`
- Create: `apps/web/src/lib/hooks/useKeyboardShortcuts.test.tsx`
- Modify: `apps/web/src/components/common/CommandPalette.tsx`
- Modify: `apps/web/src/components/common/FilterBar.tsx`

**Interfaces:**
- Consumes: route-local search target registrations and overlay actions.
- Produces: `useRegisterSearchTarget(ref)` and conflict-free global shortcuts.

- [ ] **Step 1: Write failing shortcut tests**

```tsx
it('does not trigger shortcuts while typing', async () => {
  renderShortcutHarness()
  const input = screen.getByRole('textbox')
  input.focus()
  fireEvent.keyDown(input, { key: 'c' })
  expect(openCreate).not.toHaveBeenCalled()
})

it('focuses the current list search with slash', () => {
  renderShortcutHarness()
  fireEvent.keyDown(window, { key: '/' })
  expect(screen.getByRole('searchbox')).toHaveFocus()
})
```

- [ ] **Step 2: Verify RED**

Run: `cd apps/web && npm test -- src/lib/hooks/useKeyboardShortcuts.test.tsx`  
Expected: FAIL because route-local search registration is absent.

- [ ] **Step 3: Implement keyboard registry**

```ts
const isEditableTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement && (
    target.matches('input, textarea, select, [contenteditable="true"]') ||
    Boolean(target.closest('[role="dialog"] [contenteditable="true"]'))
  )
```

Handle `Meta+K` and `Control+K`, `C`, `/`, and `Escape`. Never override browser shortcuts with Alt. Restore focus after closing dialogs and drawers.

- [ ] **Step 4: Verify keyboard suite**

Run: `cd apps/web && npm test -- src/lib/hooks/useKeyboardShortcuts.test.tsx`  
Expected: PASS.

Run: `cd apps/web && npm test`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/hooks apps/web/src/components/common/CommandPalette.tsx apps/web/src/components/common/FilterBar.tsx
git commit -m "feat(web): complete keyboard navigation contract"
```

---

### Task 5: Accessibility Release Gate

**Files:**
- Modify: `apps/web/package.json`
- Modify: `apps/web/package-lock.json`
- Create: `apps/web/e2e/accessibility.spec.ts`
- Modify: `apps/web/src/lib/theme.ts`
- Modify: `apps/web/src/components/common/StatusBadge.tsx`
- Modify: `apps/web/src/components/common/DeadlineIndicator.tsx`
- Modify: `apps/web/src/components/common/PageHeader.tsx`
- Modify: `apps/web/src/components/common/ViewSwitcher.tsx`
- Modify: `apps/web/src/components/common/FilterBar.tsx`
- Modify: `apps/web/src/components/layout/Layout.tsx`
- Modify: `apps/web/src/components/tasks/TaskDetailDialog.tsx`

**Interfaces:**
- Consumes: all major authenticated routes.
- Produces: automated Axe and monochrome status checks.

- [ ] **Step 1: Install Axe and write failing checks**

Run: `cd apps/web && npm install -D @axe-core/playwright`.

```ts
import AxeBuilder from '@axe-core/playwright'

for (const route of ['/', '/tasks', '/inbox', '/projects', '/knowledge', '/analytics', '/settings']) {
  test(`${route} has no serious accessibility violations`, async ({ page }) => {
    await login(page)
    await page.goto(route)
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? ''))).toEqual([])
  })
}
```

- [ ] **Step 2: Run accessibility suite and record failures**

Run: `cd apps/web && npx playwright test e2e/accessibility.spec.ts --project=chromium`  
Expected: FAIL until missing labels, heading order, contrast, and focus issues are corrected.

- [ ] **Step 3: Fix violations in shared primitives first**

Correct `StatusBadge`, icon buttons, tabs, dialogs, heading hierarchy, and theme focus/contrast. Add page-specific fixes only when a shared component cannot own the behavior.

- [ ] **Step 4: Verify accessibility and keyboard-only journeys**

Run: `cd apps/web && npx playwright test e2e/accessibility.spec.ts --project=chromium`  
Expected: PASS with zero serious or critical violations.

Run: `cd apps/web && npm run lint && npm run build`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/package.json apps/web/package-lock.json apps/web/e2e/accessibility.spec.ts apps/web/src/lib/theme.ts apps/web/src/components/common/StatusBadge.tsx apps/web/src/components/common/DeadlineIndicator.tsx apps/web/src/components/common/PageHeader.tsx apps/web/src/components/common/ViewSwitcher.tsx apps/web/src/components/common/FilterBar.tsx apps/web/src/components/layout/Layout.tsx apps/web/src/components/tasks/TaskDetailDialog.tsx
git commit -m "test(web): enforce accessibility release gate"
```

---

### Task 6: Visual Regression and Bundle Boundary Gate

**Files:**
- Create: `apps/web/e2e/visual.spec.ts`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/playwright.config.ts`
- Create: `apps/web/src/components/common/RouteLoadingState.tsx`

**Interfaces:**
- Consumes: stable seeded test data and completed UI.
- Produces: route-level code splitting and reproducible screenshots.

- [ ] **Step 1: Write visual checks and route-size assertion**

```ts
const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'laptop', width: 1024, height: 768 },
  { name: 'mobile', width: 390, height: 844 },
]

for (const viewport of viewports) {
  test(`dashboard ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await login(page)
    await page.goto('/')
    await expect(page).toHaveScreenshot(`dashboard-${viewport.name}.png`, { fullPage: true })
  })
}
```

- [ ] **Step 2: Run visual suite and verify baseline generation**

Run: `cd apps/web && npx playwright test e2e/visual.spec.ts --project=chromium --update-snapshots`  
Expected: snapshot files are generated for desktop, laptop, and mobile.

- [ ] **Step 3: Add route-level lazy loading**

```tsx
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const TasksPage = lazy(() => import('@/pages/TasksPage'))
const ProjectsPage = lazy(() => import('@/pages/ProjectsPage'))

<Suspense fallback={<RouteLoadingState />}>
  <Routes>{/* existing routes */}</Routes>
</Suspense>
```

Use one `RouteLoadingState` that preserves the page shell and does not blank the application. Do not lazy-load small shared primitives.

- [ ] **Step 4: Run the final UX quality gate**

Run: `cd apps/web && npm test && npm run lint && npm run build`  
Expected: PASS and the build no longer emits a single 1 MB application chunk.

Run: `cd apps/web && npx playwright test --project=chromium`  
Expected: P0, P1, accessibility, and visual suites pass.

- [ ] **Step 5: Commit final gate**

```bash
git add apps/web/src/App.tsx apps/web/src/components/common/RouteLoadingState.tsx apps/web/playwright.config.ts apps/web/e2e
git commit -m "perf(web): add route boundaries and visual gate"
```

## P2 Manual Review

1. Compare current and previous periods in Reports and verify every conclusion is traceable to data.
2. Change a personal notification setting and confirm workspace defaults remain unchanged.
3. Attempt a production-impacting setting and verify explicit impact confirmation.
4. Complete Dashboard, Inbox, Tasks, and Projects workflows at 390 px without horizontal scroll.
5. Complete daily work with keyboard only in light and dark themes.
6. Inspect statuses in grayscale and confirm text/icon still communicates meaning.
7. Review visual snapshots at 1440, 1024, and 390 px for overlap, clipping, and unstable layout.
