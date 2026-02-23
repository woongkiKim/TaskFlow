// src/components/BlockEditor.tsx
// Notion-style block editor with slash commands
import { useState, useRef, useCallback, useEffect, type KeyboardEvent } from 'react';
import { Box, alpha } from '@mui/material';
import { useLanguage } from '../contexts/LanguageContext';
import { uploadImage } from '../services/fileService';

// Re-export types for external consumers
export type { BlockType, Block } from './block-editor/blockEditorTypes';
export { markdownToBlocks, blocksToMarkdown } from './block-editor/blockEditorUtils';

import { SLASH_COMMANDS, type Block, type BlockType } from './block-editor/blockEditorTypes';
import { createBlock, markdownToBlocks, blocksToMarkdown } from './block-editor/blockEditorUtils';
import SlashMenu from './block-editor/SlashMenu';
import BlockRow from './block-editor/BlockRow';

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
