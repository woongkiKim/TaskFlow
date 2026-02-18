import { useState } from 'react';
import {
  Box, Typography, Paper, Chip, Button, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions,
  ToggleButtonGroup, ToggleButton, Avatar, IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { createProjectUpdate, deleteProjectUpdate } from '../services/projectUpdateService';
import type { ProjectUpdate, ProjectHealth } from '../types';
import { PROJECT_HEALTH_CONFIG } from '../types';

interface ProjectUpdateSectionProps {
  parentId: string;
  workspaceId: string;
  updates: ProjectUpdate[];
  onUpdateChange: (newUpdates: ProjectUpdate[]) => void;
  canEdit: boolean;
  contextData?: {
    progress: number;
    completedTasks: number;
    totalTasks: number;
  };
}

export default function ProjectUpdateSection({
  parentId, workspaceId, updates, onUpdateChange, canEdit, contextData,
}: ProjectUpdateSectionProps) {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const textByLang = (enText: string, koText: string) => (lang === 'ko' ? koText : enText);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [health, setHealth] = useState<ProjectHealth>('on_track');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const healthLabelByKey = (key: ProjectHealth) => {
    if (key === 'on_track') return textByLang('On Track', '정상');
    if (key === 'at_risk') return textByLang('At Risk', '주의');
    return textByLang('Off Track', '지연');
  };

  const applyTemplate = () => {
    if (!contextData) return;
    const { progress, completedTasks, totalTasks } = contextData;
    const tpl = lang === 'ko'
      ? `**주간 업데이트**\n\n- **진행률**: ${progress}% (${completedTasks}/${totalTasks}개 작업)\n- **주요 성과**:\n  - \n- **블로커**:\n  - 없음`
      : `**Weekly Update**\n\n- **Progress**: ${progress}% (${completedTasks}/${totalTasks} tasks)\n- **Key Achievements**:\n  - \n- **Blockers**:\n  - None`;
    setContent(tpl);
  };

  const handlePost = async () => {
    if (!user || !content.trim()) return;
    setLoading(true);
    try {
      const newUpdate = await createProjectUpdate({
        projectId: parentId,
        workspaceId,
        health,
        content: content.trim(),
        createdBy: user.uid,
        createdByName: user.displayName || textByLang('Unknown', '이름 없음'),
        createdByPhoto: user.photoURL || '',
        createdAt: new Date().toISOString(),
      });
      onUpdateChange([newUpdate, ...updates]);
      setDialogOpen(false);
      setContent('');
      setHealth('on_track');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(textByLang('Delete this update?', '이 업데이트를 삭제할까요?'))) return;
    try {
      await deleteProjectUpdate(id);
      onUpdateChange(updates.filter(u => u.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const latestHealth = updates.length > 0 ? updates[0].health : null;

  return (
    <Paper elevation={0} sx={{ height: '100%', border: '1px solid', borderColor: 'divider', borderRadius: 3, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'background.default' }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>{textByLang('Project Updates', '프로젝트 업데이트')}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">{textByLang('Current Status:', '현재 상태:')}</Typography>
            {latestHealth ? (
              <Chip
                label={healthLabelByKey(latestHealth)}
                size="small"
                sx={{
                  height: 20, fontSize: '0.65rem', fontWeight: 700,
                  bgcolor: `${PROJECT_HEALTH_CONFIG[latestHealth].color}20`,
                  color: PROJECT_HEALTH_CONFIG[latestHealth].color,
                }}
              />
            ) : (
              <Typography variant="caption" color="text.disabled">{textByLang('Unknown', '알 수 없음')}</Typography>
            )}
          </Box>
        </Box>
        {canEdit && (
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
            sx={{ fontWeight: 600, textTransform: 'none' }}
          >
            {textByLang('Post Update', '업데이트 작성')}
          </Button>
        )}
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {updates.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 3, bgcolor: 'action.hover' }}>
            <Typography variant="body2" color="text.secondary">{textByLang('No updates yet.', '아직 업데이트가 없습니다.')}</Typography>
            <Typography variant="caption" color="text.disabled">{textByLang('Post the first weekly update to track progress.', '첫 주간 업데이트를 작성해 진행 상황을 추적하세요.')}</Typography>
          </Box>
        ) : (
          updates.map((upd) => (
            <Box key={upd.id} sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 40 }}>
                <Avatar src={upd.createdByPhoto} sx={{ width: 36, height: 36, mb: 1, border: '2px solid white', boxShadow: 1 }}>
                  {upd.createdByName?.charAt(0)}
                </Avatar>
                <Box sx={{ width: 2, flex: 1, bgcolor: 'divider', mb: -2 }} />
              </Box>

              <Paper elevation={0} sx={{ flex: 1, p: 2, bgcolor: 'action.hover', borderRadius: 3, position: 'relative' }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                  <Box>
                    <Typography variant="body2" fontWeight={700}>{upd.createdByName}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(upd.createdAt).toLocaleDateString()} · {new Date(upd.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={`${PROJECT_HEALTH_CONFIG[upd.health].emoji} ${healthLabelByKey(upd.health)}`}
                      size="small"
                      sx={{
                        height: 24, fontSize: '0.7rem', fontWeight: 700,
                        bgcolor: 'background.paper',
                        color: PROJECT_HEALTH_CONFIG[upd.health].color,
                        border: '1px solid', borderColor: `${PROJECT_HEALTH_CONFIG[upd.health].color}40`,
                      }}
                    />
                    {canEdit && (
                      <IconButton size="small" onClick={() => handleDelete(upd.id)} sx={{ opacity: 0.5, '&:hover': { opacity: 1, color: 'error.main' } }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                </Box>

                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {upd.content}
                </Typography>
              </Paper>
            </Box>
          ))
        )}
      </Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{textByLang('Post Project Update', '프로젝트 업데이트 작성')}</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3, mt: 1 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>{textByLang('Health Status', '상태')}</Typography>
            <ToggleButtonGroup
              value={health}
              exclusive
              onChange={(_, v) => { if (v) setHealth(v); }}
              fullWidth
              size="small"
            >
              {(Object.entries(PROJECT_HEALTH_CONFIG) as [ProjectHealth, { label: string; emoji: string }][]).map(([key, cfg]) => (
                <ToggleButton key={key} value={key} sx={{ textTransform: 'none', fontWeight: 600 }}>
                  {cfg.emoji} {healthLabelByKey(key)}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2" fontWeight={700}>{textByLang('Update Content', '업데이트 내용')}</Typography>
              {contextData && (
                <Button size="small" startIcon={<AutoFixHighIcon />} onClick={applyTemplate} sx={{ fontSize: '0.75rem' }}>
                  {textByLang('Auto-fill Template', '템플릿 자동 채우기')}
                </Button>
              )}
            </Box>
            <TextField
              fullWidth
              multiline
              rows={6}
              placeholder={textByLang('Share key achievements, blockers, and next steps...', '주요 성과, 블로커, 다음 단계를 공유해 주세요...')}
              value={content}
              onChange={e => setContent(e.target.value)}
              sx={{ bgcolor: 'background.paper' }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {textByLang('Supports basic Markdown-like styling (*bold*, - lists).', '기본 마크다운 스타일(*굵게*, - 목록)을 지원합니다.')}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{textByLang('Cancel', '취소')}</Button>
          <Button variant="contained" disabled={!content.trim() || loading} onClick={handlePost}>
            {textByLang('Post Update', '업데이트 작성')}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
