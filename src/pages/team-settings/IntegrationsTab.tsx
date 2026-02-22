import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
    Box, Typography, Paper, List, ListItem, ListItemText,
    Avatar, Chip, IconButton, Tooltip, Button, TextField,
    Dialog, DialogTitle, DialogContent, DialogActions,
    Tabs, Tab, Select, MenuItem, FormControl, InputLabel,
    CircularProgress, alpha,
} from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import SyncIcon from '@mui/icons-material/Sync';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import FolderIcon from '@mui/icons-material/Folder';
import CommitIcon from '@mui/icons-material/Commit';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useLanguage } from '../../contexts/LanguageContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useAuth } from '../../contexts/AuthContext';
import { githubService } from '../../services/githubService';
import type { GitHubTokenInfo } from '../../services/githubService';
import type { GitHubRepo, GitHubIssue, GitHubPullRequest, GitHubCommit } from '../../types/github';
import HelpTooltip from '../../components/HelpTooltip';

const IntegrationsTab = () => {
    const { t, lang } = useLanguage();
    const textByLang = useCallback((enText: string, koText: string) => (lang === 'ko' ? koText : enText), [lang]);
    const { user } = useAuth();
    const {
        currentWorkspace, projects, refreshProjects,
        updateWorkspaceConfig,
    } = useWorkspace();

    // GitHub Integration state
    const [ghToken, setGhToken] = useState(currentWorkspace?.githubConfig?.accessToken || '');
    const [ghRepos, setGhRepos] = useState<GitHubRepo[]>([]);
    const [isFetchingRepos, setIsFetchingRepos] = useState(false);
    const [linkRepoOpen, setLinkRepoOpen] = useState(false);
    const [selectedRepoToLink, setSelectedRepoToLink] = useState<GitHubRepo | null>(null);
    const [targetProjectId, setTargetProjectId] = useState('');

    // GitHub token verification state
    const [ghTokenInfo, setGhTokenInfo] = useState<GitHubTokenInfo | null>(null);
    const [ghVerifying, setGhVerifying] = useState(false);

    // GitHub Sync state
    const [ghSyncOpen, setGhSyncOpen] = useState(false);
    const [ghSyncProjectId, setGhSyncProjectId] = useState('');
    const [ghSyncIssues, setGhSyncIssues] = useState<GitHubIssue[]>([]);
    const [ghSyncPRs, setGhSyncPRs] = useState<GitHubPullRequest[]>([]);
    const [ghSyncCommits, setGhSyncCommits] = useState<GitHubCommit[]>([]);
    const [ghSyncLoading, setGhSyncLoading] = useState(false);
    const [ghSyncTab, setGhSyncTab] = useState(0);

    // Create Issue dialog state
    const [createIssueTitle, setCreateIssueTitle] = useState('');
    const [createIssueBody, setCreateIssueBody] = useState('');
    const [creatingIssue, setCreatingIssue] = useState(false);

    useEffect(() => {
        if (currentWorkspace?.githubConfig?.accessToken) {
            setGhToken(currentWorkspace.githubConfig.accessToken);
            setGhVerifying(true);
            githubService.verifyToken(currentWorkspace.githubConfig.accessToken)
                .then(setGhTokenInfo)
                .finally(() => setGhVerifying(false));
        } else {
            setGhTokenInfo(null);
        }
    }, [currentWorkspace?.githubConfig?.accessToken]);

    const handleSaveGhToken = async () => {
        if (!currentWorkspace) return;
        try {
            await updateWorkspaceConfig({
                githubConfig: {
                    ...currentWorkspace.githubConfig,
                    accessToken: ghToken
                }
            });
            toast.success(textByLang('GitHub Settings Saved', 'GitHub 설정이 저장되었습니다'));
            if (ghToken.trim()) {
                setGhVerifying(true);
                const info = await githubService.verifyToken(ghToken);
                setGhTokenInfo(info);
                setGhVerifying(false);
                if (!info.valid) {
                    toast.error(textByLang(
                        `Token verification failed: ${info.error}`,
                        `토큰 검증 실패: ${info.error}`
                    ));
                }
            } else {
                setGhTokenInfo(null);
            }
        } catch (error) {
            console.error(error);
            toast.error(textByLang('Failed to save GitHub settings', 'GitHub 설정 저장 실패'));
        }
    };

    const handleFetchGhRepos = async () => {
        if (!ghToken) return;
        setIsFetchingRepos(true);
        try {
            const repos = await githubService.fetchUserRepos(ghToken);
            setGhRepos(repos);
        } catch (error) {
            console.error(error);
            toast.error(textByLang('Failed to fetch repositories', '저장소 목록 가져오기 실패'));
        } finally {
            setIsFetchingRepos(false);
        }
    };

    const handleLinkRepo = (repo: GitHubRepo) => {
        setSelectedRepoToLink(repo);
        setLinkRepoOpen(true);
    };

    const confirmLinkRepo = async () => {
        if (!selectedRepoToLink || !targetProjectId) return;
        try {
            const { updateProject } = await import('../../services/projectService');
            await updateProject(targetProjectId, { githubRepo: selectedRepoToLink });
            toast.success(textByLang('Repository linked successfully', '저장소가 성공적으로 연결되었습니다'));
            setLinkRepoOpen(false);
            setSelectedRepoToLink(null);
            refreshProjects();
        } catch (error) {
            console.error(error);
            toast.error(textByLang('Failed to link repository', '저장소 연결 실패'));
        }
    };

    const handleOpenGhSync = async (projectId: string) => {
        const project = projects.find(p => p.id === projectId);
        if (!project?.githubRepo || !ghToken) return;
        setGhSyncProjectId(projectId);
        setGhSyncOpen(true);
        setGhSyncLoading(true);
        setGhSyncTab(0);
        setCreateIssueTitle('');
        setCreateIssueBody('');
        try {
            const [issues, prs, commits] = await Promise.all([
                githubService.fetchRepoIssues(project.githubRepo.owner, project.githubRepo.name, ghToken),
                githubService.fetchPullRequests(project.githubRepo.owner, project.githubRepo.name, ghToken),
                githubService.fetchCommits(project.githubRepo.owner, project.githubRepo.name, ghToken, 20),
            ]);
            setGhSyncIssues(issues.filter(i => !i.pull_request));
            setGhSyncPRs(prs);
            setGhSyncCommits(commits);
        } catch (error) {
            console.error(error);
            toast.error(textByLang('Failed to sync from GitHub', 'GitHub 동기화 실패'));
        } finally {
            setGhSyncLoading(false);
        }
    };

    const handleImportGhIssue = async (issue: GitHubIssue) => {
        if (!currentWorkspace || !ghSyncProjectId || !user) return;
        try {
            const { addTaskToDB } = await import('../../services/taskService');
            const taskData = githubService.mapIssueToTask(issue, ghSyncProjectId, currentWorkspace.id);
            await addTaskToDB(taskData.text, user.uid, new Date(), taskData.tags, {
                description: taskData.description,
                status: 'todo',
                projectId: ghSyncProjectId,
                workspaceId: currentWorkspace.id,
                links: taskData.url ? [taskData.url] : [],
            });
            toast.success(textByLang('Issue imported as task', '이슈가 작업으로 등록되었습니다'));
            setGhSyncIssues(prev => prev.filter(i => i.id !== issue.id));
        } catch (error) {
            console.error(error);
            const msg = error instanceof Error ? error.message : '';
            toast.error(`${textByLang('Failed to import issue', '이슈 가져오기 실패')}${msg ? ': ' + msg : ''}`);
        }
    };

    const handleSyncPRs = async () => {
        if (!currentWorkspace || !ghSyncProjectId || !user) return;
        if (ghSyncPRs.length === 0) {
            toast.info(textByLang('No open PRs to sync', '동기화할 PR이 없습니다'));
            return;
        }
        const project = projects.find(p => p.id === ghSyncProjectId);
        if (!project) return;
        try {
            const { logActivity, buildActivityEntry } = await import('../../services/activityService');
            await Promise.all(
                ghSyncPRs.map(pr =>
                    logActivity(buildActivityEntry({
                        entityType: 'project',
                        entityId: ghSyncProjectId,
                        entityTitle: project.name,
                        action: 'created',
                        workspaceId: currentWorkspace.id,
                        userId: 'github_bot',
                        userName: `GitHub PR #${pr.number}: ${pr.user.login}`,
                        description: `${pr.title} → ${pr.base.ref} (${pr.html_url})`,
                    }))
                )
            );
            toast.success(textByLang(
                `${ghSyncPRs.length} PR(s) synced to activity feed`,
                `${ghSyncPRs.length}개 PR이 활동 피드에 동기화되었습니다`
            ));
            setGhSyncOpen(false);
        } catch (error) {
            console.error(error);
            const msg = error instanceof Error ? error.message : '';
            toast.error(`${textByLang('Failed to sync PRs', 'PR 동기화 실패')}${msg ? ': ' + msg : ''}`);
        }
    };

    const handleCreateGhIssue = async () => {
        const project = projects.find(p => p.id === ghSyncProjectId);
        if (!project?.githubRepo || !ghToken || !createIssueTitle.trim()) return;
        setCreatingIssue(true);
        try {
            const created = await githubService.createIssue(
                project.githubRepo.owner, project.githubRepo.name, ghToken,
                createIssueTitle, createIssueBody,
            );
            toast.success(textByLang(
                `Issue #${created.number} created on GitHub`,
                `GitHub에 이슈 #${created.number}이(가) 생성되었습니다`
            ));
            setCreateIssueTitle('');
            setCreateIssueBody('');
            setGhSyncIssues(prev => [created, ...prev]);
        } catch (error) {
            console.error(error);
            const msg = error instanceof Error ? error.message : '';
            toast.error(`${textByLang('Failed to create issue', '이슈 생성 실패')}${msg ? ': ' + msg : ''}`);
        } finally {
            setCreatingIssue(false);
        }
    };

    const handleUnlinkRepo = async (projectId: string) => {
        try {
            const { updateProject } = await import('../../services/projectService');
            await updateProject(projectId, { githubRepo: null as unknown as undefined });
            toast.success(textByLang('Repository unlinked', '저장소 연결이 해제되었습니다'));
            refreshProjects();
        } catch (error) {
            console.error(error);
            toast.error(textByLang('Failed to unlink repository', '저장소 연결 해제 실패'));
        }
    };

    const handleChangeLinkedRepo = (projectId: string) => {
        setTargetProjectId(projectId);
        setLinkRepoOpen(true);
    };

    if (!currentWorkspace) return null;

    return (
        <>
            <Paper sx={{ p: 4, borderRadius: 4, mb: 3, bgcolor: '#fbfbff', border: '1px solid', borderColor: alpha('#6366f1', 0.1) }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <Avatar sx={{ bgcolor: '#24292e', width: 48, height: 48 }}>
                        <GitHubIcon />
                    </Avatar>
                    <Box>
                        <Typography variant="h6" fontWeight={800}>GitHub Integration<HelpTooltip title="GitHub Integration" description={textByLang('Link your repositories to sync issues and pull requests directly into TaskFlow.', 'GitHub 저장소를 연결하여 이슈와 PR을 TaskFlow와 동기화하세요.')} /></Typography>
                        <Typography variant="body2" color="text.secondary">Link your GitHub repositories to TaskFlow projects</Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        💡 {textByLang(
                            'Includes personal repos, team repos, and org repos you have access to.',
                            '개인 저장소, 팀 저장소, 조직 저장소를 모두 가져옵니다.'
                        )}
                    </Typography>
                </Box>

                <Box sx={{ mb: 4 }}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <RocketLaunchIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                        Personal Access Token
                        <HelpTooltip
                            title="GitHub Token 발급 방법"
                            description={textByLang(
                                'A GitHub Personal Access Token (Classic) is required to access your repositories. It takes about 1 minute to create.',
                                'GitHub 저장소에 접근하기 위해 Personal Access Token (Classic)이 필요합니다. 약 1분이면 만들 수 있어요.'
                            )}
                            steps={lang === 'ko' ? [
                                'GitHub에 로그인 후 우측 상단 프로필 아이콘 클릭',
                                'Settings → Developer settings 클릭',
                                'Personal access tokens → Tokens (classic) 선택',
                                '"Generate new token (classic)" 클릭',
                                'Note(이름)에 "TaskFlow" 입력, 만료일 설정',
                                'scopes에서 "repo" 전체 체크 후 맨 아래 "Generate token" 클릭',
                                '생성된 토큰(ghp_로 시작)을 바로 복사해 여기에 붙여넣기 (이 토큰은 다시 볼 수 없음!)',
                            ] : [
                                'Log into GitHub, click your profile icon (top right)',
                                'Go to Settings → Developer settings',
                                'Select Personal access tokens → Tokens (classic)',
                                'Click "Generate new token (classic)"',
                                'Set a name (e.g. "TaskFlow") and expiration date',
                                'Check the "repo" scope (full control of private repositories)',
                                'Click "Generate token" and immediately paste the token here (you won\'t see it again!)',
                            ]}
                            link="https://github.com/settings/tokens/new?scopes=repo&description=TaskFlow"
                            linkLabel={textByLang('Open GitHub Token Settings →', 'GitHub 토큰 설정 바로가기 →')}
                            placement="bottom"
                        />
                    </Typography>
                    <TextField
                        fullWidth
                        type="password"
                        size="small"
                        placeholder="ghp_xxxxxxxxxxxx"
                        value={ghToken}
                        onChange={(e) => setGhToken(e.target.value)}
                        sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                    />

                    {/* Connection Status Banner */}
                    {ghVerifying && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, p: 1.5, borderRadius: 2, bgcolor: alpha('#6366f1', 0.06) }}>
                            <CircularProgress size={16} />
                            <Typography variant="caption" fontWeight={600}>
                                {textByLang('Verifying token...', '토큰 검증 중...')}
                            </Typography>
                        </Box>
                    )}
                    {!ghVerifying && ghTokenInfo && (
                        <Box sx={{
                            display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, p: 1.5, borderRadius: 2.5,
                            bgcolor: ghTokenInfo.valid
                                ? alpha('#10b981', 0.08)
                                : alpha('#ef4444', 0.08),
                            border: '1px solid',
                            borderColor: ghTokenInfo.valid
                                ? alpha('#10b981', 0.2)
                                : alpha('#ef4444', 0.2),
                        }}>
                            {ghTokenInfo.valid ? (
                                <>
                                    <CheckCircleIcon sx={{ color: '#10b981', fontSize: 20 }} />
                                    {ghTokenInfo.avatarUrl && (
                                        <Avatar src={ghTokenInfo.avatarUrl} sx={{ width: 24, height: 24 }} />
                                    )}
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography variant="caption" fontWeight={700} sx={{ display: 'block', color: '#059669' }}>
                                            ✅ {textByLang('Connected', '연동 완료')}
                                            {ghTokenInfo.login && ` — @${ghTokenInfo.login}`}
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.3 }}>
                                            {ghTokenInfo.scopes && ghTokenInfo.scopes.length > 0 && (
                                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                                    {textByLang('Scopes', '권한')}: {ghTokenInfo.scopes.join(', ')}
                                                </Typography>
                                            )}
                                            {ghTokenInfo.expiresAt ? (() => {
                                                const exp = new Date(ghTokenInfo.expiresAt);
                                                const now = new Date();
                                                const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                                                const isExpiringSoon = daysLeft <= 14;
                                                return (
                                                    <Typography variant="caption" sx={{
                                                        fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 0.3,
                                                        color: isExpiringSoon ? '#f59e0b' : 'text.secondary',
                                                        fontWeight: isExpiringSoon ? 700 : 400,
                                                    }}>
                                                        {isExpiringSoon && <WarningAmberIcon sx={{ fontSize: 12 }} />}
                                                        {textByLang('Expires', '만료')}: {exp.toLocaleDateString()}
                                                        {daysLeft > 0
                                                            ? ` (${daysLeft}${textByLang(' days left', '일 남음')})`
                                                            : ` (${textByLang('expired!', '만료됨!')})`}
                                                    </Typography>
                                                );
                                            })() : (
                                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                                    {textByLang('No expiration', '만료 없음')}
                                                </Typography>
                                            )}
                                        </Box>
                                    </Box>
                                </>
                            ) : (
                                <>
                                    <ErrorOutlineIcon sx={{ color: '#ef4444', fontSize: 20 }} />
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="caption" fontWeight={700} sx={{ color: '#dc2626' }}>
                                            ❌ {textByLang('Connection Failed', '인증 실패')}
                                        </Typography>
                                        {ghTokenInfo.error && (
                                            <Typography variant="caption" sx={{ display: 'block', color: '#ef4444', fontSize: '0.7rem' }}>
                                                {ghTokenInfo.error}
                                            </Typography>
                                        )}
                                    </Box>
                                </>
                            )}
                        </Box>
                    )}

                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                            variant="contained"
                            size="small"
                            onClick={handleSaveGhToken}
                            sx={{ borderRadius: 2, fontWeight: 700, px: 3 }}
                        >
                            {t('save') as string}
                        </Button>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={handleFetchGhRepos}
                            disabled={!ghToken || isFetchingRepos}
                            startIcon={<SyncIcon className={isFetchingRepos ? 'spin-animation' : ''} />}
                            sx={{ borderRadius: 2, fontWeight: 700 }}
                        >
                            {textByLang('Fetch Repositories', '저장소 목록 가져오기')}
                        </Button>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        💡 {textByLang(
                            'Includes personal repos, team repos, and org repos you have access to.',
                            '개인 저장소, 팀 저장소, 조직 저장소를 모두 가져옵니다.'
                        )}
                    </Typography>
                </Box>

                {ghRepos.length > 0 && (
                    <Box sx={{ mt: 4 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <Typography variant="subtitle2" fontWeight={700}>
                                {textByLang('Select a repository to link to a project', '프로젝트에 연결할 저장소 선택')}
                            </Typography>
                            <Typography variant="caption" sx={{
                                px: 1, py: 0.2, borderRadius: 1,
                                bgcolor: 'success.light', color: 'success.dark', fontWeight: 700
                            }}>
                                {ghRepos.length} {textByLang('repos', '개')}
                            </Typography>
                        </Box>
                        <List sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                            {ghRepos.map(repo => (
                                <Paper key={repo.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1.5, transition: 'all 0.2s', '&:hover': { bgcolor: alpha('#6366f1', 0.04), borderColor: 'primary.light' } }}>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography variant="body2" fontWeight={700} noWrap>{repo.name}</Typography>
                                        <Typography variant="caption" color="text.disabled" noWrap sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                                            <GitHubIcon sx={{ fontSize: 11 }} />
                                            {repo.owner}
                                        </Typography>
                                    </Box>
                                    <IconButton size="small" color="primary" onClick={() => handleLinkRepo(repo)}>
                                        <LinkIcon sx={{ fontSize: 18 }} />
                                    </IconButton>
                                </Paper>
                            ))}
                        </List>
                    </Box>
                )}
            </Paper>

            {/* Linked Projects Overview */}
            {(() => {
                const linkedProjects = projects.filter(p => p.githubRepo);
                const unlinkedProjects = projects.filter(p => !p.githubRepo);
                return (
                    <Paper sx={{ p: 3, borderRadius: 3, mb: 3, mt: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <LinkIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                            <Typography variant="subtitle1" fontWeight={700}>
                                {textByLang('Linked Projects', '연결된 프로젝트')}
                            </Typography>
                            <Chip
                                size="small"
                                label={`${linkedProjects.length} / ${projects.length}`}
                                sx={{
                                    fontWeight: 700, fontSize: '0.7rem',
                                    bgcolor: linkedProjects.length > 0 ? alpha('#10b981', 0.12) : alpha('#f59e0b', 0.12),
                                    color: linkedProjects.length > 0 ? '#059669' : '#d97706',
                                }}
                            />
                        </Box>

                        {linkedProjects.length === 0 ? (
                            <Box sx={{ py: 2, px: 2, borderRadius: 2, bgcolor: alpha('#f59e0b', 0.06), border: '1px dashed', borderColor: alpha('#f59e0b', 0.2) }}>
                                <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    ⚠️ {textByLang(
                                        'No projects linked yet. Fetch repositories above, then click the 🔗 link icon to connect a repo to a project.',
                                        '아직 연결된 프로젝트가 없습니다. 위에서 저장소를 가져온 후 🔗 아이콘을 클릭하여 프로젝트에 연결하세요.'
                                    )}
                                </Typography>
                            </Box>
                        ) : (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                {linkedProjects.map(proj => (
                                    <Box
                                        key={proj.id}
                                        sx={{
                                            display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5,
                                            borderRadius: 2.5, bgcolor: alpha('#10b981', 0.04),
                                            border: '1px solid', borderColor: alpha('#10b981', 0.15),
                                            transition: 'all 0.2s',
                                            '&:hover': { bgcolor: alpha('#10b981', 0.08) },
                                        }}
                                    >
                                        <CheckCircleIcon sx={{ color: '#10b981', fontSize: 18, flexShrink: 0 }} />
                                        <Avatar sx={{ bgcolor: proj.color + '25', color: proj.color, width: 28, height: 28 }}>
                                            <FolderIcon sx={{ fontSize: 16 }} />
                                        </Avatar>
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography variant="body2" fontWeight={700} noWrap>{proj.name}</Typography>
                                            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                                                <GitHubIcon sx={{ fontSize: 11 }} />
                                                {proj.githubRepo!.owner}/{proj.githubRepo!.name}
                                            </Typography>
                                        </Box>
                                        <Tooltip title={textByLang('Sync Issues & PRs', '이슈/PR 동기화')}>
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                startIcon={<SyncIcon sx={{ fontSize: 14 }} />}
                                                onClick={() => handleOpenGhSync(proj.id)}
                                                sx={{ borderRadius: 2, fontWeight: 700, fontSize: '0.72rem', textTransform: 'none', flexShrink: 0 }}
                                            >
                                                {textByLang('Sync', '동기화')}
                                            </Button>
                                        </Tooltip>
                                        <Tooltip title={textByLang('Change linked repo', '연결된 저장소 변경')}>
                                            <IconButton size="small" color="default" onClick={() => handleChangeLinkedRepo(proj.id)}>
                                                <SyncIcon sx={{ fontSize: 16 }} />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title={textByLang('Unlink repo', '저장소 연결 해제')}>
                                            <IconButton size="small" color="error" onClick={() => handleUnlinkRepo(proj.id)}>
                                                <LinkOffIcon sx={{ fontSize: 16 }} />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                ))}
                                {unlinkedProjects.length > 0 && (
                                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                                        💡 {textByLang(
                                            `${unlinkedProjects.length} project(s) not yet linked: ${unlinkedProjects.map(p => p.name).join(', ')}`,
                                            `${unlinkedProjects.length}개 프로젝트 미연결: ${unlinkedProjects.map(p => p.name).join(', ')}`
                                        )}
                                    </Typography>
                                )}
                            </Box>
                        )}
                    </Paper>
                );
            })()}

            {/* Workflow Guide */}
            <Paper sx={{ p: 3, borderRadius: 3, mb: 3, bgcolor: alpha('#6366f1', 0.02), border: '1px solid', borderColor: alpha('#6366f1', 0.08) }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    📋 {textByLang('How to Use GitHub Integration', 'GitHub 연동 사용 방법')}
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1.5 }}>
                    {[
                        {
                            step: 1,
                            icon: '🔑',
                            title: textByLang('Save Token', '토큰 저장'),
                            desc: textByLang('Enter your GitHub PAT and click Save', 'GitHub PAT를 입력하고 저장 클릭'),
                            done: !!ghTokenInfo?.valid,
                        },
                        {
                            step: 2,
                            icon: '📦',
                            title: textByLang('Fetch Repos', '저장소 가져오기'),
                            desc: textByLang('Click "Fetch Repositories" to load your repos', '"저장소 목록 가져오기" 버튼 클릭'),
                            done: ghRepos.length > 0,
                        },
                        {
                            step: 3,
                            icon: '🔗',
                            title: textByLang('Link to Project', '프로젝트에 연결'),
                            desc: textByLang('Click the link icon on a repo to connect it', '저장소의 🔗  아이콘 클릭하여 프로젝트에 연결'),
                            done: projects.some(p => p.githubRepo),
                        },
                        {
                            step: 4,
                            icon: '🔄',
                            title: textByLang('Sync & Import', '동기화'),
                            desc: textByLang('Click Sync on a linked project to import issues/PRs', '연결된 프로젝트의 동기화 버튼으로 이슈/PR 가져오기'),
                            done: false,
                        },
                    ].map(({ step, icon, title, desc, done }) => (
                        <Box key={step} sx={{
                            p: 1.5, borderRadius: 2.5, textAlign: 'center',
                            bgcolor: done ? alpha('#10b981', 0.06) : 'background.paper',
                            border: '1px solid',
                            borderColor: done ? alpha('#10b981', 0.2) : 'divider',
                            transition: 'all 0.2s',
                        }}>
                            <Typography sx={{ fontSize: '1.5rem', mb: 0.5 }}>{icon}</Typography>
                            <Box sx={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                width: 22, height: 22, borderRadius: '50%',
                                bgcolor: done ? '#10b981' : 'primary.main', color: 'white',
                                fontSize: '0.7rem', fontWeight: 800, mb: 0.5,
                            }}>
                                {done ? '✓' : step}
                            </Box>
                            <Typography variant="caption" fontWeight={700} sx={{ display: 'block' }}>{title}</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', lineHeight: 1.4 }}>
                                {desc}
                            </Typography>
                        </Box>
                    ))}
                </Box>
            </Paper>

            {/* GitHub Sync Dialog */}
            <Dialog open={ghSyncOpen} onClose={() => setGhSyncOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, pb: 0 }}>
                    <GitHubIcon />
                    {textByLang('GitHub Repository Sync', 'GitHub 저장소 동기화')}
                    <HelpTooltip title="GitHub Sync" description={textByLang('Import issues, view commits, create issues on GitHub, or sync PRs to the activity feed.', '이슈 가져오기, 커밋 확인, GitHub에 이슈 생성, PR 동기화를 할 수 있습니다.')} />
                </DialogTitle>
                <Tabs
                    value={ghSyncTab}
                    onChange={(_, v) => setGhSyncTab(v)}
                    sx={{ px: 3, borderBottom: '1px solid', borderColor: 'divider' }}
                    variant="scrollable"
                    scrollButtons="auto"
                >
                    <Tab label={`${textByLang('Issues', '이슈')} (${ghSyncIssues.length})`} sx={{ fontWeight: 700 }} />
                    <Tab label={`${textByLang('PRs', 'PR')} (${ghSyncPRs.length})`} sx={{ fontWeight: 700 }} />
                    <Tab icon={<CommitIcon sx={{ fontSize: 16 }} />} iconPosition="start" label={`${textByLang('Commits', '커밋')} (${ghSyncCommits.length})`} sx={{ fontWeight: 700 }} />
                    <Tab icon={<AddCircleOutlineIcon sx={{ fontSize: 16 }} />} iconPosition="start" label={textByLang('Create Issue', '이슈 생성')} sx={{ fontWeight: 700 }} />
                </Tabs>
                <DialogContent sx={{ minHeight: 300 }}>
                    {ghSyncLoading ? (
                        <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress size={30} /></Box>
                    ) : (
                        <>
                            {/* Tab 0: Issues */}
                            {ghSyncTab === 0 && (
                                <Box>
                                    {ghSyncIssues.length === 0 ? (
                                        <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                                            {textByLang('No open issues found.', '열린 이슈가 없습니다.')}
                                        </Typography>
                                    ) : (
                                        <List dense sx={{ bgcolor: '#f8fafc', borderRadius: 2 }}>
                                            {ghSyncIssues.map(issue => (
                                                <ListItem key={issue.id} divider sx={{ gap: 1 }}>
                                                    <Avatar src={issue.user.avatar_url} sx={{ width: 24, height: 24 }} />
                                                    <ListItemText
                                                        primary={issue.title}
                                                        secondary={`#${issue.number} by ${issue.user.login} · ${new Date(issue.created_at).toLocaleDateString()}`}
                                                        primaryTypographyProps={{ fontWeight: 600, fontSize: '0.85rem' }}
                                                    />
                                                    <Button size="small" variant="outlined" onClick={() => handleImportGhIssue(issue)} sx={{ flexShrink: 0, fontSize: '0.75rem' }}>
                                                        {textByLang('Import', '가져오기')}
                                                    </Button>
                                                    <IconButton size="small" onClick={() => window.open(issue.html_url, '_blank')}>
                                                        <OpenInNewIcon sx={{ fontSize: 16 }} />
                                                    </IconButton>
                                                </ListItem>
                                            ))}
                                        </List>
                                    )}
                                </Box>
                            )}

                            {/* Tab 1: PRs */}
                            {ghSyncTab === 1 && (
                                <Box>
                                    {ghSyncPRs.length === 0 ? (
                                        <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                                            {textByLang('No open PRs found.', '열린 PR이 없습니다.')}
                                        </Typography>
                                    ) : (
                                        <>
                                            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                                                {textByLang('Click "Sync PRs" to log these as workspace activities.', 'PR 동기화를 누르면 워크스페이스 활동으로 기록됩니다.')}
                                            </Typography>
                                            <List dense sx={{ bgcolor: '#f8fafc', borderRadius: 2 }}>
                                                {ghSyncPRs.map(pr => (
                                                    <ListItem key={pr.id} divider sx={{ gap: 1 }}>
                                                        <Avatar src={pr.user.avatar_url} sx={{ width: 24, height: 24 }} />
                                                        <ListItemText
                                                            primary={pr.title}
                                                            secondary={`#${pr.number} by ${pr.user.login} · ${pr.head.ref} → ${pr.base.ref}`}
                                                            primaryTypographyProps={{ fontWeight: 600, fontSize: '0.85rem' }}
                                                        />
                                                        <IconButton size="small" onClick={() => window.open(pr.html_url, '_blank')}>
                                                            <OpenInNewIcon sx={{ fontSize: 16 }} />
                                                        </IconButton>
                                                    </ListItem>
                                                ))}
                                            </List>
                                            <Box sx={{ mt: 2, textAlign: 'right' }}>
                                                <Button variant="contained" onClick={handleSyncPRs} disabled={ghSyncPRs.length === 0} startIcon={<SyncIcon />}>
                                                    {textByLang('Sync PRs to Activity Feed', 'PR을 활동 피드에 동기화')}
                                                </Button>
                                            </Box>
                                        </>
                                    )}
                                </Box>
                            )}

                            {/* Tab 2: Commits */}
                            {ghSyncTab === 2 && (
                                <Box>
                                    {ghSyncCommits.length === 0 ? (
                                        <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                                            {textByLang('No commits found.', '커밋이 없습니다.')}
                                        </Typography>
                                    ) : (
                                        <List dense sx={{ bgcolor: '#f8fafc', borderRadius: 2 }}>
                                            {ghSyncCommits.map(commit => (
                                                <ListItem key={commit.sha} divider sx={{ gap: 1 }}>
                                                    {commit.author ? (
                                                        <Avatar src={commit.author.avatar_url} sx={{ width: 24, height: 24 }} />
                                                    ) : (
                                                        <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem' }}>?</Avatar>
                                                    )}
                                                    <ListItemText
                                                        primary={commit.commit.message.split('\n')[0]}
                                                        secondary={
                                                            <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                <Typography component="span" variant="caption" fontWeight={600}>
                                                                    {commit.author?.login || commit.commit.author.name}
                                                                </Typography>
                                                                <Typography component="span" variant="caption" color="text.disabled">
                                                                    {new Date(commit.commit.author.date).toLocaleString()}
                                                                </Typography>
                                                                <Chip label={commit.sha.substring(0, 7)} size="small" sx={{ height: 18, fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 700 }} />
                                                            </Box>
                                                        }
                                                        primaryTypographyProps={{ fontWeight: 600, fontSize: '0.85rem', noWrap: true }}
                                                    />
                                                    <IconButton size="small" onClick={() => window.open(commit.html_url, '_blank')}>
                                                        <OpenInNewIcon sx={{ fontSize: 16 }} />
                                                    </IconButton>
                                                </ListItem>
                                            ))}
                                        </List>
                                    )}
                                </Box>
                            )}

                            {/* Tab 3: Create Issue */}
                            {ghSyncTab === 3 && (
                                <Box sx={{ py: 1 }}>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                        {textByLang(
                                            'Create a new issue directly on the linked GitHub repository.',
                                            '연결된 GitHub 저장소에 새 이슈를 바로 생성합니다.'
                                        )}
                                    </Typography>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label={textByLang('Issue Title', '이슈 제목')}
                                        placeholder={textByLang('e.g. Fix login bug on mobile', '예: 모바일 로그인 버그 수정')}
                                        value={createIssueTitle}
                                        onChange={e => setCreateIssueTitle(e.target.value)}
                                        sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                    />
                                    <TextField
                                        fullWidth
                                        multiline
                                        rows={4}
                                        size="small"
                                        label={textByLang('Description (optional)', '설명 (선택사항)')}
                                        placeholder={textByLang('Describe the issue in detail...', '이슈에 대해 자세히 설명하세요...')}
                                        value={createIssueBody}
                                        onChange={e => setCreateIssueBody(e.target.value)}
                                        sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                    />
                                    <Button
                                        variant="contained"
                                        onClick={handleCreateGhIssue}
                                        disabled={!createIssueTitle.trim() || creatingIssue}
                                        startIcon={creatingIssue ? <CircularProgress size={16} /> : <GitHubIcon />}
                                        sx={{ borderRadius: 2, fontWeight: 700, px: 3 }}
                                    >
                                        {creatingIssue
                                            ? textByLang('Creating...', '생성 중...')
                                            : textByLang('Create Issue on GitHub', 'GitHub에 이슈 생성')}
                                    </Button>
                                </Box>
                            )}
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setGhSyncOpen(false)}>{t('close') as string || textByLang('Close', '닫기')}</Button>
                </DialogActions>
            </Dialog>

            {/* Link Repo Dialog */}
            <Dialog open={linkRepoOpen} onClose={() => setLinkRepoOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>{textByLang('Link Repository', '저장소 연결')}</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {textByLang('Select a project to link with', '연결할 프로젝트를 선택하세요')}: <strong>{selectedRepoToLink?.name}</strong>
                    </Typography>
                    <FormControl fullWidth size="small">
                        <InputLabel>{t('projects') as string}</InputLabel>
                        <Select value={targetProjectId} onChange={(e) => setTargetProjectId(e.target.value as string)} label={t('projects') as string}>
                            {projects.map(p => (
                                <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setLinkRepoOpen(false)}>{t('cancel') as string}</Button>
                    <Button variant="contained" onClick={confirmLinkRepo} disabled={!targetProjectId}>{textByLang('Link', '연결')}</Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default IntegrationsTab;
