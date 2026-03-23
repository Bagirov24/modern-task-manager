import React from 'react';
import { Box, Typography, Button, SvgIconProps } from '@mui/material';
import {
  InboxOutlined as InboxIcon,
  AddCircleOutline as AddIcon,
} from '@mui/icons-material';

interface EmptyStateProps {
  icon?: React.ReactElement<SvgIconProps>;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
        px: 3,
        textAlign: 'center',
      }}
    >
      <Box
        sx={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          bgcolor: 'action.hover',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 3,
        }}
      >
        {icon
          ? React.cloneElement(icon, {
              sx: { fontSize: 40, color: 'text.secondary' },
            })
          : <InboxIcon sx={{ fontSize: 40, color: 'text.secondary' }} />}
      </Box>

      <Typography variant="h6" gutterBottom color="text.primary">
        {title}
      </Typography>

      {description && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ maxWidth: 360, mb: 3 }}
        >
          {description}
        </Typography>
      )}

      {actionLabel && onAction && (
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onAction}
          sx={{ borderRadius: 2 }}
        >
          {actionLabel}
        </Button>
      )}
    </Box>
  );
};

export default EmptyState;
