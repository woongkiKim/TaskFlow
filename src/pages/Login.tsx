// src/pages/Login.tsx
import { useEffect } from 'react';
import { Box, Button, Typography, Paper, Container } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import AppleIcon from '@mui/icons-material/Apple';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const Login = () => {
  const { signInWithGoogle, signInWithApple, user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    try {
      if (provider === 'google') await signInWithGoogle();
      if (provider === 'apple') await signInWithApple();
      navigate('/');
    } catch {
      toast.error(t('loginFailed') as string || '로그인에 실패했습니다.');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 25%, #1e3a5f 50%, #0f172a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        // Subtle grid pattern
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            radial-gradient(circle at 25% 25%, rgba(99, 102, 241, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)
          `,
          pointerEvents: 'none',
        },
        // Animated glow orbs
        '&::after': {
          content: '""',
          position: 'absolute',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%)',
          top: '-200px',
          right: '-100px',
          pointerEvents: 'none',
          animation: 'float 8s ease-in-out infinite',
        },
        '@keyframes float': {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '50%': { transform: 'translateY(30px) scale(1.05)' },
        },
        '@keyframes fadeInUp': {
          from: { opacity: 0, transform: 'translateY(24px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
      }}
    >
      <Container component="main" maxWidth="xs" sx={{ position: 'relative', zIndex: 1 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            animation: 'fadeInUp 0.6s ease-out',
          }}
        >
          <Paper
            elevation={0}
            sx={{
              p: { xs: 4, sm: 5 },
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%',
              borderRadius: 4,
              textAlign: 'center',
              background: 'rgba(30, 41, 59, 0.7)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(148, 163, 184, 0.1)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
          >
            {/* Logo */}
            <Box
              sx={{
                mb: 3,
                p: 2,
                background: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)',
                borderRadius: 3,
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                boxShadow: '0 8px 32px rgba(99, 102, 241, 0.3)',
              }}
            >
              <TaskAltIcon sx={{ fontSize: 28 }} />
              <Typography variant="h5" fontWeight={800} letterSpacing={-0.5}>
                TaskFlow
              </Typography>
            </Box>

            <Typography
              component="h1"
              variant="h5"
              fontWeight="700"
              gutterBottom
              sx={{ color: '#f1f5f9' }}
            >
              {t('loginTitle') as string}
            </Typography>
            <Typography
              variant="body2"
              sx={{ mb: 4, color: '#94a3b8', maxWidth: 280, lineHeight: 1.6 }}
            >
              {t('loginDesc') as string}
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, width: '100%' }}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<GoogleIcon />}
                onClick={() => handleSocialLogin('google')}
                sx={{
                  py: 1.5,
                  borderRadius: 2.5,
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  background: '#f1f5f9',
                  color: '#0f172a',
                  boxShadow: 'none',
                  transition: 'all 0.2s ease',
                  '&:hover': { background: '#ffffff', transform: 'translateY(-1px)' },
                }}
              >
                {t('signInGoogle') as string || 'Sign in with Google'}
              </Button>
              <Button
                fullWidth
                variant="contained"
                startIcon={<AppleIcon />}
                onClick={() => handleSocialLogin('apple')}
                sx={{
                  py: 1.5,
                  borderRadius: 2.5,
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  background: '#000000',
                  color: '#ffffff',
                  boxShadow: 'none',
                  border: '1px solid rgba(255,255,255,0.2)',
                  transition: 'all 0.2s ease',
                  '&:hover': { background: '#1a1a1a', transform: 'translateY(-1px)' },
                }}
              >
                {t('signInApple') as string || 'Sign in with Apple'}
              </Button>
            </Box>
          </Paper>

          {/* Bottom branding */}
          <Typography
            variant="caption"
            sx={{ mt: 4, color: 'rgba(148, 163, 184, 0.5)', letterSpacing: '0.05em' }}
          >
            © 2026 TaskFlow
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Login;
