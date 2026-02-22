// src/pages/AutomationsPage.tsx
import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  Box, Typography, Paper, Button, Chip, IconButton,
  alpha, useTheme, Fade, Switch, ToggleButton, ToggleButtonGroup,
  Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem, InputLabel, FormControl, TextField
} from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import AddIcon from '@mui/icons-material/Add';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import BoltIcon from '@mui/icons-material/Bolt';
import BuildIcon from '@mui/icons-material/Build';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';

import { useLanguage } from '../contexts/LanguageContext';
import { toast } from 'sonner';

const t = (lang: 'ko' | 'en', en: string, ko: string) => (lang === 'ko' ? ko : en);

type AutomationRule = {
  id: string;
  name: string;
  description: string;
  trigger: string;
  action: string;
  active: boolean;
  icon: ReactNode;
  color: string;
};

// Mock data for initial rules
const INITIAL_RULES: AutomationRule[] = [
  {
    id: 'rule_1',
    name: '자동 할당 (QA)',
    description: "상태가 'QA 대기'로 변경되면, 'QA 팀'에게 자동으로 할당합니다.",
    trigger: 'Status changes to QA',
    action: 'Assign to QA Team',
    active: true,
    icon: <BuildIcon sx={{ fontSize: 24 }} />,
    color: '#8b5cf6'
  },
  {
    id: 'rule_2',
    name: '기한 초과 알림 (Slack)',
    description: "마감일이 지나면, Slack의 #engineering 채널로 알림을 보냅니다.",
    trigger: 'Task becomes overdue',
    action: 'Send Slack message',
    active: true,
    icon: <BoltIcon sx={{ fontSize: 24 }} />,
    color: '#ef4444'
  },
  {
    id: 'rule_3',
    name: '하위 태스크 자동 완료',
    description: "상위 태스크가 완료되면, 모든 하위 태스크의 상태를 '완료'로 변경합니다.",
    trigger: 'Parent task completed',
    action: 'Mark all subtasks done',
    active: false,
    icon: <CheckCircleIcon sx={{ fontSize: 24 }} />,
    color: '#10b981'
  }
];

export default function AutomationsPage() {
  const theme = useTheme();
  const { lang } = useLanguage();
  const [rules, setRules] = useState<AutomationRule[]>(INITIAL_RULES);
  const [tab, setTab] = useState<'my_rules' | 'templates'>('my_rules');
  const [openBuilder, setOpenBuilder] = useState(false);

  // Rule Builder State
  const [trigger, setTrigger] = useState('status_change');
  const [action, setAction] = useState('assign_user');
  const [ruleName, setRuleName] = useState('');

  const toggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r));
    toast.success(t(lang, 'Rule status updated', '규칙 상태가 업데이트되었습니다'));
  };

  const handleDelete = (id: string) => {
    if (confirm(t(lang, 'Are you sure you want to delete this rule?', '이 규칙을 삭제하시겠습니까?'))) {
      setRules(prev => prev.filter(r => r.id !== id));
      toast.success(t(lang, 'Rule deleted', '규칙이 삭제되었습니다'));
    }
  };

  const handleSaveRule = () => {
    if (!ruleName.trim()) {
      toast.error(t(lang, 'Please enter a rule name', '규칙 이름을 입력해주세요'));
      return;
    }
    const newRule: AutomationRule = {
      id: `rule_${Date.now()}`,
      name: ruleName,
      description: `When ${trigger}, then ${action}`, // simplified
      trigger: trigger,
      action: action,
      active: true,
      icon: <AutoFixHighIcon sx={{ fontSize: 24 }} />,
      color: '#6366f1'
    };
    setRules([newRule, ...rules]);
    setOpenBuilder(false);
    setRuleName('');
    toast.success(t(lang, 'Automation rule created!', '자동화 규칙이 생성되었습니다!'));
  };

  const cardSx = {
    p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider',
    transition: 'all 0.2s',
    '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 12px 24px rgba(0,0,0,0.05)' }
  };

  return (
    <Fade in timeout={400}>
      <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1000, mx: 'auto' }}>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4, flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <AutoFixHighIcon sx={{ color: '#6366f1', fontSize: 32 }} />
              <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: -0.5 }}>
                {t(lang, 'Automations', '자동화 규칙')}
              </Typography>
            </Box>
            <Typography variant="body1" color="text.secondary">
              {t(lang, 'Automate repetitive tasks and build custom workflows.', '반복적인 작업을 자동화하고 맞춤형 워크플로우를 구축하세요.')}
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenBuilder(true)}
            sx={{ px: 3, py: 1, borderRadius: 2, fontWeight: 700, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', textTransform: 'none' }}>
            {t(lang, 'Create Rule', '규칙 만들기')}
          </Button>
        </Box>

        {/* Tabs */}
        <ToggleButtonGroup value={tab} exclusive onChange={(_, v) => v && setTab(v)} sx={{ mb: 4, '& .MuiToggleButton-root': { px: 3, py: 1, borderRadius: 2, textTransform: 'none', fontWeight: 600 } }}>
          <ToggleButton value="my_rules">{t(lang, 'My Rules', '내 규칙')}</ToggleButton>
          <ToggleButton value="templates">{t(lang, 'Templates', '템플릿')}</ToggleButton>
        </ToggleButtonGroup>

        {/* Rules List */}
        {tab === 'my_rules' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {rules.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <CompareArrowsIcon sx={{ fontSize: 64, color: 'text.disabled', opacity: 0.5, mb: 2 }} />
                <Typography variant="h6" color="text.secondary" fontWeight={600}>
                  {t(lang, 'No automation rules yet.', '아직 자동화 규칙이 없습니다.')}
                </Typography>
                <Button variant="outlined" sx={{ mt: 2, borderRadius: 2, textTransform: 'none' }} onClick={() => setOpenBuilder(true)}>
                  {t(lang, 'Create your first rule', '첫 번째 규칙 만들기')}
                </Button>
              </Box>
            ) : (
              rules.map(rule => (
                <Paper key={rule.id} sx={cardSx}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>

                    <Box sx={{ display: 'flex', gap: 2, flex: 1 }}>
                      <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: alpha(rule.color, 0.1), color: rule.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {rule.icon}
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography variant="h6" fontWeight={700}>{rule.name}</Typography>
                          {!rule.active && <Chip label={t(lang, 'Paused', '일시정지')} size="small" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }} />}
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {rule.description}
                        </Typography>

                        {/* Trigger -> Action path visualization */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: 2, bgcolor: theme.palette.mode === 'dark' ? alpha('#fff', 0.05) : '#f8fafc', border: '1px solid', borderColor: 'divider', width: 'fit-content' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <PlayArrowIcon sx={{ fontSize: 16, color: '#6366f1' }} />
                            <Typography variant="caption" fontWeight={600}>{rule.trigger}</Typography>
                          </Box>
                          <ArrowForwardIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <BoltIcon sx={{ fontSize: 16, color: '#10b981' }} />
                            <Typography variant="caption" fontWeight={600}>{rule.action}</Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Box>

                    {/* Controls */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                      <Switch checked={rule.active} onChange={() => toggleRule(rule.id)} color="primary" />
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton size="small" onClick={() => handleDelete(rule.id)}>
                          <DeleteOutlineIcon sx={{ fontSize: 20, color: 'error.main' }} />
                        </IconButton>
                        <IconButton size="small">
                          <MoreVertIcon sx={{ fontSize: 20 }} />
                        </IconButton>
                      </Box>
                    </Box>
                  </Box>
                </Paper>
              ))
            )}
          </Box>
        )}

        {/* Templates Tab (Mockup) */}
        {tab === 'templates' && (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 3 }}>
            {[
              { n: 'Auto-assign on creation', d: 'Assign tasks to specific users based on tags.', c: '#3b82f6' },
              { n: 'Due date reminder', d: 'Send a notification 1 day before due date.', c: '#f59e0b' },
              { n: 'Auto-archive done tasks', d: 'Archive tasks that have been done for 7 days.', c: '#64748b' },
            ].map((tmpl, i) => (
              <Paper key={i} sx={{ p: 3, borderRadius: 3, border: '1px dashed', borderColor: 'divider', transition: '0.2s', '&:hover': { borderColor: tmpl.c, bgcolor: alpha(tmpl.c, 0.02) }, cursor: 'pointer' }}>
                <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: alpha(tmpl.c, 0.1), color: tmpl.c, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                  <AutoFixHighIcon />
                </Box>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>{tmpl.n}</Typography>
                <Typography variant="body2" color="text.secondary">{tmpl.d}</Typography>
                <Button variant="text" size="small" sx={{ mt: 2, fontWeight: 700, textTransform: 'none', color: tmpl.c }}>
                  {t(lang, 'Use Template', '템플릿 사용')}
                </Button>
              </Paper>
            ))}
          </Box>
        )}

        {/* Create Rule Dialog */}
        <Dialog open={openBuilder} onClose={() => setOpenBuilder(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 800, borderBottom: '1px solid', borderColor: 'divider', pb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AutoFixHighIcon sx={{ color: '#6366f1' }} />
              {t(lang, 'Create Automation Rule', '자동화 규칙 만들기')}
            </Box>
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            <TextField fullWidth label={t(lang, 'Rule Name', '규칙 이름')} value={ruleName} onChange={e => setRuleName(e.target.value)} sx={{ mb: 4 }} />

            <Typography variant="overline" color="text.secondary" fontWeight={700}>1. WHEN (Trigger)</Typography>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 3, bgcolor: theme.palette.mode === 'dark' ? alpha('#fff', 0.02) : '#f8fafc' }}>
              <FormControl fullWidth size="small">
                <InputLabel>{t(lang, 'Select Trigger', '트리거 선택')}</InputLabel>
                <Select value={trigger} label={t(lang, 'Select Trigger', '트리거 선택')} onChange={e => setTrigger(e.target.value)}>
                  <MenuItem value="status_change">{t(lang, 'Task status changes', '태스크 상태가 변경될 때')}</MenuItem>
                  <MenuItem value="task_created">{t(lang, 'Task is created', '태스크가 생성될 때')}</MenuItem>
                  <MenuItem value="due_date">{t(lang, 'Due date approaches', '마감일이 다가올 때')}</MenuItem>
                  <MenuItem value="tag_added">{t(lang, 'Specific tag is added', '특정 태그가 추가될 때')}</MenuItem>
                </Select>
              </FormControl>
            </Paper>

            <Typography variant="overline" color="text.secondary" fontWeight={700}>2. THEN (Action)</Typography>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: theme.palette.mode === 'dark' ? alpha('#fff', 0.02) : '#f8fafc' }}>
              <FormControl fullWidth size="small">
                <InputLabel>{t(lang, 'Select Action', '액션 선택')}</InputLabel>
                <Select value={action} label={t(lang, 'Select Action', '액션 선택')} onChange={e => setAction(e.target.value)}>
                  <MenuItem value="assign_user">{t(lang, 'Change Assignee', '담당자 변경')}</MenuItem>
                  <MenuItem value="set_status">{t(lang, 'Change Status', '상태 변경')}</MenuItem>
                  <MenuItem value="add_comment">{t(lang, 'Add a comment', '댓글 추가')}</MenuItem>
                  <MenuItem value="send_notification">{t(lang, 'Send Notification (Slack/Email)', '알림 전송 (Slack/이메일)')}</MenuItem>
                </Select>
              </FormControl>
            </Paper>
          </DialogContent>
          <DialogActions sx={{ p: 2, pt: 0, borderTop: '1px solid', borderColor: 'divider', mt: 2 }}>
            <Button onClick={() => setOpenBuilder(false)} sx={{ textTransform: 'none', fontWeight: 600 }}>{t(lang, 'Cancel', '취소')}</Button>
            <Button variant="contained" onClick={handleSaveRule} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>{t(lang, 'Save Rule', '규칙 저장')}</Button>
          </DialogActions>
        </Dialog>

      </Box>
    </Fade>
  );
}
