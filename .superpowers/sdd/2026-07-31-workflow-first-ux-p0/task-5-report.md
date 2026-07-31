# Task 5 Implementation Report

## Scope

Implemented the consistent task workspace shell without changing task API contracts or replacing existing task views.

## Inherited RED

The preserved test was run before production integration:

`npm test -- src/components/tasks/TaskWorkspace.test.tsx`

Result: 4/4 tests failed against production because accessible view tabs, removable URL filter chips, persisted UI view state, and slash-to-focus behavior were missing.

## Implementation

- Added shared `PageHeader`, `ViewSwitcher`, and `FilterBar` components.
- Added accessible MUI tabs for List, Kanban, Calendar, and Timeline.
- Made `uiStore.lastTaskView` the Tasks page source of truth and kept `taskStore.setViewMode` as a compatibility mirror.
- Preserved unrelated URL parameters when changing views or removing filters.
- Added project and preset filter chips with accessible removal labels.
- Added slash-to-focus behavior that does not steal focus from editable controls.
- Kept the existing Calendar navigation and task dialogs, queries, status filters, and view components.
- Updated the UI persistence contract test for `lastTaskView`.

## Verification

- `npm test -- src/components/tasks/TaskWorkspace.test.tsx`: 4 passed.
- `npm test -- src/components/tasks/TaskWorkspace.test.tsx src/store/uiStore.persistence.test.ts src/components/layout/AppShell.test.tsx`: 8 passed.
- `npm test`: 14 files passed, 64 tests passed.
- `npm run build`: TypeScript and Vite production build passed.

## Changed Files

- `apps/web/src/components/common/PageHeader.tsx`
- `apps/web/src/components/common/ViewSwitcher.tsx`
- `apps/web/src/components/common/FilterBar.tsx`
- `apps/web/src/components/tasks/TaskWorkspace.test.tsx`
- `apps/web/src/pages/TasksPage.tsx`
- `apps/web/src/store/uiStore.ts`
- `apps/web/src/store/uiStore.persistence.test.ts`

## Remaining Risks

- Calendar remains the existing dedicated `/calendar` workspace rather than rendering a second calendar implementation inside Tasks.
- The existing Vite bundle-size warning remains unchanged and is outside Task 5 scope.

## First Review Fixes

- Passed the URL `project_id` filter into `useTasksQuery` so project chips and fetched data stay aligned.
- Routed Calendar through React Router to `/calendar`, preserving all query parameters except `view`.
- Kept Calendar outside the persisted task-view preference and redirected direct `/tasks?view=calendar` entries before rendering task content.
- Made header actions mobile-first at full width with wrapping and zero minimum width.
- Made the view switcher shrinkable and horizontally scrollable with 44px tab targets.

### Regression Cycle

- RED: `npm test -- --run src/components/tasks/TaskWorkspace.test.tsx` produced 1 failure and 7 passes; the mobile action wrapper was absent.
- GREEN: `npm test -- --run src/components/tasks/TaskWorkspace.test.tsx` produced 8 passes.

### Review Verification

- `npm run build`: TypeScript and Vite production build passed.
- Vite continues to report the pre-existing chunk-size warning.

