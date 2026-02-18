import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog, Box, TextField, List, ListItemButton, ListItemIcon,
  ListItemText, Typography, Chip, InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DashboardIcon from '@mui/icons-material/Dashboard';
import InboxIcon from '@mui/icons-material/Inbox';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ViewWeekIcon from '@mui/icons-material/ViewWeek';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SettingsIcon from '@mui/icons-material/Settings';
import GroupIcon from '@mui/icons-material/Group';
import BuildIcon from '@mui/icons-material/Build';
import MapIcon from '@mui/icons-material/Map';
import AddIcon from '@mui/icons-material/Add';
import FolderIcon from '@mui/icons-material/Folder';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import KeyboardReturnIcon from '@mui/icons-material/KeyboardReturn';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useLanguage } from '../contexts/LanguageContext';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  category: 'navigation' | 'project' | 'initiative' | 'action';
  action: () => void;
  keywords?: string[];
}

interface CommandMenuProps {
  open: boolean;
  onClose: () => void;
  onCreateTask?: () => void;
}

const CommandMenu = ({ open, onClose, onCreateTask }: CommandMenuProps) => {
  const navigate = useNavigate();
  const { projects, setCurrentProject, initiatives } = useWorkspace();
  const { lang } = useLanguage();
  const textByLang = (enText: string, koText: string) => (lang === 'ko' ? koText : enText);

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const initiativeStatusLabel = (status: string) => {
    if (status === 'planned') return textByLang('Planned', '\uACC4\uD68D');
    if (status === 'active') return textByLang('Active', '\uC9C4\uD589 \uC911');
    if (status === 'completed') return textByLang('Completed', '\uC644\uB8CC');
    return status;
  };

  const commands: CommandItem[] = useMemo(() => {
    const nav: CommandItem[] = [
      {
        id: 'nav-board',
        label: textByLang('Go to Board', '\uBCF4\uB4DC\uB85C \uC774\uB3D9'),
        description: textByLang('Task board / Kanban view', '\uC791\uC5C5 \uBCF4\uB4DC / \uCE78\uBC18 \uBCF4\uAE30'),
        icon: <DashboardIcon fontSize="small" />,
        category: 'navigation',
        action: () => { navigate('/'); onClose(); },
        keywords: ['board', 'kanban', 'tasks', '\uBCF4\uB4DC'],
      },
      {
        id: 'nav-inbox',
        label: textByLang('Go to Inbox', '\uC778\uBC15\uC2A4\uB85C \uC774\uB3D9'),
        description: textByLang('Notifications & Triage', '\uC54C\uB9BC \uBC0F \uD2B8\uB9AC\uC544\uC9C0'),
        icon: <InboxIcon fontSize="small" />,
        category: 'navigation',
        action: () => { navigate('/inbox'); onClose(); },
        keywords: ['inbox', 'notifications', 'triage', '\uC54C\uB9BC'],
      },
      {
        id: 'nav-calendar',
        label: textByLang('Go to Calendar', '\uCE98\uB9B0\uB354\uB85C \uC774\uB3D9'),
        description: textByLang('Calendar view', '\uCE98\uB9B0\uB354 \uBCF4\uAE30'),
        icon: <CalendarTodayIcon fontSize="small" />,
        category: 'navigation',
        action: () => { navigate('/calendar'); onClose(); },
        keywords: ['calendar', '\uCE98\uB9B0\uB354'],
      },
      {
        id: 'nav-planner',
        label: textByLang('Go to Weekly Planner', '\uC8FC\uAC04 \uD50C\uB798\uB108\uB85C \uC774\uB3D9'),
        icon: <ViewWeekIcon fontSize="small" />,
        category: 'navigation',
        action: () => { navigate('/planner'); onClose(); },
        keywords: ['planner', 'weekly', '\uC8FC\uAC04'],
      },
      {
        id: 'nav-reports',
        label: textByLang('Go to Reports', '\uB9AC\uD3EC\uD2B8\uB85C \uC774\uB3D9'),
        icon: <AssessmentIcon fontSize="small" />,
        category: 'navigation',
        action: () => { navigate('/reports'); onClose(); },
        keywords: ['reports', 'analytics', '\uB9AC\uD3EC\uD2B8'],
      },
      {
        id: 'nav-roadmap',
        label: textByLang('Go to Roadmap', '\uB85C\uB4DC\uB9F5\uC73C\uB85C \uC774\uB3D9'),
        icon: <MapIcon fontSize="small" />,
        category: 'navigation',
        action: () => { navigate('/roadmap'); onClose(); },
        keywords: ['roadmap', '\uB85C\uB4DC\uB9F5'],
      },
      {
        id: 'nav-settings',
        label: textByLang('Go to Settings', '\uC124\uC815\uC73C\uB85C \uC774\uB3D9'),
        icon: <SettingsIcon fontSize="small" />,
        category: 'navigation',
        action: () => { navigate('/settings'); onClose(); },
        keywords: ['settings', '\uC124\uC815'],
      },
      {
        id: 'nav-team',
        label: textByLang('Go to Team Settings', '\uD300 \uC124\uC815\uC73C\uB85C \uC774\uB3D9'),
        icon: <GroupIcon fontSize="small" />,
        category: 'navigation',
        action: () => { navigate('/team-settings'); onClose(); },
        keywords: ['team', 'members', '\uD300'],
      },
      {
        id: 'nav-ops',
        label: textByLang('Go to Ops Center', 'Ops \uC13C\uD130\uB85C \uC774\uB3D9'),
        icon: <BuildIcon fontSize="small" />,
        category: 'navigation',
        action: () => { navigate('/ops'); onClose(); },
        keywords: ['ops', 'operations'],
      },
    ];

    const actions: CommandItem[] = [
      {
        id: 'action-create-task',
        label: textByLang('Create New Task', '\uC0C8 \uC791\uC5C5 \uB9CC\uB4E4\uAE30'),
        description: 'Cmd+N',
        icon: <AddIcon fontSize="small" />,
        category: 'action',
        action: () => { onCreateTask?.(); onClose(); },
        keywords: ['create', 'new', 'task', 'add', '\uC0DD\uC131', '\uCD94\uAC00'],
      },
    ];

    const projectItems: CommandItem[] = projects.map(p => ({
      id: `proj-${p.id}`,
      label: p.name,
      description: textByLang('Project', '\uD504\uB85C\uC81D\uD2B8'),
      icon: <FolderIcon fontSize="small" sx={{ color: p.color || '#6366f1' }} />,
      category: 'project' as const,
      action: () => { setCurrentProject(p); navigate('/'); onClose(); },
      keywords: [p.name.toLowerCase()],
    }));

    const initiativeItems: CommandItem[] = initiatives.map(i => ({
      id: `init-${i.id}`,
      label: i.name,
      description: `${textByLang('Initiative', '\uC774\uB2C8\uC154\uD2F0\uBE0C')} · ${initiativeStatusLabel(i.status)}`,
      icon: <RocketLaunchIcon fontSize="small" sx={{ color: i.color || '#3b82f6' }} />,
      category: 'initiative' as const,
      action: () => { navigate(`/initiative/${i.id}`); onClose(); },
      keywords: [i.name.toLowerCase()],
    }));

    return [...actions, ...nav, ...projectItems, ...initiativeItems];
  }, [projects, initiatives, navigate, onClose, onCreateTask, setCurrentProject, lang]);

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(cmd =>
      cmd.label.toLowerCase().includes(q) ||
      cmd.description?.toLowerCase().includes(q) ||
      cmd.keywords?.some(k => k.includes(q)),
    );
  }, [query, commands]);

  const grouped = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    for (const item of filtered) {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    }
    return groups;
  }, [filtered]);

  const flatList = useMemo(() => filtered, [filtered]);

  useEffect(() => { setSelectedIndex(0); }, [query]);
  useEffect(() => { if (open) { setQuery(''); setSelectedIndex(0); } }, [open]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, flatList.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && flatList[selectedIndex]) {
      e.preventDefault();
      flatList[selectedIndex].action();
    }
  }, [flatList, selectedIndex]);

  const categoryLabels: Record<string, string> = {
    action: textByLang('Actions', '\uC791\uC5C5'),
    navigation: textByLang('Navigation', '\uC774\uB3D9'),
    project: textByLang('Projects', '\uD504\uB85C\uC81D\uD2B8'),
    initiative: textByLang('Initiatives', '\uC774\uB2C8\uC154\uD2F0\uBE0C'),
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: 'hidden',
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          mt: '-15vh',
        },
      }}
      slotProps={{ backdrop: { sx: { backdropFilter: 'blur(4px)', bgcolor: 'rgba(0,0,0,0.4)' } } }}
    >
      <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <TextField
          fullWidth
          autoFocus
          placeholder={textByLang('Type a command or search...', '\uBA85\uB839\uC5B4 \uB610\uB294 \uD0A4\uC6CC\uB4DC\uB97C \uC785\uB825\uD558\uC138\uC694...')}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          variant="standard"
          InputProps={{
            disableUnderline: true,
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
              </InputAdornment>
            ),
            sx: { fontSize: '1rem', fontWeight: 500 },
          }}
        />
      </Box>

      <Box sx={{ maxHeight: 380, overflowY: 'auto', py: 0.5 }}>
        {flatList.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">{textByLang('No results found', '\uAC80\uC0C9 \uACB0\uACFC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4')}</Typography>
          </Box>
        ) : (
          Object.entries(grouped).map(([category, items]) => (
            <Box key={category}>
              <Typography variant="caption" color="text.disabled" fontWeight={700}
                sx={{ px: 2, py: 0.5, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {categoryLabels[category] || category}
              </Typography>
              <List dense disablePadding>
                {items.map(item => {
                  const globalIdx = flatList.indexOf(item);
                  return (
                    <ListItemButton
                      key={item.id}
                      selected={globalIdx === selectedIndex}
                      onClick={item.action}
                      onMouseEnter={() => setSelectedIndex(globalIdx)}
                      sx={{
                        mx: 0.5,
                        borderRadius: 1.5,
                        px: 1.5,
                        py: 0.75,
                        '&.Mui-selected': {
                          bgcolor: 'action.selected',
                          '&:hover': { bgcolor: 'action.selected' },
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36, color: 'text.secondary' }}>
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={<Typography fontSize="0.875rem" fontWeight={500}>{item.label}</Typography>}
                        secondary={item.description && (
                          <Typography variant="caption" color="text.disabled">{item.description}</Typography>
                        )}
                      />
                      {globalIdx === selectedIndex && (
                        <KeyboardReturnIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                      )}
                    </ListItemButton>
                  );
                })}
              </List>
            </Box>
          ))
        )}
      </Box>

      <Box sx={{
        px: 2, py: 1, borderTop: '1px solid', borderColor: 'divider',
        display: 'flex', alignItems: 'center', gap: 2,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Chip label={'\u2191\u2193'} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
          <Typography variant="caption" color="text.disabled">{textByLang('Navigate', '\uC774\uB3D9')}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Chip label="Enter" size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
          <Typography variant="caption" color="text.disabled">{textByLang('Select', '\uC120\uD0DD')}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Chip label="Esc" size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
          <Typography variant="caption" color="text.disabled">{textByLang('Close', '\uB2EB\uAE30')}</Typography>
        </Box>
      </Box>
    </Dialog>
  );
};

export default CommandMenu;
