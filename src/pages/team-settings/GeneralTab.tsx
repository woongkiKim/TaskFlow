import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { ROLE_CONFIG, ROLE_HIERARCHY } from '../../types';
import type { MemberRole } from '../../types';
import {
    Box, Typography, Paper, List, ListItem, ListItemAvatar, ListItemText,
    Avatar, Chip, IconButton, Tooltip, Button, TextField,
    Dialog, DialogTitle, DialogContent, DialogActions,
    ToggleButtonGroup, ToggleButton, Select, MenuItem, FormControl, AvatarGroup,
    InputAdornment, Collapse, Badge, Divider, alpha,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import PeopleIcon from '@mui/icons-material/People';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import PersonIcon from '@mui/icons-material/Person';
import { useLanguage } from '../../contexts/LanguageContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { regenerateInviteCode, createTeamGroup, assignMemberToTeam, removeMemberFromTeam, updateMemberRole } from '../../services/workspaceService';
import { TG_COLORS } from '../../constants/colors';
import HelpTooltip from '../../components/HelpTooltip';
import InviteDialog from '../../components/InviteDialog';
import { useAuth } from '../../contexts/AuthContext';

const GeneralTab = () => {
    const { t, lang } = useLanguage();
    const textByLang = useCallback((enText: string, koText: string) => (lang === 'ko' ? koText : enText), [lang]);
    const { user } = useAuth();
    const {
        currentWorkspace, currentMembers, teamGroups,
        refreshTeamGroups, refreshMembers,
    } = useWorkspace();

    // Member Directory state
    const [memberSearch, setMemberSearch] = useState('');
    const [memberTeamFilter, setMemberTeamFilter] = useState<string>('all');
    const [memberViewMode, setMemberViewMode] = useState<'list' | 'grouped'>('grouped');
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
    const [inviteOpen, setInviteOpen] = useState(false);
    const [createTGOpen, setCreateTGOpen] = useState(false);
    const [newTGName, setNewTGName] = useState('');
    const [newTGColor, setNewTGColor] = useState(TG_COLORS[0]);
    const [inviteCode, setInviteCode] = useState(currentWorkspace?.inviteCode || '');

    const myRole = currentMembers.find(m => m.uid === user?.uid)?.role || 'member';
    const canManageRoles = myRole === 'owner' || myRole === 'admin';

    const copyCode = () => { navigator.clipboard.writeText(inviteCode); toast.success(t('copied') as string); };

    const handleRegenerateCode = async () => {
        if (!currentWorkspace) return;
        const newCode = await regenerateInviteCode(currentWorkspace.id);
        setInviteCode(newCode);
    };

    const handleCreateTG = async () => {
        if (!newTGName.trim() || !currentWorkspace) return;
        await createTeamGroup(currentWorkspace.id, newTGName.trim(), newTGColor);
        await refreshTeamGroups();
        setCreateTGOpen(false); setNewTGName('');
    };

    const handleAssignTeam = async (memberUid: string, newTeamId: string) => {
        for (const tg of teamGroups) {
            if (tg.memberIds?.includes(memberUid)) {
                await removeMemberFromTeam(tg.id, memberUid);
            }
        }
        if (newTeamId !== 'none') {
            await assignMemberToTeam(newTeamId, memberUid);
        }
        await refreshTeamGroups();
    };

    const getMemberTeam = (uid: string) => {
        const tg = teamGroups.find(g => g.memberIds?.includes(uid));
        return tg?.id || 'none';
    };

    const toggleGroupCollapse = useCallback((groupId: string) => {
        setCollapsedGroups(prev => {
            const next = new Set(prev);
            if (next.has(groupId)) next.delete(groupId);
            else next.add(groupId);
            return next;
        });
    }, []);

    const filteredMembers = useMemo(() => {
        let members = currentMembers;
        if (memberSearch.trim()) {
            const q = memberSearch.toLowerCase();
            members = members.filter(m =>
                m.displayName.toLowerCase().includes(q) ||
                m.email.toLowerCase().includes(q)
            );
        }
        if (memberTeamFilter !== 'all') {
            if (memberTeamFilter === 'none') {
                members = members.filter(m => !teamGroups.some(g => g.memberIds?.includes(m.uid)));
            } else {
                const tg = teamGroups.find(g => g.id === memberTeamFilter);
                members = members.filter(m => tg?.memberIds?.includes(m.uid));
            }
        }
        return members;
    }, [currentMembers, memberSearch, memberTeamFilter, teamGroups]);

    const groupedMembers = useMemo(() => {
        const groups: { id: string; name: string; color: string; members: typeof currentMembers }[] = [];
        for (const tg of teamGroups) {
            const tgMembers = filteredMembers.filter(m => tg.memberIds?.includes(m.uid));
            if (tgMembers.length > 0) {
                groups.push({ id: tg.id, name: tg.name, color: tg.color, members: tgMembers });
            }
        }
        const unassigned = filteredMembers.filter(m => !teamGroups.some(g => g.memberIds?.includes(m.uid)));
        if (unassigned.length > 0) {
            groups.push({ id: 'none', name: textByLang('No Team', '팀 미배정'), color: '#9e9e9e', members: unassigned });
        }
        return groups;
    }, [filteredMembers, teamGroups, textByLang]);

    if (!currentWorkspace) return null;

    return (
        <>
            {/* Invite Code */}
            <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>{t('inviteCode') as string}<HelpTooltip title={textByLang('Invite Code', '초대 코드')} description={textByLang('Share this code with teammates so they can join your workspace. You can regenerate it anytime for security.', '이 코드를 팀원에게 공유하면 워크스페이스에 참여할 수 있습니다. 보안을 위해 언제든 코드를 재발급할 수 있습니다.')} /></Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{t('inviteCodeDesc') as string}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'grey.100', p: 2, borderRadius: 2 }}>
                    <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: 6, fontFamily: 'monospace', flex: 1 }}>{inviteCode}</Typography>
                    <Tooltip title={t('copyCode') as string}><IconButton onClick={copyCode}><ContentCopyIcon /></IconButton></Tooltip>
                    <Tooltip title={t('regenerateCode') as string}><IconButton onClick={handleRegenerateCode}><RefreshIcon /></IconButton></Tooltip>
                </Box>
            </Paper>

            {/* Member Directory */}
            <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PeopleIcon sx={{ color: 'primary.main' }} />
                        <Typography variant="subtitle1" fontWeight={700}>
                            {textByLang('Member Directory', '멤버 디렉토리')}
                        </Typography>
                        <Chip label={`${currentMembers.length}`} size="small" sx={{ fontWeight: 700, fontSize: '0.75rem', height: 22, bgcolor: 'primary.main', color: 'white' }} />
                        <HelpTooltip title={textByLang('Member Directory', '멤버 디렉토리')} description={textByLang(
                            'Search and manage workspace members. Use the team filter, switch between list and grouped views, and assign members to teams.',
                            '워크스페이스 멤버를 검색하고 관리합니다. 팀 필터를 사용하고, 리스트/그룹 뷰를 전환하며, 멤버를 팀에 배정할 수 있습니다.'
                        )} />
                    </Box>
                    <Button size="small" startIcon={<AddIcon />} onClick={() => setCreateTGOpen(true)}
                        sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                        {t('createTeamGroup') as string}
                    </Button>
                </Box>

                {/* Search & Filters Bar */}
                <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                    <TextField
                        size="small"
                        placeholder={textByLang('Search by name or email...', '이름 또는 이메일로 검색...')}
                        value={memberSearch}
                        onChange={e => setMemberSearch(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                                </InputAdornment>
                            ),
                        }}
                        sx={{
                            flex: 1, minWidth: 200,
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 2, height: 36, fontSize: '0.85rem',
                                bgcolor: 'action.hover',
                                '& fieldset': { borderColor: 'transparent' },
                                '&:hover fieldset': { borderColor: 'divider' },
                                '&.Mui-focused fieldset': { borderColor: 'primary.main' },
                            },
                        }}
                    />
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                        <Select
                            value={memberTeamFilter}
                            onChange={e => setMemberTeamFilter(e.target.value)}
                            sx={{
                                fontSize: '0.8rem', height: 36, borderRadius: 2, bgcolor: 'action.hover',
                                '& fieldset': { borderColor: 'transparent' },
                                '&:hover fieldset': { borderColor: 'divider' },
                            }}
                            displayEmpty
                        >
                            <MenuItem value="all" sx={{ fontSize: '0.8rem' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <PeopleIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                    {textByLang('All Teams', '전체 팀')}
                                </Box>
                            </MenuItem>
                            {teamGroups.map(tg => (
                                <MenuItem key={tg.id} value={tg.id} sx={{ fontSize: '0.8rem' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: tg.color }} />
                                        {tg.name}
                                        <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                                            ({currentMembers.filter(m => tg.memberIds?.includes(m.uid)).length})
                                        </Typography>
                                    </Box>
                                </MenuItem>
                            ))}
                            <MenuItem value="none" sx={{ fontSize: '0.8rem' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <PersonIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                                    <em>{textByLang('No Team', '팀 미배정')}</em>
                                </Box>
                            </MenuItem>
                        </Select>
                    </FormControl>
                    <ToggleButtonGroup
                        value={memberViewMode}
                        exclusive
                        onChange={(_, v) => { if (v) setMemberViewMode(v); }}
                        size="small"
                        sx={{ height: 36, '& .MuiToggleButton-root': { px: 1.2 } }}
                    >
                        <ToggleButton value="list">
                            <Tooltip title={textByLang('List View', '리스트 뷰')}><ViewListIcon sx={{ fontSize: 20 }} /></Tooltip>
                        </ToggleButton>
                        <ToggleButton value="grouped">
                            <Tooltip title={textByLang('Team View', '팀별 뷰')}><ViewModuleIcon sx={{ fontSize: 20 }} /></Tooltip>
                        </ToggleButton>
                    </ToggleButtonGroup>
                </Box>

                {/* Results summary */}
                {memberSearch.trim() && (
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                        {textByLang(
                            `${filteredMembers.length} of ${currentMembers.length} members found`,
                            `${currentMembers.length}명 중 ${filteredMembers.length}명 표시`
                        )}
                    </Typography>
                )}

                {/* ===== LIST VIEW ===== */}
                {memberViewMode === 'list' && (
                    <List disablePadding>
                        {filteredMembers.map((m, i) => {
                            const memberTeamGroup = teamGroups.find(g => g.memberIds?.includes(m.uid));
                            return (
                                <Box key={m.uid}>
                                    <ListItem sx={{ px: 0, py: 1 }}>
                                        <ListItemAvatar>
                                            <Badge
                                                overlap="circular"
                                                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                                badgeContent={
                                                    memberTeamGroup ? (
                                                        <Box sx={{
                                                            width: 12, height: 12, borderRadius: '50%',
                                                            bgcolor: memberTeamGroup.color,
                                                            border: '2px solid white',
                                                        }} />
                                                    ) : null
                                                }
                                            >
                                                <Avatar src={m.photoURL} sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
                                                    {m.displayName.charAt(0)}
                                                </Avatar>
                                            </Badge>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <Typography fontWeight={600} fontSize="0.9rem">{m.displayName}</Typography>
                                                    <Chip
                                                        label={ROLE_CONFIG[m.role]?.label || m.role}
                                                        size="small"
                                                        sx={{
                                                            fontWeight: 700, height: 20, fontSize: '0.65rem',
                                                            bgcolor: ROLE_CONFIG[m.role]?.bgColor, color: ROLE_CONFIG[m.role]?.color,
                                                        }}
                                                    />
                                                </Box>
                                            }
                                            secondary={
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.2 }}>
                                                    <Typography variant="caption" color="text.secondary">{m.email}</Typography>
                                                    {memberTeamGroup && (
                                                        <Chip label={memberTeamGroup.name} size="small"
                                                            sx={{ height: 18, fontSize: '0.65rem', fontWeight: 600, bgcolor: alpha(memberTeamGroup.color, 0.12), color: memberTeamGroup.color }} />
                                                    )}
                                                </Box>
                                            }
                                        />
                                        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                                            <FormControl size="small" sx={{ minWidth: 110 }}>
                                                <Select
                                                    value={getMemberTeam(m.uid)}
                                                    onChange={e => handleAssignTeam(m.uid, e.target.value)}
                                                    sx={{
                                                        fontSize: '0.75rem', height: 30, borderRadius: 1.5,
                                                        '& .MuiSelect-select': { py: 0.3 },
                                                    }}
                                                >
                                                    <MenuItem value="none" sx={{ fontSize: '0.75rem' }}>
                                                        <em>{textByLang('No Team', '팀 없음')}</em>
                                                    </MenuItem>
                                                    {teamGroups.map(tg => (
                                                        <MenuItem key={tg.id} value={tg.id} sx={{ fontSize: '0.75rem' }}>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: tg.color }} />
                                                                {tg.name}
                                                            </Box>
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                            {canManageRoles && m.role !== 'owner' && (
                                                <FormControl size="small" sx={{ minWidth: 110 }}>
                                                    <Select value={m.role}
                                                        onChange={async (e) => {
                                                            await updateMemberRole(currentWorkspace!.id, m.uid, e.target.value as MemberRole);
                                                            await refreshMembers();
                                                        }}
                                                        sx={{ fontSize: '0.7rem', height: 30, borderRadius: 1.5, '& .MuiSelect-select': { py: 0.3 } }}>
                                                        {ROLE_HIERARCHY.filter(r => r !== 'owner').map(r => (
                                                            <MenuItem key={r} value={r} sx={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: ROLE_CONFIG[r].color, display: 'inline-block', mr: 0.5 }} />
                                                                {ROLE_CONFIG[r].label}
                                                            </MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                            )}
                                        </Box>
                                    </ListItem>
                                    {i < filteredMembers.length - 1 && <Divider sx={{ opacity: 0.5 }} />}
                                </Box>
                            );
                        })}
                        {filteredMembers.length === 0 && (
                            <Box sx={{ py: 4, textAlign: 'center' }}>
                                <PersonIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                                <Typography variant="body2" color="text.secondary">
                                    {memberSearch.trim()
                                        ? textByLang('No members found', '검색 결과가 없습니다')
                                        : textByLang('No members yet', '멤버가 없습니다')}
                                </Typography>
                            </Box>
                        )}
                    </List>
                )}

                {/* ===== GROUPED VIEW ===== */}
                {memberViewMode === 'grouped' && (
                    <Box>
                        {groupedMembers.map((group) => {
                            const isCollapsed = collapsedGroups.has(group.id);
                            return (
                                <Box key={group.id} sx={{ mb: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                                    {/* Group Header */}
                                    <Box
                                        onClick={() => toggleGroupCollapse(group.id)}
                                        sx={{
                                            display: 'flex', alignItems: 'center', gap: 1,
                                            px: 2, py: 1.2, cursor: 'pointer',
                                            bgcolor: alpha(group.color, 0.06),
                                            '&:hover': { bgcolor: alpha(group.color, 0.12) },
                                            transition: 'background-color 0.2s',
                                        }}
                                    >
                                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: group.color, flexShrink: 0 }} />
                                        <Typography fontWeight={700} fontSize="0.85rem" sx={{ flex: 1 }}>
                                            {group.name}
                                        </Typography>
                                        <Chip label={`${group.members.length}`} size="small"
                                            sx={{ fontWeight: 700, height: 22, fontSize: '0.7rem', bgcolor: alpha(group.color, 0.15), color: group.color }} />
                                        <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 24, height: 24, fontSize: '0.6rem', border: '2px solid white' } }}>
                                            {group.members.map(m => (
                                                <Avatar key={m.uid} src={m.photoURL} sx={{ bgcolor: group.color }}>
                                                    {m.displayName.charAt(0)}
                                                </Avatar>
                                            ))}
                                        </AvatarGroup>
                                        {isCollapsed ? <ExpandMoreIcon sx={{ fontSize: 20, color: 'text.secondary' }} /> : <ExpandLessIcon sx={{ fontSize: 20, color: 'text.secondary' }} />}
                                    </Box>

                                    {/* Group Members */}
                                    <Collapse in={!isCollapsed}>
                                        <List disablePadding sx={{ px: 1 }}>
                                            {group.members.map((m, i) => (
                                                <Box key={m.uid}>
                                                    <ListItem sx={{ px: 1, py: 0.8 }}>
                                                        <ListItemAvatar sx={{ minWidth: 44 }}>
                                                            <Avatar src={m.photoURL} sx={{ bgcolor: 'primary.main', width: 34, height: 34, fontSize: '0.85rem' }}>
                                                                {m.displayName.charAt(0)}
                                                            </Avatar>
                                                        </ListItemAvatar>
                                                        <ListItemText
                                                            primary={
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                    <Typography fontWeight={600} fontSize="0.85rem">{m.displayName}</Typography>
                                                                    <Chip
                                                                        label={ROLE_CONFIG[m.role]?.label || m.role}
                                                                        size="small"
                                                                        sx={{
                                                                            fontWeight: 700, height: 18, fontSize: '0.6rem',
                                                                            bgcolor: ROLE_CONFIG[m.role]?.bgColor, color: ROLE_CONFIG[m.role]?.color,
                                                                        }}
                                                                    />
                                                                </Box>
                                                            }
                                                            secondary={<Typography variant="caption" color="text.secondary" fontSize="0.75rem">{m.email}</Typography>}
                                                        />
                                                        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                                                            <FormControl size="small" sx={{ minWidth: 100 }}>
                                                                <Select
                                                                    value={getMemberTeam(m.uid)}
                                                                    onChange={e => handleAssignTeam(m.uid, e.target.value)}
                                                                    sx={{
                                                                        fontSize: '0.7rem', height: 28, borderRadius: 1.5,
                                                                        '& .MuiSelect-select': { py: 0.2 },
                                                                    }}
                                                                >
                                                                    <MenuItem value="none" sx={{ fontSize: '0.7rem' }}>
                                                                        <em>{textByLang('No Team', '팀 없음')}</em>
                                                                    </MenuItem>
                                                                    {teamGroups.map(tg => (
                                                                        <MenuItem key={tg.id} value={tg.id} sx={{ fontSize: '0.7rem' }}>
                                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: tg.color }} />
                                                                                {tg.name}
                                                                            </Box>
                                                                        </MenuItem>
                                                                    ))}
                                                                </Select>
                                                            </FormControl>
                                                            {canManageRoles && m.role !== 'owner' && (
                                                                <FormControl size="small" sx={{ minWidth: 100 }}>
                                                                    <Select value={m.role}
                                                                        onChange={async (e) => {
                                                                            await updateMemberRole(currentWorkspace!.id, m.uid, e.target.value as MemberRole);
                                                                            await refreshMembers();
                                                                        }}
                                                                        sx={{ fontSize: '0.65rem', height: 28, borderRadius: 1.5, '& .MuiSelect-select': { py: 0.2 } }}>
                                                                        {ROLE_HIERARCHY.filter(r => r !== 'owner').map(r => (
                                                                            <MenuItem key={r} value={r} sx={{ fontSize: '0.65rem' }}>
                                                                                <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: ROLE_CONFIG[r].color, display: 'inline-block', mr: 0.5 }} />
                                                                                {ROLE_CONFIG[r].label}
                                                                            </MenuItem>
                                                                        ))}
                                                                    </Select>
                                                                </FormControl>
                                                            )}
                                                        </Box>
                                                    </ListItem>
                                                    {i < group.members.length - 1 && <Divider sx={{ ml: 6, opacity: 0.4 }} />}
                                                </Box>
                                            ))}
                                        </List>
                                    </Collapse>
                                </Box>
                            );
                        })}

                        {groupedMembers.length === 0 && (
                            <Box sx={{ py: 4, textAlign: 'center' }}>
                                <PersonIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                                <Typography variant="body2" color="text.secondary">
                                    {memberSearch.trim()
                                        ? textByLang('No members found', '검색 결과가 없습니다')
                                        : textByLang('No members yet', '멤버가 없습니다')}
                                </Typography>
                            </Box>
                        )}

                        {/* Team Groups Summary */}
                        {teamGroups.length > 0 && !memberSearch.trim() && memberTeamFilter === 'all' && (
                            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1, display: 'block' }}>
                                    {textByLang('Teams Overview', '팀 현황')}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    {teamGroups.map(tg => {
                                        const count = currentMembers.filter(m => tg.memberIds?.includes(m.uid)).length;
                                        return (
                                            <Chip
                                                key={tg.id}
                                                label={`${tg.name} (${count})`}
                                                size="small"
                                                onClick={() => {
                                                    setMemberTeamFilter(tg.id);
                                                    setMemberViewMode('list');
                                                }}
                                                sx={{
                                                    fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer',
                                                    bgcolor: alpha(tg.color, 0.1), color: tg.color,
                                                    '&:hover': { bgcolor: alpha(tg.color, 0.2) },
                                                }}
                                            />
                                        );
                                    })}
                                </Box>
                            </Box>
                        )}
                    </Box>
                )}
            </Paper>

            {/* Create Team Group Dialog */}
            <Dialog open={createTGOpen} onClose={() => setCreateTGOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>{t('createTeamGroup') as string}</DialogTitle>
                <DialogContent>
                    <TextField autoFocus fullWidth label={t('teamGroupName') as string} value={newTGName}
                        onChange={e => setNewTGName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateTG()} sx={{ mt: 1, mb: 2 }} />
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {TG_COLORS.map(c => <Box key={c} onClick={() => setNewTGColor(c)} sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: c, cursor: 'pointer', border: newTGColor === c ? '3px solid' : '2px solid transparent', borderColor: newTGColor === c ? 'text.primary' : 'transparent' }} />)}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateTGOpen(false)}>{t('cancel') as string}</Button>
                    <Button variant="contained" onClick={handleCreateTG} disabled={!newTGName.trim()}>{t('save') as string}</Button>
                </DialogActions>
            </Dialog>

            {/* Invite Dialog */}
            <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
        </>
    );
};

export default GeneralTab;
