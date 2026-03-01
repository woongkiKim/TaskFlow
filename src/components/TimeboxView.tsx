// src/components/TimeboxView.tsx
// Hourly timebox scheduling view — drag tasks from the sidebar onto time slots.

import { useState, useCallback, useRef, useMemo } from 'react';
import {
  Box, Typography, Paper, Chip, IconButton, Tooltip,
  TextField, InputAdornment, Avatar, LinearProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import type { Task } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { format, isSameDay } from 'date-fns';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const HOUR_START = 6;   // 06:00
const HOUR_END = 23;    // 23:00
const SLOT_HEIGHT = 72; // px per hour
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function toMinutes(isoString: string): number {
  const d = new Date(isoString);
  return d.getHours() * 60 + d.getMinutes();
}

function minutesToPx(minutes: number): number {
  return ((minutes - HOUR_START * 60) / 60) * SLOT_HEIGHT;
}

function px4Duration(startIso: string, endIso: string): number {
  const diff = toMinutes(endIso) - toMinutes(startIso);
  return Math.max((diff / 60) * SLOT_HEIGHT, 24);
}

function topPx(startIso: string): number {
  return minutesToPx(toMinutes(startIso));
}

function priorityColor(priority?: string): string {
  switch (priority) {
    case 'urgent': return '#ef4444';
    case 'high': return '#f97316';
    case 'medium': return '#f59e0b';
    case 'low': return '#22c55e';
    default: return '#6366f1';
  }
}

function snapToQuarter(minutes: number): number {
  return Math.round(minutes / 15) * 15;
}

function buildIso(date: Date, totalMinutes: number): string {
  const d = new Date(date);
  d.setHours(Math.floor(totalMinutes / 60), totalMinutes % 60, 0, 0);
  return d.toISOString().replace('.000Z', '').replace('Z', '');
}

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────
interface TimeboxViewProps {
  tasks: Task[];
  currentDate: Date;
  onUpdateTask: (taskId: string, patch: Partial<Task>) => void;
  onAddTask: (text: string, timeboxStart: string, timeboxEnd: string) => void;
  onToggle: (taskId: string) => void;
  onTaskClick?: (task: Task) => void;
}

// ─────────────────────────────────────────────
// Timebox Block (placed on grid)
// ─────────────────────────────────────────────
function TimeboxBlock({
  task, currentDate, onUpdate, onToggle, onRemove, onTaskClick,
}: {
  task: Task;
  currentDate: Date;
  onUpdate: (id: string, patch: Partial<Task>) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onTaskClick?: (task: Task) => void;
}) {
  const blockRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startY: number; origStart: number; origEnd: number } | null>(null);
  const resizeRef = useRef<{ startY: number; origEnd: number } | null>(null);

  const top = topPx(task.timeboxStart!);
  const height = px4Duration(task.timeboxStart!, task.timeboxEnd!);
  const color = task.categoryColor || priorityColor(task.priority);
  const compact = height < 44;

  // ── Move drag ──
  const handleMoveMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if ((e.target as HTMLElement).dataset.resize) return;
    const startMin = toMinutes(task.timeboxStart!);
    const endMin = toMinutes(task.timeboxEnd!);
    dragRef.current = { startY: e.clientY, origStart: startMin, origEnd: endMin };

    const onMove = (mv: MouseEvent) => {
      if (!dragRef.current) return;
      const delta = mv.clientY - dragRef.current.startY;
      const deltaMin = snapToQuarter((delta / SLOT_HEIGHT) * 60);
      let newStart = Math.max(HOUR_START * 60, Math.min(HOUR_END * 60 - 30, dragRef.current.origStart + deltaMin));
      let newEnd = newStart + (dragRef.current.origEnd - dragRef.current.origStart);
      if (newEnd > HOUR_END * 60) { newEnd = HOUR_END * 60; newStart = newEnd - (dragRef.current.origEnd - dragRef.current.origStart); }
      if (blockRef.current) {
        blockRef.current.style.top = `${minutesToPx(newStart)}px`;
        blockRef.current.style.height = `${px4Duration(buildIso(currentDate, newStart), buildIso(currentDate, newEnd))}px`;
      }
    };
    const onUp = (mv: MouseEvent) => {
      if (!dragRef.current) return;
      const delta = mv.clientY - dragRef.current.startY;
      const deltaMin = snapToQuarter((delta / SLOT_HEIGHT) * 60);
      let newStart = Math.max(HOUR_START * 60, dragRef.current.origStart + deltaMin);
      let newEnd = newStart + (dragRef.current.origEnd - dragRef.current.origStart);
      if (newEnd > HOUR_END * 60) { newEnd = HOUR_END * 60; newStart = newEnd - (dragRef.current.origEnd - dragRef.current.origStart); }
      onUpdate(task.id, { timeboxStart: buildIso(currentDate, newStart), timeboxEnd: buildIso(currentDate, newEnd) });
      dragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // ── Resize drag ──
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    resizeRef.current = { startY: e.clientY, origEnd: toMinutes(task.timeboxEnd!) };
    const startMin = toMinutes(task.timeboxStart!);

    const onMove = (mv: MouseEvent) => {
      if (!resizeRef.current) return;
      const deltaMin = snapToQuarter(((mv.clientY - resizeRef.current.startY) / SLOT_HEIGHT) * 60);
      const newEnd = Math.min(HOUR_END * 60, Math.max(startMin + 15, resizeRef.current.origEnd + deltaMin));
      if (blockRef.current) {
        blockRef.current.style.height = `${px4Duration(buildIso(currentDate, startMin), buildIso(currentDate, newEnd))}px`;
      }
    };
    const onUp = (mv: MouseEvent) => {
      if (!resizeRef.current) return;
      const deltaMin = snapToQuarter(((mv.clientY - resizeRef.current.startY) / SLOT_HEIGHT) * 60);
      const newEnd = Math.min(HOUR_END * 60, Math.max(startMin + 15, resizeRef.current.origEnd + deltaMin));
      onUpdate(task.id, { timeboxEnd: buildIso(currentDate, newEnd) });
      resizeRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <Box
      ref={blockRef}
      onMouseDown={handleMoveMouseDown}
      onClick={(e) => { e.stopPropagation(); if (onTaskClick) onTaskClick(task); }}
      sx={{
        position: 'absolute', left: 4, right: 4,
        top, height,
        bgcolor: color + '22',
        borderLeft: `3px solid ${color}`,
        borderRadius: '0 6px 6px 0',
        px: 0.75, py: compact ? 0.25 : 0.5,
        cursor: 'grab',
        '&:active': { cursor: 'grabbing' },
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        overflow: 'hidden',
        userSelect: 'none',
        zIndex: 2,
        boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
        transition: 'box-shadow 0.15s',
        '&:hover': { boxShadow: `0 0 0 2px ${color}`, zIndex: 3 },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, minWidth: 0 }}>
        <IconButton
          size="small"
          disableRipple
          onClick={(e) => { e.stopPropagation(); onToggle(task.id); }}
          sx={{ p: 0.1, mt: compact ? 0 : 0.1, color: task.completed ? 'success.main' : 'text.disabled', flexShrink: 0 }}
        >
          {task.completed ? <CheckCircleIcon sx={{ fontSize: 14 }} /> : <CheckCircleOutlineIcon sx={{ fontSize: 14 }} />}
        </IconButton>
        <Typography
          variant="caption"
          fontWeight={600}
          sx={{
            color: task.completed ? 'text.disabled' : `${color}`,
            textDecoration: task.completed ? 'line-through' : 'none',
            lineHeight: 1.2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: compact ? 'nowrap' : 'normal',
            flex: 1,
          }}
        >
          {task.text}
        </Typography>
        <IconButton
          size="small"
          onClick={(e) => { e.stopPropagation(); onRemove(task.id); }}
          sx={{ p: 0.1, color: 'text.disabled', opacity: 0.5, flexShrink: 0, '&:hover': { opacity: 1, color: 'error.main' } }}
        >
          <CloseIcon sx={{ fontSize: 11 }} />
        </IconButton>
      </Box>

      {!compact && (
        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.68rem', mt: 0.25 }}>
          <AccessTimeIcon sx={{ fontSize: 10, verticalAlign: 'middle', mr: 0.25 }} />
          {format(new Date(task.timeboxStart!), 'HH:mm')} – {format(new Date(task.timeboxEnd!), 'HH:mm')}
          {task.estimate ? ` · ${task.estimate}pts` : ''}
        </Typography>
      )}

      {/* Resize handle */}
      <Box
        data-resize="true"
        onMouseDown={handleResizeMouseDown}
        sx={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 8,
          cursor: 'ns-resize',
          '&::after': {
            content: '""', display: 'block', mx: 'auto', mt: '2px',
            width: 20, height: 3, borderRadius: 2,
            bgcolor: color, opacity: 0.4,
          },
        }}
      />
    </Box>
  );
}

// ─────────────────────────────────────────────
// Sidebar task card (unscheduled)
// ─────────────────────────────────────────────
function UnscheduledCard({
  task, onDragStart, onTaskClick,
}: {
  task: Task;
  onDragStart: (task: Task) => void;
  onTaskClick?: (task: Task) => void;
}) {
  const color = task.categoryColor || priorityColor(task.priority);
  return (
    <Paper
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart(task); }}
      onClick={() => { if (onTaskClick) onTaskClick(task); }}
      elevation={0}
      sx={{
        p: 1, mb: 0.75, borderRadius: 2, cursor: 'grab',
        border: `1px solid`, borderColor: 'divider',
        borderLeft: `3px solid ${color}`,
        '&:active': { cursor: 'grabbing' },
        '&:hover': { bgcolor: 'action.hover', boxShadow: `0 0 0 1px ${color}44` },
        display: 'flex', alignItems: 'flex-start', gap: 0.75,
        userSelect: 'none',
        opacity: task.completed ? 0.5 : 1,
      }}
    >
      <DragIndicatorIcon sx={{ fontSize: 14, color: 'text.disabled', mt: 0.15, flexShrink: 0 }} />
      <Box sx={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
        <Typography
          variant="caption"
          fontWeight={600}
          sx={{
            color: 'text.primary',
            textDecoration: task.completed ? 'line-through' : 'none',
            display: 'block',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {task.text}
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5, mt: 0.25, flexWrap: 'wrap' }}>
          {task.priority && (
            <Chip label={task.priority} size="small" sx={{ height: 14, fontSize: '0.6rem', bgcolor: color + '20', color, fontWeight: 700, border: 'none' }} />
          )}
          {task.estimate && (
            <Chip label={`~${task.estimate * 25}m`} icon={<AccessTimeIcon />} size="small"
              sx={{ height: 14, fontSize: '0.6rem', '& .MuiChip-icon': { fontSize: 10 } }} />
          )}
          {task.dueDate && (
            <Chip label={task.dueDate.slice(5)} size="small" sx={{ height: 14, fontSize: '0.6rem' }} />
          )}
        </Box>
      </Box>
      {task.assigneePhoto && (
        <Avatar src={task.assigneePhoto} sx={{ width: 18, height: 18, flexShrink: 0 }} />
      )}
    </Paper>
  );
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────
export default function TimeboxView({ tasks, currentDate, onUpdateTask, onAddTask, onToggle, onTaskClick }: TimeboxViewProps) {
  const { lang } = useLanguage();
  const gridRef = useRef<HTMLDivElement>(null);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [hoverSlot, setHoverSlot] = useState<number | null>(null);   // minutes
  const [newBlockSlot, setNewBlockSlot] = useState<{ top: number; minutes: number } | null>(null);
  const [newBlockText, setNewBlockText] = useState('');
  const [search, setSearch] = useState('');

  // Partition tasks for today
  const todayBoxed = useMemo(() =>
    tasks.filter(t =>
      t.timeboxStart &&
      isSameDay(new Date(t.timeboxStart), currentDate)
    ).sort((a, b) => (a.timeboxStart! < b.timeboxStart! ? -1 : 1)),
    [tasks, currentDate]
  );

  const unscheduled = useMemo(() =>
    tasks.filter(t =>
      !t.timeboxStart ||
      !isSameDay(new Date(t.timeboxStart), currentDate)
    ).filter(t =>
      !t.completed &&
      !t.archived &&
      t.text.toLowerCase().includes(search.toLowerCase())
    ),
    [tasks, currentDate, search]
  );

  const completedToday = todayBoxed.filter(t => t.completed).length;
  const totalToday = todayBoxed.length;

  // Compute drop Y → clamped minutes
  const yToMinutes = useCallback((clientY: number): number => {
    if (!gridRef.current) return HOUR_START * 60;
    const rect = gridRef.current.getBoundingClientRect();
    const relY = clientY - rect.top;
    const rawMin = HOUR_START * 60 + (relY / SLOT_HEIGHT) * 60;
    return Math.max(HOUR_START * 60, Math.min(HOUR_END * 60 - 30, snapToQuarter(rawMin)));
  }, []);

  // ── HTML5 drag and drop (from sidebar) ──
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setHoverSlot(yToMinutes(e.clientY));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedTask) return;
    const startMin = yToMinutes(e.clientY);
    const dur = draggedTask.estimate ? draggedTask.estimate * 25 : 60;
    const endMin = Math.min(HOUR_END * 60, startMin + dur);
    onUpdateTask(draggedTask.id, {
      timeboxStart: buildIso(currentDate, startMin),
      timeboxEnd: buildIso(currentDate, endMin),
    });
    setDraggedTask(null);
    setHoverSlot(null);
  };

  // ── Click on empty grid to create new block ──
  const handleGridClick = (e: React.MouseEvent) => {
    if (draggedTask) return;
    if ((e.target as HTMLElement).closest('[data-block]')) return;
    const minutes = yToMinutes(e.clientY);
    if (!gridRef.current) return;
    const rect = gridRef.current.getBoundingClientRect();
    const relY = e.clientY - rect.top;
    setNewBlockSlot({ top: relY, minutes });
    setNewBlockText('');
  };

  const handleNewBlockSubmit = () => {
    if (!newBlockText.trim() || !newBlockSlot) return;
    const startMin = newBlockSlot.minutes;
    const endMin = Math.min(HOUR_END * 60, startMin + 60);
    onAddTask(newBlockText.trim(), buildIso(currentDate, startMin), buildIso(currentDate, endMin));
    setNewBlockSlot(null);
    setNewBlockText('');
  };

  const handleRemoveTimebox = (taskId: string) => {
    onUpdateTask(taskId, { timeboxStart: undefined, timeboxEnd: undefined });
  };

  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const showNow = isSameDay(currentDate, new Date()) && nowMinutes >= HOUR_START * 60 && nowMinutes < HOUR_END * 60;

  return (
    <Box sx={{ display: 'flex', height: '100%', overflow: 'hidden', gap: 0 }}>

      {/* ──────── Grid ──────── */}
      <Box sx={{ flex: 1, overflow: 'auto', position: 'relative', minWidth: 0 }}>
        {/* Progress bar */}
        {totalToday > 0 && (
          <Box sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">
                {lang === 'ko' ? `오늘 타임박스` : `Today's Timebox`}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {completedToday}/{totalToday} {lang === 'ko' ? '완료' : 'done'}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={totalToday > 0 ? (completedToday / totalToday) * 100 : 0}
              sx={{ borderRadius: 4, height: 4 }}
            />
          </Box>
        )}

        {/* Hourly grid */}
        <Box
          ref={gridRef}
          onDragOver={handleDragOver}
          onDragLeave={() => setHoverSlot(null)}
          onDrop={handleDrop}
          onClick={handleGridClick}
          sx={{
            position: 'relative',
            width: '100%',
            height: `${(HOUR_END - HOUR_START) * SLOT_HEIGHT}px`,
            bgcolor: 'background.default',
          }}
        >
          {/* Hour rows */}
          {HOURS.map(hour => (
            <Box
              key={hour}
              sx={{
                position: 'absolute',
                top: (hour - HOUR_START) * SLOT_HEIGHT,
                left: 0, right: 0, height: SLOT_HEIGHT,
                borderTop: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'flex-start',
                pointerEvents: 'none',
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontSize: '0.68rem',
                  color: 'text.disabled',
                  width: 40,
                  pl: 0.5,
                  pt: 0.25,
                  fontWeight: hour % 3 === 0 ? 700 : 400,
                  userSelect: 'none',
                }}
              >
                {`${String(hour).padStart(2, '0')}:00`}
              </Typography>
              {/* 30-min line */}
              <Box sx={{
                position: 'absolute',
                top: SLOT_HEIGHT / 2,
                left: 40, right: 0,
                borderTop: '1px dashed',
                borderColor: 'divider',
                opacity: 0.5,
              }} />
            </Box>
          ))}

          {/* Now indicator */}
          {showNow && (
            <Box sx={{
              position: 'absolute',
              top: minutesToPx(nowMinutes),
              left: 40, right: 0,
              height: 2,
              bgcolor: 'error.main',
              zIndex: 10,
              '&::before': {
                content: '""', position: 'absolute', left: -5, top: -4,
                width: 10, height: 10, borderRadius: '50%', bgcolor: 'error.main',
              },
            }} />
          )}

          {/* Drop hover highlight */}
          {hoverSlot !== null && draggedTask && (
            <Box sx={{
              position: 'absolute',
              top: minutesToPx(hoverSlot),
              left: 44, right: 4,
              height: Math.max(24, ((draggedTask.estimate ? draggedTask.estimate * 25 : 60) / 60) * SLOT_HEIGHT),
              bgcolor: 'primary.main',
              opacity: 0.15,
              borderRadius: 1,
              pointerEvents: 'none',
              zIndex: 1,
            }} />
          )}

          {/* Scheduled blocks */}
          <Box sx={{ position: 'absolute', top: 0, bottom: 0, left: 44, right: 0 }}>
            {todayBoxed.map(task => (
              <TimeboxBlock
                key={task.id}
                task={task}
                currentDate={currentDate}
                onUpdate={onUpdateTask}
                onToggle={onToggle}
                onRemove={handleRemoveTimebox}
                onTaskClick={onTaskClick}
              />
            ))}
          </Box>

          {/* New block input overlay */}
          {newBlockSlot && (
            <Box
              data-block="true"
              sx={{
                position: 'absolute',
                top: newBlockSlot.top,
                left: 44, right: 4,
                height: SLOT_HEIGHT,
                bgcolor: 'primary.main',
                opacity: 0.92,
                borderRadius: 1,
                zIndex: 20,
                display: 'flex',
                alignItems: 'center',
                px: 1,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <TextField
                autoFocus
                value={newBlockText}
                onChange={e => setNewBlockText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); handleNewBlockSubmit(); }
                  if (e.key === 'Escape') { setNewBlockSlot(null); setNewBlockText(''); }
                }}
                placeholder={lang === 'ko' ? '새 작업 이름 입력 후 Enter…' : 'Type task name & press Enter…'}
                variant="standard"
                fullWidth
                InputProps={{
                  disableUnderline: true,
                  startAdornment: (
                    <InputAdornment position="start">
                      <AddIcon sx={{ color: 'white', fontSize: 16 }} />
                    </InputAdornment>
                  ),
                  sx: { color: 'white', fontSize: '0.85rem', fontWeight: 600 },
                }}
                sx={{ '& input::placeholder': { color: 'rgba(255,255,255,0.7)' } }}
              />
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', ml: 0.5, whiteSpace: 'nowrap', fontSize: '0.65rem' }}>
                {format(new Date(buildIso(currentDate, newBlockSlot.minutes)), 'HH:mm')}
              </Typography>
              <IconButton size="small" onClick={() => { setNewBlockSlot(null); setNewBlockText(''); }} sx={{ color: 'white', ml: 0.5, p: 0.25 }}>
                <CloseIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Box>
          )}
        </Box>
      </Box>

      {/* ──────── Sidebar: Unscheduled ──────── */}
      <Box sx={{
        width: 240, flexShrink: 0, borderLeft: '1px solid', borderColor: 'divider',
        display: 'flex', flexDirection: 'column', overflow: 'hidden', bgcolor: 'background.paper',
      }}>
        <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ mb: 1 }}>
            {lang === 'ko' ? '📋 미배정 작업' : '📋 Unscheduled'}
          </Typography>
          <TextField
            size="small" fullWidth
            placeholder={lang === 'ko' ? '검색…' : 'Search…'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16 }} /></InputAdornment> }}
            sx={{ '& .MuiInputBase-root': { borderRadius: 2, fontSize: '0.8rem', py: 0 } }}
          />
          <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.75 }}>
            {lang === 'ko' ? '드래그해서 시간대에 배치하세요' : 'Drag tasks to schedule them'}
          </Typography>
        </Box>

        <Box sx={{ flex: 1, overflowY: 'auto', p: 1 }}>
          {unscheduled.length === 0 && (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography variant="caption" color="text.disabled">
                {lang === 'ko' ? '🎉 모든 작업이 배정되었어요!' : '🎉 All tasks scheduled!'}
              </Typography>
            </Box>
          )}
          {unscheduled.map(task => (
            <UnscheduledCard
              key={task.id}
              task={task}
              onDragStart={setDraggedTask}
              onTaskClick={onTaskClick}
            />
          ))}
        </Box>

        {/* Quick stats */}
        {todayBoxed.length > 0 && (
          <Box sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
              {lang === 'ko' ? '오늘 타임박스 요약' : "Today's Summary"}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {todayBoxed.map(t => {
                const dur = (toMinutes(t.timeboxEnd!) - toMinutes(t.timeboxStart!));
                const color = t.categoryColor || priorityColor(t.priority);
                return (
                  <Tooltip key={t.id} title={t.text} placement="left">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
                      <Typography variant="caption" noWrap sx={{ flex: 1, color: t.completed ? 'text.disabled' : 'text.primary', textDecoration: t.completed ? 'line-through' : 'none', fontSize: '0.7rem' }}>
                        {t.text}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.68rem', flexShrink: 0 }}>
                        {dur}m
                      </Typography>
                    </Box>
                  </Tooltip>
                );
              })}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 0.5, borderTop: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" color="text.disabled" fontWeight={700}>
                  {lang === 'ko' ? '총' : 'Total'}
                </Typography>
                <Typography variant="caption" color="primary" fontWeight={700}>
                  {todayBoxed.reduce((acc, t) => acc + (toMinutes(t.timeboxEnd!) - toMinutes(t.timeboxStart!)), 0)}m
                </Typography>
              </Box>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
