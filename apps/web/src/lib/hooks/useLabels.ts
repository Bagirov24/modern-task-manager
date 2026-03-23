import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSnackbar } from 'notistack'
import { labelApi, LabelCreate } from '@/lib/api/labelApi'

export function useLabels() {
  return useQuery({
    queryKey: ['labels'],
    queryFn: labelApi.getAll,
  })
}

export function useCreateLabel() {
  const qc = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()

  return useMutation({
    mutationFn: (data: LabelCreate) => labelApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['labels'] })
      enqueueSnackbar('Метка создана', { variant: 'success' })
    },
    onError: () => {
      enqueueSnackbar('Ошибка при создании метки', { variant: 'error' })
    },
  })
}

export function useDeleteLabel() {
  const qc = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()

  return useMutation({
    mutationFn: (labelId: string) => labelApi.delete(labelId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['labels'] })
      enqueueSnackbar('Метка удалена', { variant: 'info' })
    },
    onError: () => {
      enqueueSnackbar('Ошибка при удалении метки', { variant: 'error' })
    },
  })
}
