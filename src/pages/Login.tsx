// src/pages/Login.tsx
import { useEffect } from 'react';
import { Box, Button, Typography, Paper, Container } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const Login = () => {
  const { signInWithGoogle, user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  // 이미 로그인 되어있으면 대시보드로 이동
  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
      navigate('/');
    } catch {
      toast.error(t('loginFailed') as string || '로그인에 실패했습니다.');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundImage: 'url(/background.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Container component="main" maxWidth="xs">
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Paper
            elevation={3}
            sx={{
              p: 4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%',
              borderRadius: 3,
              textAlign: 'center'
            }}
          >
            <Box sx={{ mb: 3, p: 2.5, bgcolor: 'primary.main', borderRadius: 3, color: 'white' }}>
              <Typography variant="h5" fontWeight={800} letterSpacing={-0.5}>TaskFlow</Typography>
            </Box>

            <Typography component="h1" variant="h5" fontWeight="700" gutterBottom>
              {t('loginTitle') as string}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              {t('loginDesc') as string}
            </Typography>

            <Button
              fullWidth
              variant="outlined"
              startIcon={<GoogleIcon />}
              onClick={handleLogin}
              sx={{
                py: 1.5,
                borderColor: 'divider',
                color: 'text.primary',
                '&:hover': {
                  borderColor: 'divider',
                  bgcolor: 'action.hover'
                }
              }}
            >
              {t('loginButton') as string}
            </Button>
          </Paper>
        </Box>
      </Container>
    </Box>
  );
};

export default Login;