import { useState } from 'react';
import { IconButton, Popover, Box, Typography, Button, Divider } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

interface HelpTooltipProps {
  title: string;
  description: string;
  /** Optional numbered step-by-step guide shown below the description */
  steps?: string[];
  /** Optional external URL to open in a new tab */
  link?: string;
  /** Label for the link button. Defaults to 'Learn more' */
  linkLabel?: string;
  size?: 'small' | 'medium';
  placement?: 'left' | 'right' | 'bottom';
}

const HelpTooltip = ({
  title,
  description,
  steps,
  link,
  linkLabel = 'Learn more',
  size = 'small',
  placement = 'right',
}: HelpTooltipProps) => {
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
              maxWidth: 320,
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
          {/* Title */}
          <Typography
            variant="subtitle2"
            fontWeight={700}
            sx={{
              mb: 0.75,
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              color: 'primary.main',
              fontSize: '0.8rem',
            }}
          >
            💡 {title}
          </Typography>

          {/* Description */}
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65, fontSize: '0.78rem' }}>
            {description}
          </Typography>

          {/* Step-by-step guide */}
          {steps && steps.length > 0 && (
            <>
              <Divider sx={{ my: 1.25 }} />
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 0.75, display: 'block', letterSpacing: 0.3 }}>
                📋 단계별 가이드
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6 }}>
                {steps.map((step, i) => (
                  <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                    <Box sx={{
                      minWidth: 20, height: 20, borderRadius: '50%',
                      bgcolor: 'primary.main', color: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.65rem', fontWeight: 800, flexShrink: 0, mt: 0.1,
                    }}>
                      {i + 1}
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.55, fontSize: '0.75rem' }}>
                      {step}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </>
          )}

          {/* External link */}
          {link && (
            <Button
              size="small"
              variant="outlined"
              endIcon={<OpenInNewIcon sx={{ fontSize: '13px !important' }} />}
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                mt: 1.5,
                borderRadius: 2,
                fontSize: '0.72rem',
                fontWeight: 700,
                textTransform: 'none',
                py: 0.5,
                px: 1.5,
                width: '100%',
                justifyContent: 'center',
              }}
            >
              {linkLabel}
            </Button>
          )}
        </Box>
      </Popover>
    </>
  );
};

export default HelpTooltip;
