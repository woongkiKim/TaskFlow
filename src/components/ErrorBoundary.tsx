// src/components/ErrorBoundary.tsx
import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Global error boundary that catches rendering errors and
 * shows a user-friendly fallback UI instead of a white screen.
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    // TODO: Send to Sentry / error monitoring in production
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            p: 3,
            bgcolor: 'background.default',
          }}
        >
          <Paper
            elevation={0}
            sx={{
              p: 4,
              maxWidth: 480,
              textAlign: 'center',
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <ErrorOutlineIcon sx={{ fontSize: 48, color: 'error.main', mb: 2 }} />
            <Typography variant="h5" fontWeight={700} gutterBottom>
              예상치 못한 오류가 발생했습니다
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {this.state.error?.message || '알 수 없는 오류'}
            </Typography>

            <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center' }}>
              <Button variant="outlined" onClick={this.handleReset}>
                다시 시도
              </Button>
              <Button variant="contained" onClick={this.handleReload}>
                새로고침
              </Button>
            </Box>

            {import.meta.env.DEV && this.state.errorInfo && (
              <Box
                sx={{
                  mt: 3,
                  p: 2,
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                  textAlign: 'left',
                  maxHeight: 200,
                  overflow: 'auto',
                }}
              >
                <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                  {this.state.errorInfo.componentStack}
                </Typography>
              </Box>
            )}
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
