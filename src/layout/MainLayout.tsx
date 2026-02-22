import { useState, useEffect, useCallback, Suspense } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import {
  Box, Toolbar, Dialog, DialogTitle, DialogContent,
  Typography, Chip, Divider, CircularProgress,
} from '@mui/material';
import Sidebar, { DRAWER_WIDTH, COLLAPSED_DRAWER_WIDTH } from './Sidebar';
import Header from './Header';
import CommandMenu from '../components/CommandMenu';
import OnboardingTour from '../components/OnboardingTour';
import { useLanguage } from '../contexts/LanguageContext';
import { useOnboarding } from '../hooks/useOnboarding';
import { getTourSteps } from '../constants/tourSteps';

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
const MOD = isMac ? 'Cmd' : 'Ctrl';

type Shortcut = {
  keys: string[];
  label: string;
  sep?: string;
};

type ShortcutGroup = {
  title: string;
  shortcuts: Shortcut[];
};

const SHORTCUT_GROUPS_BY_LANG: Record<'en' | 'ko', ShortcutGroup[]> = {
  en: [
    {
      title: 'General',
      shortcuts: [
        { keys: [MOD, 'K'], label: 'Open command menu', sep: '+' },
        { keys: ['C'], label: 'Create new task' },
        { keys: ['?'], label: 'Show keyboard shortcuts' },
      ],
    },
    {
      title: 'Navigation',
      shortcuts: [
        { keys: ['G', 'B'], label: 'Go to Board' },
        { keys: ['G', 'I'], label: 'Go to Inbox' },
        { keys: ['G', 'C'], label: 'Go to Calendar' },
        { keys: ['G', 'P'], label: 'Go to Planner' },
        { keys: ['G', 'R'], label: 'Go to Reports' },
        { keys: ['G', 'M'], label: 'Go to Roadmap' },
        { keys: ['G', 'T'], label: 'Go to Team Settings' },
      ],
    },
  ],
  ko: [
    {
      title: '\uC77C\uBC18',
      shortcuts: [
        { keys: [MOD, 'K'], label: '\uBA85\uB839 \uBA54\uB274 \uC5F4\uAE30', sep: '+' },
        { keys: ['C'], label: '\uC0C8 \uC791\uC5C5 \uB9CC\uB4E4\uAE30' },
        { keys: ['?'], label: '\uD0A4\uBCF4\uB4DC \uB2E8\uCD95\uD0A4 \uBCF4\uAE30' },
      ],
    },
    {
      title: '\uC774\uB3D9',
      shortcuts: [
        { keys: ['G', 'B'], label: '\uBCF4\uB4DC\uB85C \uC774\uB3D9' },
        { keys: ['G', 'I'], label: '\uC778\uBC15\uC2A4\uB85C \uC774\uB3D9' },
        { keys: ['G', 'C'], label: '\uCE98\uB9B0\uB354\uB85C \uC774\uB3D9' },
        { keys: ['G', 'P'], label: '\uD50C\uB798\uB108\uB85C \uC774\uB3D9' },
        { keys: ['G', 'R'], label: '\uB9AC\uD3EC\uD2B8\uB85C \uC774\uB3D9' },
        { keys: ['G', 'M'], label: '\uB85C\uB4DC\uB9F5\uC73C\uB85C \uC774\uB3D9' },
        { keys: ['G', 'T'], label: '\uD300 \uC124\uC815\uC73C\uB85C \uC774\uB3D9' },
      ],
    },
  ],
};

const STEP_SEPARATOR_BY_LANG: Record<'en' | 'ko', string> = {
  en: 'then',
  ko: '\uB2E4\uC74C',
};

const MainLayout = () => {
  const navigate = useNavigate();
  const { t, lang } = useLanguage();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandMenuOpen, setCommandMenuOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [createWsOpen, setCreateWsOpen] = useState(false);
  const [joinWsOpen, setJoinWsOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', sidebarCollapsed.toString());
  }, [sidebarCollapsed]);

  const [gPressed, setGPressed] = useState(false);

  const shortcutGroups = SHORTCUT_GROUPS_BY_LANG[lang];
  const stepSeparator = STEP_SEPARATOR_BY_LANG[lang];

  // Onboarding tour
  const tourSteps = getTourSteps(lang);
  const {
    isActive: isTourActive,
    currentStep: tourStep,
    hasCompleted: hasTourCompleted,
    wasDismissed: wasTourDismissed,
    startTour,
    endTour,
    nextStep: tourNextStep,
    prevStep: tourPrevStep,
  } = useOnboarding();

  // Auto-start tour on first visit (with a short delay so elements render)
  useEffect(() => {
    if (!hasTourCompleted() && !wasTourDismissed()) {
      const timer = setTimeout(() => startTour(), 1200);
      return () => clearTimeout(timer);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const isTyping = useCallback(() => {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if ((el as HTMLElement).contentEditable === 'true') return true;
    return false;
  }, []);

  const handleGlobalKeyDown = useCallback((e: KeyboardEvent) => {
    if (isTyping() && !e.metaKey && !e.ctrlKey) return;

    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setCommandMenuOpen(prev => !prev);
      return;
    }

    if (e.metaKey || e.ctrlKey || e.altKey || isTyping()) return;

    if (e.key === '?') {
      e.preventDefault();
      setShortcutsOpen(prev => !prev);
      return;
    }

    if (e.key === 'c' && !gPressed) {
      e.preventDefault();
      setAddTaskOpen(true);
      return;
    }

    if (e.key === 'g' && !gPressed) {
      setGPressed(true);
      setTimeout(() => setGPressed(false), 1500);
      return;
    }

    if (gPressed) {
      setGPressed(false);
      const navMap: Record<string, string> = {
        h: '/',
        b: '/tasks',
        i: '/inbox',
        c: '/calendar',
        p: '/planner',
        r: '/reports',
        m: '/roadmap',
        t: '/team-settings',
      };
      const path = navMap[e.key];
      if (path) {
        e.preventDefault();
        navigate(path);
      }
    }
  }, [isTyping, gPressed, navigate]);

  useEffect(() => {
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleGlobalKeyDown]);

  return (
    <Box sx={{ display: 'flex' }}>
      <Header
        handleDrawerToggle={handleDrawerToggle}
        onOpenShortcuts={() => setShortcutsOpen(true)}
        onStartTour={startTour}
      />
      <Sidebar
        mobileOpen={mobileOpen}
        handleDrawerToggle={handleDrawerToggle}
        createWsOpen={createWsOpen}
        setCreateWsOpen={setCreateWsOpen}
        joinWsOpen={joinWsOpen}
        setJoinWsOpen={setJoinWsOpen}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />

      <Box
        component="main"
        data-tour="main-content"
        sx={{
          flexGrow: 1,
          p: { xs: 1.5, sm: 2, md: 3 },
          width: { md: `calc(100% - ${sidebarCollapsed ? COLLAPSED_DRAWER_WIDTH : DRAWER_WIDTH}px)` },
          minHeight: '100vh',
          bgcolor: 'background.default',
          overflow: 'hidden',
          transition: 'width 0.2s ease-in-out, margin-left 0.2s ease-in-out',
        }}
        className="main-content-transition"
      >
        <Toolbar />
        <Suspense fallback={
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 12 }}>
            <CircularProgress size={28} sx={{ color: 'primary.main' }} />
          </Box>
        }>
          <Outlet context={{ addTaskOpen, setAddTaskOpen }} />
        </Suspense>
      </Box>

      <OnboardingTour
        steps={tourSteps}
        isActive={isTourActive}
        currentStep={tourStep}
        onNext={() => tourNextStep(tourSteps.length)}
        onPrev={tourPrevStep}
        onSkip={() => endTour(false)}
        onComplete={() => endTour(true)}
      />

      <CommandMenu
        open={commandMenuOpen}
        onClose={() => setCommandMenuOpen(false)}
        onCreateTask={() => setAddTaskOpen(true)}
      />

      <Dialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
      >
        <DialogTitle sx={{ fontWeight: 800, pb: 1, fontSize: '1.1rem' }}>
          {`\u2328\uFE0F ${t('keyboardShortcuts') as string}`}
        </DialogTitle>
        <DialogContent sx={{ px: 3, pb: 3 }}>
          {shortcutGroups.map((group, gi) => (
            <Box key={group.title} sx={{ mb: gi < shortcutGroups.length - 1 ? 2 : 0 }}>
              <Typography variant="caption" color="text.disabled" fontWeight={700}
                sx={{ textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5, display: 'block' }}>
                {group.title}
              </Typography>
              {group.shortcuts.map((sc) => (
                <Box key={`${group.title}-${sc.label}`} sx={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  py: 0.6,
                }}>
                  <Typography variant="body2" color="text.secondary" fontSize="0.85rem">
                    {sc.label}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.3 }}>
                    {sc.keys.map((k, ki) => (
                      <span key={`${sc.label}-${k}-${ki}`}>
                        <Chip label={k} size="small" variant="outlined"
                          sx={{
                            height: 22, minWidth: 28,
                            fontSize: '0.7rem', fontWeight: 700,
                            fontFamily: 'monospace',
                            borderRadius: 1,
                          }}
                        />
                        {ki < sc.keys.length - 1 && (
                          <Typography component="span" variant="caption" color="text.disabled" sx={{ mx: 0.2 }}>
                            {sc.sep ?? stepSeparator}
                          </Typography>
                        )}
                      </span>
                    ))}
                  </Box>
                </Box>
              ))}
              {gi < shortcutGroups.length - 1 && <Divider sx={{ mt: 1 }} />}
            </Box>
          ))}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default MainLayout;
