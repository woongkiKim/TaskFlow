import { Box, Typography, Button, Paper, useTheme, alpha } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import HomeIcon from '@mui/icons-material/Home';
import DashboardIcon from '@mui/icons-material/Dashboard';
import { useLanguage } from '../contexts/LanguageContext';
import { useThemeMode } from '../contexts/ThemeContext';

const NotFoundPage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { lang } = useLanguage();
  const { mode } = useThemeMode();

  const isDark = mode === 'dark';
  const t = (en: string, ko: string) => (lang === 'ko' ? ko : en);

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
        position: 'absolute', top: '-10%', left: '-10%',
        width: '50vw', height: '50vw',
        background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.1)} 0%, transparent 60%)`,
        borderRadius: '50%', filter: 'blur(60px)', zIndex: 0,
      }} />

      <Paper
        elevation={0}
        sx={{
          position: 'relative',
          zIndex: 1,
          p: { xs: 4, sm: 6 },
          maxWidth: 480,
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
        {/* Large 404 Graphic */}
        <Box sx={{ position: 'relative', display: 'inline-block', mb: 3 }}>
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '7rem', sm: '9rem' },
              fontWeight: 900,
              lineHeight: 1,
              background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              opacity: 0.2,
            }}
          >
            404
          </Typography>
          <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', mt: 2 }}>
            <SearchOffIcon sx={{ fontSize: 80, color: 'primary.main', filter: `drop-shadow(0 8px 16px ${alpha(theme.palette.primary.main, 0.4)})` }} />
          </Box>
        </Box>

        <Typography variant="h4" fontWeight={800} gutterBottom sx={{ color: 'text.primary', letterSpacing: '-0.5px' }}>
          {t('Page Not Found', '페이지를 찾을 수 없습니다')}
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 360, mx: 'auto', lineHeight: 1.6 }}>
          {t(
            "The page you're looking for might have been removed, had its name changed, or is temporarily unavailable.",
            '찾으시는 페이지가 삭제되었거나 이름이 변경되었거나, 일시적으로 사용할 수 없는 상태입니다.'
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
            onClick={() => navigate('/')}
            sx={{ px: 3, py: 1.5, borderRadius: 2 }}
          >
            {t('Go Home', '홈으로')}
          </Button>
          <Button
            variant="contained"
            size="large"
            startIcon={<DashboardIcon />}
            onClick={() => navigate('/tasks')}
            sx={{ px: 3, py: 1.5, borderRadius: 2 }}
          >
            {t('View Tasks', '내 작업 보기')}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default NotFoundPage;
