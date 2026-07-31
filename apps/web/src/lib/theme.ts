import { createTheme, PaletteMode } from '@mui/material'

const getDesignTokens = (mode: PaletteMode) => ({
  palette: {
    mode,
    primary: {
      main: mode === 'dark' ? '#60A5FA' : '#2563EB',
      light: '#93C5FD',
      dark: '#1D4ED8',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: mode === 'dark' ? '#2DD4BF' : '#0F766E',
      light: '#5EEAD4',
      dark: '#0F766E',
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
            default: '#0B1120',
            paper: '#111827',
          },
          text: {
            primary: '#F8FAFC',
            secondary: '#94A3B8',
          },
          divider: '#263247',
        }
      : {
          background: {
            default: '#F8FAFC',
            paper: '#FFFFFF',
          },
          text: {
            primary: '#0F172A',
            secondary: '#64748B',
          },
          divider: '#E2E8F0',
        }),
    error: {
      main: mode === 'dark' ? '#F87171' : '#DC2626',
      light: '#F2B8B5',
      dark: '#601410',
    },
    warning: {
      main: mode === 'dark' ? '#FBBF24' : '#D97706',
      light: '#FFD54F',
    },
    info: {
      main: '#0284C7',
      light: '#4FC3F7',
    },
    success: {
      main: mode === 'dark' ? '#4ADE80' : '#16A34A',
      light: '#81C784',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontSize: '2.5rem', fontWeight: 400, letterSpacing: 0 },
    h2: { fontSize: '2rem', fontWeight: 400, letterSpacing: 0 },
    h3: { fontSize: '1.75rem', fontWeight: 400 },
    h4: { fontSize: '1.5rem', fontWeight: 500 },
    h5: { fontSize: '1.25rem', fontWeight: 500 },
    h6: { fontSize: '1rem', fontWeight: 500 },
    subtitle1: { fontSize: '1rem', fontWeight: 500, letterSpacing: 0 },
    subtitle2: { fontSize: '0.875rem', fontWeight: 500, letterSpacing: 0 },
    body1: { fontSize: '1rem', fontWeight: 400, letterSpacing: 0 },
    body2: { fontSize: '0.875rem', fontWeight: 400, letterSpacing: 0 },
    button: { fontWeight: 500, letterSpacing: 0 },
  },
  shape: {
    borderRadius: 8,
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
    MuiButtonBase: {
      styleOverrides: {
        root: {
          '&:focus-visible': {
            outline: '3px solid',
            outlineColor: mode === 'dark' ? '#93C5FD' : '#2563EB',
            outlineOffset: 2,
          },
          '@media (max-width:600px)': { minHeight: 44 },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none' as const,
          fontWeight: 500,
          borderRadius: 6,
          padding: '9px 18px',
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
          borderRadius: 8,
          border: '1px solid',
          borderColor: 'rgba(0,0,0,0.08)',
          boxShadow: '0px 1px 3px 1px rgba(0,0,0,0.08)',
          transition: 'box-shadow 0.2s ease, transform 0.2s ease',
          '&:hover': {
            boxShadow: '0px 2px 6px 2px rgba(0,0,0,0.12)',
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
          borderRadius: 8,
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
          borderRadius: 8,
          textTransform: 'none' as const,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRadius: 0,
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
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
