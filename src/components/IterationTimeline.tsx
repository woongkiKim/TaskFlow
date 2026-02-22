import { useMemo, useState, useCallback } from 'react';
import {
    Box, Typography, Tooltip, Collapse, IconButton, Slider, alpha, Chip,
    Dialog, DialogTitle, DialogContent, DialogActions, Button, LinearProgress,
    Menu, MenuItem, Divider,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import LinkIcon from '@mui/icons-material/Link';
import FlagIcon from '@mui/icons-material/Flag';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import ListAltIcon from '@mui/icons-material/ListAlt';
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';
import BusinessIcon from '@mui/icons-material/Business';
import {
    startOfMonth, endOfMonth, differenceInDays, parseISO,
    isWithinInterval, format, addMonths, subMonths,
} from 'date-fns';
import { ko as dateFnsKo } from 'date-fns/locale';
import type { Sprint } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface IterationTimelineProps {
    sprints: Sprint[];
    currentDate: Date;
    expanded: boolean;
    onToggle: () => void;
    onDateChange?: (date: Date) => void;
}

// Color mapping for iteration types
const COLORS = {
    phase: { bg: '#10b981', light: 'rgba(16,185,129,0.12)', text: '#059669', gradient: 'linear-gradient(135deg, #10b981, #34d399)' },
    sprint: { bg: '#6366f1', light: 'rgba(99,102,241,0.12)', text: '#4f46e5', gradient: 'linear-gradient(135deg, #6366f1, #818cf8)' },
    milestone: { bg: '#ef4444', light: 'rgba(239,68,68,0.12)', text: '#dc2626', gradient: 'linear-gradient(135deg, #ef4444, #f87171)' },
};

// Zoom levels
const ZOOM_LEVELS = [
    { label: 'XS', row: 28, bar: 10, childBar: 7, fontSize: '0.6rem' },
    { label: 'S', row: 36, bar: 14, childBar: 10, fontSize: '0.65rem' },
    { label: 'M', row: 44, bar: 18, childBar: 13, fontSize: '0.7rem' },
    { label: 'L', row: 56, bar: 22, childBar: 16, fontSize: '0.75rem' },
    { label: 'XL', row: 68, bar: 28, childBar: 20, fontSize: '0.8rem' },
];

import { useWorkspace } from '../contexts/WorkspaceContext';

const IterationTimeline = ({ sprints, currentDate, expanded, onToggle, onDateChange }: IterationTimelineProps) => {
    const { t, lang } = useLanguage();
    const { teamGroups, projects } = useWorkspace();
    const dateLocale = lang === 'ko' ? dateFnsKo : undefined;
    const [zoomIdx, setZoomIdx] = useState(2);
    const [selectedSprint, setSelectedSprint] = useState<Sprint | null>(null);
    const [scopeFilter, setScopeFilter] = useState<'all' | 'personal' | 'team' | 'company'>('all');
    const [selectedTeamGroupId, setSelectedTeamGroupId] = useState<string | null>(null);
    const [teamAnchorEl, setTeamAnchorEl] = useState<null | HTMLElement>(null);

    const zoom = ZOOM_LEVELS[zoomIdx];

    // Scope config with translated labels
    const SCOPE_CONFIG = useMemo(() => ({
        personal: { icon: PersonIcon, label: t('personalScope') as string, color: '#8b5cf6', bg: '#f5f3ff' },
        team: { icon: GroupIcon, label: t('teamScope') as string, color: '#3b82f6', bg: '#eff6ff' },
        company: { icon: BusinessIcon, label: t('companyScope') as string, color: '#f59e0b', bg: '#fffbeb' },
    }), [t]);

    // Status config with translated labels
    const STATUS_CONFIG = useMemo(() => ({
        planning: { label: t('statusPlanning') as string, color: '#94a3b8', bg: '#f1f5f9' },
        active: { label: t('statusActive') as string, color: '#3b82f6', bg: '#dbeafe' },
        completed: { label: t('statusCompleted') as string, color: '#10b981', bg: '#d1fae5' },
    }), [t]);

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const totalDays = differenceInDays(monthEnd, monthStart) + 1;

    const handleZoomIn = useCallback(() => setZoomIdx(z => Math.min(z + 1, ZOOM_LEVELS.length - 1)), []);
    const handleZoomOut = useCallback(() => setZoomIdx(z => Math.max(z - 1, 0)), []);

    // Date navigation
    const goToPrevMonth = useCallback(() => {
        onDateChange?.(subMonths(currentDate, 1));
    }, [currentDate, onDateChange]);
    const goToNextMonth = useCallback(() => {
        onDateChange?.(addMonths(currentDate, 1));
    }, [currentDate, onDateChange]);
    const goToToday = useCallback(() => {
        onDateChange?.(new Date());
    }, [onDateChange]);

    // Build ordered rows
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

    // Filter by scope and selected team
    const scopeFilteredRows = useMemo(() => {
        let filtered = rows;
        if (scopeFilter !== 'all') {
            filtered = rows.filter(({ sprint }) => sprint.scope === scopeFilter);
        }

        if (scopeFilter === 'team' && selectedTeamGroupId) {
            filtered = filtered.filter(({ sprint }) => {
                const project = projects.find(p => p.id === sprint.projectId);
                return project?.teamGroupId === selectedTeamGroupId;
            });
        }
        return filtered;
    }, [rows, scopeFilter, selectedTeamGroupId, projects]);

    // Filter to only show items overlapping with the current month
    const visibleRows = useMemo(() => {
        return scopeFilteredRows.filter(({ sprint: sp }) => {
            if (sp.type === 'milestone') {
                if (!sp.endDate) return false;
                const d = parseISO(sp.endDate);
                return isWithinInterval(d, { start: monthStart, end: monthEnd });
            }
            if (!sp.startDate && !sp.endDate) return false;
            const s = sp.startDate ? parseISO(sp.startDate) : monthStart;
            const e = sp.endDate ? parseISO(sp.endDate) : monthEnd;
            return s <= monthEnd && e >= monthStart;
        });
    }, [scopeFilteredRows, monthStart, monthEnd]);

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

    // Build dependency arrows data
    const depArrows = useMemo(() => {
        const arrows: { fromId: string; toId: string; type: 'depends' | 'linked' }[] = [];
        const visibleIds = new Set(visibleRows.map(r => r.sprint.id));

        visibleRows.forEach(({ sprint: sp }) => {
            // dependsOn arrows
            sp.dependsOn?.forEach(depId => {
                if (visibleIds.has(depId)) {
                    arrows.push({ fromId: depId, toId: sp.id, type: 'depends' });
                }
            });
            // linkedSprintIds arrows (milestone links)
            if (sp.type === 'milestone') {
                sp.linkedSprintIds?.forEach(lid => {
                    if (visibleIds.has(lid)) {
                        arrows.push({ fromId: lid, toId: sp.id, type: 'linked' });
                    }
                });
            }
        });
        return arrows;
    }, [visibleRows]);

    // Calculate arrow positions using percentage
    const getSprintEndPct = useCallback((sprintId: string) => {
        const sp = sprints.find(s => s.id === sprintId);
        if (!sp) return 50;
        if (sp.type === 'milestone') return sp.endDate ? dateToPct(sp.endDate) : 50;
        return sp.endDate ? dateToPct(sp.endDate) : 100;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sprints, monthStart, totalDays]);

    const getSprintStartPct = useCallback((sprintId: string) => {
        const sp = sprints.find(s => s.id === sprintId);
        if (!sp) return 0;
        if (sp.type === 'milestone') return sp.endDate ? dateToPct(sp.endDate) : 50;
        return sp.startDate ? dateToPct(sp.startDate) : 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sprints, monthStart, totalDays]);

    const getRowIndex = useCallback((sprintId: string) => {
        return visibleRows.findIndex(r => r.sprint.id === sprintId);
    }, [visibleRows]);

    // Sprint detail calculations
    const getProgress = (sp: Sprint): number => {
        if (sp.status === 'completed') return 100;
        if (!sp.startDate || !sp.endDate) return 0;
        const s = parseISO(sp.startDate);
        const e = parseISO(sp.endDate);
        const totalSpan = differenceInDays(e, s) || 1;
        const elapsed = differenceInDays(today, s);
        return Math.max(0, Math.min(100, (elapsed / totalSpan) * 100));
    };

    const getDuration = (sp: Sprint): string => {
        if (!sp.startDate || !sp.endDate) return '—';
        const days = differenceInDays(parseISO(sp.endDate), parseISO(sp.startDate));
        if (days < 7) return `${days}${lang === 'ko' ? '일' : 'd'}`;
        if (days < 30) return `${Math.round(days / 7)}${lang === 'ko' ? '주' : 'w'}`;
        return `${Math.round(days / 30)}${lang === 'ko' ? '개월' : 'mo'}`;
    };

    // Day label interval
    const dayLabelInterval = zoomIdx <= 1 ? 5 : zoomIdx === 2 ? 5 : zoomIdx === 3 ? 2 : 1;

    if (visibleRows.length === 0 && scopeFilter === 'all') return null;

    return (
        <Box sx={{ mb: 1.5 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5, userSelect: 'none', flexWrap: 'wrap' }}>
                <Box
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer' }}
                    onClick={onToggle}
                >
                    <IconButton size="small" sx={{ p: 0.2 }}>
                        {expanded ? <ExpandLessIcon sx={{ fontSize: 14 }} /> : <ExpandMoreIcon sx={{ fontSize: 14 }} />}
                    </IconButton>
                    <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ letterSpacing: 0.5, textTransform: 'uppercase', fontSize: '0.6rem' }}>
                        {t('iterationTimeline') as string}
                    </Typography>
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem', ml: 0.5 }}>
                        ({visibleRows.length})
                    </Typography>
                </Box>

                {/* Date navigation & controls */}
                {expanded && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, ml: 'auto' }}>
                        {/* Scope filter chips */}
                        <Box sx={{ display: 'flex', gap: 0.3, mr: 1 }}>
                            {(['all', 'team', 'personal', 'company'] as const).map(s => {
                                const isActive = scopeFilter === s;
                                const cfg = s === 'all' ? null : SCOPE_CONFIG[s];
                                const scopeLabel = s === 'all' ? t('allScope') as string : cfg!.label;
                                return (
                                    <Chip
                                        key={s}
                                        size="small"
                                        label={isActive && s === 'team' && selectedTeamGroupId
                                            ? `${scopeLabel}: ${teamGroups.find(tg => tg.id === selectedTeamGroupId)?.name || ''}`
                                            : scopeLabel}
                                        icon={s === 'all' ? undefined : (() => {
                                            const Icon = cfg!.icon;
                                            return <Icon sx={{ fontSize: 12 }} />;
                                        })()}
                                        onClick={(e) => {
                                            if (s === 'team') {
                                                if (isActive) {
                                                    // If already team, show menu to switch team
                                                    setTeamAnchorEl(e.currentTarget);
                                                } else {
                                                    setScopeFilter(s);
                                                    if (teamGroups.length > 1) {
                                                        setTeamAnchorEl(e.currentTarget);
                                                    } else if (teamGroups.length === 1) {
                                                        setSelectedTeamGroupId(teamGroups[0].id);
                                                    }
                                                }
                                            } else {
                                                setScopeFilter(s);
                                                setSelectedTeamGroupId(null);
                                            }
                                        }}
                                        sx={{
                                            height: 20, fontSize: '0.55rem', fontWeight: 700,
                                            bgcolor: isActive ? (cfg?.bg || alpha('#6366f1', 0.12)) : 'transparent',
                                            color: isActive ? (cfg?.color || '#6366f1') : 'text.disabled',
                                            border: '1px solid',
                                            borderColor: isActive ? (cfg?.color || '#6366f1') : 'transparent',
                                            '& .MuiChip-icon': { color: isActive ? cfg?.color : 'text.disabled' },
                                            cursor: 'pointer',
                                            '&:hover': { bgcolor: isActive ? (cfg?.bg || alpha('#6366f1', 0.15)) : alpha('#6366f1', 0.05) }
                                        }}
                                    />
                                );
                            })}
                        </Box>

                        {/* Date navigation */}
                        {onDateChange && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.2, mr: 0.5, bgcolor: alpha('#f1f5f9', 0.8), borderRadius: 1.5, px: 0.3 }}>
                                <Tooltip title={t('previousMonth') as string} arrow>
                                    <IconButton size="small" onClick={goToPrevMonth} sx={{ p: 0.2 }}>
                                        <ChevronLeftIcon sx={{ fontSize: 14 }} />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title={t('goToToday') as string} arrow>
                                    <IconButton size="small" onClick={goToToday} sx={{ p: 0.2 }}>
                                        <TodayIcon sx={{ fontSize: 12 }} />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title={t('nextMonth') as string} arrow>
                                    <IconButton size="small" onClick={goToNextMonth} sx={{ p: 0.2 }}>
                                        <ChevronRightIcon sx={{ fontSize: 14 }} />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        )}

                        {/* Zoom controls */}
                        <Tooltip title={t('zoomOut') as string} arrow>
                            <IconButton
                                size="small"
                                onClick={handleZoomOut}
                                disabled={zoomIdx === 0}
                                sx={{ p: 0.3, '&:hover': { bgcolor: alpha('#6366f1', 0.08) } }}
                            >
                                <ZoomOutIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                        </Tooltip>
                        <Slider
                            value={zoomIdx}
                            min={0}
                            max={ZOOM_LEVELS.length - 1}
                            step={1}
                            onChange={(_, v) => setZoomIdx(v as number)}
                            sx={{
                                width: 50, mx: 0.5,
                                '& .MuiSlider-thumb': { width: 10, height: 10 },
                                '& .MuiSlider-track': { height: 2 },
                                '& .MuiSlider-rail': { height: 2 },
                            }}
                        />
                        <Tooltip title={t('zoomIn') as string} arrow>
                            <IconButton
                                size="small"
                                onClick={handleZoomIn}
                                disabled={zoomIdx === ZOOM_LEVELS.length - 1}
                                sx={{ p: 0.3, '&:hover': { bgcolor: alpha('#6366f1', 0.08) } }}
                            >
                                <ZoomInIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                        </Tooltip>
                        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.5rem', fontWeight: 700, minWidth: 14, textAlign: 'center' }}>
                            {zoom.label}
                        </Typography>
                    </Box>
                )}
            </Box>

            <Collapse in={expanded}>
                {/* Date range label */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 0.5 }}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                        {format(monthStart, 'yyyy. M. d')} — {format(monthEnd, 'M. d')}
                    </Typography>
                </Box>

                <Box
                    sx={{
                        border: '1px solid', borderColor: 'divider', borderRadius: 2,
                        overflow: 'hidden', bgcolor: 'background.paper',
                        position: 'relative',
                    }}
                >
                    {/* Day axis header */}
                    <Box sx={{
                        position: 'relative', height: 22,
                        borderBottom: '1px solid', borderColor: 'divider',
                        bgcolor: alpha('#f1f5f9', 0.5),
                    }}>
                        {Array.from({ length: totalDays }, (_, i) => {
                            const dayNum = i + 1;
                            const showLabel = dayNum === 1 || dayNum % dayLabelInterval === 0 || dayNum === totalDays;
                            return showLabel ? (
                                <Typography
                                    key={i}
                                    variant="caption"
                                    sx={{
                                        position: 'absolute',
                                        left: `${((i + 0.5) / totalDays) * 100}%`,
                                        fontSize: '0.55rem',
                                        color: 'text.disabled',
                                        transform: 'translateX(-50%)',
                                        top: 4,
                                        fontWeight: dayNum === 1 || dayNum === totalDays ? 700 : 400,
                                    }}
                                >
                                    {dayNum}
                                </Typography>
                            ) : null;
                        })}
                        {todayPct >= 0 && (
                            <Box sx={{
                                position: 'absolute', left: `${todayPct}%`, top: 0, bottom: 0,
                                width: 2, bgcolor: 'error.main', opacity: 0.7, zIndex: 2,
                                borderRadius: 1,
                            }} />
                        )}
                    </Box>

                    {/* Timeline rows */}
                    {visibleRows.map(({ sprint: sp, indent }) => {
                        const color = COLORS[sp.type] || COLORS.sprint;
                        const isMilestone = sp.type === 'milestone';
                        const scopeCfg = sp.scope ? SCOPE_CONFIG[sp.scope] : null;
                        const ScopeIcon = scopeCfg?.icon;
                        const depCount = sp.dependsOn?.filter(id => sprints.some(s => s.id === id)).length || 0;

                        if (isMilestone) {
                            const pct = sp.endDate ? dateToPct(sp.endDate) : 50;

                            return (
                                <Box
                                    key={sp.id}
                                    data-sprint-id={sp.id}
                                    onClick={() => setSelectedSprint(sp)}
                                    sx={{
                                        position: 'relative', height: zoom.row,
                                        borderBottom: '1px solid', borderColor: 'divider',
                                        '&:hover': { bgcolor: color.light },
                                        transition: 'background-color 0.15s, height 0.2s ease',
                                        display: 'flex', alignItems: 'center',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {/* Label */}
                                    <Box sx={{ width: indent ? 150 : 140, flexShrink: 0, pl: indent ? 2.5 : 1, display: 'flex', alignItems: 'center', gap: 0.3, zIndex: 3 }}>
                                        {ScopeIcon && (
                                            <Tooltip title={scopeCfg!.label} arrow>
                                                <ScopeIcon sx={{ fontSize: 10, color: scopeCfg!.color, flexShrink: 0 }} />
                                            </Tooltip>
                                        )}
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                fontSize: zoom.fontSize, fontWeight: 600, color: color.text,
                                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                            }}
                                        >
                                            🎯 {sp.name}
                                        </Typography>
                                        {depCount > 0 && (
                                            <Tooltip title={`${depCount} ${t('dependencies') as string}`} arrow>
                                                <LinkIcon sx={{ fontSize: 10, color: 'text.disabled' }} />
                                            </Tooltip>
                                        )}
                                    </Box>

                                    {/* Timeline area */}
                                    <Box sx={{ flex: 1, position: 'relative', height: '100%' }}>
                                        <Tooltip title={`${sp.name} · ${t('clickForDetails') as string}`} arrow>
                                            <Box sx={{
                                                position: 'absolute',
                                                left: `${pct}%`,
                                                top: '50%',
                                                transform: 'translate(-50%, -50%) rotate(45deg)',
                                                width: Math.max(zoom.bar * 0.55, 8),
                                                height: Math.max(zoom.bar * 0.55, 8),
                                                bgcolor: sp.status === 'completed' ? 'success.main' : color.bg,
                                                borderRadius: 0.5,
                                                boxShadow: `0 0 0 2.5px ${color.light}, 0 2px 4px ${alpha(color.bg, 0.3)}`,
                                                zIndex: 3,
                                                '&:hover': { transform: 'translate(-50%, -50%) rotate(45deg) scale(1.3)' },
                                                transition: 'transform 0.15s',
                                            }} />
                                        </Tooltip>
                                        <Box sx={{
                                            position: 'absolute', top: '50%', left: 0, width: `${pct}%`,
                                            borderTop: '1.5px dashed', borderColor: color.bg, opacity: 0.3,
                                        }} />
                                        {todayPct >= 0 && (
                                            <Box sx={{
                                                position: 'absolute', left: `${todayPct}%`, top: 0, bottom: 0,
                                                width: 1.5, bgcolor: 'error.main', opacity: 0.2, zIndex: 2,
                                            }} />
                                        )}
                                    </Box>
                                </Box>
                            );
                        }

                        // Phase / Sprint — horizontal bar
                        const startPct = sp.startDate ? dateToPct(sp.startDate) : 0;
                        const endPct = sp.endDate ? dateToPct(sp.endDate) : 100;
                        const barWidth = Math.max(endPct - startPct, 2);
                        const progress = getProgress(sp);

                        const barH = indent ? zoom.childBar : zoom.bar;
                        const dateLabel = sp.startDate && sp.endDate
                            ? `${format(parseISO(sp.startDate), 'M/d')} – ${format(parseISO(sp.endDate), 'M/d')}`
                            : '';

                        return (
                            <Box
                                key={sp.id}
                                data-sprint-id={sp.id}
                                onClick={() => setSelectedSprint(sp)}
                                sx={{
                                    position: 'relative', height: zoom.row,
                                    borderBottom: '1px solid', borderColor: 'divider',
                                    '&:hover': { bgcolor: color.light },
                                    transition: 'background-color 0.15s, height 0.2s ease',
                                    display: 'flex', alignItems: 'center',
                                    cursor: 'pointer',
                                }}
                            >
                                {/* Label */}
                                <Box sx={{ width: indent ? 150 : 140, flexShrink: 0, pl: indent ? 2.5 : 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', zIndex: 3 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                                        {ScopeIcon && (
                                            <Tooltip title={scopeCfg!.label} arrow>
                                                <ScopeIcon sx={{ fontSize: 10, color: scopeCfg!.color, flexShrink: 0 }} />
                                            </Tooltip>
                                        )}
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                fontSize: zoom.fontSize, fontWeight: 600, color: color.text,
                                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                lineHeight: 1.2,
                                            }}
                                        >
                                            {indent && (
                                                <Box component="span" sx={{ color: COLORS.phase.bg, mr: 0.3, opacity: 0.5 }}>└ </Box>
                                            )}
                                            {sp.type === 'phase' ? '📋' : '🚀'} {sp.name}
                                        </Typography>
                                        {depCount > 0 && (
                                            <Tooltip title={`${depCount} ${t('dependencies') as string}`} arrow>
                                                <LinkIcon sx={{ fontSize: 9, color: 'text.disabled', flexShrink: 0 }} />
                                            </Tooltip>
                                        )}
                                    </Box>
                                    {zoomIdx >= 3 && dateLabel && (
                                        <Typography variant="caption" sx={{ fontSize: '0.55rem', color: 'text.disabled', lineHeight: 1 }}>
                                            {dateLabel}
                                        </Typography>
                                    )}
                                </Box>

                                {/* Timeline area */}
                                <Box sx={{ flex: 1, position: 'relative', height: '100%', display: 'flex', alignItems: 'center' }}>
                                    <Tooltip
                                        title={`${sp.name}${sp.startDate ? ` · ${format(parseISO(sp.startDate), 'MMM d', { locale: dateLocale })}` : ''}${sp.endDate ? ` ~ ${format(parseISO(sp.endDate), 'MMM d', { locale: dateLocale })}` : ''} · ${Math.round(progress)}% · ${t('clickForDetails') as string}`}
                                        arrow
                                    >
                                        <Box sx={{
                                            position: 'absolute',
                                            left: `${startPct}%`,
                                            width: `${barWidth}%`,
                                            height: barH,
                                            borderRadius: barH / 2,
                                            bgcolor: color.light,
                                            overflow: 'hidden',
                                            zIndex: 1,
                                            border: `1px solid ${alpha(color.bg, 0.2)}`,
                                            transition: 'height 0.2s ease, transform 0.15s',
                                            '&:hover': { transform: 'scaleY(1.15)' },
                                        }}>
                                            <Box sx={{
                                                width: `${progress}%`,
                                                height: '100%',
                                                background: sp.status === 'completed'
                                                    ? 'linear-gradient(135deg, #10b981, #34d399)'
                                                    : color.gradient,
                                                borderRadius: barH / 2,
                                                transition: 'width 0.3s ease',
                                                boxShadow: progress > 0 ? `0 1px 3px ${alpha(color.bg, 0.3)}` : 'none',
                                            }} />
                                            {barWidth > 8 && zoomIdx >= 2 && (
                                                <Typography
                                                    variant="caption"
                                                    sx={{
                                                        position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
                                                        fontSize: '0.5rem', fontWeight: 700,
                                                        color: progress > 50 ? 'white' : color.text,
                                                        opacity: 0.8, zIndex: 2,
                                                    }}
                                                >
                                                    {Math.round(progress)}%
                                                </Typography>
                                            )}
                                        </Box>
                                    </Tooltip>

                                    {todayPct >= 0 && (
                                        <Box sx={{
                                            position: 'absolute', left: `${todayPct}%`, top: 0, bottom: 0,
                                            width: 1.5, bgcolor: 'error.main', opacity: 0.2, zIndex: 2,
                                        }} />
                                    )}
                                </Box>
                            </Box>
                        );
                    })}

                    {/* Dependency arrows SVG overlay — uses percentage viewBox to avoid ref reads */}
                    {depArrows.length > 0 && (() => {
                        const svgH = visibleRows.length * zoom.row;
                        return (
                            <svg
                                viewBox={`0 0 1000 ${svgH}`}
                                preserveAspectRatio="none"
                                style={{
                                    position: 'absolute', top: 22, left: 140, right: 0,
                                    width: `calc(100% - 140px)`, height: svgH,
                                    pointerEvents: 'none', zIndex: 5,
                                    overflow: 'visible',
                                }}
                            >
                                <defs>
                                    <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                                        <polygon points="0 0, 6 2, 0 4" fill="#94a3b8" />
                                    </marker>
                                    <marker id="arrowhead-linked" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                                        <polygon points="0 0, 6 2, 0 4" fill="#ef4444" opacity="0.6" />
                                    </marker>
                                </defs>
                                {depArrows.map((arrow, i) => {
                                    const fromIdx = getRowIndex(arrow.fromId);
                                    const toIdx = getRowIndex(arrow.toId);
                                    if (fromIdx < 0 || toIdx < 0) return null;

                                    const fromEndPct = getSprintEndPct(arrow.fromId);
                                    const toStartPct = getSprintStartPct(arrow.toId);

                                    // Use viewBox coord system (0–1000)
                                    const x1 = (fromEndPct / 100) * 1000;
                                    const y1 = fromIdx * zoom.row + zoom.row / 2;
                                    const x2 = (toStartPct / 100) * 1000;
                                    const y2 = toIdx * zoom.row + zoom.row / 2;

                                    const isLinked = arrow.type === 'linked';
                                    const midX = (x1 + x2) / 2;

                                    return (
                                        <path
                                            key={i}
                                            d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                                            fill="none"
                                            stroke={isLinked ? '#ef4444' : '#94a3b8'}
                                            strokeWidth={1.2}
                                            strokeDasharray={isLinked ? '4 3' : 'none'}
                                            opacity={0.5}
                                            markerEnd={isLinked ? 'url(#arrowhead-linked)' : 'url(#arrowhead)'}
                                        />
                                    );
                                })}
                            </svg>
                        );
                    })()}

                    {/* Empty state */}
                    {visibleRows.length === 0 && (
                        <Box sx={{ py: 3, textAlign: 'center' }}>
                            <Typography variant="caption" color="text.disabled">
                                {t('noIterationsVisible') as string}
                            </Typography>
                        </Box>
                    )}
                </Box>

                {/* Team Selection Menu */}
                <Menu
                    anchorEl={teamAnchorEl}
                    open={Boolean(teamAnchorEl)}
                    onClose={() => setTeamAnchorEl(null)}
                    PaperProps={{ sx: { borderRadius: 2, mt: 0.5, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' } }}
                >
                    <MenuItem
                        selected={selectedTeamGroupId === null}
                        onClick={() => { setSelectedTeamGroupId(null); setTeamAnchorEl(null); }}
                        sx={{ fontSize: '0.75rem', fontWeight: 600 }}
                    >
                        {t('allTasks') as string}
                    </MenuItem>
                    <Divider sx={{ my: 0.5 }} />
                    {teamGroups.map(tg => (
                        <MenuItem
                            key={tg.id}
                            selected={selectedTeamGroupId === tg.id}
                            onClick={() => { setSelectedTeamGroupId(tg.id); setTeamAnchorEl(null); }}
                            sx={{ fontSize: '0.75rem', fontWeight: 600 }}
                        >
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: tg.color, mr: 1 }} />
                            {tg.name}
                        </MenuItem>
                    ))}
                </Menu>
            </Collapse>

            {/* ── Sprint Detail Dialog ── */}
            <Dialog
                open={!!selectedSprint}
                onClose={() => setSelectedSprint(null)}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3 } }}
            >
                {selectedSprint && (() => {
                    const sp = selectedSprint;
                    const color = COLORS[sp.type] || COLORS.sprint;
                    const progress = getProgress(sp);
                    const duration = getDuration(sp);
                    const scopeCfg = sp.scope ? SCOPE_CONFIG[sp.scope] : null;
                    const statusCfg = STATUS_CONFIG[sp.status];
                    const deps = sp.dependsOn?.map(id => sprints.find(s => s.id === id)).filter(Boolean) || [];
                    const linkedSprints = sp.linkedSprintIds?.map(id => sprints.find(s => s.id === id)).filter(Boolean) || [];
                    const dependents = sprints.filter(s => s.dependsOn?.includes(sp.id));
                    const typeIcon = sp.type === 'milestone' ? <FlagIcon sx={{ fontSize: 20 }} />
                        : sp.type === 'phase' ? <ListAltIcon sx={{ fontSize: 20 }} />
                        : <RocketLaunchIcon sx={{ fontSize: 20 }} />;

                    return (
                        <>
                            <DialogTitle sx={{ pb: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box sx={{ p: 0.8, borderRadius: 1.5, bgcolor: color.light, color: color.text, display: 'flex' }}>
                                        {typeIcon}
                                    </Box>
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.2 }}>{sp.name}</Typography>
                                        <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                                            <Chip label={sp.type} size="small" sx={{ height: 20, fontSize: '0.6rem', fontWeight: 700, bgcolor: color.light, color: color.text }} />
                                            <Chip label={statusCfg.label} size="small" sx={{ height: 20, fontSize: '0.6rem', fontWeight: 700, bgcolor: statusCfg.bg, color: statusCfg.color }} />
                                            {scopeCfg && (
                                                <Chip
                                                    icon={(() => { const I = scopeCfg.icon; return <I sx={{ fontSize: 12 }} />; })()}
                                                    label={scopeCfg.label}
                                                    size="small"
                                                    sx={{ height: 20, fontSize: '0.6rem', fontWeight: 700, bgcolor: scopeCfg.bg, color: scopeCfg.color, '& .MuiChip-icon': { color: scopeCfg.color } }}
                                                />
                                            )}
                                        </Box>
                                    </Box>
                                </Box>
                            </DialogTitle>
                            <DialogContent>
                                {/* Date & Progress */}
                                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2.5 }}>
                                    <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
                                        <Typography variant="caption" color="text.secondary" fontWeight={700}>{t('period') as string}</Typography>
                                        <Typography variant="body2" fontWeight={600} sx={{ mt: 0.3 }}>
                                            {sp.startDate ? format(parseISO(sp.startDate), 'PPP', { locale: dateLocale }) : '—'}
                                        </Typography>
                                        <Typography variant="body2" fontWeight={600}>
                                            → {sp.endDate ? format(parseISO(sp.endDate), 'PPP', { locale: dateLocale }) : '—'}
                                        </Typography>
                                        <Typography variant="caption" color="text.disabled">{t('durationLabel') as string}: {duration}</Typography>
                                    </Box>
                                    <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
                                        <Typography variant="caption" color="text.secondary" fontWeight={700}>{t('progressLabel') as string}</Typography>
                                        <Typography variant="h5" fontWeight={800} sx={{ mt: 0.3, color: color.text }}>{Math.round(progress)}%</Typography>
                                        <LinearProgress
                                            variant="determinate"
                                            value={progress}
                                            sx={{
                                                mt: 0.5, height: 6, borderRadius: 3,
                                                bgcolor: color.light,
                                                '& .MuiLinearProgress-bar': { bgcolor: color.bg, borderRadius: 3 },
                                            }}
                                        />
                                    </Box>
                                </Box>

                                {/* Dependencies */}
                                {deps.length > 0 && (
                                    <Box sx={{ mb: 2 }}>
                                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                            <ArrowForwardIcon sx={{ fontSize: 12, transform: 'rotate(180deg)' }} /> {t('dependsOn') as string} ({deps.length})
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                            {deps.map(d => d && (
                                                <Box key={d.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.5, borderRadius: 1.5, bgcolor: 'action.hover' }}>
                                                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: COLORS[d.type]?.bg || '#6366f1' }} />
                                                    <Typography variant="caption" fontWeight={600}>{d.name}</Typography>
                                                    <Chip label={STATUS_CONFIG[d.status]?.label || d.status} size="small" sx={{ ml: 'auto', height: 16, fontSize: '0.55rem', fontWeight: 700, bgcolor: STATUS_CONFIG[d.status]?.bg, color: STATUS_CONFIG[d.status]?.color }} />
                                                </Box>
                                            ))}
                                        </Box>
                                    </Box>
                                )}

                                {/* Linked sprints (milestone) */}
                                {linkedSprints.length > 0 && (
                                    <Box sx={{ mb: 2 }}>
                                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                            <LinkIcon sx={{ fontSize: 12 }} /> {t('linkedIterationsLabel') as string} ({linkedSprints.length})
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                            {linkedSprints.map(ls => ls && (
                                                <Box key={ls.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.5, borderRadius: 1.5, bgcolor: 'action.hover' }}>
                                                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: COLORS[ls.type]?.bg || '#6366f1' }} />
                                                    <Typography variant="caption" fontWeight={600}>{ls.name}</Typography>
                                                    <Chip label={STATUS_CONFIG[ls.status]?.label || ls.status} size="small" sx={{ ml: 'auto', height: 16, fontSize: '0.55rem', fontWeight: 700, bgcolor: STATUS_CONFIG[ls.status]?.bg, color: STATUS_CONFIG[ls.status]?.color }} />
                                                </Box>
                                            ))}
                                        </Box>
                                    </Box>
                                )}

                                {/* Dependents (who depends on this) */}
                                {dependents.length > 0 && (
                                    <Box sx={{ mb: 2 }}>
                                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                            <ArrowForwardIcon sx={{ fontSize: 12 }} /> {t('blocksLabel') as string} ({dependents.length})
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                            {dependents.map(dep => (
                                                <Box key={dep.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.5, borderRadius: 1.5, bgcolor: alpha('#ef4444', 0.04) }}>
                                                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: COLORS[dep.type]?.bg || '#6366f1' }} />
                                                    <Typography variant="caption" fontWeight={600}>{dep.name}</Typography>
                                                    <Chip label={STATUS_CONFIG[dep.status]?.label || dep.status} size="small" sx={{ ml: 'auto', height: 16, fontSize: '0.55rem', fontWeight: 700, bgcolor: STATUS_CONFIG[dep.status]?.bg, color: STATUS_CONFIG[dep.status]?.color }} />
                                                </Box>
                                            ))}
                                        </Box>
                                    </Box>
                                )}
                            </DialogContent>
                            <DialogActions sx={{ px: 3, pb: 2 }}>
                                <Button onClick={() => setSelectedSprint(null)} variant="contained" sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>
                                    {t('close') as string}
                                </Button>
                            </DialogActions>
                        </>
                    );
                })()}
            </Dialog>
        </Box>
    );
};

export default IterationTimeline;
