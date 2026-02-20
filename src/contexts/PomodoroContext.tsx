import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { useLanguage } from './LanguageContext';
import { useAuth } from './AuthContext';
import { addTimeEntry } from '../services/timeTrackingService';

type PomodoroMode = 'focus' | 'break' | 'idle';

interface PomodoroContextType {
    activeTaskId: string | null;
    activeTaskText: string;
    timeLeft: number;
    isRunning: boolean;
    mode: PomodoroMode;
    completedPomodoros: number;
    startTimer: (taskId: string, taskText: string) => void;
    pauseTimer: () => void;
    resumeTimer: () => void;
    resetTimer: () => void;
    skipBreak: () => void;
}

const FOCUS_DURATION = 25 * 60; // 25분
const BREAK_DURATION = 5 * 60;  // 5분

const PomodoroContext = createContext<PomodoroContextType | null>(null);

export const PomodoroProvider = ({ children }: { children: ReactNode }) => {
    const { t } = useLanguage();
    const { user } = useAuth();
    const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
    const [activeTaskText, setActiveTaskText] = useState('');
    const [timeLeft, setTimeLeft] = useState(FOCUS_DURATION);
    const [isRunning, setIsRunning] = useState(false);
    const [mode, setMode] = useState<PomodoroMode>('idle');
    const [completedPomodoros, setCompletedPomodoros] = useState(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const focusStartRef = useRef<string | null>(null);

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
                        durationMinutes: 25,
                    }).catch(() => { /* silent */ });
                }
                setCompletedPomodoros(prev => prev + 1);
                setMode('break');
                setTimeLeft(BREAK_DURATION);
                if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification(`🍅 ${t('pomodoroComplete') as string}`, { body: t('breakTime') as string });
                }
            } else if (mode === 'break') {
                setMode('idle');
                setIsRunning(false);
                setActiveTaskId(null);
                setActiveTaskText('');
                setTimeLeft(FOCUS_DURATION);
                focusStartRef.current = null;
                if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification(`☕ ${t('breakTime') as string}`, { body: t('startFocus') as string });
                }
            }
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isRunning, timeLeft, mode, t, activeTaskId, user]);

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
        setTimeLeft(FOCUS_DURATION);
        setIsRunning(true);
        setCompletedPomodoros(0);
        focusStartRef.current = new Date().toISOString();
    }, []);

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
        setTimeLeft(FOCUS_DURATION);
        setCompletedPomodoros(0);
        focusStartRef.current = null;
    }, []);

    const skipBreak = useCallback(() => {
        setMode('idle');
        setIsRunning(false);
        setActiveTaskId(null);
        setActiveTaskText('');
        setTimeLeft(FOCUS_DURATION);
        focusStartRef.current = null;
    }, []);

    return (
        <PomodoroContext.Provider value={{
            activeTaskId, activeTaskText, timeLeft, isRunning, mode, completedPomodoros,
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
