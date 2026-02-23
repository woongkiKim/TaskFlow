// src/components/block-editor/BlockRow.tsx
import React, { useRef, useEffect, type KeyboardEvent } from 'react';
import { Box, Paper, Typography, alpha } from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import AddIcon from '@mui/icons-material/Add';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import type { Block, BlockType } from './blockEditorTypes';

interface BlockRowProps {
  block: Block;
  index: number;
  isActive: boolean;
  onContentChange: (id: string, content: string) => void;
  onTypeChange: (id: string, type: BlockType) => void;
  onKeyDown: (e: KeyboardEvent<HTMLElement>, block: Block, index: number) => void;
  onFocus: (id: string) => void;
  onCheckToggle: (id: string) => void;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  onAddBlockBelow: (index: number) => void;
  blockRef: (el: HTMLElement | null) => void;
  lang: string;
}

const BlockRow: React.FC<BlockRowProps> = ({
  block, index,
  onContentChange, onKeyDown, onFocus, onCheckToggle,
  onDragStart, onDragOver, onDragEnd, onAddBlockBelow,
  blockRef, lang,
}) => {
  const isKo = lang === 'ko';
  const contentRef = useRef<HTMLDivElement>(null);

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
      onContentChange(block.id, contentRef.current.textContent || '');
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
      ) : block.type === 'callout' ? (
        <Box sx={{ flex: 1, bgcolor: alpha('#6366f1', 0.06), borderRadius: 2, px: 1.5, py: 1, my: 0.3, border: '1px solid', borderColor: alpha('#6366f1', 0.12), display: 'flex', alignItems: 'flex-start', gap: 1 }}>
          <Typography fontSize="1.1rem" lineHeight={1} sx={{ mt: 0.3, userSelect: 'none' }}>💡</Typography>
          <Box ref={contentRef} contentEditable suppressContentEditableWarning onInput={handleInput}
            onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => onKeyDown(e, block, index)}
            onFocus={() => onFocus(block.id)} data-placeholder={placeholderMap[block.type]}
            sx={{ outline: 'none', flex: 1, minHeight: 24, ...styleMap[block.type], ...emptyBeforeSx }} />
        </Box>
      ) : block.type === 'code' ? (
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
