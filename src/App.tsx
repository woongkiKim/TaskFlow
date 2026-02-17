// src/App.tsx
import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import './App.css'; // Import global styles (from feature/kim)
import { AppProviders } from './contexts/AppProviders';
import PrivateRoute from './routes/PrivateRoute';
import MainLayout from './layout/MainLayout';

// Lazy load pages for performance (Code Splitting)
const Login = lazy(() => import('./pages/Login'));
const TasksPage = lazy(() => import('./pages/TasksPage'));
const Calendar = lazy(() => import('./pages/Calendar'));
const WeeklyPlanner = lazy(() => import('./pages/WeeklyPlanner'));
const WeeklyReports = lazy(() => import('./pages/WeeklyReports'));
const Settings = lazy(() => import('./pages/Settings'));
const TeamSettings = lazy(() => import('./pages/TeamSettings'));
const OpsCenter = lazy(() => import('./pages/OpsCenter'));

// Loading Fallback Component
const FullPageLoader = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100vw' }}>
    <CircularProgress />
  </Box>
);

function App() {
  return (
    <AppProviders>
      <Suspense fallback={<FullPageLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<PrivateRoute />}>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<TasksPage />} />
              <Route path="dashboard" element={<Navigate to="/" replace />} />
              <Route path="calendar" element={<Calendar />} />
              <Route path="planner" element={<WeeklyPlanner />} />
              <Route path="reports" element={<WeeklyReports />} />
              <Route path="settings" element={<Settings />} />
              <Route path="team-settings" element={<TeamSettings />} />
              <Route path="ops" element={<OpsCenter />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppProviders>
  );
}

export default App;