# Frontend UX Contracts

This document describes the data contracts between the API and the frontend
for each of the 5 high-impact UX improvements shipped in commit `ux/overdue-drag-tooltip-checklist-emptystate`.

---

## #ux-1 — Overdue Indicator (Red stripe + ⚠️)

**API fields:**
- `ProjectResponse.is_overdue: bool` — computed, always present
- `TaskResponse.is_overdue: bool` — computed, always present

**Frontend contract — ProjectCard:**
```tsx
<div
  className={`card-stripe ${
    project.is_overdue ? 'bg-red-400' : ''
  }`}
  style={!project.is_overdue ? { backgroundColor: project.color } : undefined}
/>
{project.is_overdue && project.due_date && (
  <span className="text-red-400">
    ⚠️ {formatDate(project.due_date)}
  </span>
)}
```

**Frontend contract — TaskRow:**
```tsx
<span className={task.is_overdue ? 'text-red-400' : 'text-muted'}>
  {task.is_overdue ? '⚠️ ' : '📅 '}{formatDate(task.due_date)}
</span>
```

---

## #ux-2 — Drag Handle (⠿)

**API fields:**
- `ProjectResponse.position: int` — sort key for @dnd-kit
- `PATCH /projects/{id}/reorder` — body `{ position: int }`

**Frontend contract:**
```tsx
// CSS
.drag-handle { opacity: 0; cursor: grab; }
.project-card:hover .drag-handle { opacity: 1; }

// Component
<div className="project-card">
  <span className="drag-handle" {...listeners}>⠿</span>
  {/* rest of card */}
</div>

// On drag end
onDragEnd: async ({ active, over }) => {
  if (!over || active.id === over.id) return;
  const newPos = getNewPosition(items, active.id, over.id);
  await api.patch(`/projects/${active.id}/reorder`, { position: newPos });
}
```

---

## #ux-3 — Member Avatar Tooltip

**API fields (MemberResponse):**
- `display_name: str` — e.g. `"Мария Петрова"`
- `avatar_color: str` — deterministic `#RRGGBB` from user UUID
- `initials: str` — e.g. `"МП"`
- `role: MemberRole` — `viewer | editor | admin`

**Frontend contract:**
```tsx
<Tooltip content={`${member.display_name} · ${member.role}`}>
  <Avatar
    style={{ backgroundColor: member.avatar_color }}
    initials={member.initials}
  />
</Tooltip>
```

---

## #ux-4 — Checklist Progress

**API fields (TaskResponse.checklist_summary):**
```json
{ "total": 6, "completed": 3, "progress": 50.0 }
```

**Frontend contract — above checklist section:**
```tsx
{summary.total > 0 && (
  <div className="checklist-header">
    <span>☑ {summary.completed}/{summary.total}</span>
    <ProgressBar value={summary.progress} color="sky" />
  </div>
)}
```

When `total === 0`, the checklist header is hidden entirely — no empty
progress bar shown.

---

## #ux-5 — Empty State / Onboarding

**Endpoint:** `GET /projects/empty-state` → always HTTP 200

**Response:**
```json
{
  "has_projects": false,
  "suggested_templates": [
    { "id": "...", "name": "Scrum Sprint", "icon": "🏃",
      "color": "#38bdf8", "section_count": 4, "task_count": 2 }
  ],
  "cta_primary": "Создать из шаблона",
  "cta_secondary": "Создать пустой проект"
}
```

**Frontend contract:**
```tsx
const { data } = useQuery(['empty-state'], fetchEmptyState);

if (!data.has_projects) {
  return (
    <EmptyState
      templates={data.suggested_templates}
      ctaPrimary={data.cta_primary}
      ctaSecondary={data.cta_secondary}
    />
  );
}

return <ProjectGrid />;
```

**EmptyState component layout:**
```
╭─────────────────────────────────────────╮
│  📂  Пока нет проектов                  │
│  Начните с шаблона или создайте свой    │
│                                         │
│  [🏃 Scrum Sprint]  [🚀 Запуск]  [✅]  │
│                                         │
│       [+ Создать пустой проект]         │
╰─────────────────────────────────────────╯
```

---

## Summary Table

| # | Change | API field / endpoint | Frontend action |
|---|--------|---------------------|----------------|
| ux-1 | Overdue indicator | `is_overdue: bool` on Project + Task | Red stripe, ⚠️ icon |
| ux-2 | Drag handle | `position: int` + PATCH reorder | ⠿ on hover, @dnd-kit |
| ux-3 | Avatar tooltip | `display_name`, `avatar_color`, `initials` | Tooltip on hover |
| ux-4 | Checklist progress | `checklist_summary.{total,completed,progress}` | ☑ N/M + mini bar |
| ux-5 | Empty state | GET /projects/empty-state | Onboarding screen |
