# Frontend UX Contracts

Этот документ описывает data-контракты между API и фронтендом
для всех 10 UX-улучшений (5 волна-1 + 5 волна-2).

---

## Волна 1 — Высокий impact, низкая стоимость

### #ux-1 — Overdue Indicator (Red stripe + ⚠️)

**API:** `ProjectResponse.is_overdue`, `TaskResponse.is_overdue` → `bool`

```tsx
<div className={project.is_overdue ? 'bg-red-400' : ''}
     style={!project.is_overdue ? {backgroundColor: project.color} : undefined} />
{task.is_overdue && <span className="text-red-400">⚠️ {formatDate(task.due_date)}</span>}
```

### #ux-2 — Drag Handle (⠿)

**API:** `position: int` + `PATCH /projects/{id}/reorder`

```css
.drag-handle { opacity: 0; cursor: grab; }
.project-card:hover .drag-handle { opacity: 1; }
```
```tsx
onDragEnd: async ({active, over}) => {
  const newPos = getNewPosition(items, active.id, over.id);
  await api.patch(`/projects/${active.id}/reorder`, {position: newPos});
}
```

### #ux-3 — Member Avatar Tooltip

**API:** `MemberResponse.{display_name, avatar_color, initials}`

```tsx
<Tooltip content={`${m.display_name} · ${m.role}`}>
  <Avatar style={{backgroundColor: m.avatar_color}} initials={m.initials} />
</Tooltip>
```

### #ux-4 — Checklist Progress

**API:** `TaskResponse.checklist_summary.{total, completed, progress}`

```tsx
{summary.total > 0 && (
  <div className="checklist-header">
    <span>☑ {summary.completed}/{summary.total}</span>
    <ProgressBar value={summary.progress} />
  </div>
)}
```

### #ux-5 — Empty State / Onboarding

**API:** `GET /projects/empty-state` → всегда HTTP 200

```tsx
if (!data.has_projects) return <EmptyState templates={data.suggested_templates} />;
return <ProjectGrid />;
```

---

## Волна 2 — Требуют дизайн-решения

### #ux-6 — Переключатель видов Grid / List / Kanban

**API:** `GET/PATCH /users/me/preferences` → `UserPreferencesResponse`

```tsx
// Топбар — правый угол
<ViewToggle current={view} onChange={async (v) => {
  setView(v);
  await api.patch('/users/me/preferences', {last_view_mode: v});
}} />

// Рендер
const views = {
  grid:   <ProjectGrid   projects={projects} />,
  list:   <ProjectTable  projects={projects} />,
  kanban: <KanbanBoard   projects={projects} />,
};
return views[view];
```

**ViewToggle component:**
```tsx
// ⊞ = grid, ≡ = list, ▦ = kanban
const icons: Record<ViewMode, string> = {grid:'⊞', list:'≡', kanban:'▦'};
<div className="flex gap-1 rounded-md border border-border p-0.5">
  {(['grid','list','kanban'] as ViewMode[]).map(v => (
    <button
      key={v}
      className={current === v ? 'bg-sky-500/20 text-sky-400' : 'text-muted'}
      onClick={() => onChange(v)}
    >{icons[v]}</button>
  ))}
</div>
```

### #ux-7 — Аккордеоны правой панели задачи

**API:** `GET /tasks/{id}/panel` → `TaskDetailPanelResponse`

```tsx
const sections = [
  {id:'who',   icon:'👤', title:'Кто',   data: panel.who},
  {id:'where', icon:'🗂', title:'Где',   data: panel.where},
  {id:'links', icon:'🔗', title:'Связи', data: panel.links},
];

{sections.map(s => (
  <Accordion key={s.id} defaultCollapsed={s.data.collapsed}
             badge={s.data.badge_count > 0 ? s.data.badge_count : undefined}>
    <AccordionTrigger>{s.icon} {s.title}</AccordionTrigger>
    <AccordionContent>
      {s.id === 'who'   && <WhoPanel   data={panel.who}   />}
      {s.id === 'where' && <WherePanel data={panel.where} />}
      {s.id === 'links' && <LinksPanel data={panel.links} />}
    </AccordionContent>
  </Accordion>
))}
```

### #ux-8 — Унификация тегов Project ↔ Task

**API:** `UnifiedTagResponse.{scope, visual_type, slug}`

```tsx
// visual_type определяет форму чипа
<Tag style={{
  borderRadius: tag.visual_type === 'round' ? '9999px' : '4px',
  backgroundColor: hexToRgba(tag.color, 0.12),
  borderColor:     hexToRgba(tag.color, 0.40),
}}>
  {tag.visual_type === 'round' ? '🏷' : '🗂'} #{tag.name}
</Tag>
```

### #ux-9 — Tag Dropdown (автокомплит)

**API:** `GET /tags/search?q=bac&scope=all`

```tsx
const {data} = useQuery(['tag-search', q], () =>
  api.get(`/tags/search?q=${q}&scope=all`)
);

<TagDropdown>
  <Section title="Недавние">
    {data.recent.map(t => <TagOption tag={t} />)}
  </Section>
  <Divider />
  <Section title="Результаты">
    {data.matching.map(t => <TagOption tag={t} />)}
  </Section>
  {data.total_matching > data.matching.length && (
    <p className="text-muted text-xs">+ ещё {data.total_matching - data.matching.length}</p>
  )}
</TagDropdown>
```

### #ux-10 — Зависимости задач — кликабельные ссылки

**API:** `DependencyPreview.{id, title, status, priority, is_overdue}`
(из `GET /tasks/{id}/panel` → `links.blocks` + `links.blocked_by`)

```tsx
// LinksPanel component
function DepLink({dep}: {dep: DependencyPreview}) {
  const color = dep.is_overdue ? 'text-red-400'
    : dep.status === 'done'    ? 'text-muted'
    : 'text-sky-400';
  return (
    <Link to={`/tasks/${dep.id}`} className={`flex items-center gap-2 ${color}`}>
      <PriorityIcon priority={dep.priority} />
      <span>{dep.title}</span>
      {dep.is_overdue && <span>⚠️</span>}
    </Link>
  );
}

// В LinksPanel
{panel.links.blocks.length > 0 && (
  <div>
    <p className="text-xs text-muted mb-1">Блокирует</p>
    {panel.links.blocks.map(d => <DepLink key={d.id} dep={d} />)}
  </div>
)}
{panel.links.blocked_by.length > 0 && (
  <div>
    <p className="text-xs text-muted mb-1">Ожидает</p>
    {panel.links.blocked_by.map(d => <DepLink key={d.id} dep={d} />)}
  </div>
)}
```

---

## Сводная таблица всех 10 улучшений

| # | Волна | Улучшение | API | Фронтенд |
|---|-------|-----------|-----|----------|
| ux-1 | 1 | Overdue indicator | `is_overdue: bool` на Project+Task | Красная полоса, ⚠️ |
| ux-2 | 1 | Drag handle | `position` + PATCH reorder | ⠿ на hover, @dnd-kit |
| ux-3 | 1 | Avatar tooltip | `display_name, avatar_color, initials` | Tooltip при hover |
| ux-4 | 1 | Checklist progress | `checklist_summary.{total,completed,progress}` | ☑ N/M + мини-бар |
| ux-5 | 1 | Empty state | `GET /projects/empty-state` | Онбординг-экран |
| ux-6 | 2 | View modes | `GET/PATCH /users/me/preferences` | ⊞ ≡ ▦ в топбаре |
| ux-7 | 2 | Panel accordions | `GET /tasks/{id}/panel` | 3 аккордеона |
| ux-8 | 2 | Tag unification | `UnifiedTagResponse.{scope, visual_type}` | 🗂 квадрат / 🏷 круг |
| ux-9 | 2 | Tag dropdown | `GET /tags/search?q=&scope=` | Автокомплит |
| ux-10 | 2 | Dep links | `DependencyPreview` в panel.links | `<Link>` с preview |
