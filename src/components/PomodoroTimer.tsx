import { Box, Typography, IconButton, Chip, Dialog, DialogContent } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import TimerIcon from '@mui/icons-material/Timer';
import { usePomodoro } from '../contexts/PomodoroContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useState } from 'react';

const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
};

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
    const { activeTaskText, timeLeft, isRunning, mode, pauseTimer, resumeTimer, resetTimer, skipBreak } = usePomodoro();
    const { t } = useLanguage();

    const progress = mode === 'focus'
        ? ((25 * 60 - timeLeft) / (25 * 60)) * 100
        : ((5 * 60 - timeLeft) / (5 * 60)) * 100;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogContent sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="caption" fontWeight="bold" color={mode === 'focus' ? 'error.main' : 'success.main'} sx={{ textTransform: 'uppercase', letterSpacing: 2 }}>
                    {mode === 'focus' ? (t('focusTime') as string) : (t('breakTime') as string)}
                </Typography>

                {/* 원형 프로그레스 */}
                <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', my: 4 }}>
                    <Box sx={{
                        width: 180, height: 180, borderRadius: '50%',
                        background: `conic-gradient(${mode === 'focus' ? '#dc2626' : '#16a34a'} ${progress}%, #f1f5f9 ${progress}%)`,
                        display: 'flex', justifyContent: 'center', alignItems: 'center',
                    }}>
                        <Box sx={{
                            width: 160, height: 160, borderRadius: '50%',
                            bgcolor: 'background.paper', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column',
                        }}>
                            <Typography variant="h3" fontWeight="800" color={mode === 'focus' ? 'error.main' : 'success.main'}>
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
                    {mode === 'break' && (
                        <IconButton onClick={skipBreak} sx={{ bgcolor: 'action.hover', width: 56, height: 56 }}>
                            <SkipNextIcon fontSize="large" color="action" />
                        </IconButton>
                    )}
                </Box>
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
