import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { useLanguage } from './LanguageContext';
import { useAuth } from './AuthContext';
import { addTimeEntry } from '../services/timeTrackingService';

export type PomodoroMode = 'focus' | 'break' | 'long_break' | 'idle';

export type AmbientSound = 'none' | 'white' | 'brown' | 'pink';

export interface PomodoroSettings {
    focusDuration: number; // in minutes
    shortBreakDuration: number; // in minutes
    longBreakDuration: number; // in minutes
    longBreakInterval: number; // number of pomodoros
    ambientSound: AmbientSound;
}

export const defaultPomodoroSettings: PomodoroSettings = {
    focusDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    longBreakInterval: 4,
    ambientSound: 'none',
};

const playDing = () => {
    try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;

        const audioCtx = new AudioContextClass();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(110, audioCtx.currentTime + 1);

        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1);

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 1);
    } catch (e) {
        console.warn('Audio API not supported', e);
    }
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

    // Ambient Sound Logic
    const audioCtxRef = useRef<AudioContext | null>(null);
    const noiseSourceRef = useRef<AudioBufferSourceNode | null>(null);

    const stopAmbientSound = useCallback(() => {
        if (noiseSourceRef.current) {
            try { noiseSourceRef.current.stop(); } catch (e) { /* silent */ }
            noiseSourceRef.current.disconnect();
            noiseSourceRef.current = null;
        }
        if (audioCtxRef.current && audioCtxRef.current.state === 'running') {
            audioCtxRef.current.suspend();
        }
    }, []);

    const playAmbientSound = useCallback((type: AmbientSound) => {
        if (type === 'none') {
            stopAmbientSound();
            return;
        }
        try {
            if (!audioCtxRef.current) {
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                if (!AudioContextClass) return; // not supported
                audioCtxRef.current = new AudioContextClass();
            }
            const ctx = audioCtxRef.current;
            if (ctx.state === 'suspended') ctx.resume();

            if (noiseSourceRef.current) {
                stopAmbientSound();
                if (ctx.state === 'suspended') ctx.resume();
            }

            const bufferSize = ctx.sampleRate * 2;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const output = buffer.getChannelData(0);

            let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
            let lastOut = 0;

            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                if (type === 'white') {
                    output[i] = white * 0.1;
                } else if (type === 'brown') {
                    lastOut = (lastOut + (0.02 * white)) / 1.02;
                    output[i] = lastOut * 3.5 * 0.1;
                } else if (type === 'pink') {
                    b0 = 0.99886 * b0 + white * 0.0555179;
                    b1 = 0.99332 * b1 + white * 0.0750759;
                    b2 = 0.96900 * b2 + white * 0.1538520;
                    b3 = 0.86650 * b3 + white * 0.3104856;
                    b4 = 0.55000 * b4 + white * 0.5329522;
                    b5 = -0.7616 * b5 - white * 0.0168980;
                    output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.02;
                    b6 = white * 0.115926;
                }
            }

            noiseSourceRef.current = ctx.createBufferSource();
            noiseSourceRef.current.buffer = buffer;
            noiseSourceRef.current.loop = true;

            const gainNode = ctx.createGain();
            gainNode.gain.setValueAtTime(0, ctx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 1);

            noiseSourceRef.current.connect(gainNode);
            gainNode.connect(ctx.destination);
            noiseSourceRef.current.start();
        } catch (e) {
            console.warn('Ambient sound play error', e);
        }
    }, [stopAmbientSound]);

    useEffect(() => {
        if (isRunning && mode === 'focus' && settings.ambientSound !== 'none') {
            playAmbientSound(settings.ambientSound);
        } else {
            stopAmbientSound();
        }
    }, [isRunning, mode, settings.ambientSound, playAmbientSound, stopAmbientSound]);

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
                playDing();
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
                playDing();
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
