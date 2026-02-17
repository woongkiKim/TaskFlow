import { useState } from 'react';
import { Box, Typography, Button, Paper, Collapse, Chip, IconButton } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CloseIcon from '@mui/icons-material/Close';
import HistoryIcon from '@mui/icons-material/History';
import { useLanguage } from '../contexts/LanguageContext';
import type { Task } from '../types';

interface RolloverBannerProps {
    pendingTasks: Task[];
    onRollover: (taskIds: string[]) => void;
}

const RolloverBanner = ({ pendingTasks, onRollover }: RolloverBannerProps) => {
    const { t } = useLanguage();
    const [dismissed, setDismissed] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [loading, setLoading] = useState(false);

    if (dismissed || pendingTasks.length === 0) return null;

    const handleRollover = async () => {
        setLoading(true);
        try {
            await onRollover(pendingTasks.map(t => t.id));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Paper
            elevation={0}
            sx={{
                mb: 2,
                borderRadius: 3,
                border: '1px solid',
                borderColor: '#fbbf24',
                bgcolor: '#fffbeb',
                overflow: 'hidden',
            }}
        >
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ p: 1, bgcolor: '#fef3c7', borderRadius: 2, display: 'flex' }}>
                    <HistoryIcon sx={{ color: '#f59e0b' }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" fontWeight="bold" color="#92400e">
                        {t('rolloverTitle') as string}
                    </Typography>
                    <Typography variant="caption" color="#a16207">
                        {pendingTasks.length} {t('rolloverDesc') as string}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <IconButton size="small" onClick={() => setExpanded(!expanded)} sx={{ color: '#a16207' }}>
                        {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                    <Button
                        size="small"
                        variant="contained"
                        startIcon={<ArrowForwardIcon />}
                        onClick={handleRollover}
                        disabled={loading}
                        sx={{
                            bgcolor: '#f59e0b',
                            '&:hover': { bgcolor: '#d97706' },
                            textTransform: 'none',
                            fontWeight: 'bold',
                            fontSize: '0.75rem',
                            borderRadius: 2,
                            boxShadow: 'none',
                        }}
                    >
                        {t('rolloverAction') as string}
                    </Button>
                    <IconButton size="small" onClick={() => setDismissed(true)} sx={{ color: '#a16207' }}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Box>
            </Box>

            {/* 미완료 태스크 미리보기 */}
            <Collapse in={expanded}>
                <Box sx={{ px: 2, pb: 2, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {pendingTasks.map(task => (
                        <Box key={task.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
                            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#f59e0b', flexShrink: 0 }} />
                            <Typography variant="caption" color="#78350f" sx={{ flex: 1 }} noWrap>
                                {task.text}
                            </Typography>
                            {task.tags && task.tags.length > 0 && (
                                <Chip label={task.tags[0]} size="small" sx={{ height: 18, fontSize: '0.6rem', bgcolor: '#fef3c7', color: '#92400e' }} />
                            )}
                        </Box>
                    ))}
                </Box>
            </Collapse>
        </Paper>
    );
};

export default RolloverBanner;
