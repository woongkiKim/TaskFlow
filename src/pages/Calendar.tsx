import { useEffect, useState, useCallback } from 'react';
import { Box } from '@mui/material';
import WeeklyPlanner from './WeeklyPlanner';
import MonthlyView from '../components/MonthlyView';
import DailyView from '../components/DailyView';
import { useSearchParams } from 'react-router-dom';

type CalendarView = 'month' | 'week' | 'day';

const Calendar = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read initial view from URL, defaulting to 'month'
  const viewParam = searchParams.get('calView') as CalendarView | null;
  const [view, setViewState] = useState<CalendarView>(
    viewParam === 'month' || viewParam === 'week' || viewParam === 'day' ? viewParam : 'month'
  );
  const [currentDate, setCurrentDate] = useState(() => {
    const dateParam = searchParams.get('date');
    if (dateParam) {
      const parsed = new Date(`${dateParam}T00:00:00`);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  });

  // When view changes, persist to URL search params
  const setView = useCallback((newView: CalendarView) => {
    setViewState(newView);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('calView', newView);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // Sync with external URL changes (e.g. navigation from other components)
  useEffect(() => {
    const vp = searchParams.get('calView') as CalendarView | null;
    if (vp && (vp === 'month' || vp === 'week' || vp === 'day') && vp !== view) {
      setViewState(vp);
    }

    // Legacy support: read 'view' param if 'calView' not set
    if (!vp) {
      const legacyVp = searchParams.get('view') as CalendarView | null;
      if (legacyVp && (legacyVp === 'month' || legacyVp === 'week' || legacyVp === 'day') && legacyVp !== view) {
        setViewState(legacyVp);
      }
    }

    const dateParam = searchParams.get('date');
    if (dateParam) {
      const parsed = new Date(`${dateParam}T00:00:00`);
      if (!Number.isNaN(parsed.getTime())) {
        setCurrentDate(parsed);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ flex: 1, height: '100%' }}>
        {view === 'month' ? (
          <MonthlyView
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            calendarView={view}
            onViewChange={setView}
          />
        ) : view === 'week' ? (
          <WeeklyPlanner initialDate={currentDate} calendarView={view} onViewChange={setView} />
        ) : (
          <DailyView
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            calendarView={view}
            onViewChange={setView}
          />
        )}
      </Box>
    </Box>
  );
};

export default Calendar;
