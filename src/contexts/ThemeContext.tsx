import { createContext, useContext, useState, useMemo, useCallback, type ReactNode } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider, alpha } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { koKR } from '@mui/material/locale';
import { enUS } from '@mui/material/locale';

type Mode = 'light' | 'dark';

interface ThemeContextType {
  mode: Mode;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const useThemeMode = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeMode must be used within ThemeContextProvider');
  return ctx;
};

const getDesignTokens = (mode: Mode) => {
  const primaryMain = '#2563EB';
  const primaryLight = '#60A5FA';
  const primaryDark = '#1D4ED8';

  return {
    typography: {
      fontFamily: [
        '"Inter"',
        '"Pretendard"',
        '"Noto Sans KR"',
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
      ].join(','),
      h1: { fontWeight: 800, letterSpacing: '-0.02em' },
      h2: { fontWeight: 700, letterSpacing: '-0.01em' },
      h3: { fontWeight: 700, letterSpacing: '-0.01em' },
      h4: { fontWeight: 700, letterSpacing: '-0.01em' },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
      subtitle1: { fontWeight: 500 },
      subtitle2: { fontWeight: 600 },
      button: { textTransform: 'none' as const, fontWeight: 600, letterSpacing: '0.01em' },
      body1: { lineHeight: 1.6 },
      body2: { lineHeight: 1.5 },
    },
    palette: {
      mode,
      primary: {
        main: primaryMain,
        light: primaryLight,
        dark: primaryDark,
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: '#64748B',
        light: '#94A3B8',
        dark: '#475569',
        contrastText: '#FFFFFF',
      },
      success: { main: '#10B981', light: '#34D399', dark: '#059669' },
      error: { main: '#EF4444', light: '#F87171', dark: '#DC2626' },
      warning: { main: '#F59E0B', light: '#FBBF24', dark: '#D97706' },
      ...(mode === 'light'
        ? {
          background: { default: '#F8FAFC', paper: '#FFFFFF' },
          text: { primary: '#0F172A', secondary: '#475569', disabled: '#94A3B8' },
          divider: '#E2E8F0',
        }
        : {
          background: { default: '#0f172a', paper: '#1e293b' },
          text: { primary: '#f1f5f9', secondary: '#94a3b8', disabled: '#64748b' },
          divider: '#334155',
        }),
    },
    shape: { borderRadius: 12 },
    components: {
      MuiCssBaseline: {
        styleOverrides: `
          @font-face {
            font-family: 'Pretendard';
            font-weight: 400;
            font-display: swap;
            src: url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/woff2/Pretendard-Regular.woff2') format('woff2');
          }
        `,
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: '10px',
            padding: '8px 20px',
            boxShadow: 'none',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow: `0 4px 12px ${alpha(primaryMain, 0.2)}`,
            },
            '&:active': {
              transform: 'translateY(0)',
            },
          },
          containedPrimary: {
            background: `linear-gradient(135deg, ${primaryMain} 0%, ${primaryDark} 100%)`,
          },
          text: {
            '&:hover': {
              backgroundColor: alpha(primaryMain, 0.08),
              boxShadow: 'none',
              transform: 'none',
            },
          },
          outlined: {
            '&:hover': {
              boxShadow: 'none',
              transform: 'none',
              backgroundColor: alpha(primaryMain, 0.04),
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.05), 0px 10px 15px -5px rgba(0, 0, 0, 0.04)',
            border: `1px solid ${mode === 'light' ? '#E2E8F0' : '#334155'}`,
            backgroundImage: 'none',
          },
        },
      },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: { backgroundImage: 'none' },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 10,
              transition: 'box-shadow 0.2s',
              '&.Mui-focused': {
                boxShadow: `0 0 0 4px ${alpha(primaryMain, 0.1)}`,
              },
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 8, fontWeight: 600 },
        },
      },
      MuiAvatar: {
        styleOverrides: {
          root: { fontWeight: 600 },
        },
      },
    },
  };
};

export const ThemeContextProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<Mode>(() => {
    const saved = localStorage.getItem('taskflow-theme');
    return (saved === 'dark' || saved === 'light') ? saved : 'light';
  });

  const toggleMode = useCallback(() => {
    setMode(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('taskflow-theme', next);
      return next;
    });
  }, []);

  const lang = localStorage.getItem('taskflow-lang') || 'ko';
  const theme = useMemo(() => createTheme(getDesignTokens(mode), lang === 'ko' ? koKR : enUS), [mode, lang]);

  return (
    <ThemeContext.Provider value={{ mode, toggleMode }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};
