import { createTheme, PaletteMode } from '@mui/material'

const getDesignTokens = (mode: PaletteMode) => ({
  palette: {
    mode,
    primary: {
      main: '#6750A4',
      light: '#D0BCFF',
      dark: '#381E72',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#625B71',
      light: '#CCC2DC',
      dark: '#332D41',
      contrastText: '#FFFFFF',
    },
    tertiary: {
      main: '#7D5260',
      light: '#EFB8C8',
      dark: '#492532',
    },
    ...(mode === 'dark'
      ? {
          background: {
            default: '#1C1B1F',
            paper: '#2B2930',
          },
          text: {
            primary: '#E6E1E5',
            secondary: '#CAC4D0',
          },
          divider: 'rgba(230, 225, 229, 0.12)',
        }
      : {
          background: {
            default: '#FFFBFE',
            paper: '#FFFFFF',
          },
          text: {
            primary: '#1C1B1F',
            secondary: '#49454F',
          },
          divider: 'rgba(28, 27, 31, 0.12)',
        }),
    error: {
      main: '#B3261E',
      light: '#F2B8B5',
      dark: '#601410',
    },
    warning: {
      main: '#F9A825',
      light: '#FFD54F',
    },
    info: {
      main: '#0288D1',
      light: '#4FC3F7',
    },
    success: {
      main: '#2E7D32',
      light: '#81C784',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontSize: '2.5rem', fontWeight: 400, letterSpacing: '-0.02em' },
    h2: { fontSize: '2rem', fontWeight: 400, letterSpacing: '-0.01em' },
    h3: { fontSize: '1.75rem', fontWeight: 400 },
    h4: { fontSize: '1.5rem', fontWeight: 500 },
    h5: { fontSize: '1.25rem', fontWeight: 500 },
    h6: { fontSize: '1rem', fontWeight: 500 },
    subtitle1: { fontSize: '1rem', fontWeight: 500, letterSpacing: '0.01em' },
    subtitle2: { fontSize: '0.875rem', fontWeight: 500, letterSpacing: '0.005em' },
    body1: { fontSize: '1rem', fontWeight: 400, letterSpacing: '0.03em' },
    body2: { fontSize: '0.875rem', fontWeight: 400, letterSpacing: '0.02em' },
    button: { fontWeight: 500, letterSpacing: '0.02em' },
  },
  shape: {
    borderRadius: 16,
  },
  shadows: [
    'none',
    '0px 1px 3px 1px rgba(0,0,0,0.15), 0px 1px 2px rgba(0,0,0,0.3)',
    '0px 2px 6px 2px rgba(0,0,0,0.15), 0px 1px 2px rgba(0,0,0,0.3)',
    '0px 4px 8px 3px rgba(0,0,0,0.15), 0px 1px 3px rgba(0,0,0,0.3)',
    '0px 6px 10px 4px rgba(0,0,0,0.15), 0px 2px 3px rgba(0,0,0,0.3)',
    '0px 8px 12px 6px rgba(0,0,0,0.15), 0px 4px 4px rgba(0,0,0,0.3)',
    ...Array(19).fill('0px 8px 12px 6px rgba(0,0,0,0.15), 0px 4px 4px rgba(0,0,0,0.3)'),
  ] as any,
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none' as const,
          fontWeight: 500,
          borderRadius: 20,
          padding: '10px 24px',
          fontSize: '0.875rem',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': { boxShadow: '0px 1px 3px 1px rgba(0,0,0,0.15)' },
        },
        outlined: {
          borderWidth: 1,
        },
      },
      defaultProps: {
        disableElevation: true,
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid',
          borderColor: 'rgba(0,0,0,0.08)',
          boxShadow: '0px 1px 3px 1px rgba(0,0,0,0.08)',
          transition: 'box-shadow 0.2s ease, transform 0.2s ease',
          '&:hover': {
            boxShadow: '0px 2px 6px 2px rgba(0,0,0,0.12)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        rounded: {
          borderRadius: 12,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
          fontSize: '0.75rem',
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          textTransform: 'none' as const,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 28,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRadius: '0 16px 16px 0',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 28,
          margin: '2px 12px',
          padding: '8px 16px',
          '&.Mui-selected': {
            fontWeight: 600,
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          borderBottom: '1px solid',
          borderColor: 'rgba(0,0,0,0.08)',
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
          fontWeight: 600,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: 8,
          fontSize: '0.75rem',
        },
      },
    },
  },
})

export const createAppTheme = (mode: PaletteMode) => createTheme(getDesignTokens(mode))

const theme = createAppTheme('dark')
export default theme
