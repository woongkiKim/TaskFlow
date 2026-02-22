// src/components/BlockEditor.tsx
// Notion-style block editor with slash commands
import { useState, useRef, useCallback, useEffect, type KeyboardEvent, useMemo } from 'react';
import { Box, Paper, Typography, alpha, Fade } from '@mui/material';
import TitleIcon from '@mui/icons-material/Title';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import CheckBoxOutlinedIcon from '@mui/icons-material/CheckBoxOutlined';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import CodeIcon from '@mui/icons-material/Code';
import HorizontalRuleIcon from '@mui/icons-material/HorizontalRule';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import AddIcon from '@mui/icons-material/Add';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import { useLanguage } from '../contexts/LanguageContext';
import { uploadImage } from '../services/fileService';

// ─── Block Types ─────────────────────────────────────
export type BlockType =
  | 'text'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'bullet-list'
  | 'numbered-list'
  | 'checklist'
  | 'quote'
  | 'code'
  | 'divider'
  | 'callout'
  | 'image';

export interface Block {
  id: string;
  type: BlockType;
  content: string;
  checked?: boolean; // for checklist
  language?: string; // for code blocks
  url?: string; // for images
}

// ─── Slash Command Definitions ──────────────────────
interface SlashCommand {
  id: BlockType;
  label: string;
  labelKo: string;
  description: string;
  descriptionKo: string;
  icon: React.ReactNode;
  keywords: string[];
}

const SLASH_COMMANDS: SlashCommand[] = [
  {
    id: 'text', label: 'Text', labelKo: '텍스트',
    description: 'Plain text block', descriptionKo: '일반 텍스트',
    icon: <TextFieldsIcon sx={{ fontSize: 20 }} />,
    keywords: ['text', 'paragraph', '텍스트', '문단'],
  },
  {
    id: 'heading1', label: 'Heading 1', labelKo: '제목 1',
    description: 'Large section heading', descriptionKo: '큰 섹션 제목',
    icon: <TitleIcon sx={{ fontSize: 20 }} />,
    keywords: ['h1', 'heading', 'title', '제목', '큰제목'],
  },
  {
    id: 'heading2', label: 'Heading 2', labelKo: '제목 2',
    description: 'Medium section heading', descriptionKo: '중간 섹션 제목',
    icon: <TitleIcon sx={{ fontSize: 18 }} />,
    keywords: ['h2', 'heading', 'subtitle', '소제목'],
  },
  {
    id: 'heading3', label: 'Heading 3', labelKo: '제목 3',
    description: 'Small section heading', descriptionKo: '작은 섹션 제목',
    icon: <TitleIcon sx={{ fontSize: 16 }} />,
    keywords: ['h3', 'heading', '작은제목'],
  },
  {
    id: 'bullet-list', label: 'Bullet List', labelKo: '글머리 기호',
    description: 'Unordered list', descriptionKo: '순서 없는 목록',
    icon: <FormatListBulletedIcon sx={{ fontSize: 20 }} />,
    keywords: ['bullet', 'list', 'ul', '목록', '글머리'],
  },
  {
    id: 'numbered-list', label: 'Numbered List', labelKo: '번호 목록',
    description: 'Ordered list', descriptionKo: '순서 있는 목록',
    icon: <FormatListNumberedIcon sx={{ fontSize: 20 }} />,
    keywords: ['number', 'list', 'ol', 'ordered', '번호', '순서'],
  },
  {
    id: 'checklist', label: 'Checklist', labelKo: '체크리스트',
    description: 'To-do checklist', descriptionKo: '할 일 체크리스트',
    icon: <CheckBoxOutlinedIcon sx={{ fontSize: 20 }} />,
    keywords: ['check', 'todo', 'checkbox', '체크', '할일'],
  },
  {
    id: 'quote', label: 'Quote', labelKo: '인용',
    description: 'Quote or callout', descriptionKo: '인용문',
    icon: <FormatQuoteIcon sx={{ fontSize: 20 }} />,
    keywords: ['quote', 'blockquote', '인용', '인용문'],
  },
  {
    id: 'callout', label: 'Callout', labelKo: '콜아웃',
    description: 'Highlighted callout box', descriptionKo: '강조 박스',
    icon: <LightbulbOutlinedIcon sx={{ fontSize: 20 }} />,
    keywords: ['callout', 'alert', 'info', '콜아웃', '알림', '강조'],
  },
  {
    id: 'image', label: 'Image', labelKo: '이미지',
    description: 'Upload or embed image', descriptionKo: '이미지 업로드 또는 삽입',
    icon: <ImageOutlinedIcon sx={{ fontSize: 20 }} />,
    keywords: ['image', 'picture', 'upload', '이미지', '사진', '업로드'],
  },
  {
    id: 'code', label: 'Code', labelKo: '코드',
    description: 'Code block', descriptionKo: '코드 블록',
    icon: <CodeIcon sx={{ fontSize: 20 }} />,
    keywords: ['code', 'snippet', '코드'],
  },
  {
    id: 'divider', label: 'Divider', labelKo: '구분선',
    description: 'Horizontal divider', descriptionKo: '수평 구분선',
    icon: <HorizontalRuleIcon sx={{ fontSize: 20 }} />,
    keywords: ['divider', 'line', 'hr', '구분선', '줄'],
  },
];

// ─── Utility Functions ──────────────────────────────
const genId = () => `block_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const createBlock = (type: BlockType = 'text', content = ''): Block => ({
  id: genId(),
  type,
  content,
  checked: type === 'checklist' ? false : undefined,
});

// ─── Markdown ↔ Blocks Conversion ──────────────────
export const markdownToBlocks = (md: string): Block[] => {
  if (!md.trim()) return [createBlock('text', '')];

  const lines = md.split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block (```)
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({ ...createBlock('code', codeLines.join('\n')), language: lang || undefined });
      i++; // skip closing ```
      continue;
    }

    // Divider
    if (/^---+$/.test(line.trim())) {
      blocks.push(createBlock('divider', ''));
      i++;
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      blocks.push(createBlock('heading3', line.slice(4)));
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      blocks.push(createBlock('heading2', line.slice(3)));
      i++;
      continue;
    }
    if (line.startsWith('# ')) {
      blocks.push(createBlock('heading1', line.slice(2)));
      i++;
      continue;
    }

    // Checklist
    if (/^- \[[ x]\] /.test(line)) {
      const checked = line.startsWith('- [x]');
      const text = line.replace(/^- \[[ x]\] /, '');
      blocks.push({ ...createBlock('checklist', text), checked });
      i++;
      continue;
    }

    // Bullet list
    if (line.startsWith('- ')) {
      blocks.push(createBlock('bullet-list', line.slice(2)));
      i++;
      continue;
    }

    // Numbered list
    if (/^\d+\. /.test(line)) {
      blocks.push(createBlock('numbered-list', line.replace(/^\d+\. /, '')));
      i++;
      continue;
    }

    // Quote
    if (line.startsWith('> ')) {
      blocks.push(createBlock('quote', line.slice(2)));
      i++;
      continue;
    }

    // Callout (> 💡 or similar emoji patterns)
    if (/^> /.test(line) && /[\u{1F4A1}\u{26A0}\u{2139}\u{1F525}\u{2705}\u{274C}\u{1F4CC}]/u.test(line)) {
      blocks.push(createBlock('callout', line.slice(2)));
      i++;
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Image (![alt](url))
    if (line.startsWith('![') && line.includes('](')) {
      const alt = line.slice(2, line.indexOf(']'));
      const url = line.slice(line.indexOf('](') + 2, line.lastIndexOf(')'));
      blocks.push({ ...createBlock('image', alt), url });
      i++;
      continue;
    }

    // Default: text
    blocks.push(createBlock('text', line));
    i++;
  }

  return blocks.length > 0 ? blocks : [createBlock('text', '')];
};

export const blocksToMarkdown = (blocks: Block[]): string => {
  return blocks
    .map((block, idx) => {
      switch (block.type) {
        case 'heading1': return `# ${block.content}`;
        case 'heading2': return `## ${block.content}`;
        case 'heading3': return `### ${block.content}`;
        case 'bullet-list': return `- ${block.content}`;
        case 'numbered-list': {
          // find sequential numbered-list blocks before this one
          let num = 1;
          for (let j = idx - 1; j >= 0; j--) {
            if (blocks[j].type === 'numbered-list') num++;
            else break;
          }
          return `${num}. ${block.content}`;
        }
        case 'checklist':
          return `- [${block.checked ? 'x' : ' '}] ${block.content}`;
        case 'quote': return `> ${block.content}`;
        case 'callout': return `> ${block.content}`;
        case 'code': return `\`\`\`${block.language || ''}\n${block.content}\n\`\`\``;
        case 'divider': return '---';
        case 'image': return `![${block.content}](${block.url || ''})`;
        default: return block.content;
      }
    })
    .join('\n');
};

// ─── Slash Menu Component ───────────────────────────
interface SlashMenuProps {
  open: boolean;
  search: string;
  position: { top: number; left: number };
  selectedIndex: number;
  onSelect: (type: BlockType) => void;
  lang: string;
}

const SlashMenu = ({ open, search, position, selectedIndex, onSelect, lang }: SlashMenuProps) => {
  const isKo = lang === 'ko';
  const menuRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!search) return SLASH_COMMANDS;
    const q = search.toLowerCase();
    return SLASH_COMMANDS.filter(cmd =>
      cmd.label.toLowerCase().includes(q) ||
      cmd.labelKo.includes(q) ||
      cmd.keywords.some(k => k.includes(q))
    );
  }, [search]);

  // Scroll to active item
  useEffect(() => {
    if (!menuRef.current) return;
    const activeEl = menuRef.current.querySelector(`[data-index="${selectedIndex}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!open || filtered.length === 0) return null;

  return (
    <Fade in={open}>
      <Paper
        ref={menuRef}
        elevation={8}
        sx={{
          position: 'fixed',
          top: position.top,
          left: position.left,
          width: 280,
          maxHeight: 340,
          overflow: 'auto',
          borderRadius: 2.5,
          border: '1px solid',
          borderColor: 'divider',
          py: 0.8,
          zIndex: 9999,
          backdropFilter: 'blur(20px)',
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-thumb': { bgcolor: 'action.disabled', borderRadius: 2 },
        }}
      >
        <Typography
          variant="caption"
          sx={{ px: 1.5, py: 0.5, display: 'block', color: 'text.disabled', fontWeight: 700, letterSpacing: 0.5, fontSize: '0.65rem' }}
        >
          {isKo ? '블록 유형' : 'BLOCK TYPE'}
        </Typography>
        {filtered.map((cmd, idx) => (
          <Box
            key={cmd.id}
            data-index={idx}
            onClick={() => onSelect(cmd.id)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              px: 1.5,
              py: 0.8,
              cursor: 'pointer',
              borderRadius: 1.5,
              mx: 0.5,
              bgcolor: idx === selectedIndex ? alpha('#6366f1', 0.1) : 'transparent',
              transition: 'background 0.1s',
              '&:hover': { bgcolor: alpha('#6366f1', 0.08) },
            }}
          >
            <Box
              sx={{
                width: 36, height: 36, borderRadius: 1.5,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                bgcolor: 'action.hover',
                color: idx === selectedIndex ? 'primary.main' : 'text.secondary',
                border: '1px solid',
                borderColor: idx === selectedIndex ? alpha('#6366f1', 0.3) : 'transparent',
              }}
            >
              {cmd.icon}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" fontWeight={600} fontSize="0.82rem">
                {isKo ? cmd.labelKo : cmd.label}
              </Typography>
              <Typography variant="caption" color="text.disabled" fontSize="0.68rem">
                {isKo ? cmd.descriptionKo : cmd.description}
              </Typography>
            </Box>
          </Box>
        ))}
      </Paper>
    </Fade>
  );
};

// ─── Single Block Row Component ─────────────────────
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

const BlockRow = ({
  block, index,
  onContentChange, onKeyDown, onFocus, onCheckToggle,
  onDragStart, onDragOver, onDragEnd, onAddBlockBelow,
  blockRef, lang,
}: BlockRowProps) => {
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
            cursor: 'pointer',
            color: 'text.disabled',
            display: 'flex',
            alignItems: 'center',
            borderRadius: 1,
            '&:hover': { color: 'primary.main', bgcolor: alpha('#6366f1', 0.08) },
            p: 0.2,
          }}
        >
          <AddIcon sx={{ fontSize: 16 }} />
        </Box>
        <Box
          draggable
          onDragStart={() => onDragStart(index)}
          onDragEnd={onDragEnd}
          sx={{
            cursor: 'grab',
            color: 'text.disabled',
            display: 'flex',
            alignItems: 'center',
            borderRadius: 1,
            '&:hover': { color: 'text.secondary', bgcolor: alpha('#000', 0.04) },
            p: 0.2,
            '&:active': { cursor: 'grabbing' },
          }}
        >
          <DragIndicatorIcon sx={{ fontSize: 16 }} />
        </Box>
      </Box>

      {/* List markers */}
      {block.type === 'bullet-list' && (
        <Box sx={{
          minWidth: 20, textAlign: 'center', pt: 0.8,
          color: 'text.secondary', fontSize: '0.9rem', fontWeight: 900,
          userSelect: 'none',
        }}>
          •
        </Box>
      )}
      {block.type === 'numbered-list' && (
        <Box sx={{
          minWidth: 24, textAlign: 'right', pr: 0.5, pt: 0.35,
          color: 'text.secondary', fontSize: '0.85rem', fontWeight: 600,
          userSelect: 'none',
        }}>
          {`${index + 1}.`}
        </Box>
      )}
      {block.type === 'checklist' && (
        <Box
          onClick={() => onCheckToggle(block.id)}
          sx={{
            minWidth: 24, pt: 0.45, cursor: 'pointer',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          }}
        >
          <Box
            sx={{
              width: 18, height: 18, borderRadius: 0.8,
              border: '2px solid',
              borderColor: block.checked ? 'primary.main' : 'action.disabled',
              bgcolor: block.checked ? 'primary.main' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
              '&:hover': { borderColor: 'primary.main' },
            }}
          >
            {block.checked && (
              <svg width="12" height="12" viewBox="0 0 12 12">
                <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </Box>
        </Box>
      )}

      {/* Wrapper for quote/callout */}
      {block.type === 'quote' ? (
        <Box sx={{
          flex: 1, borderLeft: '3px solid', borderColor: 'primary.main',
          pl: 1.5, py: 0.3, my: 0.3, borderRadius: '0 4px 4px 0',
        }}>
          <Box
            ref={contentRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => onKeyDown(e, block, index)}
            onFocus={() => onFocus(block.id)}
            data-placeholder={placeholderMap[block.type]}
            sx={{
              outline: 'none',
              minHeight: 24,
              ...styleMap[block.type],
              '&:empty::before': {
                content: 'attr(data-placeholder)',
                color: 'text.disabled',
                pointerEvents: 'none',
              },
            }}
          />
        </Box>
      ) : block.type === 'callout' ? (
        <Box sx={{
          flex: 1, bgcolor: alpha('#6366f1', 0.06),
          borderRadius: 2, px: 1.5, py: 1, my: 0.3,
          border: '1px solid', borderColor: alpha('#6366f1', 0.12),
          display: 'flex', alignItems: 'flex-start', gap: 1,
        }}>
          <Typography fontSize="1.1rem" lineHeight={1} sx={{ mt: 0.3, userSelect: 'none' }}>💡</Typography>
          <Box
            ref={contentRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => onKeyDown(e, block, index)}
            onFocus={() => onFocus(block.id)}
            data-placeholder={placeholderMap[block.type]}
            sx={{
              outline: 'none',
              flex: 1,
              minHeight: 24,
              ...styleMap[block.type],
              '&:empty::before': {
                content: 'attr(data-placeholder)',
                color: 'text.disabled',
                pointerEvents: 'none',
              },
            }}
          />
        </Box>
      ) : block.type === 'code' ? (
        <Box sx={{
          flex: 1, bgcolor: '#1e293b', borderRadius: 2, px: 2, py: 1.5, my: 0.3,
          overflow: 'auto',
        }}>
          <Box
            ref={contentRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => onKeyDown(e, block, index)}
            onFocus={() => onFocus(block.id)}
            data-placeholder={placeholderMap[block.type]}
            sx={{
              outline: 'none',
              minHeight: 24,
              color: '#e2e8f0',
              whiteSpace: 'pre-wrap',
              ...styleMap[block.type],
              '&:empty::before': {
                content: 'attr(data-placeholder)',
                color: '#475569',
                pointerEvents: 'none',
              },
            }}
          />
        </Box>
      ) : block.type === 'image' ? (
        <Box sx={{ flex: 1, my: 1, textAlign: 'center' }}>
          {block.url ? (
            <Box sx={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}>
              <Box component="img" src={block.url} sx={{ maxWidth: '100%', borderRadius: 2, display: 'block', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Box
                ref={contentRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleInput}
                onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => onKeyDown(e, block, index)}
                onFocus={() => onFocus(block.id)}
                data-placeholder={placeholderMap[block.type]}
                sx={{
                  outline: 'none', mt: 1, fontSize: '0.75rem', fontWeight: 600,
                  '&:empty::before': { content: 'attr(data-placeholder)', color: 'text.disabled' },
                }}
              />
            </Box>
          ) : (
            <Paper variant="outlined" sx={{ p: 4, borderRadius: 2, bgcolor: alpha('#6366f1', 0.02), borderStyle: 'dashed', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <PhotoCameraIcon sx={{ fontSize: 32, color: 'text.disabled' }} />
              <Typography variant="caption" color="text.secondary">{isKo ? '업로드 중...' : 'Uploading...'}</Typography>
            </Paper>
          )}
        </Box>
      ) : (
        <Box
          ref={contentRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => onKeyDown(e, block, index)}
          onFocus={() => onFocus(block.id)}
          data-placeholder={placeholderMap[block.type]}
          sx={{
            outline: 'none',
            flex: 1,
            minHeight: 24,
            py: 0.3,
            px: 0.5,
            borderRadius: 1,
            ...styleMap[block.type],
            textDecoration: block.type === 'checklist' && block.checked ? 'line-through' : 'none',
            color: block.type === 'checklist' && block.checked ? 'text.disabled' : 'inherit',
            '&:empty::before': {
              content: 'attr(data-placeholder)',
              color: 'text.disabled',
              pointerEvents: 'none',
            },
          }}
        />
      )}
    </Box>
  );
};

// ─── Main BlockEditor Component ─────────────────────
interface BlockEditorProps {
  initialContent: string;  // markdown
  onChange: (markdown: string) => void;
  minHeight?: number;
}

const BlockEditor = ({ initialContent, onChange, minHeight = 300 }: BlockEditorProps) => {
  const { lang } = useLanguage();
  const isKo = lang === 'ko';

  const [blocks, setBlocks] = useState<Block[]>(() => markdownToBlocks(initialContent));
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [slashMenu, setSlashMenu] = useState<{
    open: boolean;
    blockId: string;
    search: string;
    position: { top: number; left: number };
    selectedIndex: number;
  }>({ open: false, blockId: '', search: '', position: { top: 0, left: 0 }, selectedIndex: 0 });
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const blockRefs = useRef<Map<string, HTMLElement | null>>(new Map());

  // Sync blocks → markdown
  useEffect(() => {
    const md = blocksToMarkdown(blocks);
    onChange(md);
  }, [blocks, onChange]);

  // Focus a specific block
  const focusBlock = useCallback((blockId: string, atEnd = true) => {
    requestAnimationFrame(() => {
      const el = blockRefs.current.get(blockId);
      if (!el) return;
      el.focus();
      if (atEnd && el.textContent) {
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(el);
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    });
  }, []);

  // ─── Block Operations ────────────────────────────
  const updateBlockContent = useCallback((id: string, content: string) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, content } : b));
  }, []);

  const updateBlockType = useCallback((id: string, type: BlockType) => {
    setBlocks(prev => prev.map(b => b.id === id ? {
      ...b, type,
      checked: type === 'checklist' ? false : undefined,
      url: type === 'image' ? b.url || '' : undefined,
    } : b));
  }, []);

  const insertBlockAfter = useCallback((afterIndex: number, type: BlockType = 'text', content = '') => {
    const newBlock = createBlock(type, content);
    setBlocks(prev => {
      const next = [...prev];
      next.splice(afterIndex + 1, 0, newBlock);
      return next;
    });
    // Focus new block
    requestAnimationFrame(() => focusBlock(newBlock.id, false));
    return newBlock.id;
  }, [focusBlock]);

  const deleteBlock = useCallback((id: string) => {
    setBlocks(prev => {
      if (prev.length <= 1) return prev; // keep at least one block
      return prev.filter(b => b.id !== id);
    });
  }, []);

  const toggleCheck = useCallback((id: string) => {
    setBlocks(prev => prev.map(b =>
      b.id === id ? { ...b, checked: !b.checked } : b
    ));
  }, []);

  // ─── Slash Menu ──────────────────────────────────
  // openSlashMenu is available for programmatic slash menu opening
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const openSlashMenu = useCallback((blockId: string) => {
    const el = blockRefs.current.get(blockId);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setSlashMenu({
      open: true,
      blockId,
      search: '',
      position: { top: rect.bottom + 4, left: rect.left },
      selectedIndex: 0,
    });
  }, []);

  const closeSlashMenu = useCallback(() => {
    setSlashMenu(prev => ({ ...prev, open: false }));
  }, []);

  const selectSlashCommand = useCallback(async (type: BlockType) => {
    const { blockId } = slashMenu;
    const block = blocks.find(b => b.id === blockId);
    if (block) {
      const newContent = block.content.replace(/\/\S*$/, '').replace(/\/$/, '').trim();
      
      if (type === 'image') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            updateBlockContent(blockId, newContent);
            updateBlockType(blockId, type);
            try {
              const url = await uploadImage(file);
              setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, url } : b));
            } catch (err) {
              console.error('Image upload failed', err);
            }
          }
        };
        input.click();
      } else if (type === 'divider') {
        updateBlockContent(blockId, newContent);
        updateBlockType(blockId, type);
        const idx = blocks.findIndex(b => b.id === blockId);
        insertBlockAfter(idx);
      } else {
        updateBlockContent(blockId, newContent);
        updateBlockType(blockId, type);
        requestAnimationFrame(() => focusBlock(blockId, true));
      }
    }
    closeSlashMenu();
  }, [slashMenu, blocks, updateBlockContent, updateBlockType, insertBlockAfter, closeSlashMenu, focusBlock]);

  // ─── Key Handling ────────────────────────────────
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLElement>, block: Block, index: number) => {
    // Slash menu navigation
    if (slashMenu.open) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const filtered = SLASH_COMMANDS.filter(cmd => {
          if (!slashMenu.search) return true;
          const q = slashMenu.search.toLowerCase();
          return cmd.label.toLowerCase().includes(q) ||
            cmd.labelKo.includes(q) ||
            cmd.keywords.some(k => k.includes(q));
        });
        setSlashMenu(prev => ({
          ...prev,
          selectedIndex: Math.min(prev.selectedIndex + 1, filtered.length - 1),
        }));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashMenu(prev => ({
          ...prev,
          selectedIndex: Math.max(prev.selectedIndex - 1, 0),
        }));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const filtered = SLASH_COMMANDS.filter(cmd => {
          if (!slashMenu.search) return true;
          const q = slashMenu.search.toLowerCase();
          return cmd.label.toLowerCase().includes(q) ||
            cmd.labelKo.includes(q) ||
            cmd.keywords.some(k => k.includes(q));
        });
        if (filtered[slashMenu.selectedIndex]) {
          selectSlashCommand(filtered[slashMenu.selectedIndex].id);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        closeSlashMenu();
        return;
      }
    }

    // Enter → new block
    if (e.key === 'Enter' && !e.shiftKey) {
      if (block.type === 'code') return; // allow multiline in code blocks

      e.preventDefault();

      // Get cursor position to handle splitting text
      const sel = window.getSelection();
      const el = blockRefs.current.get(block.id);
      let textAfterCursor = '';
      let textBeforeCursor = block.content;

      if (sel && el && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const preRange = document.createRange();
        preRange.selectNodeContents(el);
        preRange.setEnd(range.startContainer, range.startOffset);
        textBeforeCursor = preRange.toString();
        textAfterCursor = block.content.slice(textBeforeCursor.length);
      }

      // Update current block with text before cursor
      updateBlockContent(block.id, textBeforeCursor);

      // Determine new block type (continue lists)
      const continueTypes: BlockType[] = ['bullet-list', 'numbered-list', 'checklist'];
      let newType: BlockType = 'text';
      if (continueTypes.includes(block.type)) {
        if (textBeforeCursor.trim() === '') {
          // Empty list item → convert to text
          updateBlockType(block.id, 'text');
          return;
        }
        newType = block.type;
      }

      insertBlockAfter(index, newType, textAfterCursor);
    }

    // Backspace at beginning → merge with previous or change type
    if (e.key === 'Backspace') {
      const sel = window.getSelection();
      const el = blockRefs.current.get(block.id);
      if (!sel || !el) return;

      const range = sel.getRangeAt(0);
      const isAtStart = range.startOffset === 0 && range.collapsed;

      if (isAtStart) {
        // If block has special type, convert to text first
        if (block.type !== 'text') {
          e.preventDefault();
          updateBlockType(block.id, 'text');
          return;
        }

        // Merge with previous block
        if (index > 0) {
          e.preventDefault();
          const prevBlock = blocks[index - 1];
          if (prevBlock.type === 'divider') {
            deleteBlock(prevBlock.id);
            return;
          }
          const prevLen = prevBlock.content.length;
          updateBlockContent(prevBlock.id, prevBlock.content + block.content);
          deleteBlock(block.id);
          // Focus previous block at merge point
          requestAnimationFrame(() => {
            const prevEl = blockRefs.current.get(prevBlock.id);
            if (prevEl) {
              prevEl.focus();
              // Set cursor at merge point
              const textNode = prevEl.firstChild;
              if (textNode) {
                const r = document.createRange();
                r.setStart(textNode, prevLen);
                r.collapse(true);
                const s = window.getSelection();
                s?.removeAllRanges();
                s?.addRange(r);
              }
            }
          });
        }
      }
    }

    // Arrow Up at beginning → focus previous block
    if (e.key === 'ArrowUp') {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        if (range.startOffset === 0 && range.collapsed && index > 0) {
          e.preventDefault();
          focusBlock(blocks[index - 1].id, true);
        }
      }
    }

    // Arrow Down at end → focus next block
    if (e.key === 'ArrowDown') {
      const sel = window.getSelection();
      const el = blockRefs.current.get(block.id);
      if (sel && el && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const isAtEnd = range.startOffset === (el.textContent?.length || 0) && range.collapsed;
        if (isAtEnd && index < blocks.length - 1) {
          e.preventDefault();
          focusBlock(blocks[index + 1].id, false);
        }
      }
    }

    // Tab → indent (convert text to list)
    if (e.key === 'Tab') {
      e.preventDefault();
      if (block.type === 'text') {
        updateBlockType(block.id, 'bullet-list');
      }
    }

    // Detect '/' for slash menu
    // We handle this in a setTimeout so the character is already typed
  }, [slashMenu, blocks, updateBlockContent, updateBlockType, deleteBlock, insertBlockAfter,
      closeSlashMenu, selectSlashCommand, focusBlock]);

  // Track content changes for slash menu
  const handleContentChange = useCallback((id: string, content: string) => {
    updateBlockContent(id, content);

    // Check for '/' at the end for slash menu
    const slashMatch = content.match(/\/(\S*)$/);
    if (slashMatch) {
      const search = slashMatch[1] || '';
      const el = blockRefs.current.get(id);
      if (el) {
        const rect = el.getBoundingClientRect();
        // Try to position near the cursor
        const sel = window.getSelection();
        let left = rect.left;
        if (sel && sel.rangeCount > 0) {
          const r = sel.getRangeAt(0).getBoundingClientRect();
          if (r.left > 0) left = r.left;
        }
        setSlashMenu({
          open: true,
          blockId: id,
          search,
          position: { top: rect.bottom + 4, left: Math.max(left - 20, rect.left) },
          selectedIndex: 0,
        });
      }
    } else if (slashMenu.open && slashMenu.blockId === id) {
      closeSlashMenu();
    }
  }, [updateBlockContent, slashMenu, closeSlashMenu]);

  // ─── Drag & Drop ─────────────────────────────────
  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    setBlocks(prev => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(index, 0, moved);
      return next;
    });
    setDragIndex(index);
  }, [dragIndex]);

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
  }, []);

  const handleAddBlockBelow = useCallback((index: number) => {
    insertBlockAfter(index, 'text', '');
  }, [insertBlockAfter]);

  // Close slash menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (slashMenu.open) {
        const target = e.target as HTMLElement;
        if (!target.closest('[data-slash-menu]')) {
          closeSlashMenu();
        }
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [slashMenu.open, closeSlashMenu]);

  return (
    <Box
      sx={{
        minHeight,
        py: 1,
        position: 'relative',
        '& [contenteditable]': {
          caretColor: '#6366f1',
        },
      }}
    >
      {/* Hint for slash commands */}
      {blocks.length === 1 && !blocks[0].content && (
        <Box sx={{
          position: 'absolute', bottom: 8, right: 12,
          display: 'flex', alignItems: 'center', gap: 0.8,
          color: 'text.disabled', fontSize: '0.72rem',
          pointerEvents: 'none',
        }}>
          <Box sx={{
            px: 0.8, py: 0.2, bgcolor: 'action.hover', borderRadius: 1,
            fontFamily: 'monospace', fontWeight: 700, fontSize: '0.7rem',
          }}>
            /
          </Box>
          <span>{isKo ? '를 눌러 블록 유형을 선택하세요' : 'to browse block types'}</span>
        </Box>
      )}

      {/* Blocks */}
      {blocks.map((block, idx) => (
        <BlockRow
          key={block.id}
          block={block}
          index={idx}
          isActive={activeBlockId === block.id}
          onContentChange={handleContentChange}
          onTypeChange={updateBlockType}
          onKeyDown={handleKeyDown}
          onFocus={setActiveBlockId}
          onCheckToggle={toggleCheck}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onAddBlockBelow={handleAddBlockBelow}
          blockRef={(el) => { blockRefs.current.set(block.id, el); }}
          lang={lang}
        />
      ))}

      {/* Slash Menu */}
      <Box data-slash-menu>
        <SlashMenu
          open={slashMenu.open}
          search={slashMenu.search}
          position={slashMenu.position}
          selectedIndex={slashMenu.selectedIndex}
          onSelect={selectSlashCommand}
          lang={lang}
        />
      </Box>
    </Box>
  );
};

export default BlockEditor;
