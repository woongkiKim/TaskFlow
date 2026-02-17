import { useEffect, useState } from 'react';
import { Box, ToggleButton, ToggleButtonGroup, Paper } from '@mui/material';
import WeeklyPlanner from './WeeklyPlanner';
import MonthlyView from '../components/MonthlyView';
import DailyView from '../components/DailyView';
import { useLanguage } from '../contexts/LanguageContext';
import { useSearchParams } from 'react-router-dom';

const Calendar = () => {
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const viewParam = searchParams.get('view');
    if (viewParam === 'month' || viewParam === 'week' || viewParam === 'day') {
      setView(viewParam);
    }

    const dateParam = searchParams.get('date');
    if (dateParam) {
      const parsed = new Date(`${dateParam}T00:00:00`);
      if (!Number.isNaN(parsed.getTime())) {
        setCurrentDate(parsed);
      }
    }
  }, [searchParams]);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* Top Bar: View Toggle */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 0.5 }}>
          <ToggleButtonGroup
            value={view}
            exclusive
            onChange={(_, newView) => newView && setView(newView)}
            size="small"
            sx={{ height: 32 }}
          >
            <ToggleButton value="month" sx={{ px: 2, fontSize: '0.8rem', fontWeight: 600 }}>{t('month') as string}</ToggleButton>
            <ToggleButton value="week" sx={{ px: 2, fontSize: '0.8rem', fontWeight: 600 }}>{t('week') as string}</ToggleButton>
            <ToggleButton value="day" sx={{ px: 2, fontSize: '0.8rem', fontWeight: 600 }}>{t('day') as string}</ToggleButton>
          </ToggleButtonGroup>
        </Paper>
      </Box>

      {/* View Content */}
      <Box sx={{ flex: 1, height: '100%', pt: 2 }}>
        {view === 'month' ? (
          <MonthlyView currentDate={currentDate} setCurrentDate={setCurrentDate} />
        ) : view === 'week' ? (
          <WeeklyPlanner initialDate={currentDate} />
        ) : (
          <DailyView currentDate={currentDate} setCurrentDate={setCurrentDate} />
        )}
      </Box>
    </Box>
  );
};

export default Calendar;
