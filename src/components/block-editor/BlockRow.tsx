// src/components/block-editor/BlockRow.tsx
import React, { useRef, useEffect, type KeyboardEvent } from 'react';
import { IconButton, Chip, Typography, Box, Paper, alpha } from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import AddIcon from '@mui/icons-material/Add';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AlternateEmailIcon from '@mui/icons-material/AlternateEmail';
import PersonIcon from '@mui/icons-material/Person';
import type { Block, BlockType } from './blockEditorTypes';
import type { Task, TeamMember } from '../../types';

interface BlockRowProps {
  block: Block;
  index: number;
  isActive: boolean;
  onContentChange: (id: string, content: string) => void;
  onTypeChange: (id: string, type: BlockType) => void;
  onUpdateBlock: (id: string, updates: Partial<Block>) => void;
  onKeyDown: (e: KeyboardEvent<HTMLElement>, block: Block, index: number) => void;
  onFocus: (id: string) => void;
  onCheckToggle: (id: string) => void;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  onAddBlockBelow: (index: number) => void;
  allTasks: Task[];
  workspaceMembers: TeamMember[];
  blockRef: (el: HTMLElement | null) => void;
  lang: string;
}

const BlockRow: React.FC<BlockRowProps> = ({
  block, index,
  onContentChange, onKeyDown, onFocus, onCheckToggle,
  onDragStart, onDragOver, onDragEnd, onAddBlockBelow,
  onUpdateBlock,
  allTasks, workspaceMembers,
  blockRef, lang,
}) => {
  const isKo = lang === 'ko';
  const contentRef = useRef<HTMLDivElement>(null);

  const [showSearch, setShowSearch] = React.useState(false);
  const [selectedSearchIndex, setSelectedSearchIndex] = React.useState(0);

  // Compute filtered results for task/mention blocks
  const filteredTasks = React.useMemo(() => {
    if (block.type !== 'task' || !block.content) return [];
    return allTasks.filter((t: Task) => t.text.toLowerCase().includes(block.content.toLowerCase())).slice(0, 5);
  }, [block.type, block.content, allTasks]);

  const filteredMembers = React.useMemo(() => {
    if (block.type !== 'mention' || !block.content) return [];
    return workspaceMembers.filter((m: TeamMember) => m.displayName?.toLowerCase().includes(block.content.toLowerCase())).slice(0, 5);
  }, [block.type, block.content, workspaceMembers]);

  // Keep contentEditable in sync with block.content
  useEffect(() => {
    if (contentRef.current && contentRef.current.textContent !== block.content) {
      contentRef.current.textContent = block.content;
    }
  }, [block.content]);

  // Assign ref to parent for focus management
  useEffect(() => {
    blockRef(contentRef.current);
  }, [blockRef]);

  const handleInput = () => {
    if (contentRef.current) {
      const newContent = contentRef.current.textContent || '';
      onContentChange(block.id, newContent);
      if ((block.type === 'task' || block.type === 'mention') && newContent.length > 0) {
        setShowSearch(true);
        setSelectedSearchIndex(0);
      } else {
        setShowSearch(false);
      }
    }
  };

  // Keyboard navigation for search results
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!showSearch || !block.content) return;
    const items = block.type === 'task' ? filteredTasks : filteredMembers;
    if (items.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSearchIndex(prev => Math.min(prev + 1, items.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSearchIndex(prev => Math.max(prev - 1, 0));
      return;
    }
    if (e.key === 'Enter' && items.length > 0) {
      e.preventDefault();
      const selected = items[selectedSearchIndex];
      if (block.type === 'task' && 'text' in selected) {
        onUpdateBlock(block.id, { taskId: (selected as Task).id, content: (selected as Task).text });
      } else if (block.type === 'mention' && 'uid' in selected) {
        onUpdateBlock(block.id, { userId: (selected as TeamMember).uid, content: (selected as TeamMember).displayName || '' });
      }
      setShowSearch(false);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setShowSearch(false);
      return;
    }
  };

  const placeholderMap: Record<BlockType, string> = {
    'text': isKo ? "텍스트를 입력하거나 '/'를 눌러 블록을 추가하세요" : "Type something or press '/' for commands",
    'heading1': isKo ? '제목 1' : 'Heading 1',
    'heading2': isKo ? '제목 2' : 'Heading 2',
    'heading3': isKo ? '제목 3' : 'Heading 3',
    'bullet-list': isKo ? '목록 항목' : 'List item',
    'numbered-list': isKo ? '목록 항목' : 'List item',
    'checklist': isKo ? '할 일' : 'To-do',
    'quote': isKo ? '인용문을 입력하세요' : 'Type a quote',
    'callout': isKo ? '콜아웃 내용' : 'Callout content',
    'code': isKo ? '코드를 입력하세요' : 'Type code here',
    'divider': '',
    'image': isKo ? '이미지 설명' : 'Image alt text',
    'task': isKo ? '작업 검색... (태스크 ID 또는 이름)' : 'Search task... (ID or name)',
    'mention': isKo ? '사용자 멘션... (이름 또는 이메일)' : 'Mention user... (name or email)',
  };

  if (block.type === 'divider') {
    return (
      <Box
        sx={{
          display: 'flex', alignItems: 'center', gap: 0.5,
          py: 0.5, position: 'relative',
          '&:hover': { '& .drag-handle': { opacity: 1 } },
        }}
      >
        <Box className="drag-handle"
          sx={{ opacity: 0, transition: 'opacity 0.15s', cursor: 'grab', color: 'text.disabled', display: 'flex', alignItems: 'center', px: 0.3 }}
          draggable
          onDragStart={() => onDragStart(index)}
          onDragEnd={onDragEnd}
        >
          <DragIndicatorIcon sx={{ fontSize: 18 }} />
        </Box>
        <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider', my: 2 }} />
      </Box>
    );
  }

  const styleMap: Record<BlockType, object> = {
    'text': { fontSize: '0.9rem', lineHeight: 1.7 },
    'heading1': { fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.3, letterSpacing: -0.5 },
    'heading2': { fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.4 },
    'heading3': { fontSize: '1.05rem', fontWeight: 700, lineHeight: 1.5 },
    'bullet-list': { fontSize: '0.9rem', lineHeight: 1.7 },
    'numbered-list': { fontSize: '0.9rem', lineHeight: 1.7 },
    'checklist': { fontSize: '0.9rem', lineHeight: 1.7 },
    'quote': { fontSize: '0.9rem', lineHeight: 1.7, fontStyle: 'italic', color: 'text.secondary' },
    'callout': { fontSize: '0.88rem', lineHeight: 1.7 },
    'code': { fontFamily: '"Fira Code", "Consolas", monospace', fontSize: '0.82rem', lineHeight: 1.6 },
    'divider': {},
    'image': { fontSize: '0.85rem', color: 'text.secondary', textAlign: 'center' },
    'task': { fontSize: '0.88rem', lineHeight: 1.7, fontWeight: 500 },
    'mention': { fontSize: '0.88rem', lineHeight: 1.7, fontWeight: 600, color: '#3b82f6' },
  };

  const emptyBeforeSx = {
    '&:empty::before': {
      content: 'attr(data-placeholder)',
      color: 'text.disabled',
      pointerEvents: 'none',
    },
  };

  return (
    <Box
      onDragOver={(e) => onDragOver(e, index)}
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 0,
        position: 'relative',
        borderRadius: 1.5,
        transition: 'background 0.15s',
        '&:hover': {
          bgcolor: alpha('#6366f1', 0.02),
          '& .block-actions': { opacity: 1 },
        },
      }}
    >
      {/* Drag handle + Add button */}
      <Box
        className="block-actions"
        sx={{
          opacity: 0,
          transition: 'opacity 0.15s',
          display: 'flex',
          alignItems: 'center',
          pt: block.type.startsWith('heading') ? 0.5 : 0.3,
          minWidth: 44,
          flexShrink: 0,
        }}
      >
        <Box
          onClick={() => onAddBlockBelow(index)}
          sx={{
            cursor: 'pointer', color: 'text.disabled', display: 'flex', alignItems: 'center',
            borderRadius: 1, '&:hover': { color: 'primary.main', bgcolor: alpha('#6366f1', 0.08) }, p: 0.2,
          }}
        >
          <AddIcon sx={{ fontSize: 16 }} />
        </Box>
        <Box
          draggable
          onDragStart={() => onDragStart(index)}
          onDragEnd={onDragEnd}
          sx={{
            cursor: 'grab', color: 'text.disabled', display: 'flex', alignItems: 'center',
            borderRadius: 1, '&:hover': { color: 'text.secondary', bgcolor: alpha('#000', 0.04) },
            p: 0.2, '&:active': { cursor: 'grabbing' },
          }}
        >
          <DragIndicatorIcon sx={{ fontSize: 16 }} />
        </Box>
      </Box>

      {/* List markers */}
      {block.type === 'bullet-list' && (
        <Box sx={{ minWidth: 20, textAlign: 'center', pt: 0.8, color: 'text.secondary', fontSize: '0.9rem', fontWeight: 900, userSelect: 'none' }}>
          •
        </Box>
      )}
      {block.type === 'numbered-list' && (
        <Box sx={{ minWidth: 24, textAlign: 'right', pr: 0.5, pt: 0.35, color: 'text.secondary', fontSize: '0.85rem', fontWeight: 600, userSelect: 'none' }}>
          {`${index + 1}.`}
        </Box>
      )}
      {block.type === 'checklist' && (
        <Box onClick={() => onCheckToggle(block.id)} sx={{ minWidth: 24, pt: 0.45, cursor: 'pointer', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
          <Box sx={{
            width: 18, height: 18, borderRadius: 0.8,
            border: '2px solid', borderColor: block.checked ? 'primary.main' : 'action.disabled',
            bgcolor: block.checked ? 'primary.main' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s', '&:hover': { borderColor: 'primary.main' },
          }}>
            {block.checked && (
              <svg width="12" height="12" viewBox="0 0 12 12">
                <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </Box>
        </Box>
      )}

      {/* Wrapper for quote/callout/code/image/default */}
      {block.type === 'quote' ? (
        <Box sx={{ flex: 1, borderLeft: '3px solid', borderColor: 'primary.main', pl: 1.5, py: 0.3, my: 0.3, borderRadius: '0 4px 4px 0' }}>
          <Box ref={contentRef} contentEditable suppressContentEditableWarning onInput={handleInput}
            onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => onKeyDown(e, block, index)}
            onFocus={() => onFocus(block.id)} data-placeholder={placeholderMap[block.type]}
            sx={{ outline: 'none', minHeight: 24, ...styleMap[block.type], ...emptyBeforeSx }} />
        </Box>
      ) : block.type === 'task' ? (
        <Box sx={{ flex: 1, position: 'relative' }}>
          {block.taskId ? (
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1.5, border: '1.5px solid', borderColor: 'divider', bgcolor: alpha('#10b981', 0.02) }}>
              <AssignmentIcon sx={{ color: '#10b981' }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" fontWeight={700}>{block.content}</Typography>
                <Typography variant="caption" color="text.secondary">ID: {block.taskId}</Typography>
              </Box>
              <IconButton size="small" onClick={() => onUpdateBlock(block.id, { taskId: undefined })}>
                <AddIcon sx={{ fontSize: 16, transform: 'rotate(45deg)' }} />
              </IconButton>
            </Paper>
          ) : (
            <>
              <Box sx={{ flex: 1, bgcolor: alpha('#10b981', 0.06), borderRadius: 2, px: 1.5, py: 0.8, my: 0.3, border: '1px solid', borderColor: alpha('#10b981', 0.2), display: 'flex', alignItems: 'center', gap: 1 }}>
                <AssignmentIcon sx={{ color: '#10b981', fontSize: 18 }} />
                <Box ref={contentRef} contentEditable suppressContentEditableWarning onInput={handleInput}
                  onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => { handleSearchKeyDown(e); if (!e.defaultPrevented) onKeyDown(e, block, index); }}
                  onFocus={() => onFocus(block.id)} data-placeholder={placeholderMap[block.type]}
                  sx={{ outline: 'none', flex: 1, minHeight: 24, ...styleMap[block.type], ...emptyBeforeSx }} />
              </Box>
              {showSearch && block.content && (
                <Paper elevation={8} sx={{ position: 'absolute', top: '100%', left: 0, zIndex: 100, mt: 0.5, width: 300, maxHeight: 250, overflow: 'auto', borderRadius: 2, p: 1 }}>
                  <Typography variant="overline" sx={{ px: 1, color: 'text.disabled' }}>{isKo ? '작업 검색' : 'Search Tasks'}</Typography>
                  {filteredTasks.length === 0 ? (
                    <Box sx={{ px: 1, py: 2, textAlign: 'center' }}>
                      <Typography variant="caption" color="text.disabled">{isKo ? '검색 결과가 없습니다' : 'No tasks found'}</Typography>
                    </Box>
                  ) : filteredTasks.map((task: Task, i: number) => (
                    <Box key={task.id} onClick={() => { onUpdateBlock(block.id, { taskId: task.id, content: task.text }); setShowSearch(false); }}
                      sx={{ p: 1, borderRadius: 1.5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1, bgcolor: i === selectedSearchIndex ? 'action.selected' : 'transparent', '&:hover': { bgcolor: 'action.hover' } }}>
                      <AssignmentIcon sx={{ fontSize: 16, color: '#10b981' }} />
                      <Typography variant="body2">{task.text}</Typography>
                    </Box>
                  ))}
                </Paper>
              )}
            </>
          )}
        </Box>
      ) : block.type === 'mention' ? (
        <Box sx={{ flex: 1, position: 'relative', width: 'fit-content', minWidth: 200 }}>
          {block.userId ? (
            <Chip
              avatar={<Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: 'primary.main', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>{block.content.charAt(0)}</Box>}
              label={block.content}
              onDelete={() => onUpdateBlock(block.id, { userId: undefined })}
              sx={{ fontWeight: 600, color: 'primary.main', bgcolor: alpha('#3b82f6', 0.08), border: '1px solid', borderColor: alpha('#3b82f6', 0.15) }}
            />
          ) : (
            <>
              <Box sx={{ flex: 1, bgcolor: alpha('#3b82f6', 0.06), borderRadius: 2, px: 1.5, py: 0.8, my: 0.3, border: '1px solid', borderColor: alpha('#3b82f6', 0.2), display: 'flex', alignItems: 'center', gap: 1 }}>
                <AlternateEmailIcon sx={{ color: '#3b82f6', fontSize: 18 }} />
                <Box ref={contentRef} contentEditable suppressContentEditableWarning onInput={handleInput}
                  onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => { handleSearchKeyDown(e); if (!e.defaultPrevented) onKeyDown(e, block, index); }}
                  onFocus={() => onFocus(block.id)} data-placeholder={placeholderMap[block.type]}
                  sx={{ outline: 'none', flex: 1, minHeight: 24, ...styleMap[block.type], ...emptyBeforeSx }} />
              </Box>
              {showSearch && block.content && (
                <Paper elevation={8} sx={{ position: 'absolute', top: '100%', left: 0, zIndex: 100, mt: 0.5, width: 250, maxHeight: 200, overflow: 'auto', borderRadius: 2, p: 1 }}>
                  {filteredMembers.length === 0 ? (
                    <Box sx={{ px: 1, py: 2, textAlign: 'center' }}>
                      <Typography variant="caption" color="text.disabled">{isKo ? '멤버를 찾을 수 없습니다' : 'No members found'}</Typography>
                    </Box>
                  ) : filteredMembers.map((member: TeamMember, i: number) => (
                    <Box key={member.uid} onClick={() => { onUpdateBlock(block.id, { userId: member.uid, content: member.displayName || '' }); setShowSearch(false); }}
                      sx={{ p: 1, borderRadius: 1.5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1, bgcolor: i === selectedSearchIndex ? 'action.selected' : 'transparent', '&:hover': { bgcolor: 'action.hover' } }}>
                      <PersonIcon sx={{ fontSize: 16, color: '#3b82f6' }} />
                      <Typography variant="body2">{member.displayName}</Typography>
                    </Box>
                  ))}
                </Paper>
              )}
            </>
          )}
        </Box>
      ) : block.type === 'callout' ? (
        <Box sx={{ flex: 1, bgcolor: '#1e293b', borderRadius: 2, px: 2, py: 1.5, my: 0.3, overflow: 'auto' }}>
          <Box ref={contentRef} contentEditable suppressContentEditableWarning onInput={handleInput}
            onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => onKeyDown(e, block, index)}
            onFocus={() => onFocus(block.id)} data-placeholder={placeholderMap[block.type]}
            sx={{ outline: 'none', minHeight: 24, color: '#e2e8f0', whiteSpace: 'pre-wrap', ...styleMap[block.type], '&:empty::before': { content: 'attr(data-placeholder)', color: '#475569', pointerEvents: 'none' } }} />
        </Box>
      ) : block.type === 'image' ? (
        <Box sx={{ flex: 1, my: 1, textAlign: 'center' }}>
          {block.url ? (
            <Box sx={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}>
              <Box component="img" src={block.url} sx={{ maxWidth: '100%', borderRadius: 2, display: 'block', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Box ref={contentRef} contentEditable suppressContentEditableWarning onInput={handleInput}
                onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => onKeyDown(e, block, index)}
                onFocus={() => onFocus(block.id)} data-placeholder={placeholderMap[block.type]}
                sx={{ outline: 'none', mt: 1, fontSize: '0.75rem', fontWeight: 600, '&:empty::before': { content: 'attr(data-placeholder)', color: 'text.disabled' } }} />
            </Box>
          ) : (
            <Paper variant="outlined" sx={{ p: 4, borderRadius: 2, bgcolor: alpha('#6366f1', 0.02), borderStyle: 'dashed', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <PhotoCameraIcon sx={{ fontSize: 32, color: 'text.disabled' }} />
              <Typography variant="caption" color="text.secondary">{isKo ? '업로드 중...' : 'Uploading...'}</Typography>
            </Paper>
          )}
        </Box>
      ) : (
        <Box ref={contentRef} contentEditable suppressContentEditableWarning onInput={handleInput}
          onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => onKeyDown(e, block, index)}
          onFocus={() => onFocus(block.id)} data-placeholder={placeholderMap[block.type]}
          sx={{
            outline: 'none', flex: 1, minHeight: 24, py: 0.3, px: 0.5, borderRadius: 1,
            ...styleMap[block.type],
            textDecoration: block.type === 'checklist' && block.checked ? 'line-through' : 'none',
            color: block.type === 'checklist' && block.checked ? 'text.disabled' : 'inherit',
            ...emptyBeforeSx,
          }} />
      )}
    </Box>
  );
};

export default BlockRow;
