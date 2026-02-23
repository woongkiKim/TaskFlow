import { useState, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import {
    Box, Typography, Paper, Chip, IconButton, Button, InputBase, Grow,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, Menu, MenuItem,
    Avatar, Tooltip, useTheme, alpha
} from '@mui/material';
import ConfirmDialog from './ConfirmDialog';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ChecklistIcon from '@mui/icons-material/Checklist';
import AddIcon from '@mui/icons-material/Add';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import SubdirectoryArrowRightIcon from '@mui/icons-material/SubdirectoryArrowRight';
import {
    DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
    type DragStartEvent, type DragEndEvent,
    defaultDropAnimationSideEffects, type DropAnimation,
} from '@dnd-kit/core';
import {
    SortableContext, useSortable, horizontalListSortingStrategy, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useLanguage } from '../contexts/LanguageContext';
import type { TranslationKeys } from '../locales/en';
import type { Task, KanbanColumn, EstimatePoint } from '../types';
import { ESTIMATE_CONFIG } from '../types';

type TFunc = (key: TranslationKeys) => string | string[];

// Presets for column colors
const COLUMN_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#3b82f6', '#64748b'];

// --- Draggable Kanban Card (Task) ---
const KanbanCard = ({
    task,
    onClick,
    onMoveUp,
    onMoveDown,
    canMoveUp,
    canMoveDown,
    subIssueCount = 0,
}: {
    task: Task;
    onClick: (t: Task) => void;
    onMoveUp?: () => void;
    onMoveDown?: () => void;
    canMoveUp?: boolean;
    canMoveDown?: boolean;
    subIssueCount?: number;
}) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: task.id,
        data: { task, type: 'TASK' },
    });
    const theme = useTheme();
    const { t } = useLanguage();

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };
    const completedSubs = task.subtasks?.filter(s => s.completed).length || 0;
    const totalSubs = task.subtasks?.length || 0;

    // Priority Colors
    const getPriorityColor = (p?: string) => {
        if (p === 'high') return theme.palette.error.main;
        if (p === 'medium') return theme.palette.warning.main;
        return theme.palette.info.main;
    };

    return (
        <Paper
            ref={setNodeRef}
            {...listeners} {...attributes}
            style={style}
            onClick={() => onClick(task)}
            elevation={0}
            sx={{
                p: 1.5, mb: 1.5, borderRadius: 2, border: '1px solid',
                borderColor: isDragging ? 'primary.main' : 'divider',
                bgcolor: 'background.paper',
                cursor: 'grab',
                opacity: isDragging ? 0.3 : 1,
                boxShadow: isDragging ? theme.shadows[4] : '0 1px 2px rgba(0,0,0,0.02)',
                '&:hover': {
                    borderColor: 'primary.light',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                    '& .card-actions': { opacity: 1 }
                },
                position: 'relative', overflow: 'hidden',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
        >
            {/* Priority Stripe */}
            <Box sx={{
                position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
                bgcolor: task.priority ? getPriorityColor(task.priority) : 'transparent'
            }} />

            <Box sx={{ pl: 1.5 }}>
                {/* Badges / Meta */}
                <Box sx={{ display: 'flex', gap: 0.8, mb: 1, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                    {task.category && (
                        <Chip
                            label={task.category}
                            size="small"
                            sx={{
                                height: 20, fontSize: '0.65rem', fontWeight: 700,
                                bgcolor: alpha(task.categoryColor || theme.palette.primary.main, 0.1),
                                color: task.categoryColor || theme.palette.primary.main,
                                borderRadius: 1,
                            }}
                        />
                    )}
                    {(onMoveUp || onMoveDown) && (
                        <Box className="card-actions" sx={{ display: 'flex', opacity: 0, transition: 'opacity 0.2s' }}>
                            <IconButton
                                size="small"
                                disabled={!canMoveUp}
                                onPointerDown={e => e.stopPropagation()}
                                onClick={e => { e.stopPropagation(); onMoveUp?.(); }}
                                sx={{ p: 0.3 }}
                            >
                                <KeyboardArrowUpIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                            <IconButton
                                size="small"
                                disabled={!canMoveDown}
                                onPointerDown={e => e.stopPropagation()}
                                onClick={e => { e.stopPropagation(); onMoveDown?.(); }}
                                sx={{ p: 0.3 }}
                            >
                                <KeyboardArrowDownIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                        </Box>
                    )}
                </Box>

                {/* Title */}
                <Typography variant="body2" fontWeight={600} sx={{
                    mb: 1.5, lineHeight: 1.4,
                    color: task.completed ? 'text.secondary' : 'text.primary',
                    textDecoration: task.completed ? 'line-through' : 'none'
                }}>
                    {task.text}
                </Typography>

                {/* Footer Info */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                        {/* Due Date */}
                        {task.dueDate && (
                            <Tooltip title={`Due: ${task.dueDate}`}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                                    <CalendarTodayIcon sx={{ fontSize: 14 }} />
                                    <Typography variant="caption" fontWeight={600}>{task.dueDate}</Typography>
                                </Box>
                            </Tooltip>
                        )}
                        {/* Subtasks */}
                        {totalSubs > 0 && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: completedSubs === totalSubs ? 'success.main' : 'text.secondary' }}>
                                <ChecklistIcon sx={{ fontSize: 14 }} />
                                <Typography variant="caption" fontWeight={600}>{completedSubs}/{totalSubs}</Typography>
                            </Box>
                        )}
                        {/* Estimate */}
                        {task.estimate && task.estimate > 0 && ESTIMATE_CONFIG[task.estimate as EstimatePoint] && (
                            <Chip label={`${task.estimate}pt`} size="small"
                                sx={{
                                    height: 18, fontSize: '0.6rem', fontWeight: 700,
                                    bgcolor: ESTIMATE_CONFIG[task.estimate as EstimatePoint].bgColor,
                                    color: ESTIMATE_CONFIG[task.estimate as EstimatePoint].color,
                                    minWidth: 30,
                                }} />
                        )}
                        {/* Sub-issues */}
                        {subIssueCount > 0 && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, color: '#8b5cf6' }}>
                                <SubdirectoryArrowRightIcon sx={{ fontSize: 13 }} />
                                <Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.65rem' }}>{subIssueCount}</Typography>
                            </Box>
                        )}
                    </Box>

                    {/* Assignee Avatar */}
                    {task.assigneeId ? (
                        <Tooltip title={task.assigneeName || (t('assignee') as string)}>
                            <Avatar
                                src={task.assigneePhoto}
                                sx={{ width: 24, height: 24, fontSize: 10, border: `2px solid ${theme.palette.background.paper}` }}
                            >
                                {task.assigneeName?.charAt(0)}
                            </Avatar>
                        </Tooltip>
                    ) : (
                        <Tooltip title={t('unassigned') as string}>
                            <Avatar sx={{ width: 24, height: 24, bgcolor: 'action.hover', color: 'text.disabled' }}>
                                <PersonOutlineIcon sx={{ fontSize: 14 }} />
                            </Avatar>
                        </Tooltip>
                    )}
                </Box>
            </Box>
        </Paper>
    );
};

// --- Inline Add Component for Column ---
const ColumnInlineAdd = ({ columnId, onAdd, t }: { columnId: string; onAdd: (text: string, status: string) => void; t: TFunc }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [text, setText] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const handleStart = () => {
        setIsAdding(true);
        setTimeout(() => inputRef.current?.focus(), 50);
    };

    const handleSubmit = () => {
        if (text.trim()) {
            onAdd(text.trim(), columnId);
            setText('');
        }
        // Keep inline add open for rapid entry
    };

    const handleCancel = () => {
        setText('');
        setIsAdding(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            e.preventDefault();
            handleSubmit();
        } else if (e.key === 'Escape') {
            handleCancel();
        }
    };

    if (!isAdding) {
        return (
            <Box
                onClick={handleStart}
                onPointerDown={e => e.stopPropagation()}
                sx={{
                    display: 'flex', alignItems: 'center', gap: 0.5, px: 1.5, py: 1,
                    mx: 0.5, mb: 0.5, borderRadius: 2, cursor: 'pointer',
                    color: 'text.secondary', fontSize: '0.8rem', fontWeight: 500,
                    transition: 'all 0.15s',
                    '&:hover': { bgcolor: 'action.hover', color: 'primary.main' },
                }}
            >
                <AddIcon sx={{ fontSize: 16 }} />
                {t('addNewTask') as string}
            </Box>
        );
    }

    return (
        <Paper
            elevation={0}
            onPointerDown={e => e.stopPropagation()}
            sx={{
                mx: 0.5, mb: 0.5, p: 1, borderRadius: 2,
                border: '2px solid', borderColor: 'primary.main',
                bgcolor: 'background.paper',
            }}
        >
            <InputBase
                inputRef={inputRef}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => { if (!text.trim()) handleCancel(); }}
                placeholder={t('taskTitle') as string}
                fullWidth
                sx={{ fontSize: '0.85rem', px: 0.5 }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5, mt: 0.5 }}>
                <Button size="small" onClick={handleCancel} sx={{ minWidth: 0, px: 1, fontSize: '0.7rem', textTransform: 'none', color: 'text.secondary' }}>
                    Esc
                </Button>
                <Button size="small" variant="contained" onClick={handleSubmit} disabled={!text.trim()}
                    sx={{ minWidth: 0, px: 1.5, fontSize: '0.7rem', textTransform: 'none', borderRadius: 1.5 }}>
                    Enter ↵
                </Button>
            </Box>
        </Paper>
    );
};

// --- Sortable Column Component ---
const SortableProjectColumn = ({ column, children, count, totalPoints, isEmpty, onEdit, onDelete, onInlineAdd, t }: {
    column: KanbanColumn; children: React.ReactNode; count: number; totalPoints: number; isEmpty: boolean;
    onEdit: (col: KanbanColumn) => void; onDelete: (colId: string) => void;
    onInlineAdd?: (text: string, status: string) => void; t: TFunc;
}) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: column.id,
        data: { type: 'COLUMN', column },
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    return (
        <Paper
            ref={setNodeRef}
            style={style}
            elevation={0}
            sx={{
                flex: '0 0 300px',
                display: 'flex', flexDirection: 'column',
                borderRadius: 3, border: '1px solid',
                borderColor: isDragging ? 'primary.main' : 'divider',
                bgcolor: isDragging ? alpha('#6366f1', 0.04) : 'transparent',
                transition: 'all 0.2s', height: '100%',
                maxHeight: 'calc(100vh - 250px)',
            }}
        >
            <Box /* Drag Handle Header */
                {...attributes} {...listeners}
                sx={{
                    p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    borderBottom: '1px solid', borderColor: 'divider',
                    cursor: 'grab', touchAction: 'none',
                    bgcolor: 'background.paper', borderRadius: 3,
                    mb: 1.5,
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DragIndicatorIcon sx={{ fontSize: 16, color: 'text.disabled', transform: 'rotate(90deg)' }} />
                    <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {column.title}
                    </Typography>
                    <Chip label={count} size="small" sx={{ height: 20, borderRadius: 1, fontSize: '0.7rem', fontWeight: 700, bgcolor: alpha(column.color, 0.1), color: column.color }} />
                    {totalPoints > 0 && (
                        <Chip label={`🎯${totalPoints}`} size="small" variant="outlined"
                            sx={{ height: 20, borderRadius: 1, fontSize: '0.65rem', fontWeight: 600, color: 'text.secondary', borderColor: 'divider' }} />
                    )}
                </Box>

                <Box>
                    <IconButton size="small" onPointerDown={e => e.stopPropagation()} onClick={e => setAnchorEl(e.currentTarget)}>
                        <MoreHorizIcon fontSize="small" />
                    </IconButton>
                </Box>

                <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
                    <MenuItem onClick={() => { setAnchorEl(null); onEdit(column); }}>
                        <EditIcon fontSize="small" sx={{ mr: 1 }} /> {t('edit') as string}
                    </MenuItem>
                    <MenuItem onClick={() => { setAnchorEl(null); onDelete(column.id); }}>
                        <DeleteIcon fontSize="small" sx={{ mr: 1, color: 'error.main' }} /> <Typography color="error">{t('delete') as string}</Typography>
                    </MenuItem>
                </Menu>
            </Box>

            <Box sx={{
                flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column',
                pr: 0.5, px: 0.5,
                '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { backgroundColor: '#cbd5e1', borderRadius: 4 },
            }}>
                {isEmpty && (
                    <Box sx={{
                        mt: 4, mb: 2, display: 'flex', flexDirection: 'column', alignItems: 'center',
                        opacity: 0.6, px: 2, py: 3, borderRadius: 2, border: '1px dashed', borderColor: 'divider',
                        bgcolor: 'background.default'
                    }}>
                        <Typography fontSize="1.8rem" sx={{ mb: 1 }}>🍃</Typography>
                        <Typography variant="caption" color="text.secondary" align="center" fontWeight={600}>
                            {t('noTasks') as string}
                        </Typography>
                        <Typography variant="caption" color="text.disabled" align="center" sx={{ mt: 0.5, fontSize: '0.65rem' }}>
                            💡 {t('boardDesc') as string}
                        </Typography>
                    </Box>
                )}
                {children}
            </Box>

            {/* Inline Add at bottom of column */}
            {onInlineAdd && (
                <ColumnInlineAdd columnId={column.id} onAdd={onInlineAdd} t={t} />
            )}
        </Paper>
    );
};

interface BoardViewProps {
    tasks: Task[];
    columns: KanbanColumn[];
    selectedTag: string | null;
    onKanbanStatusChange: (taskId: string, newStatus: string, dropBeforeTaskId?: string) => void;
    onMoveTaskInColumn?: (taskId: string, status: string, direction: 'up' | 'down') => void;
    onReorderTasksInColumn?: (orderedIds: string[]) => void;
    onTaskClick: (task: Task) => void;
    onColumnsChange: (columns: KanbanColumn[]) => void;
    onAddTask?: (text: string, status: string) => void;
}

const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }),
};

const BoardView = ({
    tasks,
    columns,
    selectedTag,
    onKanbanStatusChange,
    onMoveTaskInColumn,
    onReorderTasksInColumn,
    onTaskClick,
    onColumnsChange,
    onAddTask,
}: BoardViewProps) => {
    const { t } = useLanguage();
    const [activeType, setActiveType] = useState<'COLUMN' | 'TASK' | null>(null);
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const [activeColumn, setActiveColumn] = useState<KanbanColumn | null>(null);

    const [editCol, setEditCol] = useState<KanbanColumn | null>(null);
    const [isNewCol, setIsNewCol] = useState(false);
    const [colName, setColName] = useState('');
    const [colColor, setColColor] = useState(COLUMN_COLORS[0]);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

    const filteredTasks = useMemo(() => {
        if (!selectedTag) return tasks;
        return tasks.filter(tk => tk.tags?.includes(selectedTag) || tk.category === selectedTag);
    }, [tasks, selectedTag]);

    // Sub-issue count map
    const subIssueCountMap = useMemo(() => {
        const map: Record<string, number> = {};
        tasks.forEach(t => {
            if (t.parentTaskId) {
                map[t.parentTaskId] = (map[t.parentTaskId] || 0) + 1;
            }
        });
        return map;
    }, [tasks]);

    const sortByOrder = (arr: Task[]) => [...arr].sort((a, b) => {
        const ao = typeof a.order === 'number' ? a.order : Number.MAX_SAFE_INTEGER;
        const bo = typeof b.order === 'number' ? b.order : Number.MAX_SAFE_INTEGER;
        if (ao !== bo) return ao - bo;
        return b.createdAt.localeCompare(a.createdAt);
    });

    const handleDragStart = (event: DragStartEvent) => {
        const type = event.active.data.current?.type;
        setActiveType(type);
        if (type === 'TASK') setActiveTask(event.active.data.current?.task);
        if (type === 'COLUMN') setActiveColumn(event.active.data.current?.column);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveType(null); setActiveTask(null); setActiveColumn(null);
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        if (activeId === overId) return;

        const isActiveColumn = active.data.current?.type === 'COLUMN';

        // 1. Column Reordering
        if (isActiveColumn) {
            const oldIndex = columns.findIndex(c => c.id === activeId);
            const newIndex = columns.findIndex(c => c.id === overId);
            if (oldIndex !== newIndex) {
                // Update order
                const reordered = arrayMove(columns, oldIndex, newIndex);
                // Assign explicit order property to persist
                const updated = reordered.map((c, i) => ({ ...c, order: i }));
                onColumnsChange(updated);
            }
        }
        // 2. Task Moving
        else {
            const taskId = activeId as string;
            const overIdStr = String(overId);
            const activeTaskItem = tasks.find(tk => tk.id === taskId);
            if (!activeTaskItem) return;

            const overColumn = columns.find(c => c.id === overIdStr);
            const overTask = tasks.find(tk => tk.id === overIdStr);

            const activeStatus = activeTaskItem.status || 'todo';
            const targetStatus = overColumn ? overColumn.id : (overTask?.status || 'todo');

            // Cross-column move
            if (activeStatus !== targetStatus) {
                const dropBeforeTaskId = overTask && (overTask.status || 'todo') === targetStatus ? overTask.id : undefined;
                onKanbanStatusChange(taskId, targetStatus, dropBeforeTaskId);
                return;
            }

            // Same-column reorder (drop over another card in same column)
            if (overTask && overTask.id !== activeTaskItem.id) {
                const sameStatusTasks = sortByOrder(
                    tasks.filter(tk => (tk.status || 'todo') === activeStatus)
                );
                const oldIndex = sameStatusTasks.findIndex(tk => tk.id === activeTaskItem.id);
                const newIndex = sameStatusTasks.findIndex(tk => tk.id === overTask.id);
                if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
                    const reordered = arrayMove(sameStatusTasks, oldIndex, newIndex);
                    onReorderTasksInColumn?.(reordered.map(tk => tk.id));
                }
            }
        }
    };

    // Column Management Handlers
    const handleAddClick = () => {
        setEditCol(null); setIsNewCol(true); setColName(''); setColColor(COLUMN_COLORS[Math.floor(Math.random() * COLUMN_COLORS.length)]);
    };
    const handleEditClick = (col: KanbanColumn) => {
        setEditCol(col); setIsNewCol(false); setColName(col.title); setColColor(col.color);
    };
    const handleSaveColumn = () => {
        if (!colName.trim()) return;
        if (isNewCol) {
            const newId = `col_${Date.now()}`;
            const newCol: KanbanColumn = { id: newId, title: colName.trim(), color: colColor, order: columns.length };
            onColumnsChange([...columns, newCol]);
        } else if (editCol) {
            const updated = columns.map(c => c.id === editCol.id ? { ...c, title: colName.trim(), color: colColor } : c);
            onColumnsChange(updated);
        }
        setEditCol(null); setIsNewCol(false);
    };
    const [deleteConfirmColId, setDeleteConfirmColId] = useState<string | null>(null);
    const handleDeleteColumn = (colId: string) => {
        if (tasks.some(tk => tk.status === colId)) {
            toast.error(t('cannotDeleteColumn') as string);
            return;
        }
        setDeleteConfirmColId(colId);
    };
    const confirmDeleteColumn = () => {
        if (deleteConfirmColId) {
            onColumnsChange(columns.filter(c => c.id !== deleteConfirmColId));
        }
        setDeleteConfirmColId(null);
    };

    const columnIds = useMemo(() => columns.map(c => c.id), [columns]);

    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <Box sx={{
                display: 'flex', gap: 2.5, flexGrow: 1, overflowX: 'auto', pb: 2, height: 'calc(100vh - 250px)',
                '&::-webkit-scrollbar': { height: 8 }, '&::-webkit-scrollbar-thumb': { backgroundColor: '#cbd5e1', borderRadius: 4 },
                alignItems: 'flex-start',
            }}>
                <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
                    {columns.map(col => {
                        const colTasks = sortByOrder(
                            filteredTasks.filter(tk => tk.status === col.id || (!tk.status && col.id === 'todo'))
                        );
                        const colPoints = colTasks.reduce((sum, tk) => sum + (tk.estimate || 0), 0);
                        return (
                            <SortableProjectColumn key={col.id} column={col} count={colTasks.length} totalPoints={colPoints} isEmpty={colTasks.length === 0} onEdit={handleEditClick} onDelete={handleDeleteColumn} onInlineAdd={onAddTask} t={t}>
                                <SortableContext items={colTasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
                                    {colTasks.map((task, i) => (
                                        <Grow in key={task.id} timeout={Math.min(300 + i * 50, 600)}>
                                            <Box>
                                                <KanbanCard
                                                    task={task}
                                                    onClick={onTaskClick}
                                                    onMoveUp={onMoveTaskInColumn ? () => onMoveTaskInColumn(task.id, col.id, 'up') : undefined}
                                                    onMoveDown={onMoveTaskInColumn ? () => onMoveTaskInColumn(task.id, col.id, 'down') : undefined}
                                                    canMoveUp={i > 0}
                                                    canMoveDown={i < colTasks.length - 1}
                                                    subIssueCount={subIssueCountMap[task.id] || 0}
                                                />
                                            </Box>
                                        </Grow>
                                    ))}
                                </SortableContext>
                            </SortableProjectColumn>
                        );
                    })}
                </SortableContext>

                {/* Add Column Placeholder Button */}
                <Paper
                    onClick={handleAddClick}
                    elevation={0}
                    sx={{
                        minWidth: 280, maxWidth: 280, height: '100%', maxHeight: 'calc(100vh - 260px)',
                        borderRadius: 3, border: '2px dashed', borderColor: 'divider',
                        bgcolor: 'background.default',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
                        cursor: 'pointer', opacity: 0.7, px: 2,
                        transition: 'all 0.2s',
                        '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover', color: 'primary.main', opacity: 1 }
                    }}
                >
                    <AddIcon sx={{ fontSize: 32, color: 'inherit' }} />
                    <Typography fontWeight={600} color="inherit">{t('addColumn') as string}</Typography>
                </Paper>
            </Box>

            <DragOverlay dropAnimation={dropAnimation}>
                {activeType === 'TASK' && activeTask ? (
                    <Paper elevation={8} sx={{ p: 2, borderRadius: 2.5, border: '2px solid', borderColor: 'primary.main', width: 280, opacity: 0.9, transform: 'rotate(3deg)' }}>
                        <Typography variant="body2" fontWeight={600}>{activeTask.text}</Typography>
                    </Paper>
                ) : activeType === 'COLUMN' && activeColumn ? (
                    <Paper elevation={8} sx={{ p: 2, borderRadius: 3, border: '2px solid', borderColor: 'primary.main', width: 300, height: 400, opacity: 0.8, bgcolor: 'background.paper' }}>
                        <Box sx={{ display: 'flex', gap: 1, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: activeColumn.color }} />
                            <Typography fontWeight={700}>{activeColumn.title}</Typography>
                        </Box>
                    </Paper>
                ) : null}
            </DragOverlay>

            <Dialog open={isNewCol || !!editCol} onClose={() => { setEditCol(null); setIsNewCol(false); }}>
                <DialogTitle>{isNewCol ? (t('addColumn') as string) : (t('editColumn') as string)}</DialogTitle>
                <DialogContent sx={{ minWidth: 300 }}>
                    <TextField autoFocus fullWidth label={t('columnName') as string} value={colName} onChange={e => setColName(e.target.value)} sx={{ mt: 1, mb: 2 }} />
                    <Typography variant="caption" sx={{ mb: 1, display: 'block' }}>{t('color') as string}</Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {COLUMN_COLORS.map(c => (
                            <Box key={c} onClick={() => setColColor(c)} sx={{
                                width: 24, height: 24, borderRadius: '50%', bgcolor: c, cursor: 'pointer',
                                border: colColor === c ? '2px solid' : '1px solid transparent', borderColor: colColor === c ? 'text.primary' : 'transparent'
                            }} />
                        ))}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setEditCol(null); setIsNewCol(false); }}>{t('cancel') as string}</Button>
                    <Button variant="contained" onClick={handleSaveColumn} disabled={!colName.trim()}>{t('save') as string}</Button>
                </DialogActions>
            </Dialog>

            <ConfirmDialog
                open={!!deleteConfirmColId}
                onClose={() => setDeleteConfirmColId(null)}
                onConfirm={confirmDeleteColumn}
                title={t('confirmDeleteColumn') as string}
                message={t('confirmDeleteColumn') as string}
                confirmLabel={t('delete') as string}
                cancelLabel={t('cancel') as string}
            />
        </DndContext>
    );
};

export default BoardView;
