import { Box, Typography, Button, Paper, useTheme, alpha } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ReplayIcon from '@mui/icons-material/Replay';
import HomeIcon from '@mui/icons-material/Home';
import { useLanguage } from '../contexts/LanguageContext';
import { useThemeMode } from '../contexts/ThemeContext';

const ServerErrorPage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { lang } = useLanguage();
  const { mode } = useThemeMode();

  const isDark = mode === 'dark';
  const t = (en: string, ko: string) => (lang === 'ko' ? ko : en);

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        width: '100%',
        bgcolor: 'background.default',
        p: 3,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background glowing effects */}
      <Box sx={{
        position: 'absolute', top: '10%', right: '15%',
        width: '40vw', height: '40vw',
        background: `radial-gradient(circle, ${alpha(theme.palette.error.main, 0.15)} 0%, transparent 60%)`,
        borderRadius: '50%', filter: 'blur(60px)', zIndex: 0,
      }} />
      <Box sx={{
        position: 'absolute', bottom: '10%', left: '15%',
        width: '30vw', height: '30vw',
        background: `radial-gradient(circle, ${alpha(theme.palette.secondary.main, 0.1)} 0%, transparent 60%)`,
        borderRadius: '50%', filter: 'blur(60px)', zIndex: 0,
      }} />

      <Paper
        elevation={0}
        sx={{
          position: 'relative',
          zIndex: 1,
          p: { xs: 4, sm: 6 },
          maxWidth: 520,
          width: '100%',
          textAlign: 'center',
          borderRadius: 4,
          bgcolor: isDark ? alpha('#1e293b', 0.8) : alpha('#ffffff', 0.8),
          backdropFilter: 'blur(20px)',
          border: '1px solid',
          borderColor: isDark ? alpha('#e2e8f0', 0.1) : alpha('#e2e8f0', 0.8),
          boxShadow: isDark
            ? '0 25px 50px -12px rgba(0,0,0,0.5)'
            : '0 25px 50px -12px rgba(0,0,0,0.1)',
        }}
      >
        {/* Large 500 Graphic */}
        <Typography
          variant="h1"
          sx={{
            fontSize: { xs: '6rem', sm: '8rem' },
            fontWeight: 900,
            lineHeight: 1,
            background: `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.dark} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 2,
            opacity: 0.9,
          }}
        >
          500
        </Typography>

        <Typography variant="h4" fontWeight={800} gutterBottom sx={{ color: 'text.primary', letterSpacing: '-0.5px' }}>
          {t('Server Connection Error', '서버 연결 오류')}
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 400, mx: 'auto', lineHeight: 1.6 }}>
          {t(
            'We encountered an unexpected issue while communicating with the server. Our engineering team has been notified.',
            '서버와 통신하는 중 예상치 못한 문제가 발생했습니다. 엔지니어링 팀에 문제가 보고되었습니다.'
          )}
        </Typography>

        <Box sx={{
          display: 'flex', gap: 2, justifyContent: 'center',
          flexDirection: { xs: 'column', sm: 'row' }
        }}>
          <Button
            variant="outlined"
            size="large"
            startIcon={<HomeIcon />}
            onClick={handleGoHome}
            sx={{ px: 3, py: 1.5, borderRadius: 2 }}
          >
            {t('Go Home', '홈으로')}
          </Button>
          <Button
            variant="contained"
            color="error"
            size="large"
            startIcon={<ReplayIcon />}
            onClick={handleRefresh}
            sx={{ px: 3, py: 1.5, borderRadius: 2 }}
          >
            {t('Try Again', '다시 시도')}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default ServerErrorPage;
