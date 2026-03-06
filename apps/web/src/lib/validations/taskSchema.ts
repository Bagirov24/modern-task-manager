import { z } from 'zod'

export const taskSchema = z.object({
  title: z.string().min(1, 'Название обязательно').max(500),
  description: z.string().max(5000).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  due_date: z.string().optional(),
  project_id: z.string().uuid().optional(),
  label_ids: z.array(z.string().uuid()).optional(),
})

export type TaskFormData = z.infer<typeof taskSchema>
