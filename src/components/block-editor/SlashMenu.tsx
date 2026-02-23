// src/components/block-editor/SlashMenu.tsx
import React, { useRef, useEffect, useMemo } from 'react';
import { Box, Paper, Typography, alpha, Fade } from '@mui/material';
import { SLASH_COMMANDS, type BlockType } from './blockEditorTypes';

interface SlashMenuProps {
  open: boolean;
  search: string;
  position: { top: number; left: number };
  selectedIndex: number;
  onSelect: (type: BlockType) => void;
  lang: string;
}

const SlashMenu: React.FC<SlashMenuProps> = ({ open, search, position, selectedIndex, onSelect, lang }) => {
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

export default SlashMenu;
