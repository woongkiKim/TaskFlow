import { Box, Typography, IconButton, Chip, Dialog, DialogContent, Collapse, TextField, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import TimerIcon from '@mui/icons-material/Timer';
import SettingsIcon from '@mui/icons-material/Settings';
import { usePomodoro } from '../contexts/PomodoroContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useState } from 'react';

const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
};

import type { AmbientSound } from '../contexts/PomodoroContext';

// 미니 타이머: Header에 표시
export const MiniPomodoroTimer = () => {
    const { activeTaskId, activeTaskText, timeLeft, isRunning, mode } = usePomodoro();
    const [dialogOpen, setDialogOpen] = useState(false);

    if (!activeTaskId || mode === 'idle') return null;

    return (
        <>
            <Chip
                icon={<TimerIcon />}
                label={`${formatTime(timeLeft)} · ${activeTaskText.length > 12 ? activeTaskText.slice(0, 12) + '…' : activeTaskText}`}
                onClick={() => setDialogOpen(true)}
                sx={{
                    bgcolor: mode === 'focus' ? '#fef2f2' : '#f0fdf4',
                    color: mode === 'focus' ? '#dc2626' : '#16a34a',
                    fontWeight: 'bold',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: mode === 'focus' ? '#fecaca' : '#bbf7d0',
                    animation: isRunning ? 'pulse 2s infinite' : 'none',
                    '@keyframes pulse': {
                        '0%, 100%': { opacity: 1 },
                        '50%': { opacity: 0.7 },
                    },
                }}
            />
            <PomodoroDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
        </>
    );
};

// 포모도로 다이얼로그 (확장 뷰)
export const PomodoroDialog = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
    const { activeTaskText, timeLeft, isRunning, mode, pauseTimer, resumeTimer, resetTimer, skipBreak, settings, updateSettings, completedPomodoros } = usePomodoro();
    const { t, lang } = useLanguage();
    const [showSettings, setShowSettings] = useState(false);

    let maxTime = settings.focusDuration * 60;
    if (mode === 'break') maxTime = settings.shortBreakDuration * 60;
    if (mode === 'long_break') maxTime = settings.longBreakDuration * 60;

    const progress = ((maxTime - timeLeft) / maxTime) * 100;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                <IconButton onClick={() => setShowSettings(!showSettings)} size="small" sx={{ color: 'text.secondary' }}>
                    <SettingsIcon fontSize="small" />
                </IconButton>
            </Box>
            <DialogContent sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="caption" fontWeight="bold" color={mode === 'focus' ? 'error.main' : mode === 'long_break' ? 'info.main' : 'success.main'} sx={{ textTransform: 'uppercase', letterSpacing: 2 }}>
                    {mode === 'focus' ? (t('focusTime') as string) : mode === 'long_break' ? (lang === 'ko' ? '긴 휴식' : 'Long Break') : (t('breakTime') as string)}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    {lang === 'ko' ? `완료된 뽀모도로: ${completedPomodoros}` : `Completed: ${completedPomodoros}`}
                </Typography>

                {/* 원형 프로그레스 */}
                <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', my: 4 }}>
                    <Box sx={{
                        width: 180, height: 180, borderRadius: '50%',
                        background: `conic-gradient(${mode === 'focus' ? '#dc2626' : mode === 'long_break' ? '#3b82f6' : '#16a34a'} ${progress}%, #f1f5f9 ${progress}%)`,
                        display: 'flex', justifyContent: 'center', alignItems: 'center',
                    }}>
                        <Box sx={{
                            width: 160, height: 160, borderRadius: '50%',
                            bgcolor: 'background.paper', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column',
                        }}>
                            <Typography variant="h3" fontWeight="800" color={mode === 'focus' ? 'error.main' : mode === 'long_break' ? 'info.main' : 'success.main'}>
                                {formatTime(timeLeft)}
                            </Typography>
                        </Box>
                    </Box>
                </Box>

                {/* 태스크 이름 */}
                <Typography variant="body2" color="text.secondary" fontWeight="600" noWrap sx={{ mb: 3 }}>
                    🍅 {activeTaskText}
                </Typography>

                {/* 컨트롤 버튼 */}
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                    {isRunning ? (
                        <IconButton onClick={pauseTimer} sx={{ bgcolor: 'action.hover', width: 56, height: 56 }}>
                            <PauseIcon fontSize="large" />
                        </IconButton>
                    ) : (
                        <IconButton onClick={resumeTimer} sx={{ bgcolor: mode === 'focus' ? '#fef2f2' : '#f0fdf4', width: 56, height: 56 }}>
                            <PlayArrowIcon fontSize="large" color={mode === 'focus' ? 'error' : 'success'} />
                        </IconButton>
                    )}
                    <IconButton onClick={resetTimer} sx={{ bgcolor: 'action.hover', width: 56, height: 56 }}>
                        <StopIcon fontSize="large" color="action" />
                    </IconButton>
                    {(mode === 'break' || mode === 'long_break') && (
                        <IconButton onClick={skipBreak} sx={{ bgcolor: 'action.hover', width: 56, height: 56 }}>
                            <SkipNextIcon fontSize="large" color="action" />
                        </IconButton>
                    )}
                </Box>

                {/* 설정 패널 */}
                <Collapse in={showSettings}>
                    <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid', borderColor: 'divider', textAlign: 'left' }}>
                        <Typography variant="subtitle2" fontWeight="700" mb={2}>
                            {lang === 'ko' ? '타이머 설정 (분)' : 'Timer Settings (min)'}
                        </Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                            <TextField
                                label={lang === 'ko' ? '집중' : 'Focus'}
                                type="number"
                                size="small"
                                value={settings.focusDuration}
                                onChange={(e) => updateSettings({ focusDuration: Math.max(1, Number(e.target.value)) })}
                            />
                            <TextField
                                label={lang === 'ko' ? '짧은 휴식' : 'Short Break'}
                                type="number"
                                size="small"
                                value={settings.shortBreakDuration}
                                onChange={(e) => updateSettings({ shortBreakDuration: Math.max(1, Number(e.target.value)) })}
                            />
                            <TextField
                                label={lang === 'ko' ? '긴 휴식' : 'Long Break'}
                                type="number"
                                size="small"
                                value={settings.longBreakDuration}
                                onChange={(e) => updateSettings({ longBreakDuration: Math.max(1, Number(e.target.value)) })}
                            />
                            <TextField
                                label={lang === 'ko' ? '긴 휴식 간격' : 'Long Break Interval'}
                                type="number"
                                size="small"
                                value={settings.longBreakInterval}
                                onChange={(e) => updateSettings({ longBreakInterval: Math.max(1, Number(e.target.value)) })}
                            />
                            <FormControl size="small" fullWidth sx={{ gridColumn: 'span 2', mt: 1 }}>
                                <InputLabel>{lang === 'ko' ? '백그라운드 소음 (집중 중)' : 'Background Sound (Focus)'}</InputLabel>
                                <Select
                                    value={settings.ambientSound}
                                    label={lang === 'ko' ? '백그라운드 소음 (집중 중)' : 'Background Sound (Focus)'}
                                    onChange={(e) => updateSettings({ ambientSound: e.target.value as AmbientSound })}
                                >
                                    <MenuItem value="none">{lang === 'ko' ? '없음' : 'None'}</MenuItem>
                                    <MenuItem value="white">{lang === 'ko' ? '백색 소음 (비행기, 비트)' : 'White Noise (Airplane, Fan)'}</MenuItem>
                                    <MenuItem value="brown">{lang === 'ko' ? '갈색 소음 (강한 빗소리, 폭포)' : 'Brown Noise (Heavy Rain, Waterfall)'}</MenuItem>
                                    <MenuItem value="pink">{lang === 'ko' ? '핑크 소음 (자연, 나뭇잎)' : 'Pink Noise (Nature, Leaves)'}</MenuItem>
                                </Select>
                            </FormControl>
                        </Box>
                    </Box>
                </Collapse>
            </DialogContent>
        </Dialog>
    );
};

// 태스크에 붙이는 포모도로 시작 버튼
export const PomodoroStartButton = ({ taskId, taskText }: { taskId: string; taskText: string }) => {
    const { activeTaskId, startTimer } = usePomodoro();
    const [dialogOpen, setDialogOpen] = useState(false);

    const isActive = activeTaskId === taskId;

    const handleClick = () => {
        if (isActive) {
            setDialogOpen(true);
        } else {
            startTimer(taskId, taskText);
            setDialogOpen(true);
        }
    };

    return (
        <>
            <IconButton
                size="small"
                onClick={handleClick}
                sx={{
                    p: 0.5,
                    color: isActive ? 'error.main' : 'text.secondary',
                    animation: isActive ? 'pulse 2s infinite' : 'none',
                    '@keyframes pulse': {
                        '0%, 100%': { opacity: 1 },
                        '50%': { opacity: 0.6 },
                    },
                }}
                title="Pomodoro Timer"
            >
                <TimerIcon sx={{ fontSize: 15 }} />
            </IconButton>
            <PomodoroDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
        </>
    );
};

export default PomodoroTimer;

function PomodoroTimer() {
    return null; // 이 컴포넌트는 위의 내보낸 하위 컴포넌트들로 사용됩니다
}
