import { useMemo, useState } from 'react';
import {
    Box, Typography, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, Checkbox, Chip, IconButton, TableSortLabel,
    Avatar, AvatarGroup, Tooltip,
} from '@mui/material';
import FlagIcon from '@mui/icons-material/Flag';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import BlockIcon from '@mui/icons-material/Block';
import LinkIcon from '@mui/icons-material/Link';
import type { Task } from '../types';
import { normalizePriority, PRIORITY_CONFIG, STATUS_CONFIG, TASK_TYPE_CONFIG } from '../types';
import type { TaskType } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

type SortKey = 'taskCode' | 'text' | 'type' | 'status' | 'priority' | 'owner' | 'dueDate' | 'blocker' | 'updatedAt';
type SortDir = 'asc' | 'desc';

const PRIORITY_ORDER: Record<string, number> = { P0: 4, P1: 3, P2: 2, P3: 1, high: 4, medium: 3, low: 2 };
const STATUS_ORDER: Record<string, number> = { 'todo': 1, 'inprogress': 2, 'in-review': 3, 'analysis-required': 4, 'handed-off': 5, 'done': 6 };

interface TableViewProps {
    tasks: Task[];
    selectedTag: string | null;
    onToggle: (id: string) => void;
    onTaskClick: (task: Task) => void;
    selectedTaskIds?: string[];
    onSelectTask?: (id: string, selected: boolean, shiftKey: boolean) => void;
}

const TableView = ({ tasks, selectedTag, onToggle, onTaskClick, selectedTaskIds = [], onSelectTask }: TableViewProps) => {
    const { t } = useLanguage();
    const [sortKey, setSortKey] = useState<SortKey>('updatedAt');
    const [sortDir, setSortDir] = useState<SortDir>('desc');

    const filteredTasks = useMemo(() => {
        if (!selectedTag) return tasks;
        return tasks.filter(t => t.tags?.includes(selectedTag) || t.category === selectedTag);
    }, [tasks, selectedTag]);

    const sortedTasks = useMemo(() => {
        return [...filteredTasks].sort((a, b) => {
            let cmp = 0;
            switch (sortKey) {
                case 'taskCode': cmp = (a.taskCode || '').localeCompare(b.taskCode || ''); break;
                case 'text': cmp = a.text.localeCompare(b.text); break;
                case 'type': cmp = (a.type || '').localeCompare(b.type || ''); break;
                case 'status': {
                    const sa = STATUS_ORDER[a.status || (a.completed ? 'done' : 'todo')] || 0;
                    const sb = STATUS_ORDER[b.status || (b.completed ? 'done' : 'todo')] || 0;
                    cmp = sa - sb; break;
                }
                case 'priority': {
                    const pa = PRIORITY_ORDER[a.priority || ''] || 0;
                    const pb = PRIORITY_ORDER[b.priority || ''] || 0;
                    cmp = pa - pb; break;
                }
                case 'owner': {
                    const oa = a.owners?.[0]?.name || a.assigneeName || '';
                    const ob = b.owners?.[0]?.name || b.assigneeName || '';
                    cmp = oa.localeCompare(ob); break;
                }
                case 'dueDate': cmp = (a.dueDate || '').localeCompare(b.dueDate || ''); break;
                case 'blocker': {
                    const ba = a.blockerStatus === 'blocked' ? 1 : 0;
                    const bb = b.blockerStatus === 'blocked' ? 1 : 0;
                    cmp = ba - bb; break;
                }
                case 'updatedAt': cmp = (a.updatedAt || a.createdAt).localeCompare(b.updatedAt || b.createdAt); break;
            }
            return sortDir === 'asc' ? cmp : -cmp;
        });
    }, [filteredTasks, sortKey, sortDir]);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) { setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc')); }
        else { setSortKey(key); setSortDir('asc'); }
    };

    const getStatusChip = (task: Task) => {
        const status = task.status || (task.completed ? 'done' : 'todo');
        const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['todo'];
        return <Chip label={cfg.label} size="small" sx={{ fontWeight: 600, height: 24, bgcolor: cfg.bgColor, color: cfg.color }} />;
    };

    const getPriorityChip = (priority?: string) => {
        const norm = normalizePriority(priority);
        if (!norm) return <Typography variant="caption" color="text.disabled">—</Typography>;
        const cfg = PRIORITY_CONFIG[norm];
        return (
            <Chip
                icon={<FlagIcon sx={{ fontSize: '12px !important', color: `${cfg.color} !important` }} />}
                label={norm} size="small"
                sx={{ height: 24, fontWeight: 700, bgcolor: cfg.bgColor, color: cfg.color, '& .MuiChip-icon': { ml: 0.5 } }}
            />
        );
    };

    const getTypeChip = (type?: TaskType) => {
        if (!type) return <Typography variant="caption" color="text.disabled">—</Typography>;
        const cfg = TASK_TYPE_CONFIG[type];
        return <Chip label={`${cfg.icon} ${cfg.label}`} size="small" sx={{ height: 22, fontWeight: 600, bgcolor: cfg.color + '15', color: cfg.color }} />;
    };

    const headerSx = { fontWeight: 700, bgcolor: 'background.paper', fontSize: '0.75rem', whiteSpace: 'nowrap' };

    return (
        <TableContainer
            component={Paper} elevation={0}
            sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'auto', maxHeight: 'calc(100vh - 250px)' }}
        >
            <Table stickyHeader size="small">
                <TableHead>
                    <TableRow>
                        <TableCell padding="checkbox" sx={{ bgcolor: 'background.paper' }}>
                            {onSelectTask && (
                                <Checkbox
                                    size="small"
                                    checked={sortedTasks.length > 0 && selectedTaskIds.length === sortedTasks.length}
                                    indeterminate={selectedTaskIds.length > 0 && selectedTaskIds.length < sortedTasks.length}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            const allIds = sortedTasks.map(t => t.id);
                                            allIds.forEach(id => {
                                                if (!selectedTaskIds.includes(id)) {
                                                    onSelectTask(id, true, false);
                                                }
                                            });
                                        } else {
                                            selectedTaskIds.forEach(id => onSelectTask(id, false, false));
                                        }
                                    }}
                                />
                            )}
                        </TableCell>
                        <TableCell padding="checkbox" sx={{ bgcolor: 'background.paper' }}></TableCell>
                        {/* ID */}
                        <TableCell sx={{ ...headerSx, width: 70 }}>
                            <TableSortLabel active={sortKey === 'taskCode'} direction={sortKey === 'taskCode' ? sortDir : 'asc'} onClick={() => handleSort('taskCode')}>
                                ID
                            </TableSortLabel>
                        </TableCell>
                        {/* Type */}
                        <TableCell sx={{ ...headerSx, width: 100 }}>
                            <TableSortLabel active={sortKey === 'type'} direction={sortKey === 'type' ? sortDir : 'asc'} onClick={() => handleSort('type')}>
                                Type
                            </TableSortLabel>
                        </TableCell>
                        {/* Title */}
                        <TableCell sx={headerSx}>
                            <TableSortLabel active={sortKey === 'text'} direction={sortKey === 'text' ? sortDir : 'asc'} onClick={() => handleSort('text')}>
                                {t('taskTitle') as string}
                            </TableSortLabel>
                        </TableCell>
                        {/* Priority */}
                        <TableCell sx={{ ...headerSx, width: 80 }}>
                            <TableSortLabel active={sortKey === 'priority'} direction={sortKey === 'priority' ? sortDir : 'asc'} onClick={() => handleSort('priority')}>
                                {t('priority') as string}
                            </TableSortLabel>
                        </TableCell>
                        {/* Status */}
                        <TableCell sx={{ ...headerSx, width: 130 }}>
                            <TableSortLabel active={sortKey === 'status'} direction={sortKey === 'status' ? sortDir : 'asc'} onClick={() => handleSort('status')}>
                                Status
                            </TableSortLabel>
                        </TableCell>
                        {/* Owner */}
                        <TableCell sx={{ ...headerSx, width: 120 }}>
                            <TableSortLabel active={sortKey === 'owner'} direction={sortKey === 'owner' ? sortDir : 'asc'} onClick={() => handleSort('owner')}>
                                Owner
                            </TableSortLabel>
                        </TableCell>
                        {/* Due Date */}
                        <TableCell sx={{ ...headerSx, width: 100 }}>
                            <TableSortLabel active={sortKey === 'dueDate'} direction={sortKey === 'dueDate' ? sortDir : 'asc'} onClick={() => handleSort('dueDate')}>
                                {t('dueDateLabel') as string}
                            </TableSortLabel>
                        </TableCell>
                        {/* Blocker */}
                        <TableCell sx={{ ...headerSx, width: 80 }}>
                            <TableSortLabel active={sortKey === 'blocker'} direction={sortKey === 'blocker' ? sortDir : 'asc'} onClick={() => handleSort('blocker')}>
                                Blocker
                            </TableSortLabel>
                        </TableCell>
                        {/* Next Action */}
                        <TableCell sx={{ ...headerSx, width: 160 }}>Next Action</TableCell>
                        {/* Links */}
                        <TableCell sx={{ ...headerSx, width: 60 }}>Links</TableCell>
                        {/* Updated */}
                        <TableCell sx={{ ...headerSx, width: 110 }}>
                            <TableSortLabel active={sortKey === 'updatedAt'} direction={sortKey === 'updatedAt' ? sortDir : 'asc'} onClick={() => handleSort('updatedAt')}>
                                Updated
                            </TableSortLabel>
                        </TableCell>
                        {/* Open */}
                        <TableCell sx={{ bgcolor: 'background.paper', width: 50 }}></TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {sortedTasks.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={14} align="center" sx={{ py: 6 }}>
                                <Typography color="text.disabled">{t('noTasks') as string}</Typography>
                            </TableCell>
                        </TableRow>
                    ) : (
                        sortedTasks.map(task => {
                            const owners = task.owners || (task.assigneeId ? [{ uid: task.assigneeId, name: task.assigneeName || '', photo: task.assigneePhoto }] : []);
                            const isOverdue = task.dueDate && !task.completed && new Date(task.dueDate) < new Date(new Date().toISOString().split('T')[0]);
                            const isBlocked = task.blockerStatus === 'blocked';

                            return (
                                <TableRow
                                    key={task.id} hover
                                    sx={{
                                        cursor: 'pointer',
                                        bgcolor: selectedTaskIds.includes(task.id) ? 'action.selected' : task.completed ? 'action.hover' : isBlocked ? '#fef2f2' : 'inherit',
                                        '&:hover': { bgcolor: 'action.selected' },
                                        borderLeft: isBlocked ? '3px solid #ef4444' : undefined,
                                    }}
                                    onClick={(e) => {
                                        if (onSelectTask && (e.shiftKey || e.metaKey || e.ctrlKey)) {
                                            e.preventDefault();
                                            onSelectTask(task.id, !selectedTaskIds.includes(task.id), e.shiftKey);
                                        } else {
                                            onTaskClick(task);
                                        }
                                    }}
                                >
                                    {onSelectTask && (
                                        <TableCell padding="checkbox">
                                            <Checkbox
                                                checked={selectedTaskIds.includes(task.id)}
                                                onChange={(e) => { e.stopPropagation(); onSelectTask(task.id, e.target.checked, (e.nativeEvent as PointerEvent).shiftKey); }}
                                                size="small"
                                            />
                                        </TableCell>
                                    )}
                                    <TableCell padding="checkbox" onClick={e => e.stopPropagation()}>
                                        <Checkbox checked={task.completed} onChange={(e) => { e.stopPropagation(); onToggle(task.id); }} size="small" />
                                    </TableCell>
                                    {/* ID */}
                                    <TableCell>
                                        <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700, color: 'text.secondary' }}>
                                            {task.taskCode || '—'}
                                        </Typography>
                                    </TableCell>
                                    {/* Type */}
                                    <TableCell>{getTypeChip(task.type)}</TableCell>
                                    {/* Title */}
                                    <TableCell>
                                        <Typography variant="body2" fontWeight={500} sx={{
                                            textDecoration: task.completed ? 'line-through' : 'none',
                                            color: task.completed ? 'text.secondary' : 'text.primary',
                                            maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                        }}>{task.text}</Typography>
                                    </TableCell>
                                    {/* Priority */}
                                    <TableCell>{getPriorityChip(task.priority)}</TableCell>
                                    {/* Status */}
                                    <TableCell>{getStatusChip(task)}</TableCell>
                                    {/* Owner */}
                                    <TableCell>
                                        {owners.length > 0 ? (
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <AvatarGroup max={3} sx={{ '& .MuiAvatar-root': { width: 22, height: 22, fontSize: 10, border: '1px solid white' } }}>
                                                    {owners.map(o => (
                                                        <Tooltip key={o.uid} title={o.name}>
                                                            <Avatar src={o.photo} sx={{ width: 22, height: 22 }}>{o.name?.charAt(0)}</Avatar>
                                                        </Tooltip>
                                                    ))}
                                                </AvatarGroup>
                                            </Box>
                                        ) : (
                                            <Typography variant="caption" color="text.disabled">—</Typography>
                                        )}
                                    </TableCell>
                                    {/* Due Date */}
                                    <TableCell>
                                        <Typography variant="caption" sx={{
                                            color: isOverdue ? '#dc2626' : 'text.secondary',
                                            fontWeight: isOverdue ? 700 : 400,
                                        }}>
                                            {task.dueDate || '—'}
                                        </Typography>
                                    </TableCell>
                                    {/* Blocker */}
                                    <TableCell>
                                        {isBlocked ? (
                                            <Tooltip title={task.blockerDetail || 'Blocked'}>
                                                <Chip icon={<BlockIcon />} label="Yes" size="small" color="error"
                                                    sx={{ height: 22, fontWeight: 600, fontSize: '0.65rem' }} />
                                            </Tooltip>
                                        ) : (
                                            <Typography variant="caption" color="text.disabled">None</Typography>
                                        )}
                                    </TableCell>
                                    {/* Next Action */}
                                    <TableCell>
                                        <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 150, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                                            {task.nextAction || '—'}
                                        </Typography>
                                    </TableCell>
                                    {/* Links */}
                                    <TableCell onClick={e => e.stopPropagation()}>
                                        {task.links && task.links.length > 0 ? (
                                            <Tooltip title={task.links.join('\n')}>
                                                <IconButton size="small" component="a" href={task.links[0]} target="_blank" onClick={e => e.stopPropagation()}
                                                    sx={{ color: 'primary.main' }}>
                                                    <LinkIcon sx={{ fontSize: 16 }} />
                                                </IconButton>
                                            </Tooltip>
                                        ) : (
                                            <Typography variant="caption" color="text.disabled">—</Typography>
                                        )}
                                    </TableCell>
                                    {/* Updated */}
                                    <TableCell>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                                {(task.updatedAt || task.createdAt).substring(0, 10)}
                                            </Typography>
                                            {task.updatedByName && (
                                                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem' }}>
                                                    {task.updatedByName}
                                                </Typography>
                                            )}
                                        </Box>
                                    </TableCell>
                                    {/* Open */}
                                    <TableCell onClick={e => e.stopPropagation()}>
                                        <IconButton size="small" onClick={() => onTaskClick(task)} sx={{ color: 'text.secondary' }}>
                                            <OpenInNewIcon sx={{ fontSize: 16 }} />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default TableView;
