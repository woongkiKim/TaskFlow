import { useEffect, useState, useRef, useCallback } from 'react';
import { Box, Typography, Button, IconButton, LinearProgress } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import type { TourStep } from '../hooks/useOnboarding';

interface OnboardingTourProps {
  steps: TourStep[];
  isActive: boolean;
  currentStep: number;
  lang?: 'ko' | 'en';
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onComplete: () => void;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const CARD_WIDTH = 400;
const CARD_GAP = 16;

const OnboardingTour = ({
  steps,
  isActive,
  currentStep,
  lang = 'en',
  onNext,
  onPrev,
  onSkip,
  onComplete,
}: OnboardingTourProps) => {
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  const updateTargetRect = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(step.targetSelector);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    } else {
      setTargetRect(null);
    }
  }, [step]);

  useEffect(() => {
    if (!isActive) return;
    const rafId = requestAnimationFrame(() => setIsAnimating(true));
    const timer = setTimeout(() => {
      updateTargetRect();
      setIsAnimating(false);
    }, 150);

    const handleResize = () => updateTargetRect();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [isActive, currentStep, updateTargetRect]);

  if (!isActive || !step) return null;

  const getCardPosition = () => {
    if (!targetRect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

    const placement = step.placement || 'right';
    const centerX = targetRect.left + targetRect.width / 2;
    const centerY = targetRect.top + targetRect.height / 2;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    switch (placement) {
      case 'right': {
        let left = targetRect.left + targetRect.width + CARD_GAP;
        let top = centerY;
        if (left + CARD_WIDTH > vw - 20) left = targetRect.left - CARD_WIDTH - CARD_GAP;
        if (top + 100 > vh) top = vh - 160;
        return { top: `${Math.max(20, top)}px`, left: `${Math.max(20, left)}px`, transform: 'translateY(-50%)' };
      }
      case 'left': {
        let left = targetRect.left - CARD_WIDTH - CARD_GAP;
        if (left < 20) left = targetRect.left + targetRect.width + CARD_GAP;
        return { top: `${Math.max(20, centerY)}px`, left: `${Math.max(20, left)}px`, transform: 'translateY(-50%)' };
      }
      case 'bottom': {
        let left = centerX - CARD_WIDTH / 2;
        if (left + CARD_WIDTH > vw - 20) left = vw - CARD_WIDTH - 20;
        if (left < 20) left = 20;
        return { top: `${targetRect.top + targetRect.height + CARD_GAP}px`, left: `${left}px` };
      }
      case 'top': {
        let left = centerX - CARD_WIDTH / 2;
        if (left + CARD_WIDTH > vw - 20) left = vw - CARD_WIDTH - 20;
        if (left < 20) left = 20;
        return { bottom: `${vh - targetRect.top + CARD_GAP}px`, left: `${left}px` };
      }
      default:
        return { top: `${centerY}px`, left: `${centerX}px` };
    }
  };

  const progress = ((currentStep + 1) / steps.length) * 100;
  const cardPos = getCardPosition();

  return (
    <>
      {/* Overlay backdrop with spotlight cutout */}
      <Box
        onClick={onSkip}
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: 9998,
          transition: 'all 0.3s ease',
          cursor: 'pointer',
          // Dark overlay with a transparent "hole" around the target
          ...(targetRect ? {
            background: `
              linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)) 0 0 / 100% ${targetRect.top - 8}px no-repeat,
              linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)) 0 ${targetRect.top + targetRect.height + 8}px / 100% calc(100% - ${targetRect.top + targetRect.height + 8}px) no-repeat,
              linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)) 0 ${targetRect.top - 8}px / ${targetRect.left - 8}px ${targetRect.height + 16}px no-repeat,
              linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)) ${targetRect.left + targetRect.width + 8}px ${targetRect.top - 8}px / calc(100% - ${targetRect.left + targetRect.width + 8}px) ${targetRect.height + 16}px no-repeat
            `,
          } : {
            bgcolor: 'rgba(0,0,0,0.55)',
          }),
        }}
      />

      {/* Spotlight ring around target */}
      {targetRect && (
        <Box
          sx={{
            position: 'fixed',
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            borderRadius: 3,
            border: '2px solid',
            borderColor: 'primary.main',
            boxShadow: '0 0 0 4px rgba(99,102,241,0.25), 0 0 24px rgba(99,102,241,0.15)',
            zIndex: 9999,
            pointerEvents: 'none',
            transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
            animation: 'spotlightPulse 2s ease-in-out infinite',
            '@keyframes spotlightPulse': {
              '0%, 100%': { boxShadow: '0 0 0 4px rgba(99,102,241,0.25), 0 0 24px rgba(99,102,241,0.15)' },
              '50%': { boxShadow: '0 0 0 6px rgba(99,102,241,0.35), 0 0 32px rgba(99,102,241,0.25)' },
            },
          }}
        />
      )}

      {/* Tour step card */}
      <Box
        ref={cardRef}
        onClick={(e) => e.stopPropagation()}
        sx={{
          position: 'fixed',
          ...cardPos,
          width: CARD_WIDTH,
          zIndex: 10000,
          borderRadius: 4,
          overflow: 'hidden',
          background: 'linear-gradient(145deg, #ffffff 0%, #f8f9ff 100%)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(99,102,241,0.15)',
          color: '#1a1a2e',
          opacity: isAnimating ? 0 : 1,
          transition: 'opacity 0.25s ease, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isAnimating
            ? (cardPos.transform || '') + ' scale(0.95)'
            : (cardPos.transform || '') + ' scale(1)',
        }}
      >
        {/* Progress bar */}
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 3,
            bgcolor: 'rgba(99,102,241,0.1)',
            '& .MuiLinearProgress-bar': {
              bgcolor: 'primary.main',
              transition: 'transform 0.4s ease',
            },
          }}
        />

        {/* Header with close button */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, pt: 2, pb: 0 }}>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              color: 'primary.main',
              bgcolor: 'rgba(99,102,241,0.08)',
              px: 1,
              py: 0.3,
              borderRadius: 1,
              fontSize: '0.65rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {currentStep + 1} / {steps.length}
          </Typography>
          <IconButton size="small" onClick={onSkip} sx={{ color: '#9ca3af', '&:hover': { color: '#6b7280' } }}>
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>

        {/* Content */}
        <Box sx={{ px: 2.5, py: 1.5, maxHeight: 320, overflowY: 'auto', '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: '#d1d5db', borderRadius: 2 } }}>
          <Typography
            variant="subtitle1"
            fontWeight={800}
            sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1, fontSize: '1.05rem', lineHeight: 1.3, color: '#1a1a2e' }}
          >
            {step.icon && <span style={{ fontSize: '1.2rem' }}>{step.icon}</span>}
            {step.title}
          </Typography>
          <Typography variant="body2" sx={{ lineHeight: 1.75, fontSize: '0.82rem', color: '#4b5563', whiteSpace: 'pre-line' }}>
            {step.description}
          </Typography>
        </Box>

        {/* Footer buttons */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2.5,
            pb: 2,
            pt: 0.5,
          }}
        >
          <Button
            size="small"
            onClick={onSkip}
            sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', textTransform: 'none' }}
          >
            {lang === 'ko' ? '건너뛰기' : 'Skip Tour'}
          </Button>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {currentStep > 0 && (
              <IconButton size="small" onClick={onPrev}
                sx={{
                  border: '1px solid', borderColor: 'divider',
                  width: 32, height: 32,
                }}>
                <ArrowBackIcon sx={{ fontSize: 16 }} />
              </IconButton>
            )}
            <Button
              size="small"
              variant="contained"
              onClick={isLastStep ? onComplete : onNext}
              endIcon={!isLastStep ? <ArrowForwardIcon sx={{ fontSize: 14 }} /> : undefined}
              sx={{
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'none',
                borderRadius: 2,
                px: 2,
                minHeight: 32,
                bgcolor: isLastStep ? 'success.main' : 'primary.main',
                boxShadow: isLastStep
                  ? '0 4px 14px rgba(16,185,129,0.35)'
                  : '0 4px 14px rgba(99,102,241,0.35)',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: isLastStep
                    ? '0 6px 20px rgba(16,185,129,0.4)'
                    : '0 6px 20px rgba(99,102,241,0.4)',
                },
                transition: 'all 0.2s ease',
              }}
            >
              {isLastStep ? (lang === 'ko' ? '🎉 완료!' : '🎉 Done!') : (lang === 'ko' ? '다음' : 'Next')}
            </Button>
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default OnboardingTour;
