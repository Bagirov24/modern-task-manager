import type { ReactElement, SyntheticEvent } from 'react'
import { Tab, Tabs } from '@mui/material'
import {
  CalendarMonth as CalendarIcon,
  Timeline as TimelineIcon,
  ViewKanban as KanbanIcon,
  ViewList as ListIcon,
} from '@mui/icons-material'
import type { TaskView } from '@/store/uiStore'

interface ViewSwitcherProps {
  value: TaskView
  onChange: (view: TaskView) => void
}

const views: Array<{ value: TaskView; label: string; icon: ReactElement }> = [
  { value: 'list', label: 'Список', icon: <ListIcon fontSize="small" /> },
  { value: 'kanban', label: 'Kanban', icon: <KanbanIcon fontSize="small" /> },
  { value: 'calendar', label: 'Календарь', icon: <CalendarIcon fontSize="small" /> },
  { value: 'timeline', label: 'Timeline', icon: <TimelineIcon fontSize="small" /> },
]

export default function ViewSwitcher({ value, onChange }: ViewSwitcherProps) {
  const handleChange = (_event: SyntheticEvent, next: TaskView) => onChange(next)

  return (
    <Tabs
      data-testid="task-view-switcher"
      value={value}
      onChange={handleChange}
      aria-label="Представление задач"
      variant="scrollable"
      scrollButtons="auto"
      sx={{
        flex: 1,
        minWidth: 0,
        maxWidth: '100%',
        minHeight: 44,
        '& .MuiTab-root': { minHeight: 44, minWidth: 96 },
      }}
    >
      {views.map((view) => (
        <Tab key={view.value} value={view.value} icon={view.icon} iconPosition="start" label={view.label} />
      ))}
    </Tabs>
  )
}
