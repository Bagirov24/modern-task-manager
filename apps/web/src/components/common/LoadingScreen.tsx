import React from 'react';
import {
  Box,
  CircularProgress,
  Typography,
  LinearProgress,
} from '@mui/material';

interface LoadingScreenProps {
  message?: string;
  variant?: 'circular' | 'linear';
  fullScreen?: boolean;
  size?: number;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Загрузка...',
  variant = 'circular',
  fullScreen = true,
  size = 48,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        ...(fullScreen
          ? {
              position: 'fixed',
              inset: 0,
              bgcolor: 'background.default',
              zIndex: 9999,
            }
          : {
              py: 8,
              width: '100%',
            }),
      }}
    >
      {variant === 'circular' ? (
        <CircularProgress size={size} thickness={3} />
      ) : (
        <Box sx={{ width: '60%', maxWidth: 300 }}>
          <LinearProgress />
        </Box>
      )}

      {message && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 1 }}
        >
          {message}
        </Typography>
      )}
    </Box>
  );
};

export default LoadingScreen;
