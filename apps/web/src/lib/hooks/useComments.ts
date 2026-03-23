import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSnackbar } from 'notistack'
import { commentApi, CommentCreate } from '@/lib/api/commentApi'

export function useComments(taskId: string | undefined) {
  return useQuery({
    queryKey: ['comments', taskId],
    queryFn: () => commentApi.getByTask(taskId!),
    enabled: !!taskId,
  })
}

export function useCreateComment() {
  const qc = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()

  return useMutation({
    mutationFn: (data: CommentCreate) => commentApi.create(data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['comments', variables.task_id] })
      enqueueSnackbar('Комментарий добавлен', { variant: 'success' })
    },
    onError: () => {
      enqueueSnackbar('Ошибка при добавлении комментария', { variant: 'error' })
    },
  })
}

export function useDeleteComment() {
  const qc = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()

  return useMutation({
    mutationFn: ({ commentId, taskId }: { commentId: string; taskId: string }) =>
      commentApi.delete(commentId).then(() => taskId),
    onSuccess: (taskId) => {
      qc.invalidateQueries({ queryKey: ['comments', taskId] })
      enqueueSnackbar('Комментарий удален', { variant: 'info' })
    },
    onError: () => {
      enqueueSnackbar('Ошибка при удалении комментария', { variant: 'error' })
    },
  })
}
