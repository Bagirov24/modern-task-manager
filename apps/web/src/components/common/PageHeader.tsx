import type { ReactNode } from 'react'
import { Box, Stack, Typography } from '@mui/material'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
}

export default function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between" gap={2}>
      <Box>
        <Typography variant="h4" fontWeight={800}>{title}</Typography>
        {description && <Typography variant="body2" color="text.secondary">{description}</Typography>}
      </Box>
      {actions && (
        <Stack
          data-testid="page-header-actions"
          direction="row"
          spacing={1}
          alignItems="center"
          useFlexGap
          sx={(theme) => ({
            width: '100%',
            minWidth: 0,
            flexWrap: 'wrap',
            [theme.breakpoints.up('md')]: { width: 'auto', flexWrap: 'nowrap' },
          })}
        >
          {actions}
        </Stack>
      )}
    </Stack>
  )
}
