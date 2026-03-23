import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { taskSchema, TaskFormData } from '@/lib/validations/taskSchema'
import { useTaskStore } from '@/lib/store/taskStore'
import {
  Card,
  CardContent,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  IconButton,
  Collapse,
  Box,
} from '@mui/material'
import { Add as AddIcon, Close as CloseIcon } from '@mui/icons-material'

export default function AddTask() {
  const [isOpen, setIsOpen] = useState(false)
  const addTask = useTaskStore((s) => s.addTask)
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
  })

  const onSubmit = (data: TaskFormData) => {
    addTask({
      id: crypto.randomUUID(),
      ...data,
      status: 'todo',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any)
    reset()
    setIsOpen(false)
  }

  if (!isOpen) {
    return (
      <Button
        startIcon={<AddIcon />}
        onClick={() => setIsOpen(true)}
        sx={{ color: 'text.secondary', justifyContent: 'flex-start', py: 1.5 }}
      >
        Добавить задачу
      </Button>
    )
  }

  return (
    <Collapse in={isOpen}>
      <Card
        sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'primary.main' }}
        elevation={0}
      >
        <CardContent>
          <Stack component="form" onSubmit={handleSubmit(onSubmit)} spacing={2}>
            <TextField
              {...register('title')}
              placeholder="Название задачи"
              autoFocus
              fullWidth
              error={!!errors.title}
              helperText={errors.title?.message}
              variant="standard"
              InputProps={{ sx: { fontSize: '0.95rem' } }}
            />

            <TextField
              {...register('description')}
              placeholder="Описание (необязательно)"
              multiline
              rows={2}
              fullWidth
              variant="standard"
              InputProps={{ sx: { fontSize: '0.875rem' } }}
            />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Приоритет</InputLabel>
                <Select {...register('priority')} defaultValue="low" label="Приоритет">
                  <MenuItem value="low">Низкий</MenuItem>
                  <MenuItem value="medium">Средний</MenuItem>
                  <MenuItem value="high">Высокий</MenuItem>
                  <MenuItem value="urgent">Срочный</MenuItem>
                </Select>
              </FormControl>

              <Stack direction="row" spacing={1}>
                <IconButton onClick={() => { reset(); setIsOpen(false) }} size="small">
                  <CloseIcon />
                </IconButton>
                <Button type="submit" variant="contained" size="small">
                  Добавить
                </Button>
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Collapse>
  )
}
