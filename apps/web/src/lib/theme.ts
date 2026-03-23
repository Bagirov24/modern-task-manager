import { createTheme, PaletteMode } from '@mui/material'

const getDesignTokens = (mode: PaletteMode) => ({
  palette: {
    mode,
    primary: {
      main: '#7C4DFF',
      light: '#B388FF',
      dark: '#651FFF',
    },
    secondary: {
      main: '#00BCD4',
      light: '#4DD0E1',
      dark: '#00838F',
    },
    ...(mode === 'dark'
      ? {
          background: {
            default: '#121212',
            paper: '#1E1E1E',
          },
          text: {
            primary: '#FFFFFF',
            secondary: 'rgba(255, 255, 255, 0.7)',
          },
          divider: 'rgba(255, 255, 255, 0.12)',
        }
      : {
          background: {
            default: '#F5F5F5',
            paper: '#FFFFFF',
          },
          text: {
            primary: '#212121',
            secondary: 'rgba(0, 0, 0, 0.6)',
          },
          divider: 'rgba(0, 0, 0, 0.12)',
        }),
    error: {
      main: '#EF5350',
    },
    warning: {
      main: '#FFA726',
    },
    info: {
      main: '#42A5F5',
    },
    success: {
      main: '#66BB6A',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none' as const,
          fontWeight: 500,
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
})

export const createAppTheme = (mode: PaletteMode) =>
  createTheme(getDesignTokens(mode))

const theme = createAppTheme('dark')
export default theme
