import { useMemo } from 'react';
import { Box, Typography, Tooltip, Collapse, IconButton } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { startOfMonth, endOfMonth, differenceInDays, parseISO, isWithinInterval } from 'date-fns';
import type { Sprint } from '../types';

interface IterationTimelineProps {
    sprints: Sprint[];
    currentDate: Date;
    expanded: boolean;
    onToggle: () => void;
}

// Color mapping for iteration types
const COLORS = {
    phase: { bg: '#10b981', light: 'rgba(16,185,129,0.15)', text: '#059669' },
    sprint: { bg: '#6366f1', light: 'rgba(99,102,241,0.15)', text: '#4f46e5' },
    milestone: { bg: '#ef4444', light: 'rgba(239,68,68,0.15)', text: '#dc2626' },
};

const IterationTimeline = ({ sprints, currentDate, expanded, onToggle }: IterationTimelineProps) => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const totalDays = differenceInDays(monthEnd, monthStart) + 1;

    // Build ordered rows: phases (with children indented), standalone sprints, milestones
    const rows = useMemo(() => {
        const result: { sprint: Sprint; indent: boolean }[] = [];
        const phases = sprints.filter(s => s.type === 'phase');
        const childSprintsByPhase = (phaseId: string) => sprints.filter(s => s.type === 'sprint' && s.parentId === phaseId);
        const topSprints = sprints.filter(s => s.type === 'sprint' && !s.parentId);
        const milestones = sprints.filter(s => s.type === 'milestone');

        phases.forEach(phase => {
            result.push({ sprint: phase, indent: false });
            childSprintsByPhase(phase.id).forEach(child => {
                result.push({ sprint: child, indent: true });
            });
        });
        topSprints.forEach(sp => result.push({ sprint: sp, indent: false }));
        milestones.forEach(ms => result.push({ sprint: ms, indent: false }));

        return result;
    }, [sprints]);

    // Filter to only show items overlapping with the current month
    const visibleRows = useMemo(() => {
        return rows.filter(({ sprint: sp }) => {
            if (sp.type === 'milestone') {
                if (!sp.endDate) return false;
                const d = parseISO(sp.endDate);
                return isWithinInterval(d, { start: monthStart, end: monthEnd });
            }
            if (!sp.startDate && !sp.endDate) return false;
            const s = sp.startDate ? parseISO(sp.startDate) : monthStart;
            const e = sp.endDate ? parseISO(sp.endDate) : monthEnd;
            // Check overlap with month range
            return s <= monthEnd && e >= monthStart;
        });
    }, [rows, monthStart, monthEnd]);

    // Calculate position percentage for a date within the month
    const dateToPct = (dateStr: string): number => {
        const d = parseISO(dateStr);
        const dayOffset = differenceInDays(d, monthStart);
        return Math.max(0, Math.min(100, (dayOffset / totalDays) * 100));
    };

    // "Today" marker position
    const today = new Date();
    const todayInMonth = isWithinInterval(today, { start: monthStart, end: monthEnd });
    const todayPct = todayInMonth ? (differenceInDays(today, monthStart) / totalDays) * 100 : -1;

    if (visibleRows.length === 0) return null;

    return (
        <Box sx={{ mb: 1.5 }}>
            {/* Header */}
            <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', mb: 0.5, userSelect: 'none' }}
                onClick={onToggle}
            >
                <IconButton size="small" sx={{ p: 0.2 }}>
                    {expanded ? <ExpandLessIcon sx={{ fontSize: 14 }} /> : <ExpandMoreIcon sx={{ fontSize: 14 }} />}
                </IconButton>
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ letterSpacing: 0.5, textTransform: 'uppercase', fontSize: '0.6rem' }}>
                    Iteration Timeline
                </Typography>
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem', ml: 0.5 }}>
                    ({visibleRows.length})
                </Typography>
            </Box>

            <Collapse in={expanded}>
                <Box
                    sx={{
                        border: '1px solid', borderColor: 'divider', borderRadius: 2,
                        overflow: 'hidden', bgcolor: 'background.paper',
                    }}
                >
                    {/* Day axis header */}
                    <Box sx={{ position: 'relative', height: 20, borderBottom: '1px solid', borderColor: 'divider', px: 0 }}>
                        {Array.from({ length: totalDays }, (_, i) => {
                            const dayNum = i + 1;
                            const showLabel = dayNum === 1 || dayNum % 5 === 0 || dayNum === totalDays;
                            return showLabel ? (
                                <Typography
                                    key={i}
                                    variant="caption"
                                    sx={{
                                        position: 'absolute',
                                        left: `${(i / totalDays) * 100}%`,
                                        fontSize: '0.55rem',
                                        color: 'text.disabled',
                                        transform: 'translateX(-50%)',
                                        top: 3,
                                        fontWeight: dayNum === 1 || dayNum === totalDays ? 600 : 400,
                                    }}
                                >
                                    {dayNum}
                                </Typography>
                            ) : null;
                        })}
                        {/* Today marker on axis */}
                        {todayPct >= 0 && (
                            <Box sx={{
                                position: 'absolute', left: `${todayPct}%`, top: 0, bottom: 0,
                                width: 1.5, bgcolor: 'error.main', opacity: 0.6, zIndex: 2,
                            }} />
                        )}
                    </Box>

                    {/* Timeline rows */}
                    {visibleRows.map(({ sprint: sp, indent }) => {
                        const color = COLORS[sp.type] || COLORS.sprint;
                        const isMilestone = sp.type === 'milestone';

                        if (isMilestone) {
                            // Milestone — diamond marker
                            const pct = sp.endDate ? dateToPct(sp.endDate) : 50;
                            const linkedNames = sp.linkedSprintIds
                                ?.map(lid => sprints.find(s => s.id === lid)?.name)
                                .filter(Boolean) || [];
                            const tooltipText = [
                                sp.name,
                                sp.endDate ? `→ ${sp.endDate}` : '',
                                linkedNames.length > 0 ? `📎 ${linkedNames.join(', ')}` : '',
                            ].filter(Boolean).join(' · ');
                            return (
                                <Box
                                    key={sp.id}
                                    sx={{
                                        position: 'relative', height: 28,
                                        borderBottom: '1px solid', borderColor: 'divider',
                                        '&:hover': { bgcolor: color.light },
                                        transition: 'background-color 0.15s',
                                    }}
                                >
                                    {/* Label */}
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
                                            fontSize: '0.65rem', fontWeight: 600, color: color.text,
                                            whiteSpace: 'nowrap', zIndex: 1,
                                        }}
                                    >
                                        🎯 {sp.name}
                                        {linkedNames.length > 0 && (
                                            <Box component="span" sx={{ ml: 0.5, opacity: 0.5, fontSize: '0.55rem', fontWeight: 400 }}>
                                                📎{linkedNames.length}
                                            </Box>
                                        )}
                                    </Typography>
                                    {/* Diamond marker */}
                                    <Tooltip title={tooltipText} arrow>
                                        <Box sx={{
                                            position: 'absolute',
                                            left: `${pct}%`,
                                            top: '50%',
                                            transform: 'translate(-50%, -50%) rotate(45deg)',
                                            width: 10, height: 10,
                                            bgcolor: sp.status === 'completed' ? 'success.main' : color.bg,
                                            borderRadius: 0.5,
                                            boxShadow: `0 0 0 2px ${color.light}`,
                                            zIndex: 3,
                                        }} />
                                    </Tooltip>
                                    {/* Dashed line to diamond */}
                                    <Box sx={{
                                        position: 'absolute', top: '50%', left: 0, width: `${pct}%`,
                                        borderTop: '1px dashed', borderColor: color.bg, opacity: 0.3,
                                    }} />
                                    {/* Today marker */}
                                    {todayPct >= 0 && (
                                        <Box sx={{
                                            position: 'absolute', left: `${todayPct}%`, top: 0, bottom: 0,
                                            width: 1.5, bgcolor: 'error.main', opacity: 0.25, zIndex: 2,
                                        }} />
                                    )}
                                </Box>
                            );
                        }

                        // Phase / Sprint — horizontal bar
                        const startPct = sp.startDate ? dateToPct(sp.startDate) : 0;
                        const endPct = sp.endDate ? dateToPct(sp.endDate) : 100;
                        const barWidth = Math.max(endPct - startPct, 1.5);

                        // Calculate a simple progress based on current date
                        let progress = 0;
                        if (sp.startDate && sp.endDate) {
                            const s = parseISO(sp.startDate);
                            const e = parseISO(sp.endDate);
                            const totalSpan = differenceInDays(e, s) || 1;
                            const elapsed = differenceInDays(today, s);
                            if (sp.status === 'completed') progress = 100;
                            else progress = Math.max(0, Math.min(100, (elapsed / totalSpan) * 100));
                        } else if (sp.status === 'completed') {
                            progress = 100;
                        }

                        return (
                            <Box
                                key={sp.id}
                                sx={{
                                    position: 'relative', height: 28,
                                    borderBottom: '1px solid', borderColor: 'divider',
                                    '&:hover': { bgcolor: color.light },
                                    transition: 'background-color 0.15s',
                                }}
                            >
                                {/* Label */}
                                <Typography
                                    variant="caption"
                                    sx={{
                                        position: 'absolute', left: indent ? 20 : 8, top: '50%', transform: 'translateY(-50%)',
                                        fontSize: '0.65rem', fontWeight: 600, color: color.text,
                                        whiteSpace: 'nowrap', zIndex: 1,
                                    }}
                                >
                                    {indent && (
                                        <Box component="span" sx={{ color: COLORS.phase.bg, mr: 0.3, opacity: 0.5 }}>└ </Box>
                                    )}
                                    {sp.type === 'phase' ? '📋' : '🚀'} {sp.name}
                                </Typography>

                                {/* Bar track */}
                                <Tooltip
                                    title={`${sp.name}${sp.startDate ? ` · ${sp.startDate}` : ''}${sp.endDate ? ` ~ ${sp.endDate}` : ''} · ${Math.round(progress)}%`}
                                    arrow
                                >
                                    <Box sx={{
                                        position: 'absolute',
                                        left: `${startPct}%`,
                                        width: `${barWidth}%`,
                                        top: '50%', transform: 'translateY(-50%)',
                                        height: indent ? 6 : 8,
                                        borderRadius: 4,
                                        bgcolor: color.light,
                                        overflow: 'hidden',
                                        zIndex: 1,
                                    }}>
                                        {/* Filled progress */}
                                        <Box sx={{
                                            width: `${progress}%`, height: '100%',
                                            bgcolor: sp.status === 'completed' ? 'success.main' : color.bg,
                                            borderRadius: 4,
                                            transition: 'width 0.3s ease',
                                        }} />
                                    </Box>
                                </Tooltip>

                                {/* Today marker */}
                                {todayPct >= 0 && (
                                    <Box sx={{
                                        position: 'absolute', left: `${todayPct}%`, top: 0, bottom: 0,
                                        width: 1.5, bgcolor: 'error.main', opacity: 0.25, zIndex: 2,
                                    }} />
                                )}
                            </Box>
                        );
                    })}
                </Box>
            </Collapse>
        </Box>
    );
};

export default IterationTimeline;
