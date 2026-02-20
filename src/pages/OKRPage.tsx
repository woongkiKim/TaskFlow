// src/pages/OKRPage.tsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Box, Typography, Paper, Button, IconButton, TextField,
    LinearProgress, Chip, Avatar, Collapse, Tooltip, Select,
    MenuItem, FormControl, InputLabel, Dialog, DialogTitle,
    DialogContent, DialogActions, Skeleton, alpha, useTheme,
    Slider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import FlagIcon from '@mui/icons-material/Flag';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useLanguage } from '../contexts/LanguageContext';
import { fetchObjectives, createObjective, updateObjective, deleteObjective } from '../services/okrService';
import type { Objective, KeyResult } from '../types';
import { OKR_STATUS_CONFIG } from '../types';

const t = (lang: 'ko' | 'en', en: string, ko: string) => (lang === 'ko' ? ko : en);

// ─── Generate unique ID ───
const genId = () => `kr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

// ─── Period options ───
const PERIODS = ['Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026'];

const OKRPage = () => {
    const theme = useTheme();
    const { user } = useAuth();
    const { lang } = useLanguage();
    const { currentWorkspace } = useWorkspace();
    const wsId = currentWorkspace?.id || '';

    const [objectives, setObjectives] = useState<Objective[]>([]);
    const [loading, setLoading] = useState(true);
    const [periodFilter, setPeriodFilter] = useState<string>('all');
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [editingKR, setEditingKR] = useState<{ objId: string; kr: KeyResult } | null>(null);

    // New Objective form
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newPeriod, setNewPeriod] = useState('Q1 2026');
    const [newStatus, setNewStatus] = useState<Objective['status']>('draft');

    // ─── Load ───
    const loadData = useCallback(async () => {
        if (!wsId) return;
        try {
            const data = await fetchObjectives(wsId, periodFilter === 'all' ? undefined : periodFilter);
            setObjectives(data);
            // Auto-expand all
            setExpandedIds(new Set(data.map(o => o.id)));
        } catch (e) { console.error('OKR load error:', e); }
        finally { setLoading(false); }
    }, [wsId, periodFilter]);

    useEffect(() => { loadData(); }, [loadData]);

    // ─── Toggle expand ───
    const toggleExpand = (id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    // ─── Create Objective ───
    const handleCreate = async () => {
        if (!newTitle.trim() || !user) return;
        const obj = await createObjective({
            title: newTitle.trim(),
            description: newDesc.trim() || undefined,
            period: newPeriod,
            status: newStatus,
            ownerId: user.uid,
            ownerName: user.displayName || 'User',
            keyResults: [],
            workspaceId: wsId,
            createdBy: user.uid,
        });
        setObjectives(prev => [obj, ...prev]);
        setExpandedIds(prev => new Set(prev).add(obj.id));
        setNewTitle(''); setNewDesc(''); setAddDialogOpen(false);
    };

    // ─── Delete Objective ───
    const handleDelete = async (id: string) => {
        await deleteObjective(id);
        setObjectives(prev => prev.filter(o => o.id !== id));
    };

    // ─── Update status ───
    const handleStatusChange = async (id: string, status: Objective['status']) => {
        await updateObjective(id, { status });
        setObjectives(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    };

    // ─── Add Key Result ───
    const handleAddKR = async (objId: string) => {
        const kr: KeyResult = { id: genId(), title: '', targetValue: 100, currentValue: 0, unit: '%' };
        const obj = objectives.find(o => o.id === objId);
        if (!obj) return;
        const newKRs = [...obj.keyResults, kr];
        await updateObjective(objId, { keyResults: newKRs });
        setObjectives(prev => prev.map(o => o.id === objId ? { ...o, keyResults: newKRs } : o));
        setEditingKR({ objId, kr });
    };

    // ─── Update Key Result ───
    const handleUpdateKR = async (objId: string, krId: string, updates: Partial<KeyResult>) => {
        const obj = objectives.find(o => o.id === objId);
        if (!obj) return;
        const newKRs = obj.keyResults.map(kr => kr.id === krId ? { ...kr, ...updates } : kr);
        await updateObjective(objId, { keyResults: newKRs });
        setObjectives(prev => prev.map(o => o.id === objId ? { ...o, keyResults: newKRs } : o));
    };

    // ─── Delete Key Result ───
    const handleDeleteKR = async (objId: string, krId: string) => {
        const obj = objectives.find(o => o.id === objId);
        if (!obj) return;
        const newKRs = obj.keyResults.filter(kr => kr.id !== krId);
        await updateObjective(objId, { keyResults: newKRs });
        setObjectives(prev => prev.map(o => o.id === objId ? { ...o, keyResults: newKRs } : o));
    };

    // ─── Compute overall progress of an Objective ───
    const getObjProgress = useCallback((obj: Objective) => {
        if (obj.keyResults.length === 0) return 0;
        const sum = obj.keyResults.reduce((acc, kr) => {
            const pct = kr.targetValue > 0 ? Math.min((kr.currentValue / kr.targetValue) * 100, 100) : 0;
            return acc + pct;
        }, 0);
        return Math.round(sum / obj.keyResults.length);
    }, []);

    // ─── Stats ───
    const stats = useMemo(() => {
        const active = objectives.filter(o => o.status === 'active').length;
        const completed = objectives.filter(o => o.status === 'completed').length;
        const avgProgress = objectives.length > 0
            ? Math.round(objectives.reduce((s, o) => s + getObjProgress(o), 0) / objectives.length)
            : 0;
        return { total: objectives.length, active, completed, avgProgress };
    }, [objectives, getObjProgress]);

    if (loading) {
        return (
            <Box sx={{ p: 3 }}>
                {[1, 2, 3].map(i => (
                    <Skeleton key={i} variant="rounded" height={180} sx={{ mb: 2, borderRadius: 3 }} />
                ))}
            </Box>
        );
    }

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
            {/* ═══ HEADER ═══ */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <TrackChangesIcon sx={{ fontSize: 28, color: 'primary.main' }} />
                    <Typography variant="h5" fontWeight={800}>
                        {t(lang, 'OKR Goals', 'OKR 목표 관리')}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                    <FormControl size="small" sx={{ minWidth: 130 }}>
                        <InputLabel>{t(lang, 'Period', '기간')}</InputLabel>
                        <Select value={periodFilter} label={t(lang, 'Period', '기간')}
                            onChange={e => setPeriodFilter(e.target.value)}
                            sx={{ borderRadius: 2, fontWeight: 600, fontSize: '0.85rem' }}>
                            <MenuItem value="all">{t(lang, 'All Periods', '전체')}</MenuItem>
                            {PERIODS.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <Button variant="contained" startIcon={<AddIcon />}
                        onClick={() => setAddDialogOpen(true)}
                        sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none', px: 2.5 }}>
                        {t(lang, 'New Objective', '목표 추가')}
                    </Button>
                </Box>
            </Box>

            {/* ═══ STATS CARDS ═══ */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 2, mb: 3 }}>
                {[
                    { label: t(lang, 'Total', '전체'), value: stats.total, color: '#6366f1', bg: '#eef2ff' },
                    { label: t(lang, 'Active', '진행중'), value: stats.active, color: '#3b82f6', bg: '#eff6ff' },
                    { label: t(lang, 'Completed', '완료'), value: stats.completed, color: '#10b981', bg: '#ecfdf5' },
                    { label: t(lang, 'Avg Progress', '평균 진행률'), value: `${stats.avgProgress}%`, color: '#f59e0b', bg: '#fffbeb' },
                ].map((s, i) => (
                    <Paper key={i} sx={{
                        p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider',
                        display: 'flex', flexDirection: 'column', gap: 0.5,
                    }}>
                        <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {s.label}
                        </Typography>
                        <Typography variant="h4" fontWeight={800} sx={{ color: s.color }}>{s.value}</Typography>
                    </Paper>
                ))}
            </Box>

            {/* ═══ OBJECTIVES LIST ═══ */}
            {objectives.length === 0 ? (
                <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                    <TrackChangesIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography variant="h6" fontWeight={700} color="text.secondary">
                        {t(lang, 'No objectives yet', '아직 목표가 없습니다')}
                    </Typography>
                    <Typography variant="body2" color="text.disabled" sx={{ mb: 2 }}>
                        {t(lang, 'Create your first objective to start tracking progress', '첫 번째 목표를 추가해 보세요')}
                    </Typography>
                    <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setAddDialogOpen(true)}
                        sx={{ borderRadius: 2, textTransform: 'none' }}>
                        {t(lang, 'New Objective', '목표 추가')}
                    </Button>
                </Paper>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {objectives.map(obj => {
                        const progress = getObjProgress(obj);
                        const cfg = OKR_STATUS_CONFIG[obj.status];
                        const expanded = expandedIds.has(obj.id);

                        return (
                            <Paper key={obj.id} sx={{
                                borderRadius: 3, border: '1px solid', borderColor: 'divider',
                                overflow: 'hidden', transition: 'box-shadow 0.2s',
                                '&:hover': { boxShadow: `0 4px 20px ${alpha(cfg.color, 0.12)}` },
                            }}>
                                {/* Objective Header */}
                                <Box
                                    onClick={() => toggleExpand(obj.id)}
                                    sx={{
                                        p: 2.5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2,
                                        '&:hover': { bgcolor: alpha(cfg.color, 0.03) },
                                    }}
                                >
                                    <IconButton size="small" sx={{ p: 0.5 }}>
                                        {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                    </IconButton>

                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                            <FlagIcon sx={{ fontSize: 18, color: cfg.color }} />
                                            <Typography variant="subtitle1" fontWeight={700} noWrap>{obj.title}</Typography>
                                            <Chip label={lang === 'ko' ? cfg.labelKo : cfg.label} size="small"
                                                sx={{ fontWeight: 700, fontSize: '0.7rem', bgcolor: cfg.bgColor, color: cfg.color, height: 22 }} />
                                            <Chip label={obj.period} size="small" variant="outlined"
                                                sx={{ fontWeight: 600, fontSize: '0.7rem', height: 22 }} />
                                        </Box>
                                        {obj.description && (
                                            <Typography variant="body2" color="text.secondary" noWrap sx={{ ml: 3.5 }}>
                                                {obj.description}
                                            </Typography>
                                        )}
                                    </Box>

                                    {/* Owner + Progress */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                                        <Tooltip title={obj.ownerName}>
                                            <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: cfg.color }}>
                                                {obj.ownerName[0]}
                                            </Avatar>
                                        </Tooltip>
                                        <Box sx={{ width: 100, textAlign: 'right' }}>
                                            <Typography variant="caption" fontWeight={700} sx={{ color: progress >= 70 ? '#10b981' : progress >= 40 ? '#f59e0b' : '#94a3b8' }}>
                                                {progress}%
                                            </Typography>
                                            <LinearProgress variant="determinate" value={progress}
                                                sx={{
                                                    height: 6, borderRadius: 3, mt: 0.5,
                                                    bgcolor: alpha(cfg.color, 0.12),
                                                    '& .MuiLinearProgress-bar': { bgcolor: cfg.color, borderRadius: 3 },
                                                }} />
                                        </Box>

                                        {/* Actions */}
                                        <Select
                                            size="small" value={obj.status}
                                            onChange={e => { e.stopPropagation(); handleStatusChange(obj.id, e.target.value as Objective['status']); }}
                                            onClick={e => e.stopPropagation()}
                                            sx={{ minWidth: 90, fontSize: '0.75rem', fontWeight: 600, borderRadius: 2, height: 30, '& .MuiSelect-select': { py: 0.5 } }}
                                        >
                                            {(Object.keys(OKR_STATUS_CONFIG) as Objective['status'][]).map(s => (
                                                <MenuItem key={s} value={s} sx={{ fontSize: '0.8rem' }}>
                                                    {lang === 'ko' ? OKR_STATUS_CONFIG[s].labelKo : OKR_STATUS_CONFIG[s].label}
                                                </MenuItem>
                                            ))}
                                        </Select>

                                        <Tooltip title={t(lang, 'Delete', '삭제')}>
                                            <IconButton size="small" onClick={e => { e.stopPropagation(); handleDelete(obj.id); }}
                                                sx={{ color: 'error.light', '&:hover': { color: 'error.main' } }}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </Box>

                                {/* Key Results */}
                                <Collapse in={expanded} timeout={250}>
                                    <Box sx={{ px: 2.5, pb: 2.5, pt: 0 }}>
                                        <Box sx={{
                                            bgcolor: alpha(theme.palette.primary.main, 0.03),
                                            borderRadius: 2, p: 2,
                                        }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                                                <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.72rem' }}>
                                                    {t(lang, 'Key Results', '핵심 결과')} ({obj.keyResults.length})
                                                </Typography>
                                                <Button size="small" startIcon={<AddIcon />}
                                                    onClick={() => handleAddKR(obj.id)}
                                                    sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' }}>
                                                    {t(lang, 'Add KR', 'KR 추가')}
                                                </Button>
                                            </Box>

                                            {obj.keyResults.length === 0 ? (
                                                <Typography variant="body2" color="text.disabled" sx={{ textAlign: 'center', py: 2 }}>
                                                    {t(lang, 'No key results yet — click "Add KR" to start', '핵심 결과를 추가해 보세요')}
                                                </Typography>
                                            ) : (
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                                    {obj.keyResults.map((kr, idx) => {
                                                        const krPct = kr.targetValue > 0 ? Math.min((kr.currentValue / kr.targetValue) * 100, 100) : 0;
                                                        const isEditing = editingKR?.objId === obj.id && editingKR?.kr.id === kr.id;
                                                        return (
                                                            <Paper key={kr.id} variant="outlined" sx={{
                                                                p: 1.5, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2,
                                                                bgcolor: 'background.paper',
                                                                '&:hover': { borderColor: 'primary.main' },
                                                            }}>
                                                                {/* KR Number */}
                                                                <Chip label={`KR${idx + 1}`} size="small"
                                                                    sx={{ fontWeight: 800, fontSize: '0.65rem', height: 22, minWidth: 40, bgcolor: alpha(cfg.color, 0.1), color: cfg.color }} />

                                                                {/* Title */}
                                                                {isEditing ? (
                                                                    <TextField
                                                                        size="small" fullWidth autoFocus
                                                                        value={kr.title}
                                                                        placeholder={t(lang, 'Key Result title...', '핵심 결과 제목...')}
                                                                        onChange={e => handleUpdateKR(obj.id, kr.id, { title: e.target.value })}
                                                                        onBlur={() => setEditingKR(null)}
                                                                        onKeyDown={e => { if (e.key === 'Enter') setEditingKR(null); }}
                                                                        sx={{ '& .MuiInputBase-input': { fontSize: '0.85rem', py: 0.5 } }}
                                                                    />
                                                                ) : (
                                                                    <Typography variant="body2" fontWeight={600} sx={{ flex: 1, cursor: 'pointer', minWidth: 0 }}
                                                                        onClick={() => setEditingKR({ objId: obj.id, kr })}
                                                                        noWrap>
                                                                        {kr.title || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>{t(lang, 'Click to edit', '클릭하여 편집')}</span>}
                                                                    </Typography>
                                                                )}

                                                                {/* Progress Slider */}
                                                                <Box sx={{ width: 160, display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                                                                    <Slider
                                                                        size="small"
                                                                        value={kr.currentValue}
                                                                        min={0}
                                                                        max={kr.targetValue}
                                                                        step={kr.targetValue <= 10 ? 0.1 : 1}
                                                                        onChange={(_e, val) => handleUpdateKR(obj.id, kr.id, { currentValue: val as number })}
                                                                        sx={{
                                                                            color: krPct >= 70 ? '#10b981' : krPct >= 40 ? '#f59e0b' : '#94a3b8',
                                                                            '& .MuiSlider-thumb': { width: 14, height: 14 },
                                                                        }}
                                                                    />
                                                                </Box>

                                                                {/* Value display */}
                                                                <Typography variant="caption" fontWeight={700} sx={{
                                                                    minWidth: 65, textAlign: 'right',
                                                                    color: krPct >= 70 ? '#10b981' : krPct >= 40 ? '#f59e0b' : '#64748b',
                                                                }}>
                                                                    {kr.currentValue}/{kr.targetValue}{kr.unit}
                                                                </Typography>

                                                                {/* KR Actions */}
                                                                <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                                                                    <Tooltip title={t(lang, 'Edit', '편집')}>
                                                                        <IconButton size="small" onClick={() => setEditingKR({ objId: obj.id, kr })}>
                                                                            <EditIcon sx={{ fontSize: 16 }} />
                                                                        </IconButton>
                                                                    </Tooltip>
                                                                    {krPct >= 100 && <CheckCircleIcon sx={{ fontSize: 18, color: '#10b981' }} />}
                                                                    <Tooltip title={t(lang, 'Delete', '삭제')}>
                                                                        <IconButton size="small" onClick={() => handleDeleteKR(obj.id, kr.id)}
                                                                            sx={{ color: 'error.light' }}>
                                                                            <DeleteIcon sx={{ fontSize: 16 }} />
                                                                        </IconButton>
                                                                    </Tooltip>
                                                                </Box>
                                                            </Paper>
                                                        );
                                                    })}
                                                </Box>
                                            )}
                                        </Box>
                                    </Box>
                                </Collapse>
                            </Paper>
                        );
                    })}
                </Box>
            )}

            {/* ═══ ADD OBJECTIVE DIALOG ═══ */}
            <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth
                PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FlagIcon color="primary" />
                    {t(lang, 'New Objective', '새 목표')}
                </DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
                    <TextField
                        label={t(lang, 'Objective Title', '목표 제목')}
                        value={newTitle} onChange={e => setNewTitle(e.target.value)} fullWidth autoFocus
                        placeholder={t(lang, 'e.g. Improve product quality by 60%', '예: 제품 품질 60% 향상')}
                    />
                    <TextField
                        label={t(lang, 'Description (optional)', '설명 (선택)')}
                        value={newDesc} onChange={e => setNewDesc(e.target.value)} fullWidth multiline rows={2}
                        placeholder={t(lang, 'What does this objective aim to achieve?', '이 목표의 달성 방향을 설명해 주세요')}
                    />
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <FormControl size="small" sx={{ flex: 1 }}>
                            <InputLabel>{t(lang, 'Period', '기간')}</InputLabel>
                            <Select value={newPeriod} label={t(lang, 'Period', '기간')}
                                onChange={e => setNewPeriod(e.target.value)}>
                                {PERIODS.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ flex: 1 }}>
                            <InputLabel>{t(lang, 'Status', '상태')}</InputLabel>
                            <Select value={newStatus} label={t(lang, 'Status', '상태')}
                                onChange={e => setNewStatus(e.target.value as Objective['status'])}>
                                {(Object.keys(OKR_STATUS_CONFIG) as Objective['status'][]).map(s => (
                                    <MenuItem key={s} value={s}>
                                        {lang === 'ko' ? OKR_STATUS_CONFIG[s].labelKo : OKR_STATUS_CONFIG[s].label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setAddDialogOpen(false)} sx={{ textTransform: 'none' }}>
                        {t(lang, 'Cancel', '취소')}
                    </Button>
                    <Button variant="contained" onClick={handleCreate} disabled={!newTitle.trim()}
                        sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none' }}>
                        {t(lang, 'Create', '생성')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default OKRPage;
