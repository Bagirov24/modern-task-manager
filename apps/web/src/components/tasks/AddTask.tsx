import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { taskSchema, TaskFormData } from '@/lib/validations/taskSchema'
import { useTasks } from '@/lib/hooks/useTasks'
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
  const [loading, setLoading] = useState(false)
  const { createTask } = useTasks()
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
  })

  const onSubmit = async (data: TaskFormData) => {
    setLoading(true)
    try {
      await createTask({
        title: data.title,
        description: data.description,
        priority: data.priority || 'low',
        status: 'todo',
      })
      reset()
      setIsOpen(false)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <Button
        startIcon={<AddIcon />}
        onClick={() => setIsOpen(true)}
        sx={{ color: 'text.secondary', justifyContent: 'flex-start', py: 1.5 }}
      >
        \u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u0437\u0430\u0434\u0430\u0447\u0443
      </Button>
    )
  }

  return (
    <Collapse in={isOpen}>
      <Card
        sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'primary.main' }}
      >
        <CardContent>
          <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            <Stack spacing={2}>
              <TextField
                {...register('title')}
                label="\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435"
                size="small"
                fullWidth
                error={!!errors.title}
                helperText={errors.title?.message}
                autoFocus
              />
              <TextField
                {...register('description')}
                label="\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435"
                size="small"
                fullWidth
                multiline
                rows={2}
              />
              <FormControl size="small" fullWidth>
                <InputLabel>\u041f\u0440\u0438\u043e\u0440\u0438\u0442\u0435\u0442</InputLabel>
                <Controller
                  name="priority"
                  control={control}
                  defaultValue="medium"
                  render={({ field }) => (
                    <Select {...field} label="\u041f\u0440\u0438\u043e\u0440\u0438\u0442\u0435\u0442">
                      <MenuItem value="low">\u041d\u0438\u0437\u043a\u0438\u0439</MenuItem>
                      <MenuItem value="medium">\u0421\u0440\u0435\u0434\u043d\u0438\u0439</MenuItem>
                      <MenuItem value="high">\u0412\u044b\u0441\u043e\u043a\u0438\u0439</MenuItem>
                      <MenuItem value="urgent">\u0421\u0440\u043e\u0447\u043d\u044b\u0439</MenuItem>
                    </Select>
                  )}
                />
              </FormControl>
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button
                  variant="text"
                  onClick={() => { reset(); setIsOpen(false) }}
                  size="small"
                >
                  \u041e\u0442\u043c\u0435\u043d\u0430
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  size="small"
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={16} /> : undefined}
                >
                  \u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c
                </Button>
              </Stack>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Collapse>
  )
}
