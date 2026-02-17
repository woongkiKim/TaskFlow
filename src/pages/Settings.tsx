import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Box, Typography, Paper, Avatar, Switch, Divider, IconButton, InputBase, Chip, ToggleButtonGroup, ToggleButton } from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import BadgeIcon from '@mui/icons-material/Badge';
import FolderIcon from '@mui/icons-material/Folder';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from '../contexts/AuthContext';
import { useThemeMode } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { fetchWorkspaceProjects, createProject, deleteProject } from '../services/projectService';
import type { Project } from '../types';
import {
  getWeeklyPlannerPreferences,
  setWeeklyPlannerPreferences,
  DEFAULT_WEEKLY_PLANNER_PREFERENCES,
  type WeeklyPlannerPreferences,
} from '../utils/plannerPreferences';

const PROJECT_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#14b8a6', // teal
  '#6366f1', // indigo
];

const Settings = () => {
  const { user } = useAuth();
  const { mode, toggleMode } = useThemeMode();
  const { t } = useLanguage();
  const { currentWorkspace } = useWorkspace();

  const [projects, setProjects] = useState<Project[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PROJECT_COLORS[0]);
  const [plannerPrefs, setPlannerPrefs] = useState<WeeklyPlannerPreferences>(() =>
    getWeeklyPlannerPreferences(user?.uid)
  );

  useEffect(() => {
    if (!currentWorkspace?.id) return;
    fetchWorkspaceProjects(currentWorkspace.id).then(setProjects).catch(console.error);
  }, [currentWorkspace?.id]);

  useEffect(() => {
    setPlannerPrefs(getWeeklyPlannerPreferences(user?.uid));
  }, [user?.uid]);

  const savePlannerPrefs = (next: WeeklyPlannerPreferences) => {
    setPlannerPrefs(next);
    setWeeklyPlannerPreferences(next, user?.uid);
  };

  const weekDayOrder = plannerPrefs.weekStartsOn === 1 ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6];
  const mondayFirstDayNames = useMemo(() => {
    const translated = t('dayNames');
    if (Array.isArray(translated) && translated.length === 7) {
      return translated.map(String);
    }
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  }, [t]);
  const dayLabelsByWeekday = useMemo(
    () => [mondayFirstDayNames[6], ...mondayFirstDayNames.slice(0, 6)],
    [mondayFirstDayNames]
  );

  const handleAddProject = async () => {
    if (!newName.trim() || !user || !currentWorkspace?.id) return;
    try {
      const project = await createProject(newName.trim(), currentWorkspace.id, selectedColor, user.uid);
      setProjects(prev => [...prev, project].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName('');
      setIsAdding(false);
      setSelectedColor(PROJECT_COLORS[0]);
    } catch {
      toast.error(t('addFailed') as string);
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      await deleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch {
      toast.error(t('deleteFailed') as string);
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

      <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <FolderIcon color="primary" />
            <Box>
              <Typography variant="h6" fontWeight="bold">{t('projects') as string}</Typography>
              <Typography variant="body2" color="text.secondary">{t('projectsDesc') as string}</Typography>
            </Box>
          </Box>
          {!isAdding && (
            <IconButton
              size="small"
              onClick={() => setIsAdding(true)}
              sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          )}
        </Box>

        {isAdding && (
          <Paper sx={{ p: 2, mb: 2, borderRadius: 2, border: '2px solid', borderColor: 'primary.main' }}>
            <InputBase
              fullWidth
              placeholder={t('projectName') as string}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void handleAddProject();
                } else if (e.key === 'Escape') {
                  setIsAdding(false);
                  setNewName('');
                }
              }}
              autoFocus
              sx={{ fontSize: '0.9rem', mb: 1.5 }}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {PROJECT_COLORS.map((color) => (
                  <Box
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      bgcolor: color,
                      cursor: 'pointer',
                      border: selectedColor === color ? '3px solid' : '2px solid transparent',
                      borderColor: selectedColor === color ? 'text.primary' : 'transparent',
                      transition: 'all 0.15s',
                      '&:hover': { transform: 'scale(1.2)' },
                    }}
                  />
                ))}
              </Box>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <IconButton size="small" onClick={() => { void handleAddProject(); }} sx={{ color: 'primary.main' }}>
                  <AddIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => { setIsAdding(false); setNewName(''); }}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          </Paper>
        )}

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {projects.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
              {t('noProjects') as string}
            </Typography>
          ) : (
            projects.map((project) => (
              <Chip
                key={project.id}
                label={project.name}
                onDelete={() => { void handleDeleteProject(project.id); }}
                sx={{
                  bgcolor: project.color + '20',
                  color: project.color,
                  fontWeight: 600,
                  borderRadius: 2,
                  '& .MuiChip-deleteIcon': { color: project.color, opacity: 0.6, '&:hover': { opacity: 1 } },
                }}
              />
            ))
          )}
        </Box>
      </Paper>

      <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" fontWeight="bold">
            {`${t('planner') as string} ${t('settings') as string}`}
          </Typography>
          <Chip
            label="Reset"
            size="small"
            onClick={() => savePlannerPrefs(DEFAULT_WEEKLY_PLANNER_PREFERENCES)}
            variant="outlined"
          />
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          Week Starts On
        </Typography>
        <ToggleButtonGroup
          value={plannerPrefs.weekStartsOn}
          exclusive
          onChange={(_, v) => typeof v === 'number' && savePlannerPrefs({ ...plannerPrefs, weekStartsOn: v as 0 | 1 })}
          size="small"
          sx={{ mb: 2 }}
        >
          <ToggleButton value={1}>{mondayFirstDayNames[0]}</ToggleButton>
          <ToggleButton value={0}>{dayLabelsByWeekday[0]}</ToggleButton>
        </ToggleButtonGroup>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          Visible Weekdays (click to hide/show)
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
          {weekDayOrder.map((weekday) => {
            const visible = !plannerPrefs.hiddenWeekdays.includes(weekday);
            const visibleCount = 7 - plannerPrefs.hiddenWeekdays.length;
            return (
              <Chip
                key={weekday}
                label={dayLabelsByWeekday[weekday]}
                color={visible ? 'primary' : 'default'}
                variant={visible ? 'filled' : 'outlined'}
                onClick={() => {
                  if (visible && visibleCount <= 1) return;
                  const nextHidden = visible
                    ? plannerPrefs.hiddenWeekdays.filter(d => d !== weekday)
                    : [...plannerPrefs.hiddenWeekdays, weekday].sort((a, b) => a - b);
                  savePlannerPrefs({ ...plannerPrefs, hiddenWeekdays: nextHidden });
                }}
                sx={{ fontWeight: 600, cursor: 'pointer' }}
              />
            );
          })}
        </Box>
      </Paper>

      <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
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
    </Box>
  );
};

export default Settings;
