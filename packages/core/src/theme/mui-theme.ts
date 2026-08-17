import { createTheme, type ThemeOptions, type Shadows } from '@mui/material/styles';

/**
 * ComplianceOS MUI Theme
 * Matches existing design tokens from index.css
 * Supports both light and dark modes
 */

const baseTypography = {
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  h1: { fontFamily: "'Outfit', sans-serif", fontWeight: 800, letterSpacing: '-0.02em' },
  h2: { fontFamily: "'Outfit', sans-serif", fontWeight: 700, letterSpacing: '-0.02em' },
  h3: { fontFamily: "'Outfit', sans-serif", fontWeight: 700 },
  h4: { fontFamily: "'Outfit', sans-serif", fontWeight: 600 },
  h5: { fontFamily: "'Outfit', sans-serif", fontWeight: 600 },
  h6: { fontFamily: "'Outfit', sans-serif", fontWeight: 600 },
  body1: { fontFamily: "'Inter', sans-serif" },
  body2: { fontFamily: "'Inter', sans-serif" },
  button: { textTransform: 'none', fontWeight: 600 },
  subtitle1: { fontFamily: "'Inter', sans-serif" },
  subtitle2: { fontFamily: "'Inter', sans-serif" },
  caption: { fontFamily: "'Inter', sans-serif" },
  overline: { fontFamily: "'Inter', sans-serif" },
};

const baseShape = {
  borderRadius: 10, // Matches --radius: 0.625rem (0.625 × 16 = 10px)
};

const baseShadows: Shadows = [
  'none',
  '0 2px 4px rgba(0, 0, 0, 0.1)',
  '0 4px 8px rgba(0, 0, 0, 0.12)',
  '0 6px 12px rgba(0, 0, 0, 0.15)',
  '0 8px 16px rgba(0, 0, 0, 0.18)',
  '0 10px 20px rgba(0, 0, 0, 0.2)',
  '0 12px 24px rgba(0, 0, 0, 0.22)',
  '0 14px 28px rgba(0, 0, 0, 0.24)',
  '0 16px 32px rgba(0, 0, 0, 0.26)',
  '0 18px 36px rgba(0, 0, 0, 0.28)',
  '0 20px 40px rgba(0, 0, 0, 0.3)',
  '0 22px 44px rgba(0, 0, 0, 0.32)',
  '0 24px 48px rgba(0, 0, 0, 0.34)',
  '0 26px 52px rgba(0, 0, 0, 0.36)',
  '0 28px 56px rgba(0, 0, 0, 0.38)',
  '0 30px 60px rgba(0, 0, 0, 0.4)',
  '0 32px 64px rgba(0, 0, 0, 0.42)',
  '0 34px 68px rgba(0, 0, 0, 0.44)',
  '0 36px 72px rgba(0, 0, 0, 0.46)',
  '0 38px 76px rgba(0, 0, 0, 0.48)',
  '0 40px 80px rgba(0, 0, 0, 0.5)',
  '0 42px 84px rgba(0, 0, 0, 0.52)',
  '0 44px 88px rgba(0, 0, 0, 0.54)',
  '0 46px 92px rgba(0, 0, 0, 0.56)',
];

const baseComponents = {
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: 10,
        boxShadow: 'none',
        fontWeight: 600,
        '&:hover': { boxShadow: 'none' },
      },
      containedPrimary: {
        '&:hover': { backgroundColor: '#0284c7' },
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: 16, // Rounded-2xl equivalent
      },
    },
  },
  MuiCardContent: {
    styleOverrides: {
      root: {
        padding: 24,
        '&:last-child': { paddingBottom: 24 },
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        fontWeight: 600,
      },
    },
  },
  MuiTextField: {
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: 10,
        },
      },
    },
  },
  MuiSelect: {
    styleOverrides: {
      root: {
        borderRadius: 10,
      },
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: 16,
      },
    },
  },
  MuiTooltip: {
    styleOverrides: {
      tooltip: {
        borderRadius: 8,
        fontSize: '0.75rem',
        fontWeight: 500,
      },
    },
  },
  MuiAlert: {
    styleOverrides: {
      root: {
        borderRadius: 10,
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
  MuiLinearProgress: {
    styleOverrides: {
      root: {
        borderRadius: 4,
        height: 8,
      },
    },
  },
  MuiCircularProgress: {
    styleOverrides: {
      root: {
        // Uses primary color by default
      },
    },
  },
};

const lightThemeOptions: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: {
      main: '#0f2c59', // --primary-cta
      light: '#3b82f6', // --primary-cta-hover
      dark: '#0a1f3d',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#6366f1',
      light: '#818cf8',
      dark: '#4f46e5',
      contrastText: '#ffffff',
    },
    error: {
      main: '#dc2626', // --error
      light: '#ef4444',
      dark: '#b91c1c', // --error-foreground
    },
    warning: {
      main: '#d97706', // --warning
      light: '#f59e0b',
      dark: '#b45309', // --warning-foreground
    },
    info: {
      main: '#0284c7', // --info
      light: '#0ea5e9',
      dark: '#0369a1', // --info-foreground
    },
    success: {
      main: '#059669', // --success
      light: '#10b981',
      dark: '#047857', // --success-foreground
    },
    background: {
      default: '#ffffff', // --background (light)
      paper: '#ffffff', // --card (light)
    },
    text: {
      primary: '#020617', // --foreground (light) — deep slate
      secondary: '#64748b', // --muted-foreground (light) — slate 500
      disabled: '#94a3b8',
    },
    divider: '#e2e8f0', // --border (light) — slate 200
    grey: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
    },
  },
  typography: baseTypography,
  shape: baseShape,
  shadows: baseShadows,
  components: baseComponents,
};

const darkThemeOptions: ThemeOptions = {
  palette: {
    mode: 'dark',
    primary: {
      main: '#e2e8f0', // --primary (dark mode)
      light: '#f1f5f9',
      dark: '#cbd5e1',
      contrastText: '#020617',
    },
    secondary: {
      main: '#818cf8',
      light: '#a5b4fc',
      dark: '#6366f1',
      contrastText: '#ffffff',
    },
    error: {
      main: '#ef4444',
      light: '#f87171',
      dark: '#dc2626',
    },
    warning: {
      main: '#f59e0b',
      light: '#fbbf24',
      dark: '#d97706',
    },
    info: {
      main: '#0ea5e9',
      light: '#38bdf8',
      dark: '#0284c7',
    },
    success: {
      main: '#10b981',
      light: '#34d399',
      dark: '#059669',
    },
    background: {
      default: '#0f172a', // --background (dark) — slate 900
      paper: '#1e293b', // --card (dark) — slate 800
    },
    text: {
      primary: '#f1f5f9', // --foreground (dark) — slate 100
      secondary: '#94a3b8', // --muted-foreground (dark) — slate 400
      disabled: '#64748b',
    },
    divider: 'rgba(255, 255, 255, 0.08)', // --border (dark)
    grey: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
    },
  },
  typography: baseTypography,
  shape: baseShape,
  shadows: baseShadows,
  components: {
    ...baseComponents,
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          backdropFilter: 'blur(12px)',
          backgroundColor: 'rgba(15, 23, 42, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        },
      },
    },
  },
};

/**
 * Create light theme
 */
export const lightTheme = createTheme(lightThemeOptions);

/**
 * Create dark theme
 */
export const darkTheme = createTheme(darkThemeOptions);

/**
 * Get theme based on mode
 */
export const getTheme = (mode: 'light' | 'dark') => {
  return mode === 'dark' ? darkTheme : lightTheme;
};

export default getTheme;
