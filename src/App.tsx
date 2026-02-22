// src/App.tsx
import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CircularProgress, Box, Typography } from '@mui/material';
import './App.css';
import { AppProviders } from './contexts/AppProviders';
import PrivateRoute from './routes/PrivateRoute';
import MainLayout from './layout/MainLayout';

// Lazy load pages for performance (Code Splitting)
const Login = lazy(() => import('./pages/Login'));
const HomePage = lazy(() => import('./pages/HomePage'));
const TasksPage = lazy(() => import('./pages/TasksPage'));
const Calendar = lazy(() => import('./pages/Calendar'));
const WeeklyPlanner = lazy(() => import('./pages/WeeklyPlanner'));
const WeeklyReports = lazy(() => import('./pages/WeeklyReports'));
const Settings = lazy(() => import('./pages/Settings'));
const TeamSettings = lazy(() => import('./pages/TeamSettings'));
const OpsCenter = lazy(() => import('./pages/OpsCenter'));
const InboxPage = lazy(() => import('./pages/InboxPage'));
const InitiativePage = lazy(() => import('./pages/InitiativePage'));
const RoadmapPage = lazy(() => import('./pages/RoadmapPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const OKRPage = lazy(() => import('./pages/OKRPage'));
const WikiPage = lazy(() => import('./pages/WikiPage'));
const GitHubPanel = lazy(() => import('./pages/GitHubPanel'));
const DiscussionPage = lazy(() => import('./pages/DiscussionPage'));
const ProductivityPage = lazy(() => import('./pages/ProductivityPage'));
const AutomationsPage = lazy(() => import('./pages/AutomationsPage'));
const CustomFieldsPage = lazy(() => import('./pages/CustomFieldsPage'));
const GanttPage = lazy(() => import('./pages/GanttPage'));
const IntegrationsPage = lazy(() => import('./pages/IntegrationsPage'));
const TimeTrackingPage = lazy(() => import('./pages/TimeTrackingPage'));

// Loading Fallback Component — Linear-style branded loader
const FullPageLoader = () => (
  <Box sx={{
    display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
    height: '100vh', width: '100vw', gap: 2,
    background: (theme) => theme.palette.mode === 'dark'
      ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
      : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    '@keyframes pulse': {
      '0%, 100%': { opacity: 1, transform: 'scale(1)' },
      '50%': { opacity: 0.7, transform: 'scale(0.95)' },
    },
  }}>
    <Box sx={{
      p: 1.5,
      borderRadius: 2.5,
      background: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)',
      display: 'flex', alignItems: 'center', gap: 1, color: 'white',
      animation: 'pulse 2s ease-in-out infinite',
      boxShadow: '0 8px 32px rgba(99, 102, 241, 0.3)',
    }}>
      <Typography variant="h6" fontWeight={800} letterSpacing={-0.5}>TaskFlow</Typography>
    </Box>
    <CircularProgress size={24} sx={{ color: 'primary.main', mt: 1 }} />
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
              <Route index element={<HomePage />} />
              <Route path="tasks" element={<TasksPage />} />
              <Route path="inbox" element={<InboxPage />} />
              <Route path="dashboard" element={<Navigate to="/" replace />} />
              <Route path="calendar" element={<Calendar />} />
              <Route path="planner" element={<WeeklyPlanner />} />
              <Route path="reports" element={<WeeklyReports />} />
              <Route path="settings" element={<Settings />} />
              <Route path="team-settings" element={<TeamSettings />} />
              <Route path="ops" element={<OpsCenter />} />
              <Route path="initiative/:id" element={<InitiativePage />} />
              <Route path="roadmap" element={<RoadmapPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="okr" element={<OKRPage />} />
              <Route path="wiki" element={<WikiPage />} />
              <Route path="gantt" element={<GanttPage />} />
              <Route path="discussions" element={<DiscussionPage />} />
              <Route path="productivity" element={<ProductivityPage />} />
              <Route path="automations" element={<AutomationsPage />} />
              <Route path="integrations" element={<IntegrationsPage />} />
              <Route path="custom-fields" element={<CustomFieldsPage />} />
              <Route path="time-tracking" element={<TimeTrackingPage />} />
              <Route path="github" element={<GitHubPanel />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppProviders>
  );
}

export default App;