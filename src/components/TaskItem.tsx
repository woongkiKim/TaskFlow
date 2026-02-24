import { useState, useRef, useEffect, useCallback } from 'react';
import { Box, Checkbox, IconButton, Paper, Typography, InputBase, Chip, LinearProgress, Avatar, AvatarGroup, Menu, MenuItem, Divider } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import FlagIcon from '@mui/icons-material/Flag';
import ChecklistIcon from '@mui/icons-material/Checklist';
import BlockIcon from '@mui/icons-material/Block';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import FolderIcon from '@mui/icons-material/Folder';
import SettingsIcon from '@mui/icons-material/Settings';
import SubdirectoryArrowRightIcon from '@mui/icons-material/SubdirectoryArrowRight';
import TimerIcon from '@mui/icons-material/Timer';
import confetti from 'canvas-confetti';
import { useNavigate } from 'react-router-dom';

import type { Task, Project, EstimatePoint } from '../types';
import { normalizePriority, PRIORITY_CONFIG, TASK_TYPE_CONFIG, ESTIMATE_CONFIG } from '../types';
import { PomodoroStartButton } from './PomodoroTimer';
import { getTagColor } from '../utils/tagUtils';
import { useLanguage } from '../contexts/LanguageContext';

interface TaskItemProps {
  task: Task;
  projects?: Project[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, newText: string) => void;
  onClick?: (task: Task) => void;
  onCategoryChange?: (id: string, category: string | null, categoryColor: string | null) => void;
  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
  disableMoveUp?: boolean;
  disableMoveDown?: boolean;
  subIssueCount?: number;
}

const TaskItem = ({
  task,
  projects = [],
  onToggle,
  onDelete,
  onEdit,
  onClick,
  onCategoryChange,
  onMoveUp,
  onMoveDown,
  disableMoveUp,
  disableMoveDown,
  subIssueCount = 0,
}: TaskItemProps) => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(task.text);
  const inputRef = useRef<HTMLInputElement>(null);

  // Kim's interactive category state
  const [categoryAnchorEl, setCategoryAnchorEl] = useState<null | HTMLElement>(null);

  // Kim's dopamine effect state
  const [justChecked, setJustChecked] = useState(false);
  const checkboxRef = useRef<HTMLButtonElement>(null);

  const fireConfetti = useCallback(() => {
    if (!checkboxRef.current) return;
    const rect = checkboxRef.current.getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height / 2) / window.innerHeight;

    const colors = ['#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#10b981', '#ec4899'];

    // 1) From checkbox left
    confetti({
      particleCount: 25, spread: 55, angle: 135, origin: { x, y },
      colors, ticks: 50, gravity: 0.8, scalar: 0.8, drift: -0.5,
    });
    // 2) From checkbox right
    confetti({
      particleCount: 25, spread: 55, angle: 45, origin: { x, y },
      colors, ticks: 50, gravity: 0.8, scalar: 0.8, drift: 0.5,
    });

    // 3) Top left shower
    setTimeout(() => {
      confetti({
        particleCount: 40, spread: 70, angle: 315, origin: { x: 0, y: 0 },
        colors, ticks: 120, gravity: 1, scalar: 1, drift: 1, shapes: ['circle', 'square'],
      });
    }, 100);

    // 4) Top right shower
    setTimeout(() => {
      confetti({
        particleCount: 40, spread: 70, angle: 225, origin: { x: 1, y: 0 },
        colors, ticks: 120, gravity: 1, scalar: 1, drift: -1, shapes: ['circle', 'square'],
      });
    }, 200);
  }, []);

  const handleToggleWithAnimation = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isEditing) return;

    if (!task.completed) {
      // Completed! Toggle immediately, show animation async
      setJustChecked(true);
      onToggle(task.id);
      fireConfetti();
      setTimeout(() => setJustChecked(false), 600);
    } else {
      // Uncheck instantly
      onToggle(task.id);
    }
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleEditStart = () => {
    setEditText(task.text);
    setIsEditing(true);
  };

  const handleEditConfirm = () => {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== task.text) {
      onEdit(task.id, trimmed);
    }
    setIsEditing(false);
  };

  const handleEditCancel = () => {
    setEditText(task.text);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEditConfirm();
    } else if (e.key === 'Escape') {
      handleEditCancel();
    }
  };

  const handleClick = () => {
    if (!isEditing && onClick) {
      onClick(task);
    }
  };

  const handleCategorySelect = (project: Project | null) => {
    setCategoryAnchorEl(null);
    if (onCategoryChange) {
      onCategoryChange(
        task.id,
        project ? project.name : null,
        project ? project.color : null
      );
    }
  };

  // Priority (with legacy auto-mapping)
  const normalizedPriority = normalizePriority(task.priority);
  const priorityCfg = normalizedPriority ? PRIORITY_CONFIG[normalizedPriority] : null;
  const priorityColor = priorityCfg?.color;

  // Type
  const typeCfg = task.type ? TASK_TYPE_CONFIG[task.type] : null;

  // Subtasks
  const completedSubs = task.subtasks?.filter(s => s.completed).length || 0;
  const totalSubs = task.subtasks?.length || 0;

  // Owners
  const owners = task.owners || (task.assigneeId ? [{ uid: task.assigneeId, name: task.assigneeName || '', photo: task.assigneePhoto }] : []);

  // Blocker
  const isBlocked = task.blockerStatus === 'blocked';

  // Relations summary
  const blocksCount = task.relations?.filter(r => r.type === 'blocks').length || 0;
  const blockedByCount = task.relations?.filter(r => r.type === 'blocked_by').length || 0;
  const otherRelCount = task.relations?.filter(r => r.type !== 'blocks' && r.type !== 'blocked_by').length || 0;

  // Estimate
  const estimateCfg = task.estimate && task.estimate > 0 ? ESTIMATE_CONFIG[task.estimate as EstimatePoint] : null;

  return (
    <Paper
      elevation={0}
      className={justChecked ? 'task-card-burst' : ''}
      sx={{
        p: 2, mb: 2, display: 'flex', alignItems: 'center', borderRadius: 3,
        border: '1px solid',
        borderColor: isEditing ? 'primary.main' : isBlocked ? '#fecaca' : justChecked ? 'primary.main' : 'transparent',
        borderLeft: priorityColor ? `4px solid ${priorityColor}` : isBlocked ? '4px solid #ef4444' : '1px solid transparent',
        transition: 'all 0.2s ease-in-out',
        cursor: !isEditing && onClick ? 'pointer' : 'default',
        '&:hover': {
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          borderColor: isEditing ? 'primary.main' : 'divider',
          transform: !isEditing ? 'translateY(-1px)' : 'none',
          '& .action-buttons': { opacity: 1 },
        },
        backgroundColor: task.completed ? 'action.hover' : isBlocked ? '#fef2f2' : 'background.paper',
      }}
      onClick={handleClick}
    >
      {/* Checkbox with DOPAMINE effect */}
      <Checkbox
        ref={checkboxRef}
        checked={task.completed}
        onClick={handleToggleWithAnimation}
        checkedIcon={<CheckIcon />}
        inputProps={{
          'aria-label': task.completed ? `Mark "${task.text}" incomplete` : `Mark "${task.text}" complete`,
        }}
        sx={{
          color: 'text.secondary',
          '&.Mui-checked': { color: 'primary.main' },
          mr: 1.5,
          transition: 'transform 0.2s',
          transform: justChecked ? 'scale(1.2)' : 'scale(1)'
        }}
        disabled={isEditing}
      />

      {/* Text & Meta */}
      <Box sx={{ flexGrow: 1, minWidth: 0 }} onClick={e => { if (isEditing) e.stopPropagation(); }}>
        {isEditing ? (
          <InputBase
            inputRef={inputRef} value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleKeyDown} onBlur={handleEditConfirm} fullWidth
            sx={{ fontSize: '1rem', fontWeight: 500, py: 0, '& input': { p: 0 } }}
          />
        ) : (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {/* Task Code */}
              {task.taskCode && (
                <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700, color: 'text.disabled', mr: 0.5 }}>
                  {task.taskCode}
                </Typography>
              )}
              <Typography
                variant="body1"
                sx={{
                  fontWeight: 500, textDecoration: task.completed ? 'line-through' : 'none',
                  color: task.completed ? 'text.secondary' : 'text.primary',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer',
                }}
                onDoubleClick={handleEditStart}
              >
                {task.text}
              </Typography>
            </Box>

            {/* Meta chips */}
            {!task.completed && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5, gap: 0.5, flexWrap: 'wrap' }}>
                {/* Type badge */}
                {typeCfg && (
                  <Chip label={`${typeCfg.icon} ${typeCfg.label}`} size="small"
                    sx={{ height: 20, fontSize: '0.6rem', fontWeight: 600, bgcolor: typeCfg.color + '15', color: typeCfg.color }} />
                )}
                {/* Priority */}
                {normalizedPriority && priorityColor && (
                  <Chip
                    icon={<FlagIcon sx={{ fontSize: '12px !important', color: `${priorityColor} !important` }} />}
                    label={normalizedPriority} size="small"
                    sx={{
                      height: 20, fontSize: '0.6rem', fontWeight: 700,
                      bgcolor: priorityColor + '15', color: priorityColor,
                      '& .MuiChip-icon': { ml: 0.5 },
                    }}
                  />
                )}
                {/* Blocker */}
                {isBlocked && (
                  <Chip icon={<BlockIcon sx={{ fontSize: '12px !important' }} />} label={t('blocker') as string} size="small"
                    color="error" sx={{ height: 20, fontSize: '0.6rem', fontWeight: 700, '& .MuiChip-icon': { ml: 0.5 } }} />
                )}
                {/* Relation indicators */}
                {blocksCount > 0 && (
                  <Chip icon={<AccountTreeIcon sx={{ fontSize: '12px !important', color: '#ef4444 !important' }} />}
                    label={`Blocks ${blocksCount}`} size="small"
                    sx={{ height: 20, fontSize: '0.6rem', fontWeight: 600, bgcolor: '#ef444418', color: '#ef4444', '& .MuiChip-icon': { ml: 0.5 } }} />
                )}
                {blockedByCount > 0 && (
                  <Chip icon={<AccountTreeIcon sx={{ fontSize: '12px !important', color: '#f97316 !important' }} />}
                    label={`Blocked ${blockedByCount}`} size="small"
                    sx={{ height: 20, fontSize: '0.6rem', fontWeight: 600, bgcolor: '#f9731618', color: '#f97316', '& .MuiChip-icon': { ml: 0.5 } }} />
                )}
                {otherRelCount > 0 && (
                  <Chip icon={<AccountTreeIcon sx={{ fontSize: '12px !important', color: '#6366f1 !important' }} />}
                    label={`${otherRelCount}`} size="small"
                    sx={{ height: 20, fontSize: '0.6rem', fontWeight: 600, bgcolor: '#6366f118', color: '#6366f1', '& .MuiChip-icon': { ml: 0.5 } }} />
                )}

                {/* Category (Interactive) from kim, integrated into HEAD style */}
                <Box
                  onClick={(e) => {
                    if (onCategoryChange) {
                      e.stopPropagation();
                      setCategoryAnchorEl(e.currentTarget);
                    }
                  }}
                  sx={{ display: 'flex', alignItems: 'center', cursor: onCategoryChange ? 'pointer' : 'default', '&:hover': onCategoryChange ? { opacity: 0.8 } : {} }}
                >
                  {task.category ? (
                    <>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: task.categoryColor || 'primary.main', mr: 0.5 }} />
                      <Typography variant="caption" color="text.secondary">{task.category}</Typography>
                    </>
                  ) : onCategoryChange ? (
                    <FolderIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                  ) : null}
                </Box>

                {/* Tags */}
                {task.tags?.map(tag => (
                  <Chip key={tag} label={`#${tag}`} size="small"
                    sx={{ height: 20, fontSize: '0.65rem', fontWeight: 'bold', bgcolor: getTagColor(tag) + '18', color: getTagColor(tag) }} />
                ))}
                {/* Subtasks */}
                {totalSubs > 0 && (
                  <Chip icon={<ChecklistIcon sx={{ fontSize: '12px !important' }} />} label={`${completedSubs}/${totalSubs}`}
                    size="small" sx={{ height: 20, fontSize: '0.6rem', fontWeight: 600, '& .MuiChip-icon': { ml: 0.5 } }} />
                )}
                {/* Estimate */}
                {estimateCfg && (
                  <Chip label={`${task.estimate}pt`} size="small"
                    sx={{
                      height: 20, fontSize: '0.6rem', fontWeight: 700,
                      bgcolor: estimateCfg.bgColor, color: estimateCfg.color,
                      minWidth: 32,
                    }} />
                )}
                {/* Time Spent */}
                {task.totalTimeSpent != null && task.totalTimeSpent > 0 && (
                  <Chip
                    icon={<TimerIcon sx={{ fontSize: '12px !important', color: '#06b6d4 !important' }} />}
                    label={task.totalTimeSpent >= 60
                      ? `${Math.floor(task.totalTimeSpent / 60)}h ${task.totalTimeSpent % 60}m`
                      : `${task.totalTimeSpent}m`
                    }
                    size="small"
                    sx={{
                      height: 20, fontSize: '0.6rem', fontWeight: 700,
                      bgcolor: '#06b6d418', color: '#06b6d4',
                      '& .MuiChip-icon': { ml: 0.5 },
                    }}
                  />
                )}
                {/* Sub-issues */}
                {subIssueCount > 0 && (
                  <Chip
                    icon={<SubdirectoryArrowRightIcon sx={{ fontSize: '12px !important', color: '#8b5cf6 !important' }} />}
                    label={subIssueCount}
                    size="small"
                    sx={{
                      height: 20, fontSize: '0.6rem', fontWeight: 700,
                      bgcolor: '#8b5cf615', color: '#8b5cf6',
                      '& .MuiChip-icon': { ml: 0.5 },
                    }}
                  />
                )}
                {/* Parent indicator */}
                {task.parentTaskId && (
                  <Chip
                    icon={<SubdirectoryArrowRightIcon sx={{ fontSize: '12px !important', transform: 'rotate(180deg)' }} />}
                    label={task.parentTaskText ? task.parentTaskText.substring(0, 15) + (task.parentTaskText.length > 15 ? '…' : '') : 'Sub'}
                    size="small" variant="outlined"
                    sx={{
                      height: 20, fontSize: '0.55rem', fontWeight: 600,
                      color: 'text.secondary', borderColor: 'divider',
                      '& .MuiChip-icon': { ml: 0.5 },
                    }}
                  />
                )}
                {/* Owners avatars */}
                {owners.length > 0 && (
                  <AvatarGroup max={3} sx={{ '& .MuiAvatar-root': { width: 18, height: 18, fontSize: 9, border: '1px solid white' } }}>
                    {owners.map(o => <Avatar key={o.uid} src={o.photo} sx={{ width: 18, height: 18 }}>{o.name?.charAt(0)}</Avatar>)}
                  </AvatarGroup>
                )}
              </Box>
            )}

            {/* Subtask progress bar */}
            {!task.completed && totalSubs > 0 && (
              <LinearProgress variant="determinate" value={(completedSubs / totalSubs) * 100}
                sx={{ borderRadius: 4, height: 3, mt: 0.5, bgcolor: 'action.hover' }} />
            )}

            {/* Project Selection Menu (Kim's feature) */}
            <Menu
              anchorEl={categoryAnchorEl}
              open={Boolean(categoryAnchorEl)}
              onClose={() => setCategoryAnchorEl(null)}
              slotProps={{ paper: { sx: { borderRadius: 2, minWidth: 160, mt: 1 } } }}
              onClick={e => e.stopPropagation()}
            >
              <MenuItem
                onClick={() => handleCategorySelect(null)}
                selected={!task.category}
                sx={{ fontSize: '0.875rem' }}
              >
                {t('noProject') as string}
              </MenuItem>
              {projects.map((project) => (
                <MenuItem
                  key={project.id}
                  onClick={() => handleCategorySelect(project)}
                  selected={task.category === project.name}
                  sx={{ fontSize: '0.875rem', gap: 1 }}
                >
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: project.color, flexShrink: 0 }} />
                  {project.name}
                </MenuItem>
              ))}
              <Divider />
              <MenuItem
                onClick={() => { setCategoryAnchorEl(null); navigate('/settings'); }}
                sx={{ fontSize: '0.875rem', gap: 1, color: 'text.secondary' }}
              >
                <SettingsIcon sx={{ fontSize: 16 }} />
                {t('goToSettings') || 'Go to Settings'}
              </MenuItem>
            </Menu>
          </>
        )}
      </Box>

      {/* Action buttons */}
      <Box className="action-buttons" sx={{ opacity: isEditing ? 1 : 0, transition: 'opacity 0.2s', display: 'flex' }}
        onClick={e => e.stopPropagation()}>
        {isEditing ? (
          <>
            <IconButton size="small" onClick={handleEditConfirm} sx={{ color: 'success.main' }}><CheckIcon fontSize="small" /></IconButton>
            <IconButton size="small" onClick={handleEditCancel} sx={{ color: 'text.secondary' }}><CloseIcon fontSize="small" /></IconButton>
          </>
        ) : (
          <>
            {(onMoveUp || onMoveDown) && (
              <>
                <IconButton size="small" onClick={() => onMoveUp?.(task.id)} disabled={disableMoveUp} sx={{ color: 'text.secondary' }}>
                  <KeyboardArrowUpIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => onMoveDown?.(task.id)} disabled={disableMoveDown} sx={{ color: 'text.secondary' }}>
                  <KeyboardArrowDownIcon fontSize="small" />
                </IconButton>
              </>
            )}
            <PomodoroStartButton taskId={task.id} taskText={task.text} />
            <IconButton size="small" onClick={handleEditStart} sx={{ color: 'text.secondary' }}><EditIcon fontSize="small" /></IconButton>
            <IconButton size="small" onClick={() => onDelete(task.id)} sx={{ color: 'error.main' }}><DeleteOutlineIcon fontSize="small" /></IconButton>
          </>
        )}
      </Box>
    </Paper>
  );
};

export default TaskItem;
