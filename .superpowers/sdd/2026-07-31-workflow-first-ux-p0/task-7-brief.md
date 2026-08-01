# Task 7: P0 Accessibility and End-to-End Gate

Base commit: `dcabc26`

## Requirement Audit

| Requirement | Existing implementation | Status | Decision |
|---|---|---|---|
| Desktop/mobile app shell | `Layout`, `Sidebar`, `MobileNavigation` | reuse | Exercise existing responsive navigation in browser E2E |
| Context-preserving task drawer | URL-driven `TaskDetailDialog` and Task 6 regressions | reuse | Verify direct task URL, Escape close, mobile full width, and focus restoration |
| Command search and arrow navigation | Mounted `CommandPalette` already handles ArrowUp, ArrowDown, Enter, and Escape | extend | Keep one palette; exercise it in E2E and stabilize global shortcuts |
| Slash search | Tasks page already focuses its local task search | extend | Preserve local handler; global slash opens the mounted palette only when no page handler consumed the event |
| Quick create shortcut | Global `C` shortcut and `QuickTaskDialog` exist | reuse | Verify it and do not create another modal |
| Overlay close | MUI dialogs/drawers plus palette Escape handling exist | extend | Add a UI-store Escape fallback without intercepting editable controls |
| Icon-only controls | Most P0 controls have tooltips or labels, several miss one half | extend | Add both tooltip and `aria-label` to visible P0 icon-only controls |
| Legacy search dialog | Unmounted `SearchDialog` duplicates the command palette and Ctrl/Cmd+K listener | remove | Delete the unused duplicate |
| Playwright | Config and stale smoke suite exist; dependency is undeclared and command uses pnpm | extend | Declare `@playwright/test`, use npm, and add the approved workflow spec |
| E2E data | Existing backend auth/project/task APIs | reuse | Create a unique user/project/task through existing APIs; store no fixed credentials or tokens |
| Local frontend/API bridge | Vite proxy assumes Docker DNS while Playwright starts host npm | extend | Make proxy target configurable and point Playwright at the healthy local API |

## Planned Files

- Modify `apps/web/package.json` and `apps/web/package-lock.json`.
- Modify `apps/web/playwright.config.ts`.
- Modify `apps/web/vite.config.ts` only for configurable local API proxying.
- Create `apps/web/e2e/workflow-first-p0.spec.ts`.
- Modify `apps/web/src/lib/hooks/useKeyboardShortcuts.ts`.
- Create `apps/web/src/lib/hooks/useKeyboardShortcuts.test.tsx`.
- Remove unused `apps/web/src/components/common/SearchDialog.tsx`.
- Modify only P0 shell/task files that have confirmed icon-button accessibility gaps.
- Write `task-7-report.md`; update `progress.md` only when the checkpoint is saved.

## Required Behavior

1. `Ctrl/Cmd+K` opens the single command palette.
2. `/` keeps the Tasks page local-search behavior; elsewhere it opens and focuses command search.
3. `C` opens existing quick task creation.
4. `Escape` closes active UI-store overlays without stealing normal typing/editor keys.
5. Command palette ArrowUp/ArrowDown and Enter remain functional.
6. Keyboard shortcuts do not fire from input, textarea, select, or contenteditable targets; already prevented events are respected.
7. Every visible P0 icon-only button has an accessible name and tooltip.
8. Desktop E2E completes Dashboard -> task workspace -> Communications -> Escape without losing URL context.
9. Mobile E2E exposes the five-item bottom navigation and a full-width task drawer at 390 x 844.
10. E2E setup uses unique non-secret credentials and existing APIs; no token is printed or persisted in source.

## RED / GREEN

1. Install the declared Playwright test dependency.
2. Add E2E and shortcut tests, then record RED for incomplete behavior/configuration.
3. Implement the smallest production changes.
4. Run:

```powershell
cd apps/web
npm test -- src/lib/hooks/useKeyboardShortcuts.test.tsx
npm test
npm run lint
npm run build
npx playwright test e2e/workflow-first-p0.spec.ts --project=chromium
```

5. Run backend health before E2E and fail with an actionable message when the API is unavailable.

## Commit

`test(web): cover workflow-first P0 journeys`
