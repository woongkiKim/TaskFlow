// src/layout/SidebarDialogs.tsx
// Extracted from Sidebar.tsx ??all creation/join dialogs + view management
import { useState } from 'react';
import {
  Box, Typography, TextField, Button,
  Dialog, DialogTitle, DialogContent, DialogActions,
  ToggleButtonGroup, ToggleButton, Select, MenuItem, FormControl, InputLabel,
  Checkbox, FormControlLabel, Menu,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useLanguage } from '../contexts/LanguageContext';
import { WS_COLORS, PROJECT_COLORS } from '../constants/colors';
import ConfirmDialog from '../components/ConfirmDialog';
import InviteDialog from '../components/InviteDialog';
import CustomViewDialog from '../components/CustomViewDialog';
import type { CustomView, ViewFilter, Sprint, Initiative } from '../types';

export interface SidebarDialogsProps {
  // Workspace creation
  createWsOpen: boolean;
  setCreateWsOpen: (open: boolean) => void;
  onCreateWs: (name: string, color: string, type: 'personal' | 'team' | 'organization') => void;

  // Join workspace
  joinWsOpen: boolean;
  setJoinWsOpen: (open: boolean) => void;
  onJoinWs: (code: string) => void;

  // Invite
  inviteOpen: boolean;
  setInviteOpen: (open: boolean) => void;

  // Project creation
  createProjectOpen: boolean;
  setCreateProjectOpen: (open: boolean) => void;
  onCreateProject: (name: string, color: string, initiativeId?: string) => void;
  initiatives: Initiative[];

  // Sprint creation
  createSprintOpen: boolean;
  setCreateSprintOpen: (open: boolean) => void;
  onCreateSprint: (name: string, type: 'sprint' | 'phase' | 'milestone', startDate?: string, endDate?: string, parentId?: string, linkedIds?: string[]) => void;
  sprints: Sprint[];

  // Custom Views
  customViews: CustomView[];
  createViewOpen: boolean;
  setCreateViewOpen: (open: boolean) => void;
  editingView: CustomView | null;
  setEditingView: (view: CustomView | null) => void;
  onCreateOrUpdateView: (data: { name: string; icon: string; color: string; filters: ViewFilter; viewMode?: 'list' | 'board' | 'calendar' | 'table' }) => void;
  deleteConfirmView: CustomView | null;
  setDeleteConfirmView: (view: CustomView | null) => void;
  onDeleteView: (viewId: string) => void;
  viewMenuAnchor: null | HTMLElement;
  viewMenuTarget: CustomView | null;
  onCloseViewMenu: () => void;

  // Initiative creation
  createInitiativeOpen: boolean;
  setCreateInitiativeOpen: (open: boolean) => void;
  onAddInitiative: (name: string) => Promise<unknown>;
}

const SidebarDialogs = (props: SidebarDialogsProps) => {
  const { t, lang } = useLanguage();
  const textByLang = (enText: string, koText: string) => (lang === 'ko' ? koText : enText);

  // Workspace creation local state
  const [newWsName, setNewWsName] = useState('');
  const [newWsType, setNewWsType] = useState<'personal' | 'team' | 'organization'>('team');
  const [newWsColor, setNewWsColor] = useState(WS_COLORS[0]);

  // Project creation local state
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectColor, setNewProjectColor] = useState(PROJECT_COLORS[0]);
  const [newProjectInitiativeId, setNewProjectInitiativeId] = useState('');

  // Sprint creation local state
  const [newSprintName, setNewSprintName] = useState('');
  const [newSprintType, setNewSprintType] = useState<'sprint' | 'phase' | 'milestone'>('sprint');
  const [newSprintStartDate, setNewSprintStartDate] = useState('');
  const [newSprintEndDate, setNewSprintEndDate] = useState('');
  const [newSprintParentId, setNewSprintParentId] = useState<string>('');
  const [newSprintLinkedIds, setNewSprintLinkedIds] = useState<string[]>([]);

  // Join workspace local state
  const [joinCode, setJoinCode] = useState('');

  // Initiative creation local state
  const [newInitiativeName, setNewInitiativeName] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);

  const handleCreateWs = () => {
    if (!newWsName.trim()) return;
    props.onCreateWs(newWsName.trim(), newWsColor, newWsType);
    setNewWsName('');
  };

  const handleCreateProject = () => {
    if (!newProjectName.trim() || creatingProject) return;
    setCreatingProject(true);
    props.onCreateProject(newProjectName.trim(), newProjectColor, newProjectInitiativeId || undefined);
    setNewProjectName(''); setNewProjectInitiativeId('');
    setTimeout(() => setCreatingProject(false), 800);
  };

  const handleCreateSprint = () => {
    if (!newSprintName.trim()) return;
    const startDate = newSprintType === 'milestone' ? undefined : (newSprintStartDate || undefined);
    const endDate = newSprintEndDate || undefined;
    const parentId = newSprintType === 'sprint' && newSprintParentId ? newSprintParentId : undefined;
    const linkedIds = newSprintType === 'milestone' && newSprintLinkedIds.length > 0 ? newSprintLinkedIds : undefined;
    props.onCreateSprint(newSprintName.trim(), newSprintType, startDate, endDate, parentId, linkedIds);
    setNewSprintName(''); setNewSprintStartDate(''); setNewSprintEndDate(''); setNewSprintParentId(''); setNewSprintLinkedIds([]);
  };

  const handleJoinWs = () => {
    if (!joinCode.trim()) return;
    props.onJoinWs(joinCode.trim());
    setJoinCode('');
  };

  const resetSprintForm = () => {
    setNewSprintStartDate(''); setNewSprintEndDate(''); setNewSprintParentId(''); setNewSprintLinkedIds([]);
  };

  return (
    <>
      {/* Create Workspace Dialog */}
      <Dialog open={props.createWsOpen} onClose={() => props.setCreateWsOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{t('createWorkspace') as string}</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth label={t('workspaceName') as string} value={newWsName}
            onChange={e => setNewWsName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateWs()}
            sx={{ mt: 1, mb: 2 }} />
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>{t('workspaceType') as string}</Typography>
          <ToggleButtonGroup value={newWsType} exclusive onChange={(_, v) => v && setNewWsType(v)} size="small" fullWidth sx={{
            mb: 2,
            '& .MuiToggleButton-root': { textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' }
          }}>
            <ToggleButton value="personal">{t('typePersonal') as string}</ToggleButton>
            <ToggleButton value="team">{t('typeTeam') as string}</ToggleButton>
            <ToggleButton value="organization">{t('typeOrg') as string}</ToggleButton>
          </ToggleButtonGroup>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>{t('teamColor') as string}</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {WS_COLORS.map(c => (
              <Box key={c} role="button" tabIndex={0} aria-label={`Color ${c}`}
                onClick={() => setNewWsColor(c)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setNewWsColor(c); } }}
                sx={{
                  width: 28, height: 28, borderRadius: '50%', bgcolor: c, cursor: 'pointer',
                  border: newWsColor === c ? '3px solid' : '2px solid transparent', borderColor: newWsColor === c ? 'text.primary' : 'transparent',
                  '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
                }} />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => props.setCreateWsOpen(false)}>{t('cancel') as string}</Button>
          <Button variant="contained" onClick={handleCreateWs} disabled={!newWsName.trim()}>{t('save') as string}</Button>
        </DialogActions>
      </Dialog>

      {/* Join Workspace Dialog */}
      <Dialog open={props.joinWsOpen} onClose={() => props.setJoinWsOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{t('joinWorkspace') as string}</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth label={t('inviteCode') as string} placeholder="ABC123"
            value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleJoinWs()} sx={{ mt: 1 }}
            inputProps={{ style: { letterSpacing: 4, fontWeight: 700, textAlign: 'center' } }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => props.setJoinWsOpen(false)}>{t('cancel') as string}</Button>
          <Button variant="contained" onClick={handleJoinWs} disabled={joinCode.length < 6}>{t('joinWorkspace') as string}</Button>
        </DialogActions>
      </Dialog>

      {/* Create Project Dialog */}
      <Dialog open={props.createProjectOpen} onClose={() => props.setCreateProjectOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{t('createProject') as string}</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth label={t('projectName') as string} value={newProjectName}
            onChange={e => setNewProjectName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateProject()}
            sx={{ mt: 1, mb: 2 }} />

          {props.initiatives.length > 0 && (
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>{(t('initiatives') as string) || textByLang('Initiative', '이니셔티브')}</InputLabel>
              <Select value={newProjectInitiativeId} label={(t('initiatives') as string) || textByLang('Initiative', '이니셔티브')}
                onChange={(e) => setNewProjectInitiativeId(e.target.value)}>
                <MenuItem value=""><em>{textByLang('None', '없음')}</em></MenuItem>
                {props.initiatives.map(init => (
                  <MenuItem key={init.id} value={init.id}>{init.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>{t('projectColor') as string}</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {PROJECT_COLORS.map(c => (
              <Box key={c} role="button" tabIndex={0} aria-label={`Color ${c}`}
                onClick={() => setNewProjectColor(c)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setNewProjectColor(c); } }}
                sx={{
                  width: 28, height: 28, borderRadius: '50%', bgcolor: c, cursor: 'pointer',
                  border: newProjectColor === c ? '3px solid' : '2px solid transparent', borderColor: newProjectColor === c ? 'text.primary' : 'transparent',
                  '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
                }} />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => props.setCreateProjectOpen(false)}>{t('cancel') as string}</Button>
          <Button variant="contained" onClick={handleCreateProject} disabled={!newProjectName.trim() || creatingProject}>{creatingProject ? '...' : (t('save') as string)}</Button>
        </DialogActions>
      </Dialog>

      {/* Create Sprint Dialog */}
      <Dialog open={props.createSprintOpen} onClose={() => { props.setCreateSprintOpen(false); resetSprintForm(); }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{t('createSprint') as string}</DialogTitle>
        <DialogContent>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>{t('sprintType') as string}</Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            {([
              { value: 'sprint' as const, icon: '•', label: textByLang('Sprint', '스프린트'), color: '#6366f1', desc: t('sprintDesc') as string },
              { value: 'phase' as const, icon: '•', label: textByLang('Phase', '페이즈'), color: '#10b981', desc: t('phaseDesc') as string },
              { value: 'milestone' as const, icon: '•', label: textByLang('Milestone', '마일스톤'), color: '#ef4444', desc: t('milestoneDesc') as string },
            ]).map(opt => {
              const isActive = newSprintType === opt.value;
              return (
                <Box key={opt.value} role="button" tabIndex={0}
                  onClick={() => { setNewSprintType(opt.value); resetSprintForm(); }}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setNewSprintType(opt.value); } }}
                  sx={{
                    flex: 1, cursor: 'pointer', borderRadius: 2, p: 1.5, textAlign: 'center',
                    border: '2px solid', borderColor: isActive ? opt.color : 'divider',
                    bgcolor: isActive ? `${opt.color}10` : 'transparent',
                    transition: 'all 0.15s ease',
                    '&:hover': { borderColor: opt.color, bgcolor: `${opt.color}08` },
                    '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
                  }}>
                  <Typography sx={{ fontSize: '1.3rem', mb: 0.3 }}>{opt.icon}</Typography>
                  <Typography variant="caption" sx={{
                    fontWeight: 700, display: 'block', color: isActive ? opt.color : 'text.primary',
                    fontSize: '0.7rem',
                  }}>{opt.label}</Typography>
                </Box>
              );
            })}
          </Box>

          <Box sx={{
            p: 1.5, borderRadius: 1.5, mb: 2,
            bgcolor: newSprintType === 'sprint' ? 'rgba(99,102,241,0.06)' : newSprintType === 'phase' ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
            borderLeft: '3px solid',
            borderColor: newSprintType === 'sprint' ? '#6366f1' : newSprintType === 'phase' ? '#10b981' : '#ef4444',
          }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.78rem', lineHeight: 1.5 }}>
              {newSprintType === 'sprint' && (t('sprintDesc') as string)}
              {newSprintType === 'phase' && (t('phaseDesc') as string)}
              {newSprintType === 'milestone' && (t('milestoneDesc') as string)}
            </Typography>
          </Box>

          <TextField autoFocus fullWidth label={t('sprintName') as string} value={newSprintName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSprintName(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleCreateSprint()}
            sx={{ mb: 2 }} />

          {newSprintType === 'sprint' && props.sprints.filter(s => s.type === 'phase').length > 0 && (
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>{t('parentPhase') as string}</InputLabel>
              <Select value={newSprintParentId} label={t('parentPhase') as string}
                onChange={(e) => setNewSprintParentId(e.target.value as string)}>
                <MenuItem value="">{t('noParent') as string}</MenuItem>
                {props.sprints.filter(s => s.type === 'phase').map(phase => (
                  <MenuItem key={phase.id} value={phase.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 4, height: 16, borderRadius: 1, bgcolor: '#10b981' }} />
                      {phase.name}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {newSprintType === 'milestone' && props.sprints.filter(s => s.type !== 'milestone').length > 0 && (
            <Box sx={{ mb: 2, p: 1.5, borderRadius: 1.5, bgcolor: 'action.hover' }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>
                {t('selectLinkedSprints') as string}
              </Typography>
              {props.sprints.filter(s => s.type !== 'milestone').map(sp => (
                <FormControlLabel key={sp.id} sx={{ display: 'block', ml: 0, '&:hover': { bgcolor: 'action.selected', borderRadius: 1 } }}
                  control={
                    <Checkbox size="small" checked={newSprintLinkedIds.includes(sp.id)}
                      sx={{ color: sp.type === 'phase' ? '#10b981' : '#6366f1', '&.Mui-checked': { color: sp.type === 'phase' ? '#10b981' : '#6366f1' } }}
                      onChange={(e) => {
                        if (e.target.checked) setNewSprintLinkedIds(prev => [...prev, sp.id]);
                        else setNewSprintLinkedIds(prev => prev.filter(id => id !== sp.id));
                      }} />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                      <Box sx={{ width: 4, height: 14, borderRadius: 1, bgcolor: sp.type === 'phase' ? '#10b981' : '#6366f1' }} />
                      <Typography variant="body2">{sp.name}</Typography>
                    </Box>
                  }
                />
              ))}
            </Box>
          )}

          {newSprintType === 'milestone' ? (
            <TextField fullWidth type="date" label={t('targetDate') as string} value={newSprintEndDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSprintEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }} sx={{ mt: 1 }} />
          ) : (
            <Box sx={{ display: 'flex', gap: 1.5, mt: 1 }}>
              <TextField fullWidth type="date" label={t('startDate') as string} value={newSprintStartDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSprintStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }} />
              <TextField fullWidth type="date" label={t('endDate') as string} value={newSprintEndDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSprintEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }} />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { props.setCreateSprintOpen(false); resetSprintForm(); }}>{t('cancel') as string}</Button>
          <Button variant="contained" onClick={handleCreateSprint} disabled={!newSprintName.trim()}>{t('save') as string}</Button>
        </DialogActions>
      </Dialog>

      <InviteDialog open={props.inviteOpen} onClose={() => props.setInviteOpen(false)} />

      {/* View Context Menu */}
      <Menu
        anchorEl={props.viewMenuAnchor}
        open={Boolean(props.viewMenuAnchor)}
        onClose={props.onCloseViewMenu}
        PaperProps={{ sx: { borderRadius: 2, minWidth: 140, py: 0.5 } }}
      >
        <MenuItem onClick={() => {
          if (props.viewMenuTarget) {
            props.setEditingView(props.viewMenuTarget);
            props.setCreateViewOpen(true);
          }
          props.onCloseViewMenu();
        }} sx={{ fontSize: '0.8rem', py: 0.7 }}>
          <EditIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
          {(t('editView') as string) || textByLang('Edit View', '뷰 수정')}
        </MenuItem>
        <MenuItem onClick={() => {
          if (props.viewMenuTarget) props.setDeleteConfirmView(props.viewMenuTarget);
          props.onCloseViewMenu();
        }} sx={{ fontSize: '0.8rem', py: 0.7, color: 'error.main' }}>
          <DeleteOutlineIcon sx={{ fontSize: 16, mr: 1 }} />
          {(t('delete') as string) || textByLang('Delete', '삭제')}
        </MenuItem>
      </Menu>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={!!props.deleteConfirmView}
        onClose={() => props.setDeleteConfirmView(null)}
        onConfirm={() => props.deleteConfirmView && props.onDeleteView(props.deleteConfirmView.id)}
        title={textByLang('Delete View', '뷰 삭제')}
        message={textByLang(
          `Are you sure you want to delete "${props.deleteConfirmView?.name}"? This action cannot be undone.`,
          `"${props.deleteConfirmView?.name}" 뷰를 삭제할까요? 이 작업은 되돌릴 수 없습니다.`
        )}
        confirmLabel={(t('delete') as string) || textByLang('Delete', '삭제')}
        cancelLabel={t('cancel') as string}
      />

      <CustomViewDialog
        open={props.createViewOpen}
        onClose={() => { props.setCreateViewOpen(false); props.setEditingView(null); }}
        onSave={props.onCreateOrUpdateView}
        editView={props.editingView}
      />

      {/* Create Initiative Dialog */}
      <Dialog open={props.createInitiativeOpen} onClose={() => props.setCreateInitiativeOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{(t('createInitiative') as string) || textByLang('Create Initiative', '이니셔티브 만들기')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus margin="dense" label={t('name') as string} fullWidth variant="outlined"
            value={newInitiativeName} onChange={e => setNewInitiativeName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && newInitiativeName.trim()) { props.onAddInitiative(newInitiativeName).then(() => { props.setCreateInitiativeOpen(false); setNewInitiativeName(''); }); } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => props.setCreateInitiativeOpen(false)}>{t('cancel') as string}</Button>
          <Button variant="contained" disabled={!newInitiativeName.trim()} onClick={() => { props.onAddInitiative(newInitiativeName).then(() => { props.setCreateInitiativeOpen(false); setNewInitiativeName(''); }); }}>
            {t('create') as string}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SidebarDialogs;

