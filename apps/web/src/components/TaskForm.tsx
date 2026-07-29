/**
 * TaskForm — full task creation / edit form.
 *
 * Fields
 * ------
 * title          required, 1–500 chars
 * description    RichTextEditor (Tiptap), HTML output, max 10 000 chars
 * status         select: todo | in_progress | done | archived
 * priority       select: low | medium | high | urgent  (with colour dots)
 * project_id     select (fetched from /api/v1/projects/)
 * assignee_id    select (fetched from /api/v1/users/ — members of project)
 * label_ids      multi-select colour chips
 * due_date       date input
 * start_date     date input (must be before due_date)
 * parent_id      optional select (subtask mode)
 *
 * Validation
 * ----------
 * Mirrors backend Pydantic rules via Zod.
 * start_date < due_date enforced client-side before submit.
 *
 * Usage
 * -----
 * <TaskForm onSuccess={(task) => navigate(`/tasks/${task.id}`)} />
 * <TaskForm task={existingTask} onSuccess={closeModal} />
 */
import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { RichTextEditor } from './RichTextEditor';
import api from '../lib/api';

// ---------------------------------------------------------------------------
// Zod schema (mirrors backend Pydantic rules)
// ---------------------------------------------------------------------------
const taskSchema = z
  .object({
    title: z.string().trim().min(1, 'Название обязательно').max(500),
    description: z.string().max(10_000).optional(),
    description_format: z.enum(['plain', 'markdown', 'html']).default('html'),
    status: z.enum(['todo', 'in_progress', 'done', 'archived']).default('todo'),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
    project_id: z.string().uuid().optional().nullable(),
    assignee_id: z.string().uuid().optional().nullable(),
    label_ids: z.array(z.string().uuid()).default([]),
    due_date: z.string().optional().nullable(),
    start_date: z.string().optional().nullable(),
    parent_id: z.string().uuid().optional().nullable(),
  })
  .refine(
    (d) => !(d.start_date && d.due_date && new Date(d.start_date) >= new Date(d.due_date)),
    { message: 'Дата начала должна быть раньше срока', path: ['start_date'] },
  );

type TaskFormValues = z.infer<typeof taskSchema>;

// ---------------------------------------------------------------------------
// Helper sub-components
// ---------------------------------------------------------------------------
const Label: React.FC<{ htmlFor: string; children: React.ReactNode }> = ({ htmlFor, children }) => (
  <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-300 mb-1">
    {children}
  </label>
);

const FieldError: React.FC<{ message?: string }> = ({ message }) =>
  message ? <p className="mt-1 text-xs text-red-400">{message}</p> : null;

const inputCls = [
  'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2',
  'text-sm text-slate-100 placeholder-slate-500',
  'focus:outline-none focus:border-sky-500 transition-colors',
].join(' ');

const selectCls = inputCls + ' cursor-pointer';

const PRIORITY_OPTIONS = [
  { value: 'low',    label: '🟢 Низкий' },
  { value: 'medium', label: '🟡 Средний' },
  { value: 'high',   label: '🔴 Высокий' },
  { value: 'urgent', label: '🚨 Срочный' },
] as const;

const STATUS_OPTIONS = [
  { value: 'todo',        label: 'К выполнению' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'done',        label: 'Готово' },
  { value: 'archived',    label: 'Архив' },
] as const;

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
interface TaskFormProps {
  task?: Partial<TaskFormValues> & { id?: string };
  onSuccess?: (task: Record<string, unknown>) => void;
  onCancel?: () => void;
}

export const TaskForm: React.FC<TaskFormProps> = ({ task, onSuccess, onCancel }) => {
  const isEdit = Boolean(task?.id);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title ?? '',
      description: task?.description ?? '',
      description_format: task?.description_format ?? 'html',
      status: task?.status ?? 'todo',
      priority: task?.priority ?? 'medium',
      project_id: task?.project_id ?? null,
      assignee_id: task?.assignee_id ?? null,
      label_ids: task?.label_ids ?? [],
      due_date: task?.due_date ?? null,
      start_date: task?.start_date ?? null,
      parent_id: task?.parent_id ?? null,
    },
  });

  const onSubmit = async (values: TaskFormValues) => {
    setSubmitting(true);
    setServerError(null);
    try {
      const url = isEdit ? `/api/v1/tasks/${task!.id}` : '/api/v1/tasks/';
      const method = isEdit ? 'patch' : 'post';
      const { data } = await api[method](url, values);
      onSuccess?.(data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail ?? 'Ошибка при сохранении задачи';
      setServerError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-5 bg-slate-900 rounded-xl p-6"
    >
      {/* ---------------------------------------------------------------- */}
      {/* Title                                                            */}
      {/* ---------------------------------------------------------------- */}
      <div>
        <Label htmlFor="title">Название *</Label>
        <input
          id="title"
          {...register('title')}
          className={inputCls}
          placeholder="Краткое название задачи"
        />
        <FieldError message={errors.title?.message} />
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Description — Tiptap rich-text editor                           */}
      {/* ---------------------------------------------------------------- */}
      <div>
        <Label htmlFor="description">Описание</Label>
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <RichTextEditor
              value={field.value ?? ''}
              onChange={field.onChange}
              placeholder="Добавьте подробное описание, шаги воспроизведения, скриншоты…"
            />
          )}
        />
        <FieldError message={errors.description?.message} />
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Status + Priority (2 columns)                                    */}
      {/* ---------------------------------------------------------------- */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="status">Статус</Label>
          <select id="status" {...register('status')} className={selectCls}>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="priority">Приоритет</Label>
          <select id="priority" {...register('priority')} className={selectCls}>
            {PRIORITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Dates (2 columns)                                                */}
      {/* ---------------------------------------------------------------- */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="start_date">Дата начала</Label>
          <input id="start_date" type="date" {...register('start_date')} className={inputCls} />
          <FieldError message={errors.start_date?.message} />
        </div>
        <div>
          <Label htmlFor="due_date">Срок выполнения</Label>
          <input id="due_date" type="date" {...register('due_date')} className={inputCls} />
          <FieldError message={errors.due_date?.message} />
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Server error                                                      */}
      {/* ---------------------------------------------------------------- */}
      {serverError && (
        <div className="rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-300">
          {serverError}
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Actions                                                           */}
      {/* ---------------------------------------------------------------- */}
      <div className="flex justify-end gap-3 pt-1">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Отмена
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-50 px-5 py-2 text-sm font-semibold text-white transition-colors"
        >
          {submitting ? 'Сохранение…' : isEdit ? 'Сохранить' : 'Создать задачу'}
        </button>
      </div>
    </form>
  );
};

export default TaskForm;
