// src/components/NetworkBanner.tsx
// ──────────────────────────────────────────────────────────
// Shows a non-intrusive banner when the connection is poor
// or offline. Automatically hides when connection recovers.
// ──────────────────────────────────────────────────────────

import { Box, Typography, Slide } from '@mui/material';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import SignalCellularConnectedNoInternet0BarIcon from '@mui/icons-material/SignalCellularConnectedNoInternet0Bar';
import useNetworkStatus from '../hooks/useNetworkStatus';

const NetworkBanner = () => {
  const { quality, isOffline, isSlow } = useNetworkStatus();

  // Only show for offline or very slow connections
  if (quality === 'fast' || quality === 'medium') return null;

  const isOfflineState = isOffline;
  const message = isOfflineState
    ? 'You are offline — showing cached data'
    : isSlow
      ? 'Slow connection detected — using cached data to save bandwidth'
      : '';

  if (!message) return null;

  return (
    <Slide direction="down" in={true} mountOnEnter unmountOnExit>
      <Box
        sx={{
          bgcolor: isOfflineState ? '#ef4444' : '#f59e0b',
          color: 'white',
          py: 0.5,
          px: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
          fontSize: '0.8rem',
          fontWeight: 600,
          zIndex: 1300,
          textAlign: 'center',
        }}
      >
        {isOfflineState ? (
          <WifiOffIcon sx={{ fontSize: 16 }} />
        ) : (
          <SignalCellularConnectedNoInternet0BarIcon sx={{ fontSize: 16 }} />
        )}
        <Typography variant="caption" fontWeight={600}>
          {message}
        </Typography>
      </Box>
    </Slide>
  );
};

export default NetworkBanner;
