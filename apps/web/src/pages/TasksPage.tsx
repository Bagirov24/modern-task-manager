import TaskList from '@/components/tasks/TaskList'
import AddTask from '@/components/tasks/AddTask'
import { Container, Typography, Box, Chip, Stack } from '@mui/material'
import { useTaskStore } from '@/lib/store/taskStore'

export default function TasksPage() {
  const tasks = useTaskStore((s) => s.tasks)
  const todoCount = tasks.filter((t) => t.status === 'todo').length
  const doneCount = tasks.filter((t) => t.status === 'done').length

  return (
    <Container maxWidth="md" disableGutters>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
            Мои задачи
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Управляйте своими задачами эффективно
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Chip label={`${todoCount} активных`} color="primary" variant="outlined" size="small" />
          <Chip label={`${doneCount} выполнено`} color="success" variant="outlined" size="small" />
        </Stack>
      </Box>

      <AddTask />

      <Box sx={{ mt: 3 }}>
        <TaskList />
      </Box>
    </Container>
  )
}
