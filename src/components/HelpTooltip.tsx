import { useState } from 'react';
import { IconButton, Popover, Box, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

interface HelpTooltipProps {
  title: string;
  description: string;
  size?: 'small' | 'medium';
  placement?: 'left' | 'right' | 'bottom';
}

const HelpTooltip = ({ title, description, size = 'small', placement = 'right' }: HelpTooltipProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const anchorOrigin = placement === 'left'
    ? { vertical: 'center' as const, horizontal: 'left' as const }
    : placement === 'bottom'
      ? { vertical: 'bottom' as const, horizontal: 'center' as const }
      : { vertical: 'center' as const, horizontal: 'right' as const };

  const transformOrigin = placement === 'left'
    ? { vertical: 'center' as const, horizontal: 'right' as const }
    : placement === 'bottom'
      ? { vertical: 'top' as const, horizontal: 'center' as const }
      : { vertical: 'center' as const, horizontal: 'left' as const };

  return (
    <>
      <IconButton
        size={size}
        onClick={(e) => setAnchorEl(anchorEl ? null : e.currentTarget)}
        sx={{
          opacity: 0.45,
          transition: 'all 0.2s ease',
          '&:hover': { opacity: 1, bgcolor: 'primary.main', color: 'white', transform: 'scale(1.1)' },
          width: size === 'small' ? 24 : 32,
          height: size === 'small' ? 24 : 32,
        }}
      >
        <InfoOutlinedIcon sx={{ fontSize: size === 'small' ? 16 : 20 }} />
      </IconButton>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={anchorOrigin}
        transformOrigin={transformOrigin}
        slotProps={{
          paper: {
            sx: {
              maxWidth: 280,
              borderRadius: 3,
              p: 2,
              background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.05) 100%)',
              backdropFilter: 'blur(20px)',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              animation: 'fadeSlideIn 0.2s ease',
              '@keyframes fadeSlideIn': {
                from: { opacity: 0, transform: 'translateY(4px)' },
                to: { opacity: 1, transform: 'translateY(0)' },
              },
            },
          },
        }}
      >
        <Box>
          <Typography
            variant="subtitle2"
            fontWeight={700}
            sx={{
              mb: 0.5,
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              color: 'primary.main',
              fontSize: '0.8rem',
            }}
          >
            💡 {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, fontSize: '0.78rem' }}>
            {description}
          </Typography>
        </Box>
      </Popover>
    </>
  );
};

export default HelpTooltip;
