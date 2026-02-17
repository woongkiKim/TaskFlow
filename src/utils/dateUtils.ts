import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  addWeeks,
  subWeeks,
  isSameDay,
  endOfMonth,
  startOfMonth,
  addMonths,
  subMonths,
  isSameMonth,
  getWeek,
} from 'date-fns';

export const getDaysInWeek = (date: Date, weekStartsOn: 0 | 1 = 1) => {
  const start = startOfWeek(date, { weekStartsOn });
  const end = endOfWeek(date, { weekStartsOn });
  return eachDayOfInterval({ start, end });
};

export const formatWeekHeader = (date: Date, weekStartsOn: 0 | 1 = 1) => {
  const start = startOfWeek(date, { weekStartsOn });
  const end = endOfWeek(date, { weekStartsOn });
  const weekNumber = getWeek(date, { weekStartsOn, firstWeekContainsDate: 1 });
  return {
    monthYear: format(date, 'MMMM yyyy'),
    weekRange: `Week ${weekNumber} (${format(start, 'MMM d')} - ${format(end, 'MMM d')})`,
  };
};

export const getNextWeek = (date: Date) => addWeeks(date, 1);
export const getPrevWeek = (date: Date) => subWeeks(date, 1);

export const isSameDate = (date1: number | Date, date2: number | Date) => isSameDay(date1, date2);

export const getDaysInMonthGrid = (date: Date, weekStartsOn: 0 | 1 = 1) => {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const startDate = startOfWeek(monthStart, { weekStartsOn });
  const endDate = endOfWeek(monthEnd, { weekStartsOn });

  return eachDayOfInterval({
    start: startDate,
    end: endDate,
  });
};

export const getNextMonth = (date: Date) => addMonths(date, 1);
export const getPrevMonth = (date: Date) => subMonths(date, 1);
export const isSameMonthDate = (date1: Date, date2: Date) => isSameMonth(date1, date2);
