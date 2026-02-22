// src/pages/GitHubPanel.tsx
import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Tabs, Tab, List, ListItem, ListItemText,
  Avatar, Button, IconButton, Chip, CircularProgress, TextField,
  alpha, Tooltip, Divider, Badge,
} from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';
import SyncIcon from '@mui/icons-material/Sync';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CommitIcon from '@mui/icons-material/Commit';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import BugReportIcon from '@mui/icons-material/BugReport';
import MergeIcon from '@mui/icons-material/Merge';
import SettingsIcon from '@mui/icons-material/Settings';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useLanguage } from '../contexts/LanguageContext';
import { githubService } from '../services/githubService';
import type { GitHubIssue, GitHubPullRequest, GitHubCommit } from '../types/github';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

const GitHubPanel = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { user } = useAuth();
  const { currentProject, currentWorkspace } = useWorkspace();
  const textByLang = useCallback((en: string, ko: string) => lang === 'ko' ? ko : en, [lang]);

  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [prs, setPrs] = useState<GitHubPullRequest[]>([]);
  const [commits, setCommits] = useState<GitHubCommit[]>([]);

  // Create issue state
  const [createTitle, setCreateTitle] = useState('');
  const [createBody, setCreateBody] = useState('');
  const [creating, setCreating] = useState(false);

  const ghToken = currentWorkspace?.githubConfig?.accessToken || '';
  const ghRepo = currentProject?.githubRepo;

  const fetchData = useCallback(async () => {
    if (!ghRepo || !ghToken) return;
    setLoading(true);
    try {
      const [issueData, prData, commitData] = await Promise.all([
        githubService.fetchRepoIssues(ghRepo.owner, ghRepo.name, ghToken),
        githubService.fetchPullRequests(ghRepo.owner, ghRepo.name, ghToken),
        githubService.fetchCommits(ghRepo.owner, ghRepo.name, ghToken, 30),
      ]);
      setIssues(issueData.filter(i => !i.pull_request));
      setPrs(prData);
      setCommits(commitData);
    } catch (err) {
      console.error(err);
      toast.error(textByLang('Failed to fetch GitHub data', 'GitHub 데이터 가져오기 실패'));
    } finally {
      setLoading(false);
    }
  }, [ghRepo, ghToken, textByLang]);

  useEffect(() => {
    if (ghRepo && ghToken) fetchData();
  }, [ghRepo, ghToken, fetchData]);

  const handleCreateIssue = async () => {
    if (!ghRepo || !ghToken || !createTitle.trim()) return;
    setCreating(true);
    try {
      const created = await githubService.createIssue(
        ghRepo.owner, ghRepo.name, ghToken,
        createTitle, createBody,
      );
      toast.success(textByLang(
        `Issue #${created.number} created on GitHub`,
        `GitHub에 이슈 #${created.number}이(가) 생성되었습니다`
      ));
      setCreateTitle('');
      setCreateBody('');
      setIssues(prev => [created, ...prev]);
      setTab(0); // switch to issues tab
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : '';
      toast.error(`${textByLang('Failed to create issue', '이슈 생성 실패')}${msg ? ': ' + msg : ''}`);
    } finally {
      setCreating(false);
    }
  };

  const handleImportIssue = async (issue: GitHubIssue) => {
    if (!currentWorkspace || !currentProject) return;
    try {
      const { addTaskToDB } = await import('../services/taskService');
      const taskData = githubService.mapIssueToTask(issue, currentProject.id, currentWorkspace.id);
      await addTaskToDB(taskData.text, user?.uid || '', new Date(), taskData.tags, {
        description: taskData.description,
        status: 'todo',
        projectId: currentProject.id,
        workspaceId: currentWorkspace.id,
        links: taskData.url ? [taskData.url] : [],
      });
      toast.success(textByLang('Issue imported as task', '이슈가 작업으로 등록되었습니다'));
      setIssues(prev => prev.filter(i => i.id !== issue.id));
    } catch (err) {
      console.error(err);
      toast.error(textByLang('Failed to import issue', '이슈 가져오기 실패'));
    }
  };

  // Not linked state
  if (!currentProject) {
    return (
      <Box sx={{ maxWidth: 700, mx: 'auto', py: 6, textAlign: 'center' }}>
        <GitHubIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
          {textByLang('Select a Project', '프로젝트를 선택하세요')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {textByLang(
            'Select a project from the sidebar to view its GitHub integration.',
            '사이드바에서 프로젝트를 선택하면 GitHub 연동 정보를 볼 수 있습니다.'
          )}
        </Typography>
      </Box>
    );
  }

  if (!ghToken) {
    return (
      <Box sx={{ maxWidth: 700, mx: 'auto', py: 6, textAlign: 'center' }}>
        <GitHubIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
          {textByLang('GitHub Token Not Set', 'GitHub 토큰 미설정')}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
          {textByLang(
            'A GitHub Personal Access Token is needed for this workspace. Once set, it applies to all projects automatically.',
            '이 워크스페이스에 GitHub 개인 액세스 토큰이 필요합니다. 한 번 설정하면 모든 프로젝트에 자동 적용됩니다.'
          )}
        </Typography>
        <Typography variant="caption" color="text.disabled" sx={{ mb: 3, display: 'block' }}>
          {textByLang(
            'Team Settings → GitHub Integration → Enter your PAT and click Save',
            '팀 설정 → GitHub Integration → PAT 입력 후 저장'
          )}
        </Typography>
        <Button
          variant="contained"
          startIcon={<SettingsIcon />}
          onClick={() => navigate('/team-settings')}
          sx={{ borderRadius: 2, fontWeight: 700, px: 3 }}
        >
          {textByLang('Set Up GitHub Token', 'GitHub 토큰 설정하기')}
        </Button>
      </Box>
    );
  }

  if (!ghRepo) {
    return (
      <Box sx={{ maxWidth: 700, mx: 'auto', py: 6, textAlign: 'center' }}>
        <GitHubIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
          {textByLang('Repository Not Linked', '저장소 미연결')}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
          {textByLang(
            `"${currentProject.name}" doesn't have a linked GitHub repository yet. Link one in Team Settings to see issues, PRs, and commits here.`,
            `"${currentProject.name}"에 연결된 GitHub 저장소가 없습니다. 팀 설정에서 저장소를 연결하면 이슈, PR, 커밋을 여기서 확인할 수 있습니다.`
          )}
        </Typography>
        <Typography variant="caption" color="text.disabled" sx={{ mb: 3, display: 'block' }}>
          {textByLang(
            'The GitHub token is already configured for this workspace ✓',
            '이 워크스페이스의 GitHub 토큰은 이미 설정되어 있습니다 ✓'
          )}
        </Typography>
        <Button
          variant="contained"
          startIcon={<SettingsIcon />}
          onClick={() => navigate('/team-settings')}
          sx={{ borderRadius: 2, fontWeight: 700, px: 3 }}
        >
          {textByLang('Link Repository', '저장소 연결하기')}
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', pb: 4 }}>
      {/* Header */}
      <Paper sx={{
        p: 3, mb: 3, borderRadius: 3,
        background: 'linear-gradient(135deg, #24292e 0%, #1a1e22 100%)',
        color: 'white',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.15)', width: 48, height: 48 }}>
            <GitHubIcon sx={{ fontSize: 28 }} />
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight={800}>
              {ghRepo.owner}/{ghRepo.name}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.7 }}>
              {textByLang(`Linked to project "${currentProject.name}"`, `"${currentProject.name}" 프로젝트에 연결됨`)}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title={textByLang('Refresh', '새로고침')}>
              <IconButton onClick={fetchData} disabled={loading} sx={{ color: 'white' }}>
                <SyncIcon className={loading ? 'spin-animation' : ''} />
              </IconButton>
            </Tooltip>
            <Tooltip title={textByLang('Open on GitHub', 'GitHub에서 열기')}>
              <IconButton onClick={() => window.open(ghRepo.url, '_blank')} sx={{ color: 'white' }}>
                <OpenInNewIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Stats */}
        <Box sx={{ display: 'flex', gap: 3, mt: 2 }}>
          {[
            { icon: <BugReportIcon sx={{ fontSize: 16 }} />, label: textByLang('Issues', '이슈'), count: issues.length, color: '#fbbf24' },
            { icon: <MergeIcon sx={{ fontSize: 16 }} />, label: textByLang('PRs', 'PR'), count: prs.length, color: '#34d399' },
            { icon: <CommitIcon sx={{ fontSize: 16 }} />, label: textByLang('Commits', '커밋'), count: commits.length, color: '#60a5fa' },
          ].map(stat => (
            <Box key={stat.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
              <Box sx={{ color: stat.color }}>{stat.icon}</Box>
              <Typography variant="body2" fontWeight={700}>{stat.count}</Typography>
              <Typography variant="caption" sx={{ opacity: 0.6 }}>{stat.label}</Typography>
            </Box>
          ))}
        </Box>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ px: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#6366f1', 0.02) }}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab
            icon={<Badge badgeContent={issues.length} color="warning" max={99}><BugReportIcon sx={{ fontSize: 18 }} /></Badge>}
            iconPosition="start"
            label={textByLang('Issues', '이슈')}
            sx={{ fontWeight: 700, textTransform: 'none' }}
          />
          <Tab
            icon={<Badge badgeContent={prs.length} color="success" max={99}><MergeIcon sx={{ fontSize: 18 }} /></Badge>}
            iconPosition="start"
            label={textByLang('Pull Requests', 'PR')}
            sx={{ fontWeight: 700, textTransform: 'none' }}
          />
          <Tab
            icon={<CommitIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label={textByLang('Commits', '커밋')}
            sx={{ fontWeight: 700, textTransform: 'none' }}
          />
          <Tab
            icon={<AddCircleOutlineIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label={textByLang('Create Issue', '이슈 생성')}
            sx={{ fontWeight: 700, textTransform: 'none' }}
          />
        </Tabs>

        <Box sx={{ p: 2, minHeight: 300 }}>
          {loading ? (
            <Box sx={{ py: 8, textAlign: 'center' }}>
              <CircularProgress size={32} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                {textByLang('Loading GitHub data...', 'GitHub 데이터 로딩 중...')}
              </Typography>
            </Box>
          ) : (
            <>
              {/* ── Issues Tab ── */}
              {tab === 0 && (
                <Box>
                  {issues.length === 0 ? (
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                      <BugReportIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                      <Typography variant="body1" color="text.secondary">
                        {textByLang('No open issues', '열린 이슈가 없습니다')}
                      </Typography>
                    </Box>
                  ) : (
                    <List disablePadding>
                      {issues.map((issue, i) => (
                        <Box key={issue.id}>
                          <ListItem sx={{ px: 1, gap: 1.5, py: 1.2 }}>
                            <Avatar src={issue.user.avatar_url} sx={{ width: 32, height: 32 }} />
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="body2" fontWeight={700}>{issue.title}</Typography>
                                  {issue.labels?.map(label => (
                                    <Chip
                                      key={label.name}
                                      label={label.name}
                                      size="small"
                                      sx={{
                                        height: 18, fontSize: '0.6rem', fontWeight: 700,
                                        bgcolor: `#${label.color}25`,
                                        color: `#${label.color}`,
                                        border: `1px solid #${label.color}40`,
                                      }}
                                    />
                                  ))}
                                </Box>
                              }
                              secondary={`#${issue.number} · ${issue.user.login} · ${new Date(issue.created_at).toLocaleDateString()}`}
                              secondaryTypographyProps={{ variant: 'caption' }}
                            />
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleImportIssue(issue)}
                              sx={{ flexShrink: 0, borderRadius: 2, fontWeight: 700, fontSize: '0.72rem', textTransform: 'none' }}
                            >
                              {textByLang('Import', '가져오기')}
                            </Button>
                            <IconButton size="small" onClick={() => window.open(issue.html_url, '_blank')}>
                              <OpenInNewIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </ListItem>
                          {i < issues.length - 1 && <Divider />}
                        </Box>
                      ))}
                    </List>
                  )}
                </Box>
              )}

              {/* ── PRs Tab ── */}
              {tab === 1 && (
                <Box>
                  {prs.length === 0 ? (
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                      <MergeIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                      <Typography variant="body1" color="text.secondary">
                        {textByLang('No open pull requests', '열린 PR이 없습니다')}
                      </Typography>
                    </Box>
                  ) : (
                    <List disablePadding>
                      {prs.map((pr, i) => (
                        <Box key={pr.id}>
                          <ListItem sx={{ px: 1, gap: 1.5, py: 1.2 }}>
                            <Avatar src={pr.user.avatar_url} sx={{ width: 32, height: 32 }} />
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="body2" fontWeight={700}>{pr.title}</Typography>
                                  <Chip
                                    label={pr.state}
                                    size="small"
                                    sx={{
                                      height: 18, fontSize: '0.6rem', fontWeight: 700,
                                      bgcolor: pr.state === 'open' ? alpha('#22c55e', 0.1) : alpha('#ef4444', 0.1),
                                      color: pr.state === 'open' ? '#16a34a' : '#dc2626',
                                    }}
                                  />
                                </Box>
                              }
                              secondary={
                                <Typography variant="caption" color="text.secondary">
                                  #{pr.number} · {pr.user.login} · <code style={{ fontSize: '0.7rem', background: '#f1f5f9', padding: '1px 4px', borderRadius: 3 }}>{pr.head.ref}</code> → <code style={{ fontSize: '0.7rem', background: '#f1f5f9', padding: '1px 4px', borderRadius: 3 }}>{pr.base.ref}</code>
                                </Typography>
                              }
                            />
                            <IconButton size="small" onClick={() => window.open(pr.html_url, '_blank')}>
                              <OpenInNewIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </ListItem>
                          {i < prs.length - 1 && <Divider />}
                        </Box>
                      ))}
                    </List>
                  )}
                </Box>
              )}

              {/* ── Commits Tab ── */}
              {tab === 2 && (
                <Box>
                  {commits.length === 0 ? (
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                      <CommitIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                      <Typography variant="body1" color="text.secondary">
                        {textByLang('No commits found', '커밋이 없습니다')}
                      </Typography>
                    </Box>
                  ) : (
                    <List disablePadding>
                      {commits.map((commit, i) => {
                        const message = commit.commit.message.split('\n')[0];
                        const timeAgo = getRelativeTime(commit.commit.author.date);
                        return (
                          <Box key={commit.sha}>
                            <ListItem sx={{ px: 1, gap: 1.5, py: 1 }}>
                              {commit.author ? (
                                <Avatar src={commit.author.avatar_url} sx={{ width: 28, height: 28 }} />
                              ) : (
                                <Avatar sx={{ width: 28, height: 28, fontSize: '0.7rem', bgcolor: '#e2e8f0' }}>?</Avatar>
                              )}
                              <ListItemText
                                primary={
                                  <Typography variant="body2" fontWeight={600} sx={{
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                  }}>
                                    {message}
                                  </Typography>
                                }
                                secondary={
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.3 }}>
                                    <Typography variant="caption" fontWeight={600} color="text.secondary">
                                      {commit.author?.login || commit.commit.author.name}
                                    </Typography>
                                    <Typography variant="caption" color="text.disabled">
                                      {timeAgo}
                                    </Typography>
                                  </Box>
                                }
                              />
                              <Chip
                                label={commit.sha.substring(0, 7)}
                                size="small"
                                onClick={() => window.open(commit.html_url, '_blank')}
                                sx={{
                                  height: 22, fontFamily: 'monospace', fontWeight: 700,
                                  fontSize: '0.7rem', cursor: 'pointer',
                                  bgcolor: alpha('#6366f1', 0.08), color: '#6366f1',
                                  '&:hover': { bgcolor: alpha('#6366f1', 0.15) },
                                }}
                              />
                              <IconButton size="small" onClick={() => window.open(commit.html_url, '_blank')}>
                                <OpenInNewIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </ListItem>
                            {i < commits.length - 1 && <Divider />}
                          </Box>
                        );
                      })}
                    </List>
                  )}
                </Box>
              )}

              {/* ── Create Issue Tab ── */}
              {tab === 3 && (
                <Box sx={{ maxWidth: 600 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                    {textByLang(
                      `Create a new issue on ${ghRepo.owner}/${ghRepo.name}`,
                      `${ghRepo.owner}/${ghRepo.name}에 새 이슈를 생성합니다`
                    )}
                  </Typography>
                  <TextField
                    fullWidth
                    label={textByLang('Issue Title', '이슈 제목')}
                    placeholder={textByLang('e.g. Fix login bug on mobile', '예: 모바일 로그인 버그 수정')}
                    value={createTitle}
                    onChange={e => setCreateTitle(e.target.value)}
                    sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                  />
                  <TextField
                    fullWidth
                    multiline
                    rows={5}
                    label={textByLang('Description (optional)', '설명 (선택사항)')}
                    placeholder={textByLang('Describe the issue in detail...', '이슈에 대해 자세히 설명하세요...')}
                    value={createBody}
                    onChange={e => setCreateBody(e.target.value)}
                    sx={{ mb: 3, '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                  />
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleCreateIssue}
                    disabled={!createTitle.trim() || creating}
                    startIcon={creating ? <CircularProgress size={18} /> : <GitHubIcon />}
                    sx={{
                      borderRadius: 2.5, fontWeight: 700, px: 4,
                      bgcolor: '#24292e',
                      '&:hover': { bgcolor: '#1a1e22' },
                    }}
                  >
                    {creating
                      ? textByLang('Creating...', '생성 중...')
                      : textByLang('Create Issue on GitHub', 'GitHub에 이슈 생성')}
                  </Button>
                </Box>
              )}
            </>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

/** Simple relative time formatter */
function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default GitHubPanel;
