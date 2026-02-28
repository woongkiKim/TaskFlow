import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { useLanguage } from './LanguageContext';
import { useAuth } from './AuthContext';
import { addTimeEntry } from '../services/timeTrackingService';

export type PomodoroMode = 'focus' | 'break' | 'long_break' | 'idle';

export interface PomodoroSettings {
    focusDuration: number; // in minutes
    shortBreakDuration: number; // in minutes
    longBreakDuration: number; // in minutes
    longBreakInterval: number; // number of pomodoros
}

export const defaultPomodoroSettings: PomodoroSettings = {
    focusDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    longBreakInterval: 4,
};

interface PomodoroContextType {
    activeTaskId: string | null;
    activeTaskText: string;
    timeLeft: number;
    isRunning: boolean;
    mode: PomodoroMode;
    completedPomodoros: number;
    settings: PomodoroSettings;
    updateSettings: (newSettings: Partial<PomodoroSettings>) => void;
    startTimer: (taskId: string, taskText: string) => void;
    pauseTimer: () => void;
    resumeTimer: () => void;
    resetTimer: () => void;
    skipBreak: () => void;
}

const PomodoroContext = createContext<PomodoroContextType | null>(null);

const SETTINGS_KEY = 'pomodoro_settings';

export const PomodoroProvider = ({ children }: { children: ReactNode }) => {
    const { t, lang } = useLanguage();
    const { user } = useAuth();
    const [settings, setSettings] = useState<PomodoroSettings>(() => {
        try {
            const stored = localStorage.getItem(SETTINGS_KEY);
            return stored ? { ...defaultPomodoroSettings, ...JSON.parse(stored) } : defaultPomodoroSettings;
        } catch {
            return defaultPomodoroSettings;
        }
    });

    const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
    const [activeTaskText, setActiveTaskText] = useState('');
    const [timeLeft, setTimeLeft] = useState(settings.focusDuration * 60);
    const [isRunning, setIsRunning] = useState(false);
    const [mode, setMode] = useState<PomodoroMode>('idle');
    const [completedPomodoros, setCompletedPomodoros] = useState(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const focusStartRef = useRef<string | null>(null);
    const focusDurationStartRef = useRef<number>(settings.focusDuration);

    const updateSettings = useCallback((newSettings: Partial<PomodoroSettings>) => {
        setSettings(prev => {
            const updated = { ...prev, ...newSettings };
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
            // Update time left if idle
            if (mode === 'idle') {
                setTimeLeft(updated.focusDuration * 60);
            }
            return updated;
        });
    }, [mode]);

    // 타이머 틱
    useEffect(() => {
        if (isRunning && timeLeft > 0) {
            intervalRef.current = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && isRunning) {
            // 모드 전환
            if (mode === 'focus') {
                // ✅ 포모도로 완료 → 시간 기록 저장
                if (activeTaskId && user && focusStartRef.current) {
                    addTimeEntry({
                        taskId: activeTaskId,
                        userId: user.uid,
                        userName: user.displayName || '',
                        type: 'pomodoro',
                        startTime: focusStartRef.current,
                        endTime: new Date().toISOString(),
                        durationMinutes: focusDurationStartRef.current, // Use the focus duration when it started
                    }).catch(() => { /* silent */ });
                }
                const newCompleted = completedPomodoros + 1;
                setCompletedPomodoros(newCompleted);

                // Determine break type
                const isLongBreak = newCompleted > 0 && newCompleted % settings.longBreakInterval === 0;
                setMode(isLongBreak ? 'long_break' : 'break');
                setTimeLeft((isLongBreak ? settings.longBreakDuration : settings.shortBreakDuration) * 60);

                if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification(`🍅 ${t('pomodoroComplete') as string}`, {
                        body: isLongBreak ? (lang === 'ko' ? '긴 휴식 시간입니다!' : 'Time for a long break!') : (t('breakTime') as string)
                    });
                }
            } else if (mode === 'break' || mode === 'long_break') {
                setMode('idle');
                setIsRunning(false);
                setActiveTaskId(null);
                setActiveTaskText('');
                setTimeLeft(settings.focusDuration * 60);
                focusStartRef.current = null;
                if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification(`☕ ${t('breakTime') as string}`, { body: t('startFocus') as string });
                }
            }
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isRunning, timeLeft, mode, t, lang, activeTaskId, user, completedPomodoros, settings]);

    // 알림 권한 요청
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    const startTimer = useCallback((taskId: string, taskText: string) => {
        setActiveTaskId(taskId);
        setActiveTaskText(taskText);
        setMode('focus');
        setTimeLeft(settings.focusDuration * 60);
        focusDurationStartRef.current = settings.focusDuration;
        setIsRunning(true);
        focusStartRef.current = new Date().toISOString();
    }, [settings.focusDuration]);

    const pauseTimer = useCallback(() => {
        setIsRunning(false);
    }, []);

    const resumeTimer = useCallback(() => {
        setIsRunning(true);
    }, []);

    const resetTimer = useCallback(() => {
        setIsRunning(false);
        setMode('idle');
        setActiveTaskId(null);
        setActiveTaskText('');
        setTimeLeft(settings.focusDuration * 60);
        focusStartRef.current = null;
    }, [settings.focusDuration]);

    const skipBreak = useCallback(() => {
        setMode('idle');
        setIsRunning(false);
        setActiveTaskId(null);
        setActiveTaskText('');
        setTimeLeft(settings.focusDuration * 60);
        focusStartRef.current = null;
    }, [settings.focusDuration]);

    return (
        <PomodoroContext.Provider value={{
            activeTaskId, activeTaskText, timeLeft, isRunning, mode, completedPomodoros,
            settings, updateSettings,
            startTimer, pauseTimer, resumeTimer, resetTimer, skipBreak
        }}>
            {children}
        </PomodoroContext.Provider>
    );
};

export const usePomodoro = () => {
    const ctx = useContext(PomodoroContext);
    if (!ctx) throw new Error('usePomodoro must be used within PomodoroProvider');
    return ctx;
};
