import { useMemo, useState } from 'react';
import { Box, Typography, Paper, Tooltip } from '@mui/material';
import { format, addMonths, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';
import { ko as dateFnsKo } from 'date-fns/locale';
import { useLanguage } from '../contexts/LanguageContext';

export interface GanttItem {
  id: string;
  name: string;
  startDate?: string;
  targetDate?: string;
  createdAt: string;
  color: string;
}

interface GanttChartProps {
  items: GanttItem[];
  onItemClick: (item: GanttItem) => void;
  title?: string;
}

const GanttChart = ({ items, onItemClick }: GanttChartProps) => {
  const { lang } = useLanguage();
  const dateLocale = lang === 'ko' ? dateFnsKo : undefined;
  const todayLabel = lang === 'ko' ? '\uC624\uB298' : 'Today';
  // Stable fallback timestamp — useState initializer runs once, safe for impure calls
  const [stableNowMs] = useState(() => Date.now());

  const { minDate, maxDate, totalDays } = useMemo(() => {
    if (items.length === 0) {
      const now = new Date();
      return {
        minDate: startOfMonth(now),
        maxDate: endOfMonth(addMonths(now, 1)),
        totalDays: 60,
      };
    }

    const dates = items.flatMap(p => [
      p.startDate ? new Date(p.startDate) : new Date(p.createdAt),
      p.targetDate ? new Date(p.targetDate) : new Date(stableNowMs + 30 * 24 * 60 * 60 * 1000),
    ]);

    const min = startOfMonth(new Date(Math.min(...dates.map(d => d.getTime()))));
    const max = endOfMonth(new Date(Math.max(...dates.map(d => d.getTime()))));

    const paddedMin = addMonths(min, -1);
    const paddedMax = addMonths(max, 2);

    return {
      minDate: paddedMin,
      maxDate: paddedMax,
      totalDays: Math.max(differenceInDays(paddedMax, paddedMin), 30),
    };
  }, [items, stableNowMs]);

  const months = useMemo(() => {
    const list = [];
    let cur = minDate;
    while (cur <= maxDate) {
      list.push(cur);
      cur = addMonths(cur, 1);
    }
    return list;
  }, [minDate, maxDate]);

  return (
    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
      <Box sx={{ overflowX: 'auto', position: 'relative' }}>
        <Box sx={{ minWidth: Math.max(months.length * 150, 800), position: 'relative', pb: 2 }}>
          <Box sx={{ display: 'flex', borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.default', position: 'sticky', top: 0, zIndex: 20 }}>
            {months.map(m => (
              <Box key={m.toISOString()} sx={{ width: `${100 / months.length}%`, minWidth: 150, flexShrink: 0, p: 1, borderRight: '1px dashed', borderColor: 'divider' }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">
                  {format(m, 'MMMM yyyy', { locale: dateLocale })}
                </Typography>
              </Box>
            ))}
          </Box>

          <Box sx={{ position: 'absolute', top: 38, bottom: 0, left: 0, right: 0, display: 'flex', zIndex: 0, pointerEvents: 'none' }}>
            {months.map(m => (
              <Box key={`bg-${m.toISOString()}`} sx={{ width: `${100 / months.length}%`, minWidth: 150, flexShrink: 0, borderRight: '1px dashed', borderColor: 'divider' }} />
            ))}
          </Box>

          <Box sx={{ py: 2, position: 'relative', zIndex: 10 }}>
            {items.map(item => {
              const start = item.startDate ? new Date(item.startDate) : new Date(item.createdAt);
              let end = item.targetDate ? new Date(item.targetDate) : new Date(new Date().setDate(start.getDate() + 30));
              if (end <= start) end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

              const offsetDays = differenceInDays(start, minDate);
              const durationDays = differenceInDays(end, start);

              const leftPct = (offsetDays / totalDays) * 100;
              const widthPct = (durationDays / totalDays) * 100;

              return (
                <Box key={item.id} sx={{ position: 'relative', height: 48, mb: 1, display: 'flex', alignItems: 'center' }}>
                  <Tooltip title={`${item.name} (${format(start, 'MMM d', { locale: dateLocale })} - ${format(end, 'MMM d', { locale: dateLocale })})`}>
                    <Box
                      onClick={() => onItemClick(item)}
                      sx={{
                        position: 'absolute',
                        left: `${leftPct}%`,
                        width: `${Math.max(widthPct, 0.5)}%`,
                        height: 36,
                        bgcolor: item.color,
                        borderRadius: 2,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', px: 1.5,
                        transition: 'transform 0.2s',
                        '&:hover': { transform: 'scaleY(1.05)', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' },
                        overflow: 'hidden', whiteSpace: 'nowrap',
                      }}
                    >
                      <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
                        {item.name}
                      </Typography>
                    </Box>
                  </Tooltip>
                </Box>
              );
            })}
          </Box>

          {(() => {
            const today = new Date();
            if (today >= minDate && today <= maxDate) {
              const off = differenceInDays(today, minDate);
              const left = (off / totalDays) * 100;
              return (
                <Box sx={{
                  position: 'absolute', top: 0, bottom: 0, left: `${left}%`,
                  width: 2, bgcolor: 'error.main', zIndex: 15, pointerEvents: 'none',
                }}>
                  <Box sx={{
                    position: 'absolute', top: 0, left: -4,
                    width: 10, height: 10, borderRadius: '50%', bgcolor: 'error.main',
                  }} />
                  <Typography
                    variant="caption"
                    sx={{
                      position: 'absolute', top: -20, left: -15,
                      bgcolor: 'error.main', color: 'white', px: 0.5, borderRadius: 0.5,
                      fontSize: '0.65rem', fontWeight: 700,
                    }}
                  >
                    {todayLabel}
                  </Typography>
                </Box>
              );
            }
            return null;
          })()}
        </Box>
      </Box>
    </Paper>
  );
};

export default GanttChart;
