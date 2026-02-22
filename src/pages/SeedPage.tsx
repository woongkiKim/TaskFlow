// src/pages/SeedPage.tsx
// Development-only page for seeding/clearing dummy data via Django management command.

import { useState } from 'react';
import { Box, Button, Typography, Paper, CircularProgress } from '@mui/material';
import api from '../services/apiClient';
import { toast } from 'sonner';

const SeedPage = () => {
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const addLog = (msg: string) => setLog((prev) => [...prev, msg]);

  const handleSeed = async () => {
    setLoading(true);
    setLog([]);
    addLog('Requesting backend to seed dummy data...');

    try {
      const result = await api.post<{ message: string; details?: Record<string, number> }>(
        'admin/seed-dummy/'
      );
      addLog(`✅ ${result.message}`);
      if (result.details) {
        Object.entries(result.details).forEach(([key, count]) => {
          addLog(`  ${key}: ${count} items created`);
        });
      }
      toast.success('Successfully seeded dummy data!');
    } catch (error: unknown) {
      console.error(error);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Failed to seed data');
      addLog(`❌ Error: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClearSeed = async () => {
    setLoading(true);
    setLog([]);
    addLog('Requesting backend to clear dummy data...');

    try {
      const result = await api.post<{ message: string; details?: Record<string, number> }>(
        'admin/clear-dummy/'
      );
      addLog(`✅ ${result.message}`);
      if (result.details) {
        Object.entries(result.details).forEach(([key, count]) => {
          addLog(`  ${key}: ${count} items deleted`);
        });
      }
      toast.success('Successfully cleared dummy data!');
    } catch (error: unknown) {
      console.error(error);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Failed to clear data');
      addLog(`❌ Error: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 4, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" fontWeight={800} gutterBottom>
        🌱 Database Seeder (Development)
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Seed or clear realistic dummy data in the Django backend database.
        Uses the <code>seed_dummy</code> management command on the backend.
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSeed}
          disabled={loading}
          startIcon={loading && <CircularProgress size={20} color="inherit" />}
        >
          Seed Dummy Data
        </Button>
        <Button
          variant="outlined"
          color="error"
          onClick={handleClearSeed}
          disabled={loading}
          startIcon={loading && <CircularProgress size={20} color="inherit" />}
        >
          Clear All Dummy Data
        </Button>
      </Box>

      <Paper sx={{ p: 2, bgcolor: '#1e293b', color: '#f8fafc', minHeight: 200, fontFamily: 'monospace' }}>
        <Typography variant="subtitle2" sx={{ mb: 1, color: '#94a3b8' }}>Logs Output:</Typography>
        {log.map((l, i) => (
          <Box key={i} sx={{ fontSize: '0.85rem', mb: 0.5 }}>{l}</Box>
        ))}
        {log.length === 0 && (
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            Click a button above to see logs here.
          </Typography>
        )}
      </Paper>
    </Box>
  );
};

export default SeedPage;
