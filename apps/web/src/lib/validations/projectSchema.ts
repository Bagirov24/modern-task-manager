import { z } from 'zod'

export const projectCreateSchema = z.object({
  name: z.string()
    .min(1, 'Название проекта обязательно')
    .max(100, 'Название не должно превышать 100 символов'),
  description: z.string()
    .max(500, 'Описание не должно превышать 500 символов')
    .optional()
    .default(''),
  color: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Неверный формат цвета')
    .optional()
    .default('#1976d2'),
  icon: z.string().optional().default('folder'),
})

export const projectUpdateSchema = projectCreateSchema.partial()

export const commentCreateSchema = z.object({
  content: z.string()
    .min(1, 'Комментарий не может быть пустым')
    .max(2000, 'Комментарий не должен превышать 2000 символов'),
  task_id: z.string().uuid(),
})

export const labelCreateSchema = z.object({
  name: z.string()
    .min(1, 'Название метки обязательно')
    .max(50, 'Название не должно превышать 50 символов'),
  color: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Неверный формат цвета')
    .optional()
    .default('#9e9e9e'),
})

export const subtaskCreateSchema = z.object({
  title: z.string()
    .min(1, 'Название подзадачи обязательно')
    .max(200, 'Название не должно превышать 200 символов'),
  is_completed: z.boolean().optional().default(false),
})

export type ProjectCreate = z.infer<typeof projectCreateSchema>
export type ProjectUpdate = z.infer<typeof projectUpdateSchema>
export type CommentCreate = z.infer<typeof commentCreateSchema>
export type LabelCreate = z.infer<typeof labelCreateSchema>
export type SubtaskCreate = z.infer<typeof subtaskCreateSchema>
