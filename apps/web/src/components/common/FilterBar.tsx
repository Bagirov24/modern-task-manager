import { Chip, Stack } from '@mui/material'

export interface ActiveFilter {
  key: string
  label: string
}

interface FilterBarProps {
  filters: ActiveFilter[]
  onRemove: (key: string) => void
}

export default function FilterBar({ filters, onRemove }: FilterBarProps) {
  if (filters.length === 0) return null

  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap aria-label="Активные фильтры">
      {filters.map((filter) => (
        <Chip
          key={filter.key}
          size="small"
          label={filter.label}
          aria-label={`Удалить фильтр ${filter.label}`}
          onDelete={() => onRemove(filter.key)}
          onClick={() => onRemove(filter.key)}
        />
      ))}
    </Stack>
  )
}
