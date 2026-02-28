import { useState } from 'react';
import {
  Box, Typography, Paper, Avatar, Switch, Divider, Chip, Select, MenuItem, FormControl, IconButton, TextField, Fade,
} from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import LightModeIcon from '@mui/icons-material/LightMode';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import InventoryIcon from '@mui/icons-material/Inventory';
import LinkIcon from '@mui/icons-material/Link';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from '../contexts/AuthContext';
import { useThemeMode } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useSearchParams } from 'react-router-dom';
import TeamSettings from './TeamSettings';
import IntegrationsPage from './IntegrationsPage';
import { toast } from 'sonner';
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
      title: '일반',
      shortcuts: [
        { keys: [MOD, 'K'], label: '명령 메뉴 열기', sep: '+' },
        { keys: ['C'], label: '새 작업 만들기' },
        { keys: ['?'], label: '키보드 단축키 보기' },
      ],
    },
    {
      title: '이동',
      shortcuts: [
        { keys: ['G', 'B'], label: '보드로 이동' },
        { keys: ['G', 'I'], label: '인박스로 이동' },
        { keys: ['G', 'C'], label: '캘린더로 이동' },
        { keys: ['G', 'P'], label: '플래너로 이동' },
        { keys: ['G', 'R'], label: '리포트로 이동' },
        { keys: ['G', 'M'], label: '로드맵으로 이동' },
        { keys: ['G', 'T'], label: '팀 설정으로 이동' },
      ],
    },
  ],
};

const Settings = () => {
  const { user, updateDisplayName } = useAuth();
  const { mode, toggleMode } = useThemeMode();
  const { t, lang } = useLanguage();
  const { currentWorkspace } = useWorkspace();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = parseInt(searchParams.get('tab') || '0');

  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.displayName || '');

  const shortcutGroups = SHORTCUT_GROUPS_BY_LANG[(lang === 'ko' ? 'ko' : 'en') as 'ko' | 'en'];

  // Notification settings
  type NotifKey = 'task_assigned' | 'task_completed' | 'task_status_changed' | 'task_mentioned' | 'task_due_soon' | 'task_overdue' | 'comment_added' | 'sprint_started' | 'sprint_completed' | 'email_enabled';
  const defaultNotifSettings: Record<NotifKey, boolean> = {
    task_assigned: true, task_completed: true, task_status_changed: true,
    task_mentioned: true, task_due_soon: true, task_overdue: true,
    comment_added: true, sprint_started: true, sprint_completed: true, email_enabled: false,
  };
  const notifStorageKey = `notif_settings_${currentWorkspace?.id || 'default'}`;
  const loadNotifSettings = (): Record<NotifKey, boolean> => {
    try { const raw = localStorage.getItem(notifStorageKey); return raw ? { ...defaultNotifSettings, ...JSON.parse(raw) } : defaultNotifSettings; } catch { return defaultNotifSettings; }
  };
  const [notifSettings, setNotifSettings] = useState<Record<NotifKey, boolean>>(loadNotifSettings);
  const toggleNotif = (key: NotifKey) => {
    const updated = { ...notifSettings, [key]: !notifSettings[key] };
    setNotifSettings(updated);
    localStorage.setItem(notifStorageKey, JSON.stringify(updated));
  };
  const NOTIF_LABELS: Record<NotifKey, { en: string; ko: string; icon: string }> = {
    task_assigned: { en: 'Task assigned to me', ko: '작업이 나에게 배정됨', icon: '👤' },
    task_completed: { en: 'Task completed', ko: '작업 완료됨', icon: '✅' },
    task_status_changed: { en: 'Task status changed', ko: '작업 상태 변경됨', icon: '🔄' },
    task_mentioned: { en: '@Mention in comments', ko: '댓글에서 @멘션', icon: '💬' },
    task_due_soon: { en: 'Task due soon (24h)', ko: '작업 마감 임박 (24시간)', icon: '⏰' },
    task_overdue: { en: 'Task overdue', ko: '작업 기한 초과', icon: '🔴' },
    comment_added: { en: 'New comment on my tasks', ko: '내 작업에 새 댓글', icon: '💭' },
    sprint_started: { en: 'Sprint started', ko: '스프린트 시작됨', icon: '🚀' },
    sprint_completed: { en: 'Sprint completed', ko: '스프린트 완료됨', icon: '🏁' },
    email_enabled: { en: 'Send email notifications', ko: '이메일 알림 발송', icon: '📧' },
  };

  // Backlog settings state — sync from workspace on change
  const [backlogSettings, setBacklogSettingsState] = useState<BacklogSettings>({
    autoArchiveEnabled: false,
    archiveDaysThreshold: 90,
    staleNotificationDays: 60,
    sprintRolloverEnabled: true,
  });
  const [lastWsId, setLastWsId] = useState<string | null>(null);

  if (currentWorkspace?.id && currentWorkspace.id !== lastWsId) {
    setBacklogSettingsState(getBacklogSettings(currentWorkspace.id));
    setLastWsId(currentWorkspace.id);
  }

  const updateBacklogSetting = <K extends keyof BacklogSettings>(key: K, value: BacklogSettings[K]) => {
    const updated = { ...backlogSettings, [key]: value };
    setBacklogSettingsState(updated);
    if (currentWorkspace?.id) {
      saveBacklogSettings(currentWorkspace.id, updated);
    }
  };

  const handleUpdateName = async () => {
    if (!newName.trim()) return;
    try {
      await updateDisplayName(newName.trim());
      setIsEditingName(false);
      toast.success(lang === 'ko' ? '이름이 변경되었습니다.' : 'Display name updated.');
    } catch {
      toast.error(lang === 'ko' ? '변경 실패' : 'Update failed');
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

  const handleTabChange = (index: number) => {
    setSearchParams({ tab: index.toString() });
  };

  return (
    <Box sx={{ maxWidth: activeTab === 1 ? '1000px' : activeTab === 2 ? '1000px' : '700px', mx: 'auto', pb: 4, pt: 2, transition: 'max-width 0.3s' }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="800" sx={{ mb: 1, letterSpacing: '-0.02em' }}>
          {t('settings') as string}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('settingsDesc') as string}
        </Typography>
      </Box>

      {/* Modern Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
        <Box sx={{ display: 'flex', gap: 4 }}>
          {[
            { label: lang === 'ko' ? '내 프로필' : 'My Profile', icon: <PersonIcon sx={{ fontSize: 18 }} /> },
            { label: lang === 'ko' ? '워크스페이스' : 'Workspace', icon: <InventoryIcon sx={{ fontSize: 18 }} /> },
            { label: lang === 'ko' ? '외부 서비스 연동' : 'Integrations', icon: <LinkIcon sx={{ fontSize: 18 }} /> },
            { label: lang === 'ko' ? '환경설정' : 'Preferences', icon: <KeyboardIcon sx={{ fontSize: 18 }} /> },
            { label: lang === 'ko' ? '알림 설정' : 'Notifications', icon: <NotificationsActiveIcon sx={{ fontSize: 18 }} /> },
          ].map((tab, i) => (
            <Box
              key={i}
              onClick={() => handleTabChange(i)}
              sx={{
                pb: 2,
                px: 0.5,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 1.2,
                position: 'relative',
                color: activeTab === i ? 'primary.main' : 'text.secondary',
                transition: 'all 0.2s',
                '&:hover': { color: 'primary.main' },
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  bottom: -1,
                  left: 0,
                  right: 0,
                  height: 3,
                  borderRadius: '3px 3px 0 0',
                  bgcolor: 'primary.main',
                  transform: activeTab === i ? 'scaleX(1)' : 'scaleX(0)',
                  transition: 'transform 0.2s ease-in-out',
                }
              }}
            >
              {tab.icon}
              <Typography variant="body2" fontWeight={activeTab === i ? 700 : 500}>
                {tab.label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* ─── TAB 0: Profile ─── */}
      {activeTab === 0 && (
        <Fade in={activeTab === 0}>
          <Box>
            <Paper variant="outlined" sx={{ p: 4, borderRadius: 4, bgcolor: 'background.paper', mb: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
                <Avatar
                  src={user?.photoURL || undefined}
                  sx={{ width: 100, height: 100, fontSize: 32, bgcolor: 'primary.main', boxShadow: '0 8px 32px rgba(99,102,241,0.15)' }}
                >
                  {getInitials()}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  {isEditingName ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TextField
                        size="small"
                        variant="outlined"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        autoFocus
                        onKeyPress={e => e.key === 'Enter' && handleUpdateName()}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                      />
                      <IconButton color="primary" onClick={handleUpdateName} sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}>
                        <SaveIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                      <IconButton onClick={() => { setIsEditingName(false); setNewName(user?.displayName || ''); }} sx={{ bgcolor: 'action.hover' }}>
                        <CloseIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Typography variant="h5" fontWeight="800">{user?.displayName || 'User'}</Typography>
                      <IconButton size="small" onClick={() => setIsEditingName(true)} sx={{ color: 'text.disabled', '&:hover': { color: 'primary.main', bgcolor: 'primary.light' } }}>
                        <EditIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Box>
                  )}
                  <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>{user?.email}</Typography>
                  <Box sx={{ mt: 2, display: 'flex', gap: 1.5 }}>
                    <Chip label="Account Holder" size="small" sx={{ fontWeight: 700, bgcolor: 'rgba(99,102,241,0.08)', color: 'primary.main', border: '1px solid', borderColor: 'primary.light' }} />
                    <Chip label={currentWorkspace?.name || 'No Workspace'} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ my: 4, opacity: 0.6 }} />

              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 4 }}>
                <Box>
                  <Typography variant="caption" color="text.disabled" fontWeight={700} sx={{ textTransform: 'uppercase', mb: 1.2, display: 'block', letterSpacing: 1 }}>Display Name</Typography>
                  <Typography variant="body1" fontWeight={600}>{user?.displayName || '-'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.disabled" fontWeight={700} sx={{ textTransform: 'uppercase', mb: 1.2, display: 'block', letterSpacing: 1 }}>Email Address</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <EmailIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                    <Typography variant="body1" fontWeight={600}>{user?.email || '-'}</Typography>
                  </Box>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.disabled" fontWeight={700} sx={{ textTransform: 'uppercase', mb: 1.2, display: 'block', letterSpacing: 1 }}>User ID</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', bgcolor: 'action.hover', px: 1, py: 0.5, borderRadius: 1.5, display: 'inline-block' }}>{user?.uid.slice(0, 8)}...</Typography>
                </Box>
              </Box>
            </Paper>
          </Box>
        </Fade>
      )}

      {/* ─── TAB 1: Workspace ─── */}
      {activeTab === 1 && (
        <Fade in={activeTab === 1}>
          <Box>
            <TeamSettings />
          </Box>
        </Fade>
      )}

      {/* ─── TAB 2: External Integrations ─── */}
      {activeTab === 2 && (
        <Fade in={activeTab === 2}>
          <Box>
            <IntegrationsPage hideHeader />
          </Box>
        </Fade>
      )}

      {/* ─── TAB 3: Preferences ─── */}
      {activeTab === 3 && (
        <Fade in={activeTab === 3}>
          <Box>
            {/* Appearance */}
            <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2, px: 1 }}>Appearance</Typography>
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 4, mb: 4, bgcolor: 'background.paper' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
                  <Box sx={{ width: 42, height: 42, borderRadius: 2.5, bgcolor: mode === 'dark' ? 'rgba(250,204,21,0.1)' : 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {mode === 'dark' ? <DarkModeIcon sx={{ color: '#facc15' }} /> : <LightModeIcon sx={{ color: '#f59e0b' }} />}
                  </Box>
                  <Box>
                    <Typography variant="body1" fontWeight="700">{t('darkMode') as string}</Typography>
                    <Typography variant="body2" color="text.secondary">{t('darkModeDesc') as string}</Typography>
                  </Box>
                </Box>
                <Switch checked={mode === 'dark'} onChange={toggleMode} color="primary" sx={{ '& .MuiSwitch-thumb': { boxShadow: '0 2px 4px rgba(0,0,0,0.2)' } }} />
              </Box>
            </Paper>

            {/* Backlog */}
            <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2, px: 1 }}>Automation</Typography>
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 4, mb: 4, bgcolor: 'background.paper' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <InventoryIcon sx={{ color: 'primary.main' }} />
                <Typography variant="body1" fontWeight="800">Backlog Management</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
                <Box>
                  <Typography variant="body2" fontWeight="700">Auto-archive stale tasks</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Automatically archive tasks in 'todo' status older than threshold</Typography>
                </Box>
                <Switch checked={backlogSettings.autoArchiveEnabled} onChange={(_, v) => updateBacklogSetting('autoArchiveEnabled', v)} color="primary" />
              </Box>
              {backlogSettings.autoArchiveEnabled && (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, pl: 2, animation: 'fadeIn 0.3s' }}>
                  <Typography variant="body2" color="text.secondary">Archive after (days)</Typography>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <Select value={backlogSettings.archiveDaysThreshold} onChange={e => updateBacklogSetting('archiveDaysThreshold', Number(e.target.value))} sx={{ borderRadius: 2.5 }}>
                      {[30, 60, 90, 120, 180].map(d => <MenuItem key={d} value={d}>{d} days</MenuItem>)}
                    </Select>
                  </FormControl>
                </Box>
              )}
              <Divider sx={{ my: 2.5, opacity: 0.5 }} />
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" fontWeight="700">Sprint Rollover</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Move incomplete tasks to new sprint</Typography>
                </Box>
                <Switch checked={backlogSettings.sprintRolloverEnabled} onChange={(_, v) => updateBacklogSetting('sprintRolloverEnabled', v)} color="primary" />
              </Box>
            </Paper>

            {/* Shortcuts */}
            <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2, px: 1 }}>Keyboard Shortcuts</Typography>
            <Paper variant="outlined" sx={{ p: 4, borderRadius: 4, bgcolor: 'background.paper' }}>
              {shortcutGroups.map((group, gi) => (
                <Box key={group.title} sx={{ mb: gi < shortcutGroups.length - 1 ? 5 : 0 }}>
                  <Typography variant="caption" color="primary" fontWeight={800} sx={{ textTransform: 'uppercase', mb: 2, display: 'block', letterSpacing: 1.5 }}>{group.title}</Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: () => (gi === 0 ? 3 : 2) }}>
                    {group.shortcuts.map((sc, si) => (
                      <Box key={si} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="body2" color="text.secondary" fontWeight={500}>{sc.label}</Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                          {sc.keys.map((k, ki) => (
                            <Box key={ki} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Paper variant="outlined" sx={{ px: 1, py: 0.4, minWidth: 28, textAlign: 'center', borderRadius: 1.5, bgcolor: 'action.hover', borderBottom: '2px solid', borderColor: 'divider' }}>
                                <Typography variant="caption" fontWeight={800} sx={{ fontSize: '0.65rem', fontFamily: 'monospace' }}>{k}</Typography>
                              </Paper>
                              {ki < sc.keys.length - 1 && <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem', fontWeight: 700 }}>{sc.sep ?? '+'}</Typography>}
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Box>
              ))}
            </Paper>
          </Box>
        </Fade>
      )}

      {/* ─── TAB 4: Notifications ─── */}
      {activeTab === 4 && (
        <Fade in={activeTab === 4}>
          <Box>
            <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2, px: 1 }}>
              {lang === 'ko' ? '인앱 알림' : 'In-App Notifications'}
            </Typography>
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 4, mb: 4, bgcolor: 'background.paper' }}>
              {(Object.keys(notifSettings) as NotifKey[]).filter(k => k !== 'email_enabled').map((key) => (
                <Box key={key} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5, borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 'none' } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography fontSize="1.2rem">{NOTIF_LABELS[key].icon}</Typography>
                    <Typography variant="body2" fontWeight={600}>{lang === 'ko' ? NOTIF_LABELS[key].ko : NOTIF_LABELS[key].en}</Typography>
                  </Box>
                  <Switch checked={notifSettings[key]} onChange={() => toggleNotif(key)} color="primary" />
                </Box>
              ))}
            </Paper>

            <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2, px: 1 }}>
              {lang === 'ko' ? '이메일 알림' : 'Email Notifications'}
            </Typography>
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 4, mb: 4, bgcolor: 'background.paper' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Typography fontSize="1.2rem">📧</Typography>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>{lang === 'ko' ? NOTIF_LABELS.email_enabled.ko : NOTIF_LABELS.email_enabled.en}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {lang === 'ko' ? '활성화하면 중요 알림을 이메일로도 받습니다' : 'When enabled, important notifications are also sent via email'}
                    </Typography>
                  </Box>
                </Box>
                <Switch checked={notifSettings.email_enabled} onChange={() => toggleNotif('email_enabled')} color="primary" />
              </Box>
            </Paper>
          </Box>
        </Fade>
      )}
    </Box>
  );
};

export default Settings;
