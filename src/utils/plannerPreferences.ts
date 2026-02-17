export interface WeeklyPlannerPreferences {
  weekStartsOn: 0 | 1; // 0: Sun, 1: Mon
  hiddenWeekdays: number[]; // 0(Sun) ... 6(Sat)
}

const DEFAULT_PREFERENCES: WeeklyPlannerPreferences = {
  weekStartsOn: 1,
  hiddenWeekdays: [],
};

const clampWeekday = (d: unknown): number | null => {
  if (typeof d !== 'number' || !Number.isInteger(d)) return null;
  if (d < 0 || d > 6) return null;
  return d;
};

const normalizePreferences = (raw: unknown): WeeklyPlannerPreferences => {
  if (!raw || typeof raw !== 'object') return DEFAULT_PREFERENCES;
  const obj = raw as Partial<WeeklyPlannerPreferences>;
  const weekStartsOn: 0 | 1 = obj.weekStartsOn === 0 ? 0 : 1;
  const hiddenWeekdays = Array.isArray(obj.hiddenWeekdays)
    ? Array.from(new Set(obj.hiddenWeekdays.map(clampWeekday).filter((v): v is number => v !== null))).sort((a, b) => a - b)
    : [];
  return { weekStartsOn, hiddenWeekdays };
};

const keyForUser = (userId?: string) => `taskflow-weekly-preferences${userId ? `:${userId}` : ''}`;

export const getWeeklyPlannerPreferences = (userId?: string): WeeklyPlannerPreferences => {
  try {
    const raw = localStorage.getItem(keyForUser(userId));
    if (!raw) return DEFAULT_PREFERENCES;
    return normalizePreferences(JSON.parse(raw));
  } catch {
    return DEFAULT_PREFERENCES;
  }
};

export const setWeeklyPlannerPreferences = (prefs: WeeklyPlannerPreferences, userId?: string): void => {
  try {
    localStorage.setItem(keyForUser(userId), JSON.stringify(normalizePreferences(prefs)));
  } catch {
    // no-op
  }
};

export const DEFAULT_WEEKLY_PLANNER_PREFERENCES = DEFAULT_PREFERENCES;
