// src/pages/IntegrationsPage.tsx
import { useState, useCallback, useEffect } from 'react';
import {
  Box, Typography, Paper, TextField, Button, Switch,
  FormControlLabel, Chip, alpha, IconButton,
  CircularProgress, Divider, Alert, List, ListItemText,
  Card, CardMedia, CardContent, CardActions,
  ListItemButton, ListItemIcon, Fade,
} from '@mui/material';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useLanguage } from '../contexts/LanguageContext';
import { slackService } from '../services/slackService';
import { googleChatService } from '../services/googleChatService';
import { figmaService } from '../services/figmaService';
import type { SlackConfig, GoogleChatConfig, FigmaConfig, InAppConfig } from '../types/integrations';
import { toast } from 'sonner';
import GitHubIcon from '@mui/icons-material/GitHub';

// Icons
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SendIcon from '@mui/icons-material/Send';
import LinkIcon from '@mui/icons-material/Link';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';

// ── SVG icon components for brand logos ──
const SlackLogo = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#E01E5A"/></svg>
);
const GoogleChatLogo = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10z" fill="#00AC47"/><path d="M7 8h10v2H7V8zm0 3h7v2H7v-2zm0 3h10v2H7v-2z" fill="white"/></svg>
);
const FigmaLogo = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M8 24c2.208 0 4-1.792 4-4v-4H8c-2.208 0-4 1.792-4 4s1.792 4 4 4z" fill="#0ACF83"/><path d="M4 12c0-2.208 1.792-4 4-4h4v8H8c-2.208 0-4-1.792-4-4z" fill="#A259FF"/><path d="M4 4c0-2.208 1.792-4 4-4h4v8H8C5.792 8 4 6.208 4 4z" fill="#F24E1E"/><path d="M12 0h4c2.208 0 4 1.792 4 4s-1.792 4-4 4h-4V0z" fill="#FF7262"/><path d="M20 12c0 2.208-1.792 4-4 4s-4-1.792-4-4 1.792-4 4-4 4 1.792 4 4z" fill="#1ABCFE"/></svg>
);

// Default configs
const defaultSlack: SlackConfig = {
  enabled: false, webhookUrl: '', channel: '',
  notifyOnTaskCreated: true, notifyOnTaskCompleted: true,
  notifyOnTaskAssigned: true, notifyOnStatusChange: false, notifyOnComment: true,
};
const defaultGChat: GoogleChatConfig = {
  enabled: false, webhookUrl: '', spaceName: '',
  notifyOnTaskCreated: true, notifyOnTaskCompleted: true,
  notifyOnTaskAssigned: true, notifyOnStatusChange: false, notifyOnComment: true,
};
const defaultFigma: FigmaConfig = {
  enabled: false, accessToken: '', teamId: '', projectFiles: [],
};
const defaultInApp: InAppConfig = {
  enabled: true,
  notifyOnTaskCreated: true,
  notifyOnTaskCompleted: true,
  notifyOnTaskAssigned: true,
  notifyOnStatusChange: true,
  notifyOnComment: true,
};

const IntegrationsPage = ({ hideHeader = false }: { hideHeader?: boolean }) => {
  const { lang } = useLanguage();
  const { currentWorkspace, updateWorkspaceConfig } = useWorkspace();
  const tx = useCallback((en: string, ko: string) => lang === 'ko' ? ko : en, [lang]);

  const [tab, setTab] = useState(0);

  const ws = currentWorkspace;

  // ── GitHub state ──
  const [ghToken, setGhToken] = useState(() => ws?.githubConfig?.accessToken || '');
  const [ghTokenSaving, setGhTokenSaving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  // ── Slack state ──
  const [slack, setSlack] = useState<SlackConfig>(() => ({ ...defaultSlack, ...ws?.integrations?.slack }));

  // ── Google Chat state ──
  const [gchat, setGchat] = useState<GoogleChatConfig>(() => ({ ...defaultGChat, ...ws?.integrations?.googleChat }));

  // ── Figma state ──
  const [figma, setFigma] = useState<FigmaConfig>(() => ({ ...defaultFigma, ...ws?.integrations?.figma }));
  const [inApp, setInApp] = useState<InAppConfig>(() => ({ ...defaultInApp, ...ws?.integrations?.inApp }));
  const [figmaUser, setFigmaUser] = useState<string | null>(null);
  const [figmaFileUrl, setFigmaFileUrl] = useState('');
  const [loadingFigma, setLoadingFigma] = useState(false);

  // ── Sync with remote config when it loads ──
  useEffect(() => {
    if (ws?.integrations) {
      if (ws.integrations.slack) setSlack(s => ({ ...s, ...ws.integrations?.slack }));
      if (ws.integrations.googleChat) setGchat(s => ({ ...s, ...ws.integrations?.googleChat }));
      if (ws.integrations.figma) setFigma(s => ({ ...s, ...ws.integrations?.figma }));
      if (ws.integrations.inApp) setInApp(s => ({ ...s, ...ws.integrations?.inApp }));
    }
    if (ws?.githubConfig?.accessToken) {
      setGhToken(ws.githubConfig.accessToken);
    }
  }, [ws?.integrations, ws?.githubConfig?.accessToken]);

  // ── Helpers ──
  const saveIntegrations = async (
    key: 'slack' | 'googleChat' | 'figma' | 'inApp',
    value: SlackConfig | GoogleChatConfig | FigmaConfig | InAppConfig,
  ) => {
    if (!currentWorkspace) return;
    setSaving(true);
    try {
      await updateWorkspaceConfig({
        integrations: {
          ...currentWorkspace.integrations,
          [key]: value,
        },
      });
      toast.success(tx('Integration saved', '통합 설정이 저장되었습니다'));
    } catch {
      toast.error(tx('Failed to save', '저장 실패'));
    } finally {
      setSaving(false);
    }
  };

  // ── Slack handlers ──
  const handleTestSlack = async () => {
    setTesting(true);
    const result = await slackService.testConnection(slack.webhookUrl);
    if (result.ok) {
      toast.success(tx('Slack connected!', 'Slack 연결 성공!'));
    } else {
      toast.error(`${tx('Slack test failed', 'Slack 테스트 실패')}: ${result.error}`);
    }
    setTesting(false);
  };

  // ── Google Chat handlers ──
  const handleTestGChat = async () => {
    setTesting(true);
    const result = await googleChatService.testConnection(gchat.webhookUrl);
    if (result.ok) {
      toast.success(tx('Google Chat connected!', 'Google Chat 연결 성공!'));
    } else {
      toast.error(`${tx('Google Chat test failed', 'Google Chat 테스트 실패')}: ${result.error}`);
    }
    setTesting(false);
  };

  // ── Figma handlers ──
  const handleVerifyFigma = async () => {
    setTesting(true);
    const result = await figmaService.verifyToken(figma.accessToken);
    if (result.ok) {
      setFigmaUser(result.user || null);
      toast.success(`${tx('Figma verified', 'Figma 인증 완료')}  — @${result.user}`);
    } else {
      setFigmaUser(null);
      toast.error(`${tx('Figma token invalid', 'Figma 토큰이 유효하지 않습니다')}: ${result.error}`);
    }
    setTesting(false);
  };

  const handleAddFigmaFile = async () => {
    const fileKey = figmaService.parseFileKey(figmaFileUrl);
    if (!fileKey) {
      toast.error(tx('Invalid Figma URL', '올바른 Figma URL을 입력하세요'));
      return;
    }
    if (figma.projectFiles.some(f => f.fileKey === fileKey)) {
      toast.error(tx('File already linked', '이미 연결된 파일입니다'));
      return;
    }
    setLoadingFigma(true);
    const file = await figmaService.fetchFile(fileKey, figma.accessToken);
    if (file) {
      const updated = {
        ...figma,
        projectFiles: [...figma.projectFiles, {
          fileKey: file.key,
          fileName: file.name,
          thumbnailUrl: file.thumbnail_url,
          lastAccessedAt: new Date().toISOString(),
        }],
      };
      setFigma(updated);
      setFigmaFileUrl('');
      toast.success(`${tx('File linked', '파일 연결 완료')}: ${file.name}`);
    } else {
      toast.error(tx('Could not fetch file', '파일 정보를 가져올 수 없습니다'));
    }
    setLoadingFigma(false);
  };

  const handleRemoveFigmaFile = (fileKey: string) => {
    const updated = {
      ...figma,
      projectFiles: figma.projectFiles.filter(f => f.fileKey !== fileKey),
    };
    setFigma(updated);
  };

  // ── GitHub handlers ──
  const handleSaveGhToken = async () => {
    if (!currentWorkspace) return;
    setGhTokenSaving(true);
    try {
      await updateWorkspaceConfig({
        githubConfig: {
          ...currentWorkspace.githubConfig,
          accessToken: ghToken,
        },
      });
      toast.success(tx('GitHub token saved', 'GitHub 토큰이 저장되었습니다'));
    } catch {
      toast.error(tx('Failed to save', '저장 실패'));
    } finally {
      setGhTokenSaving(false);
    }
  };

  const handleRemoveGhToken = async () => {
    if (!currentWorkspace) return;
    try {
      await updateWorkspaceConfig({
        githubConfig: { ...currentWorkspace.githubConfig, accessToken: '' },
      });
      setGhToken('');
      toast.success(tx('GitHub token removed', 'GitHub 토큰이 제거되었습니다'));
    } catch {
      toast.error(tx('Failed to remove', '제거 실패'));
    }
  };

  // ── No workspace ──
  if (!currentWorkspace) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          {tx('Select a workspace to manage integrations', '워크스페이스를 선택하세요')}
        </Typography>
      </Box>
    );
  }

  // ── Notification toggle helper ──
  const NotifToggle = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
    <FormControlLabel
      control={<Switch size="small" checked={checked} onChange={(_, v) => onChange(v)} />}
      label={<Typography variant="body2">{label}</Typography>}
      sx={{ mx: 0, mb: 0.5 }}
    />
  );

  return (
    <Box sx={{ pb: 4 }}>
      {/* Header */}
      {!hideHeader && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight={800} sx={{ mb: 1, letterSpacing: '-0.02em' }}>
            {tx('Integrations', '외부 서비스 연동')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {tx(
              'Connect Slack, Google Chat, Figma, and GitHub to supercharge your workflow.',
              'Slack, Google Chat, Figma, GitHub를 연결하여 워크플로우를 강화하세요.'
            )}
          </Typography>
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 4, minHeight: '600px', alignItems: 'flex-start' }}>
      {/* Left Sidebar: Service List */}
      <Paper
        variant="outlined"
        sx={{
          width: 280,
          borderRadius: 4,
          overflow: 'hidden',
          bgcolor: 'background.paper',
          flexShrink: 0,
          position: 'sticky',
          top: 24,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
          <Typography variant="overline" fontWeight={700} color="text.secondary" sx={{ letterSpacing: 1.2 }}>
            {tx('External Services', '외부 서비스')}
          </Typography>
        </Box>
        <List sx={{ p: 1 }}>
          {[
            { id: 0, name: 'GitHub', logo: <GitHubIcon sx={{ fontSize: 20 }} />, color: '#24292e', connected: !!ghToken },
            { id: 1, name: 'Slack', logo: <SlackLogo />, color: '#4A154B', connected: slack.enabled && !!slack.webhookUrl },
            { id: 2, name: 'Google Chat', logo: <GoogleChatLogo />, color: '#00897b', connected: gchat.enabled && !!gchat.webhookUrl },
            { id: 3, name: 'Figma', logo: <FigmaLogo />, color: '#A259FF', connected: figma.enabled && !!figma.accessToken },
            { id: 4, name: 'App Notification', logo: <NotificationsActiveIcon sx={{ fontSize: 20 }} />, color: '#3b82f6', connected: inApp.enabled },
          ].map((svc) => (
            <ListItemButton
              key={svc.id}
              onClick={() => setTab(svc.id)}
              selected={tab === svc.id}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                py: 1.5,
                transition: 'all 0.2s',
                '&.Mui-selected': {
                  bgcolor: alpha(svc.color, 0.08),
                  color: svc.color,
                  '&:hover': { bgcolor: alpha(svc.color, 0.12) },
                },
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: tab === svc.id ? svc.color : 'text.secondary' }}>
                {svc.logo}
              </ListItemIcon>
              <ListItemText
                primary={svc.name}
                primaryTypographyProps={{ fontWeight: tab === svc.id ? 700 : 500, fontSize: '0.9rem' }}
              />
              {svc.connected && (
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: '#22c55e',
                    boxShadow: `0 0 0 2px ${alpha('#22c55e', 0.2)}`,
                  }}
                />
              )}
            </ListItemButton>
          ))}
        </List>
      </Paper>

      {/* Right Content Area */}
      <Box sx={{ flex: 1 }}>
        <Fade in={true} key={tab} timeout={400}>
          <Box>
            <Paper
              variant="outlined"
              sx={{
                p: 4,
                borderRadius: 4,
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                boxShadow: '0 4px 24px rgba(0,0,0,0.02)',
              }}
            >
              {/* Tab Content Header */}
              <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 3,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: alpha(
                        tab === 0 ? '#24292e' : tab === 1 ? '#4A154B' : tab === 2 ? '#00AC47' : tab === 3 ? '#A259FF' : '#3b82f6',
                        0.1
                      ),
                      color: tab === 0 ? '#24292e' : tab === 1 ? '#4A154B' : tab === 2 ? '#00AC47' : tab === 3 ? '#A259FF' : '#3b82f6',
                    }}
                  >
                    {tab === 0 ? <GitHubIcon /> : tab === 1 ? <SlackLogo /> : tab === 2 ? <GoogleChatLogo /> : tab === 3 ? <FigmaLogo /> : <NotificationsActiveIcon />}
                  </Box>
                  <Box>
                    <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: -0.5 }}>
                      {tab === 0 ? 'GitHub' : tab === 1 ? 'Slack' : tab === 2 ? 'Google Chat' : tab === 3 ? 'Figma' : 'App Notifications'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {tab === 0
                        ? tx('Sync your workflow with GitHub.', 'GitHub와 워크플로우를 연동하세요.')
                        : tab === 1
                        ? tx('Receive real-time project updates.', '프로젝트 업데이트를 Slack으로 받으세요.')
                        : tab === 2
                        ? tx('Integrate TaskFlow with Google Spaces.', 'Google Spaces와 연동하세요.')
                        : tab === 3
                        ? tx('Link design files to your projects.', '프로젝트에 디자인 파일을 연결하세요.')
                        : tx('Configure internal task-flow notification alerts.', '태스크플로우 내부 알림 설정을 관리합니다.')}
                    </Typography>
                  </Box>
                </Box>

                {((tab === 0 && !!ghToken) || (tab === 1 && slack.enabled) || (tab === 2 && gchat.enabled) || (tab === 3 && figma.enabled) || (tab === 4 && inApp.enabled)) && (
                  <Chip
                    icon={<CheckCircleIcon sx={{ fontSize: '14px !important' }} />}
                    label={tx('Active', '활성화됨')}
                    sx={{
                      bgcolor: alpha('#22c55e', 0.1),
                      color: '#16a34a',
                      fontWeight: 700,
                      borderRadius: 1.5,
                      px: 0.5,
                    }}
                  />
                )}
              </Box>

              <Divider sx={{ mb: 4, opacity: 0.6 }} />

              {/* ─────── GITHUB CONFIG ─────── */}
              {tab === 0 && (
                <Box>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, color: 'text.primary' }}>
                    {tx('Personal Access Token', '개인 액세스 토큰')}
                  </Typography>
                  <Alert
                    severity="info"
                    sx={{
                      mb: 3,
                      borderRadius: 3,
                      bgcolor: alpha('#3b82f6', 0.05),
                      border: '1px solid',
                      borderColor: alpha('#3b82f6', 0.1),
                      '& .MuiAlert-icon': { color: '#3b82f6' },
                    }}
                  >
                    <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                      {tx(
                        'Generate a token at github.com → Settings → Developer settings → Tokens (classic). Grant "repo" scope to enable full synchronization.',
                        'github.com → Settings → Developer settings → Tokens (classic)에서 토큰을 생성하세요. "repo" 권한이 필요합니다.'
                      )}
                    </Typography>
                  </Alert>

                  <TextField
                    fullWidth
                    label={tx('GitHub Token', 'GitHub 토큰')}
                    placeholder="ghp_..."
                    type="password"
                    value={ghToken}
                    onChange={(e) => {
                      setGhToken(e.target.value);
                    }}
                    sx={{ mb: 3, '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                  />

                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Button
                      variant="contained"
                      onClick={handleSaveGhToken}
                      disabled={!ghToken || ghTokenSaving}
                      startIcon={ghTokenSaving ? <CircularProgress size={16} /> : <CheckCircleIcon />}
                      sx={{
                        borderRadius: 3,
                        fontWeight: 700,
                        px: 3,
                        py: 1.2,
                        textTransform: 'none',
                        bgcolor: '#24292e',
                        '&:hover': { bgcolor: '#000' },
                      }}
                    >
                      {tx('Connect GitHub', 'GitHub 연결')}
                    </Button>
                    {!!ws?.githubConfig?.accessToken && (
                      <Button
                        variant="text"
                        color="error"
                        onClick={handleRemoveGhToken}
                        sx={{ fontWeight: 700, textTransform: 'none' }}
                      >
                        {tx('Disconnect', '연결 해제')}
                      </Button>
                    )}
                  </Box>
                  
                  <Box sx={{ mt: 4, p: 3, borderRadius: 3, bgcolor: 'action.hover', border: '1px dashed', borderColor: 'divider' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinkIcon sx={{ fontSize: 14 }} />
                      {tx(
                        'Project-specific repo linking is managed in Workspace Settings → Projects.',
                        '프로젝트별 저장소 연결은 워크스페이스 설정 → 프로젝트 탭에서 관리할 수 있습니다.'
                      )}
                    </Typography>
                  </Box>
                </Box>
              )}

              {/* ─────── SLACK CONFIG ─────── */}
              {tab === 1 && (
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700}>{tx('Slack Notifications', 'Slack 알림')}</Typography>
                      <Typography variant="caption" color="text.secondary">{tx('Send automated updates to your Slack channel', 'Slack 채널로 자동 업데이트를 전송합니다')}</Typography>
                    </Box>
                    <Switch
                      checked={slack.enabled}
                      onChange={(_, v) => setSlack((s) => ({ ...s, enabled: v }))}
                      sx={{ '& .MuiSwitch-thumb': { boxShadow: '0 2px 4px rgba(0,0,0,0.2)' } }}
                    />
                  </Box>

                  <TextField
                    fullWidth
                    label={tx('Webhook URL', 'Webhook URL')}
                    placeholder="https://hooks.slack.com/services/..."
                    value={slack.webhookUrl}
                    onChange={(e) => setSlack((s) => ({ ...s, webhookUrl: e.target.value }))}
                    sx={{ mb: 4, '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                  />

                  <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 2, color: 'text.primary', letterSpacing: 0.5 }}>
                    {tx('EVENT TRIGGER SETTINGS', '이벤트 트리거 설정')}
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 4 }}>
                    <NotifToggle label={tx('Task Created', '작업 생성')} checked={slack.notifyOnTaskCreated} onChange={(v) => setSlack((s) => ({ ...s, notifyOnTaskCreated: v }))} />
                    <NotifToggle label={tx('Task Completed', '작업 완료')} checked={slack.notifyOnTaskCompleted} onChange={(v) => setSlack((s) => ({ ...s, notifyOnTaskCompleted: v }))} />
                    <NotifToggle label={tx('Task Assigned', '작업 할당')} checked={slack.notifyOnTaskAssigned} onChange={(v) => setSlack((s) => ({ ...s, notifyOnTaskAssigned: v }))} />
                    <NotifToggle label={tx('New Comment', '새 댓글 추가')} checked={slack.notifyOnComment} onChange={(v) => setSlack((s) => ({ ...s, notifyOnComment: v }))} />
                    <NotifToggle label={tx('Status Change', '상태 변경')} checked={slack.notifyOnStatusChange} onChange={(v) => setSlack((s) => ({ ...s, notifyOnStatusChange: v }))} />
                  </Box>

                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      variant="contained"
                      onClick={() => saveIntegrations('slack', slack)}
                      disabled={saving}
                      sx={{
                        borderRadius: 3,
                        fontWeight: 700,
                        px: 4,
                        py: 1.2,
                        textTransform: 'none',
                        bgcolor: '#4A154B',
                        '&:hover': { bgcolor: '#300d31' },
                      }}
                    >
                      {tx('Save Slack Settings', 'Slack 설정 저장')}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={handleTestSlack}
                      disabled={!slack.webhookUrl || testing}
                      startIcon={testing ? <CircularProgress size={14} /> : <SendIcon sx={{ fontSize: 16 }} />}
                      sx={{ borderRadius: 3, fontWeight: 700, textTransform: 'none' }}
                    >
                      {tx('Send Test', '테스트 전송')}
                    </Button>
                  </Box>
                </Box>
              )}

              {/* ─────── GOOGLE CHAT CONFIG ─────── */}
              {tab === 2 && (
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700}>{tx('Google Chat Webhook', 'Google Chat 웹훅')}</Typography>
                      <Typography variant="caption" color="text.secondary">{tx('Relay TaskFlow activities to Google Spaces', 'TaskFlow 활동을 Google Spaces로 전달합니다')}</Typography>
                    </Box>
                    <Switch
                      checked={gchat.enabled}
                      onChange={(_, v) => setGchat((s) => ({ ...s, enabled: v }))}
                    />
                  </Box>

                  <TextField
                    fullWidth
                    label={tx('Webhook URL', 'Webhook URL')}
                    placeholder="https://chat.googleapis.com/v1/spaces/..."
                    value={gchat.webhookUrl}
                    onChange={(e) => setGchat((s) => ({ ...s, webhookUrl: e.target.value }))}
                    sx={{ mb: 4, '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                  />

                  <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 2, color: 'text.primary', letterSpacing: 0.5 }}>
                    {tx('EVENT TRIGGER SETTINGS', '이벤트 트리거 설정')}
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 4 }}>
                    <NotifToggle label={tx('Task Created', '작업 생성')} checked={gchat.notifyOnTaskCreated} onChange={(v) => setGchat((s) => ({ ...s, notifyOnTaskCreated: v }))} />
                    <NotifToggle label={tx('Task Completed', '작업 완료')} checked={gchat.notifyOnTaskCompleted} onChange={(v) => setGchat((s) => ({ ...s, notifyOnTaskCompleted: v }))} />
                    <NotifToggle label={tx('Task Assigned', '작업 할당')} checked={gchat.notifyOnTaskAssigned} onChange={(v) => setGchat((s) => ({ ...s, notifyOnTaskAssigned: v }))} />
                    <NotifToggle label={tx('New Comment', '새 댓글 추가')} checked={gchat.notifyOnComment} onChange={(v) => setGchat((s) => ({ ...s, notifyOnComment: v }))} />
                    <NotifToggle label={tx('Status Change', '상태 변경')} checked={gchat.notifyOnStatusChange} onChange={(v) => setGchat((s) => ({ ...s, notifyOnStatusChange: v }))} />
                  </Box>

                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      variant="contained"
                      onClick={() => saveIntegrations('googleChat', gchat)}
                      disabled={saving}
                      sx={{
                        borderRadius: 3,
                        fontWeight: 700,
                        px: 4,
                        py: 1.2,
                        textTransform: 'none',
                        bgcolor: '#00AC47',
                        '&:hover': { bgcolor: '#008a39' },
                      }}
                    >
                      {tx('Enable Integration', 'Google Chat 활성화')}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={handleTestGChat}
                      disabled={!gchat.webhookUrl || testing}
                      sx={{ borderRadius: 3, fontWeight: 700, textTransform: 'none' }}
                    >
                      {tx('Save Google Chat Settings', 'Google Chat 설정 저장')}
                    </Button>
                  </Box>
                </Box>
              )}

              {/* --- App Notifications Config --- */}
              {tab === 4 && (
                <Box>
                  <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ width: 48, height: 48, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha('#3b82f6', 0.1), color: '#3b82f6' }}>
                        <NotificationsActiveIcon />
                      </Box>
                      <Box>
                        <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: -0.5 }}>
                          {tx('App Notifications', '앱 내 알림')}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {tx('Configure internal task-flow notification alerts.', '태스크플로우 내부 알림 설정을 관리합니다.')}
                        </Typography>
                      </Box>
                    </Box>
                    <Chip
                      label={inApp.enabled ? tx('Active', '활성화됨') : tx('Inactive', '비활성화됨')}
                      color={inApp.enabled ? 'success' : 'default'}
                      size="small"
                      sx={{ fontWeight: 700, borderRadius: 2 }}
                    />
                  </Box>

                  <Divider sx={{ mb: 4, opacity: 0.6 }} />

                  <FormControlLabel
                    control={<Switch checked={inApp.enabled} onChange={(_, v) => setInApp((s) => ({ ...s, enabled: v }))} />}
                    label={<Typography fontWeight={700}>{tx('Enable Internal Notifications', '내부 알림 활성화')}</Typography>}
                    sx={{ mb: 2 }}
                  />

                  <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 2, color: 'text.primary', mt: 2, letterSpacing: 0.5 }}>
                    {tx('EVENT TRIGGER SETTINGS', '이벤트 트리거 설정')}
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 4 }}>
                    <NotifToggle label={tx('Task Created', '작업 생성')} checked={inApp.notifyOnTaskCreated} onChange={(v) => setInApp((s) => ({ ...s, notifyOnTaskCreated: v }))} />
                    <NotifToggle label={tx('Task Completed', '작업 완료')} checked={inApp.notifyOnTaskCompleted} onChange={(v) => setInApp((s) => ({ ...s, notifyOnTaskCompleted: v }))} />
                    <NotifToggle label={tx('Task Assigned', '작업 할당')} checked={inApp.notifyOnTaskAssigned} onChange={(v) => setInApp((s) => ({ ...s, notifyOnTaskAssigned: v }))} />
                    <NotifToggle label={tx('New Comment', '새 댓글 추가')} checked={inApp.notifyOnComment} onChange={(v) => setInApp((s) => ({ ...s, notifyOnComment: v }))} />
                    <NotifToggle label={tx('Status Change', '상태 변경')} checked={inApp.notifyOnStatusChange} onChange={(v) => setInApp((s) => ({ ...s, notifyOnStatusChange: v }))} />
                  </Box>

                  <Box sx={{ mt: 4 }}>
                    <Button
                      variant="contained"
                      onClick={() => saveIntegrations('inApp', inApp)}
                      disabled={saving}
                      sx={{ borderRadius: 3, fontWeight: 700, px: 4, py: 1.2, bgcolor: '#3b82f6', '&:hover': { bgcolor: '#2563eb' } }}
                    >
                      {tx('Save Notification Settings', '알림 설정 저장')}
                    </Button>
                  </Box>
                </Box>
              )}

              {/* ─────── FIGMA CONFIG ─────── */}
              {tab === 3 && (
                <Box>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>
                    {tx('Figma API Authentication', 'Figma API 인증')}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                    <TextField
                      fullWidth
                      label={tx('Personal Access Token', '개인 액세스 토큰')}
                      type="password"
                      value={figma.accessToken}
                      onChange={(e) => setFigma((s) => ({ ...s, accessToken: e.target.value }))}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                    />
                    <Button
                      variant="outlined"
                      onClick={handleVerifyFigma}
                      disabled={!figma.accessToken || testing}
                      sx={{ borderRadius: 3, fontWeight: 700, px: 4 }}
                    >
                      {tx('Verify', '인증')}
                    </Button>
                  </Box>

                  {figmaUser && (
                    <Alert icon={<CheckCircleIcon fontSize="inherit" />} severity="success" sx={{ mb: 4, borderRadius: 3 }}>
                      {tx('Connected as', '인증된 사용자')}: <strong>{figmaUser}</strong>
                    </Alert>
                  )}

                  <Divider sx={{ my: 4 }} />

                  <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>
                    {tx('Connected Files', '연결된 디자인 파일')}
                  </Typography>

                  <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="https://www.figma.com/file/..."
                      value={figmaFileUrl}
                      onChange={(e) => setFigmaFileUrl(e.target.value)}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                    />
                    <Button
                      variant="contained"
                      onClick={handleAddFigmaFile}
                      disabled={!figmaFileUrl || !figma.accessToken || loadingFigma}
                      sx={{ borderRadius: 3, fontWeight: 700, px: 4, bgcolor: '#A259FF', '&:hover': { bgcolor: '#8e48e0' } }}
                    >
                      {tx('Add', '추가')}
                    </Button>
                  </Box>

                  {figma.projectFiles.length > 0 ? (
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 2.5 }}>
                      {figma.projectFiles.map((file) => (
                        <Card key={file.fileKey} sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
                          <CardMedia component="img" height="120" image={file.thumbnailUrl} sx={{ bgcolor: 'action.hover' }} />
                          <CardContent sx={{ p: 2, pb: '8px !important' }}>
                            <Typography variant="body2" fontWeight={700} noWrap>{file.fileName}</Typography>
                            <Typography variant="caption" color="text.secondary">{tx('Linked to Project', '프로젝트에 연결됨')}</Typography>
                          </CardContent>
                          <CardActions sx={{ px: 2, pb: 2 }}>
                            <IconButton size="small" onClick={() => window.open(figmaService.getFileUrl(file.fileKey), '_blank')}>
                              <OpenInNewIcon fontSize="small" />
                            </IconButton>
                            <Box sx={{ flex: 1 }} />
                            <Button size="small" color="error" onClick={() => handleRemoveFigmaFile(file.fileKey)}>
                              {tx('Unlink', '해제')}
                            </Button>
                          </CardActions>
                        </Card>
                      ))}
                    </Box>
                  ) : (
                    <Box sx={{ py: 6, textAlign: 'center', bgcolor: 'action.hover', borderRadius: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        {tx('No files linked yet. Add a Figma URL to get started.', '연결된 파일이 없습니다. Figma URL을 추가해보세요.')}
                      </Typography>
                    </Box>
                  )}
                  
                  <Box sx={{ mt: 4 }}>
                    <Button
                      variant="contained"
                      onClick={() => saveIntegrations('figma', figma)}
                      disabled={saving}
                      sx={{ borderRadius: 3, fontWeight: 700, px: 4, py: 1.2, bgcolor: '#A259FF', '&:hover': { bgcolor: '#8e48e0' } }}
                    >
                      {tx('Save Figma Workspace Settings', 'Figma 워크스페이스 설정 저장')}
                    </Button>
                  </Box>
                </Box>
              )}
            </Paper>
          </Box>
        </Fade>
      </Box>
    </Box>
  </Box>
  );
};

export default IntegrationsPage;
