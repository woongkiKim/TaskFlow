import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Typography, List, ListItem, ListItemAvatar, Avatar,
  ListItemText, IconButton, Select, MenuItem,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useLanguage } from '../contexts/LanguageContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { addProjectMember, updateProjectMemberRole, removeProjectMember } from '../services/projectService';
import type { Project, ProjectMember, TeamMember } from '../types';
import { toast } from 'sonner';

interface ProjectMembersDialogProps {
  open: boolean;
  project: Project | null;
  onClose: () => void;
  onProjectUpdated: () => void;
}

export default function ProjectMembersDialog({ open, project, onClose, onProjectUpdated }: ProjectMembersDialogProps) {
  const { lang } = useLanguage();
  const textByLang = (en: string, ko: string) => (lang === 'ko' ? ko : en);
  const { currentMembers } = useWorkspace();
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<ProjectMember[]>([]);

  useEffect(() => {
    if (open && project) {
      setMembers(project.members || []);
    }
  }, [open, project]);

  const handleAddMember = async (userId: string, role: string) => {
    if (!project) return;
    setLoading(true);
    try {
      const nm = await addProjectMember(project.id, userId, role);
      setMembers((prev) => [...prev, nm]);
      onProjectUpdated(); // Refresh project list to trigger re-fetch of members
    } catch {
      toast.error(textByLang('Failed to add member', '멤버 추가 실패'));
    }
    setLoading(false);
  };

  const handleUpdateRole = async (memberId: string, role: string) => {
    try {
      await updateProjectMemberRole(memberId, role);
      setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, role: role as 'viewer' | 'triage' | 'member' | 'maintainer' | 'admin' } : m));
      toast.success(textByLang('Saved', '저장되었습니다'));
      onProjectUpdated();
    } catch {
      toast.error(textByLang('Error', '오류가 발생했습니다'));
    }
  };

  const handleRemove = async (memberId: string) => {
    try {
      await removeProjectMember(memberId);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      onProjectUpdated();
    } catch {
      toast.error(textByLang('Error', '오류가 발생했습니다'));
    }
  };

  if (!project) return null;

  // Find users who are not yet in the project
  const nonMembers = currentMembers.filter(
    (wm: TeamMember) => !members.find((pm) => pm.user === wm.uid) && wm.uid !== project.createdBy
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        🔒 {project.name} {textByLang('Members', '멤버 관리')}
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
          {textByLang('Current Project Members', '현재 프로젝트 멤버')}
        </Typography>
        <List>
          {members.map((m) => (
            <ListItem key={m.id} sx={{ px: 0 }}>
              <ListItemAvatar>
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.9rem' }}>
                  {m.user_name?.charAt(0) || m.user_email?.charAt(0) || 'U'}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={<Typography variant="body2" fontWeight={600}>{m.user_name || m.user_email}</Typography>}
                secondary={<Typography variant="caption">{m.user_email}</Typography>}
              />
              <Select
                size="small"
                value={m.role}
                onChange={(e) => handleUpdateRole(m.id, e.target.value)}
                sx={{ minWidth: 100, fontSize: '0.8rem', mr: 1, height: 32 }}
              >
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="maintainer">Maintainer</MenuItem>
                <MenuItem value="member">Member</MenuItem>
                <MenuItem value="triage">Triage</MenuItem>
                <MenuItem value="viewer">Viewer</MenuItem>
              </Select>
              <IconButton size="small" color="error" onClick={() => handleRemove(m.id)}>
                <DeleteIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </ListItem>
          ))}
          {members.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
              {textByLang('Only workspace admins and the creator have access right now.', '현재 관리자와 생성자만 접근할 수 있습니다.')}
            </Typography>
          )}
        </List>

        <Typography variant="subtitle2" sx={{ mb: 1, mt: 3, fontWeight: 600 }}>
          {textByLang('Invite Workspace Members', '워크스페이스 멤버 초대')}
        </Typography>
        <List>
          {nonMembers.map((wm: TeamMember) => (
            <ListItem key={wm.uid} sx={{ px: 0 }}>
              <ListItemAvatar>
                <Avatar src={wm.photoURL} sx={{ width: 32, height: 32 }} />
              </ListItemAvatar>
              <ListItemText
                primary={<Typography variant="body2" fontWeight={600}>{wm.displayName}</Typography>}
                secondary={<Typography variant="caption">{wm.email}</Typography>}
              />
              <Button
                variant="outlined"
                size="small"
                disabled={loading}
                onClick={() => handleAddMember(wm.uid, 'member')}
              >
                {textByLang('Add', '추가')}
              </Button>
            </ListItem>
          ))}
          {nonMembers.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
              {textByLang('All workspace members are already added.', '새로 추가할 워크스페이스 멤버가 없습니다.')}
            </Typography>
          )}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{textByLang('Close', '닫기')}</Button>
      </DialogActions>
    </Dialog>
  );
}
