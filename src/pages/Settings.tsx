import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Avatar, Switch, Divider, Chip, Select, MenuItem, FormControl,
} from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import BadgeIcon from '@mui/icons-material/Badge';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import InventoryIcon from '@mui/icons-material/Inventory';
import { useAuth } from '../contexts/AuthContext';
import { useThemeMode } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { getBacklogSettings, saveBacklogSettings, type BacklogSettings } from '../services/backlogService';

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

const Settings = () => {
  const { user } = useAuth();
  const { mode, toggleMode } = useThemeMode();
  const { t, lang } = useLanguage();
  const shortcutGroups = SHORTCUT_GROUPS_BY_LANG[lang];
  const stepSeparator = STEP_SEPARATOR_BY_LANG[lang];
  const { currentWorkspace } = useWorkspace();

  // Backlog settings state
  const [backlogSettings, setBacklogSettingsState] = useState<BacklogSettings>({
    autoArchiveEnabled: false,
    archiveDaysThreshold: 90,
    staleNotificationDays: 60,
    sprintRolloverEnabled: true,
  });

  useEffect(() => {
    if (currentWorkspace?.id) {
      setBacklogSettingsState(getBacklogSettings(currentWorkspace.id));
    }
  }, [currentWorkspace?.id]);

  const updateBacklogSetting = <K extends keyof BacklogSettings>(key: K, value: BacklogSettings[K]) => {
    const updated = { ...backlogSettings, [key]: value };
    setBacklogSettingsState(updated);
    if (currentWorkspace?.id) {
      saveBacklogSettings(currentWorkspace.id, updated);
    }
  };

  const getInitials = () => {
    if (!user?.displayName) return '?';
    return user.displayName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Box sx={{ maxWidth: '700px', mx: 'auto', pb: 4 }}>
      <Typography variant="h4" fontWeight="800" gutterBottom>
        {t('settings') as string}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        {t('settingsDesc') as string}
      </Typography>

      {/* My Profile */}
      <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <PersonIcon color="primary" />
          <Typography variant="h6" fontWeight="bold">{t('myProfile') as string}</Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
          <Avatar
            src={user?.photoURL || undefined}
            sx={{ width: 80, height: 80, fontSize: 28, bgcolor: 'primary.main' }}
          >
            {getInitials()}
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight="700">
              {user?.displayName || 'User'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {user?.email || ''}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <BadgeIcon sx={{ color: 'text.secondary' }} />
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight="600">{t('displayName') as string}</Typography>
              <Typography variant="body1" fontWeight="500">{user?.displayName || '-'}</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <EmailIcon sx={{ color: 'text.secondary' }} />
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight="600">{t('email') as string}</Typography>
              <Typography variant="body1" fontWeight="500">{user?.email || '-'}</Typography>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Appearance (Dark Mode) */}
      <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {mode === 'dark' ? (
              <DarkModeIcon sx={{ color: '#facc15' }} />
            ) : (
              <LightModeIcon sx={{ color: '#f59e0b' }} />
            )}
            <Box>
              <Typography variant="subtitle1" fontWeight="bold">{t('darkMode') as string}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t('darkModeDesc') as string}
              </Typography>
            </Box>
          </Box>
          <Switch
            checked={mode === 'dark'}
            onChange={toggleMode}
            color="primary"
          />
        </Box>
      </Paper>

      {/* Backlog Management */}
      <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <InventoryIcon color="primary" />
          <Typography variant="h6" fontWeight="bold">Backlog Management</Typography>
        </Box>

        {/* Auto-archive toggle */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography variant="subtitle2" fontWeight="600">Auto-archive stale tasks</Typography>
            <Typography variant="body2" color="text.secondary">
              Automatically archive 'todo' tasks older than the threshold
            </Typography>
          </Box>
          <Switch
            checked={backlogSettings.autoArchiveEnabled}
            onChange={(_, v) => updateBacklogSetting('autoArchiveEnabled', v)}
            color="primary"
          />
        </Box>

        {/* Archive threshold */}
        {backlogSettings.autoArchiveEnabled && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, pl: 2 }}>
            <Typography variant="body2" color="text.secondary">Archive after (days)</Typography>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <Select
                value={backlogSettings.archiveDaysThreshold}
                onChange={e => updateBacklogSetting('archiveDaysThreshold', Number(e.target.value))}
                sx={{ borderRadius: 2 }}
              >
                {[30, 60, 90, 120, 180].map(d => (
                  <MenuItem key={d} value={d}>{d} days</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Sprint rollover toggle */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="subtitle2" fontWeight="600">Sprint auto-rollover</Typography>
            <Typography variant="body2" color="text.secondary">
              Move incomplete tasks to the next sprint automatically
            </Typography>
          </Box>
          <Switch
            checked={backlogSettings.sprintRolloverEnabled}
            onChange={(_, v) => updateBacklogSetting('sprintRolloverEnabled', v)}
            color="primary"
          />
        </Box>
      </Paper>

      {/* Keyboard Shortcuts Reference */}
      <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <KeyboardIcon color="primary" />
          <Typography variant="h6" fontWeight="bold">{t('keyboardShortcuts') as string}</Typography>
        </Box>

        {shortcutGroups.map((group, gi) => (
          <Box key={group.title} sx={{ mb: gi < shortcutGroups.length - 1 ? 3 : 0 }}>
            <Typography variant="caption" color="text.disabled" fontWeight={700}
              sx={{ textTransform: 'uppercase', letterSpacing: 0.5, mb: 1, display: 'block' }}>
              {group.title}
            </Typography>
            {group.shortcuts.map((sc, si) => (
              <Box key={`${group.title}-${sc.label}`} sx={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                py: 0.8,
                borderBottom: si < group.shortcuts.length - 1 ? '1px solid' : 'none',
                borderColor: 'divider',
              }}>
                <Typography variant="body2" color="text.secondary" fontSize="0.85rem">
                  {sc.label}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.3, alignItems: 'center' }}>
                  {sc.keys.map((k, ki) => (
                    <span key={`${sc.label}-${k}`}>
                      <Chip label={k} size="small" variant="outlined"
                        sx={{
                          height: 24, minWidth: 30,
                          fontSize: '0.7rem', fontWeight: 700,
                          fontFamily: 'monospace',
                          borderRadius: 1,
                        }}
                      />
                      {ki < sc.keys.length - 1 && (
                        <Typography component="span" variant="caption" color="text.disabled" sx={{ mx: 0.3 }}>
                          {sc.sep ?? stepSeparator}
                        </Typography>
                      )}
                    </span>
                  ))}
                </Box>
              </Box>
            ))}
            {gi < shortcutGroups.length - 1 && <Divider sx={{ mt: 1.5 }} />}
          </Box>
        ))}
      </Paper>
    </Box>
  );
};

export default Settings;
