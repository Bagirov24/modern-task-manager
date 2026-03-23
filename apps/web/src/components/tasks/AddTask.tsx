import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { taskSchema, TaskFormData } from '@/lib/validations/taskSchema'
import { useCreateTask } from '@/lib/hooks/useTasks'
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
  CircularProgress,
} from '@mui/material'
import { Add as AddIcon, Close as CloseIcon } from '@mui/icons-material'

export default function AddTask() {
  const [isOpen, setIsOpen] = useState(false)
  const createMutation = useCreateTask()
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
  })

  const onSubmit = (data: TaskFormData) => {
    createMutation.mutate(
      {
        title: data.title,
        description: data.description,
        priority: data.priority || 'low',
        status: 'todo',
      },
      {
        onSuccess: () => {
          reset()
          setIsOpen(false)
        },
      }
    )
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
              label="Название задачи"
              fullWidth
              size="small"
              autoFocus
              error={!!errors.title}
              helperText={errors.title?.message}
            />
            <TextField
              {...register('description')}
              label="Описание"
              fullWidth
              size="small"
              multiline
              rows={2}
            />
            <FormControl size="small">
              <InputLabel>Приоритет</InputLabel>
              <Controller
                name="priority"
                control={control}
                defaultValue="low"
                render={({ field }) => (
                  <Select {...field} label="Приоритет">
                    <MenuItem value="low">Низкий</MenuItem>
                    <MenuItem value="medium">Средний</MenuItem>
                    <MenuItem value="high">Высокий</MenuItem>
                    <MenuItem value="urgent">Срочный</MenuItem>
                  </Select>
                )}
              />
            </FormControl>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <IconButton onClick={() => { reset(); setIsOpen(false) }} size="small">
                <CloseIcon />
              </IconButton>
              <Button
                type="submit"
                variant="contained"
                size="small"
                disabled={createMutation.isPending}
                startIcon={createMutation.isPending ? <CircularProgress size={16} /> : undefined}
              >
                Добавить
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Collapse>
  )
}
