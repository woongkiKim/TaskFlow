// src/pages/AnalyticsPage.tsx
import { Box, Typography } from '@mui/material';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import CycleAnalytics from '../components/CycleAnalytics';
import { useLanguage } from '../contexts/LanguageContext';

export default function AnalyticsPage() {
  const { t } = useLanguage();

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1400, mx: 'auto' }}>
      {/* Page Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <AnalyticsIcon sx={{ color: '#6366f1', fontSize: 28 }} />
        <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: -0.5 }}>
          {t('analytics') as string || 'Analytics'}
        </Typography>
      </Box>

      <CycleAnalytics />
    </Box>
  );
}
