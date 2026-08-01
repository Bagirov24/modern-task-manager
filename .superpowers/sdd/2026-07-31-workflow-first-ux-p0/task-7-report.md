# Task 7 Implementation Report

## Audit

- Reused the mounted `CommandPalette`, existing `QuickTaskDialog`, URL-owned Task 6 drawer, `Layout`, `Sidebar`, `MobileNavigation`, and current auth/project/task APIs.
- Extended the existing shortcut hook and P0 icon controls; no duplicate palette, task modal, route, API, or model was added.
- Removed the confirmed unmounted `SearchDialog` duplicate and its competing Ctrl/Cmd+K listener.
- Kept the Tasks-page `/` search owner: the global shortcut respects `defaultPrevented` and only opens the command palette when a page control did not consume the key.
- Made the host Vite proxy configurable while preserving Docker DNS defaults.

## RED / GREEN

- Shortcut RED: 2 failed and 2 passed before `/` and global Escape behavior were implemented.
- Initial Playwright RED: the stale `pnpm` web-server command never reached the configured port.
- Browser RED then exposed three production defects: notification collection redirect stripped Authorization and caused logout, transient `/auth/me` 429 responses cleared valid sessions, and the mobile sidebar opened over the app by default.
- Focused shortcut/auth/UI-store GREEN: 3 files, 8 tests passed.
- Full frontend GREEN: 18 files, 94 tests passed.
- Browser GREEN: 4/4 P0 journeys passed on Chromium and Firefox across desktop and 390 x 844 mobile viewports.
- TypeScript passed with `npx tsc --noEmit`.
- Production build passed with TypeScript and Vite.
- Frontend lint passed with 0 errors and the unchanged 74-warning legacy baseline.
- Runtime API check returned HTTP 200 from `/health`.

## Implementation

- Added Ctrl/Cmd+K, context-aware `/`, `C`, and Escape handling with stable listeners.
- Preserved editable input behavior and already-consumed events; Escape can still close overlays from an active editor field.
- Added keyboard regression coverage for palette open, quick create, editable targets, `defaultPrevented`, and overlay close.
- Added a full workflow Playwright gate for Dashboard, task List, URL-owned drawer, Communications, Escape focus restoration, palette arrows, quick create, mobile bottom navigation, and full-width mobile drawer.
- Made E2E data worker-scoped with random in-memory credentials, existing APIs, bounded project/task cleanup, and no token output or source persistence.
- Added accessible names, tooltips, and mobile touch targets to active P0 shell, task, project, calendar, document, and useful-link icon controls.
- Kept task action controls visible without hover on touch layouts and visible on keyboard focus.
- Added an accessible dialog name to the task drawer and an accessible task-specific Focus Now open action.
- Changed the notification collection request to canonical `/notifications/`, eliminating the absolute redirect that dropped Authorization.
- Kept a valid local session on transient auth verification failures; only 401/403 now clear it.
- Closed the transient mobile sidebar by default and covered that state in the existing persistence suite.
- Configured API and WebSocket proxy targets for both Docker and host Playwright execution.
- Declared Playwright and added the `test:e2e` package script.

## Changed Files

- `apps/web/package.json`
- `apps/web/package-lock.json`
- `apps/web/playwright.config.ts`
- `apps/web/vite.config.ts`
- `apps/web/e2e/workflow-first-p0.spec.ts`
- `apps/web/src/components/common/SearchDialog.tsx` (removed)
- `apps/web/src/components/layout/Header.tsx`
- `apps/web/src/components/layout/Sidebar.tsx`
- `apps/web/src/components/tasks/KanbanBoard.tsx`
- `apps/web/src/components/tasks/TaskDetailDialog.tsx`
- `apps/web/src/components/tasks/TaskItem.tsx`
- `apps/web/src/components/tasks/drawer/TaskDrawerHeader.tsx`
- `apps/web/src/features/dashboard/FocusNowCard.tsx`
- `apps/web/src/lib/api/notificationApi.ts`
- `apps/web/src/lib/hooks/useKeyboardShortcuts.ts`
- `apps/web/src/lib/hooks/useKeyboardShortcuts.test.tsx`
- `apps/web/src/pages/CalendarPage.tsx`
- `apps/web/src/pages/DocumentsPage.tsx`
- `apps/web/src/pages/ProjectDetailPage.tsx`
- `apps/web/src/pages/ProjectsPage.tsx`
- `apps/web/src/pages/TasksPage.tsx`
- `apps/web/src/pages/WorkspaceLinksPage.tsx`
- `apps/web/src/store/authStore.ts`
- `apps/web/src/store/authStore.test.ts`
- `apps/web/src/store/uiStore.ts`
- `apps/web/src/store/uiStore.persistence.test.ts`

## API And Migrations

- No backend endpoint, schema, model, service, or migration was added or changed.
- Existing auth, project, task, communication, document, test-data, and workspace-link contracts remain backward compatible.
- Playwright consumes the existing APIs through a configurable local proxy.

## Decisions

- A page-local shortcut remains authoritative when it calls `preventDefault`; global shortcuts are the fallback.
- Escape is the only global shortcut allowed from editable targets.
- Mobile navigation starts unobstructed; the temporary sidebar opens only after an explicit user action.
- Transient auth verification failures preserve the last valid local session, while explicit 401/403 rejection still logs out.
- E2E fixtures are worker-scoped to reduce rate-limit pressure and use random non-production credentials kept only in process memory.
- The latest published React Router 7 release is retained because downgrading reintroduces multiple older XSS/DoS advisories and the release that npm identifies as the complete fix is not published.

## Review Status

- Parent review covered shortcut ownership, auth failure semantics, proxy behavior, mobile defaults, touch accessibility, E2E cleanup, and dependency changes.
- Two independent read-only reviewer attempts were started; neither returned a verdict within bounded waits, and both were stopped. Parent review therefore owns the final approval.
- No open Critical or Important parent-review findings remain.

## Residual Risks

- `npm audit` reports two high package findings for the direct/transitive React Router pair under `GHSA-qwww-vcr4-c8h2`. The affected feature is RSC action handling, which this SPA does not use, but no fully patched published release is currently available; the dependency must be upgraded when one is released.
- The existing production bundle remains about 1.08 MB before gzip and still emits the legacy chunk-size warning; route-level code splitting is a separate performance task.
- Frontend lint retains 74 pre-existing type, hook-dependency, and fast-refresh warnings but has no errors.
- Playwright browser binaries are local tooling prerequisites and are installed with `npx playwright install chromium firefox` on a new machine.
