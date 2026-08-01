# SDD ledger - plan: docs/superpowers/plans/2026-07-31-workflow-first-ux-p0.md
Task 1: fix round 1/5 (2 addressed, 0 open; commits cc83301..8940329)
Task 1: complete (commits ae9f3c4..8940329, review clean)
Task 2: attempt 1 interrupted before changes - implementer usage limit; worktree clean
Task 2: attempt 2 interrupted after RED test file only - implementer became unresponsive; no production files or commit
Task 2: attempt 3 interrupted before production changes - worktree path became read-only after environment profile changed; relocating worktree
Task 2: fix round 1/5 (3 addressed, 0 open; commits 535bd5f..27e6f1b)
Task 2: minor (deferred): additional deadline-type/fallback and uncommon AttentionState prop-combination coverage
Task 2: complete (commits 8940329..27e6f1b, review clean)
Task 3: PAUSED by user due to usage limits at HEAD 27e6f1b - only untracked apps/web/src/components/layout/AppShell.test.tsx exists; no production changes, tests, report, or commit; resume by validating this test against task-3-brief.md and observing RED
Task 3: resumed - AppShell.test.tsx matches brief; RED confirmed 2/2 failed (missing grouped desktop labels and mobile navigation; legacy duplicate FABs still rendered), command npm test -- src/components/layout/AppShell.test.tsx, HEAD 27e6f1b
Task 3: fix round 1/5 (1 addressed, 0 open; commits 8bd39a4..fd9da23)
Task 3: complete (commits 27e6f1b..fd9da23, review clean)
Task 4: fix round 1 recovery - original implementer became unresponsive with 22 changed paths and no fix commit; changes preserved in worktree at base 6ba75c4 for fresh implementer
Task 4: fix round 1/5 (5 addressed, 3 open - stats partial failure, blocked/missing risk, Inbox waiting scope; commits 6ba75c4..a750a06)
Task 4: fix round 2/5 (2 addressed, 1 open - empty-string missing action; commits a750a06..4e0c589)
Task 4: fix round 3/5 (one-of-six stats coverage addressed, 1 open - tab/newline whitespace missing action; commits 4e0c589..aa77ed7)
Task 4: fix round 4/5 PAUSED - fresh implementer became unresponsive before changes; worktree clean at aa77ed7; remaining fix: PostgreSQL-safe whitespace-only predicate including tab/newline plus regression tests; DB integration blocked by isolated PostgreSQL connection loss
Task 4: fix round 4/5 correction - late commit c7be6fe completed POSIX whitespace predicate and tab/CRLF tests; supersedes preceding PAUSED line; pending scoped re-review
Task 4: fix round 4/5 (1 addressed, 0 open; commits aa77ed7..c7be6fe; POSIX whitespace predicate approved)
Task 4: minor (deferred verification): database-backed project stats assertion could not execute because isolated PostgreSQL disconnected during fixture setup; dialect compilation, syntax, ruff and scoped review clean
Task 4: complete (commits fd9da23..c7be6fe, review clean after 4 fix rounds)
Task 4: verification gap closed - PostgreSQL 16 database-backed project stats test passed inside Docker Compose with Redis (1 passed); prior Windows-host failure isolated to asyncpg/Docker NAT transport
Task 5: started at base c7be6fe - consistent task workspace shell, TDD and independent review required
Task 5: attempt 1 interrupted after RED test file only - implementer became unresponsive; no production changes or commit; test preserved for validation
Task 5: review round 1 found 3 Important - project chip not applied, calendar state/content mismatch with lost URL params, mobile header overflow; fix round 1 started from a076bca
Task 5: fix round 1 attempt A interrupted before changes - fix implementer became unresponsive; worktree clean at a076bca
Task 5: fix round 1 review - project filtering and mobile overflow closed; Calendar SPA navigation closed reload/state mismatch but preserved project_id/preset are not consumed by CalendarPage, 1 Important remains; fix round 2 started at d786c6a
Task 5: fix round 2 implementation verified locally - Calendar consumes project_id/preset, shared preset logic, focused 15/15, full frontend 71/71, build pass; pending final scoped review and commit
Task 5: fix round 2/5 (1 addressed, 0 open; commits d786c6a..a600293; Calendar consumes URL filters through shared preset logic)
Task 5: complete (commits c7be6fe..a600293, final independent review APPROVED; focused 15/15, full frontend 71/71, production build pass)
CHECKPOINT: stop after Task 5 at HEAD a600293 on codex/workflow-first-ux-p0; worktree should be clean; next action is extract/validate Task 6 Context-preserving Task Drawer brief and begin RED TaskDrawer.test.tsx
CHECKPOINT correction: final saved HEAD is c6932da (verification report commit after implementation HEAD a600293); resume Task 6 from c6932da
Task 6: started at base c6932da - context-preserving task drawer, strict TDD and independent review required
Task 6: attempt 1 recovery - implementer became unresponsive after full integration diff and RED tests; no commit/report, changes preserved at base c6932da; parent focused TaskDrawer suite passed 6/6
Task 6: URGENT PAUSE requested by user; implementer stopped and all current changes preserved
Task 6 checkpoint status: initial focused drawer suite passed 6/6 before latest recovery-test edits; latest browser-back/invalid-url/count recovery patch may be partially applied and is NOT reverified
Task 6 resume action: inspect diff at WIP checkpoint, repair TaskDrawer.test.tsx setup, implement/verify URL close + invalid id cleanup + tab counts, then run focused/full/build/backend tests and independent review
CHECKPOINT: Task 6 WIP saved at HEAD 7dd4a9d on codex/workflow-first-ux-p0; resume from this commit, worktree expected clean; do not treat Task 6 as complete until verification/review
Task 6: final hardening complete (commits c6932da..dcabc26; task identities, explicit historical Alembic baseline, fresh PostgreSQL base-to-head regression, frontend 87/87, backend 21/21, build/lint/ruff clean)
Task 7: started at base dcabc26 - P0 accessibility and browser end-to-end gate, strict RED/GREEN and independent review requested
Task 7: RED confirmed shortcut gaps and stale Playwright host setup; browser runs then exposed notification 307-to-401 logout, transient auth 429 logout, and default-open mobile sidebar
Task 7: GREEN complete - focused 8/8, full frontend 94/94, Chromium/Firefox desktop+mobile E2E 4/4, TypeScript/build/API health pass, lint 0 errors with unchanged 74-warning legacy baseline
Task 7: complete (commits dcabc26..d578244; parent review clean; two independent read-only reviewer attempts timed out without findings and were stopped)
Task 7: residual - React Router GHSA-qwww-vcr4-c8h2 has no fully patched published release; current SPA does not use affected RSC action mode, monitor and upgrade when available
CHECKPOINT: Workflow-first UX P0 plan complete at implementation HEAD d578244 on codex/workflow-first-ux-p0; next work must begin with a new audited plan rather than extending this completed seven-task plan
Task 7: final acceptance hardening closed responsive-width, pin-refresh, all-view persistence, offline-retry, rate-limit isolation, and Sensitive Data Guard fixture-flake coverage
Task 7: final browser gate complete - Chromium and Firefox 10/10 across desktop, 1440/1024 acceptance, offline recovery, and 390x844 mobile
CHECKPOINT: Workflow-first UX P0 acceptance re-audit complete; all 35 plan steps and seven manual-review checks are recorded as complete, browser gate 10/10, frontend 94/94, backend 21/21
