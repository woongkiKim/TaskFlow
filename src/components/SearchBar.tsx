import { useState, useEffect, useRef, useMemo } from 'react';
import {
    Box,
    InputBase,
    Paper,
    Typography,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Chip,
    Popper,
    ClickAwayListener,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import type { Task } from '../types';
import { normalizePriority } from '../types';
import { getTagColor } from './TagInput';
import { useLanguage } from '../contexts/LanguageContext';

interface SearchBarProps {
    tasks: Task[];
    onSelectTask: (task: Task) => void;
}

const SearchBar = ({ tasks, onSelectTask }: SearchBarProps) => {
    const { t } = useLanguage();
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const anchorRef = useRef<HTMLDivElement>(null);

    const results = useMemo(() => {
        if (!query.trim()) return [];
        const q = query.toLowerCase();
        return tasks.filter(task =>
            task.text.toLowerCase().includes(q) ||
            task.category?.toLowerCase().includes(q) ||
            task.tags?.some(tag => tag.toLowerCase().includes(q)) ||
            task.description?.toLowerCase().includes(q)
        ).slice(0, 8);
    }, [query, tasks]);

    useEffect(() => {
        setIsOpen(query.trim().length > 0);
    }, [query, results]);

    const handleSelect = (task: Task) => {
        onSelectTask(task);
        setQuery('');
        setIsOpen(false);
    };

    const priorityIcon = (p?: string) => {
        const norm = normalizePriority(p);
        if (!norm) return '';
        const icons: Record<string, string> = { P0: '🔴', P1: '🟠', P2: '🟡', P3: '⚪' };
        return icons[norm] || '';
    };

    return (
        <ClickAwayListener onClickAway={() => setIsOpen(false)}>
            <Box ref={anchorRef} sx={{ position: 'relative' }}>
                <Paper
                    elevation={0}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: isOpen ? 'primary.main' : 'divider',
                        bgcolor: 'action.hover',
                        transition: 'border-color 0.2s',
                        width: { xs: 200, sm: 280 },
                    }}
                >
                    <SearchIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                    <InputBase
                        placeholder={t('searchPlaceholder') as string}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        sx={{ flex: 1, fontSize: '0.85rem' }}
                    />
                </Paper>

                <Popper
                    open={isOpen}
                    anchorEl={anchorRef.current}
                    placement="bottom-start"
                    style={{ zIndex: 1300, width: anchorRef.current?.offsetWidth || 280 }}
                >
                    <Paper
                        elevation={8}
                        sx={{
                            mt: 0.5,
                            borderRadius: 2,
                            border: '1px solid',
                            borderColor: 'divider',
                            maxHeight: 360,
                            overflow: 'auto',
                        }}
                    >
                        <List dense disablePadding>
                            {results.length === 0 ? (
                                <ListItem sx={{ py: 2, justifyContent: 'center' }}>
                                    <Typography variant="body2" color="text.secondary">
                                        {t('noTasks') as string}
                                    </Typography>
                                </ListItem>
                            ) : results.map(task => (
                                <ListItem key={task.id} disablePadding>
                                    <ListItemButton onClick={() => handleSelect(task)} sx={{ py: 1, px: 2 }}>
                                        <ListItemText
                                            primary={
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    {priorityIcon(task.priority)}
                                                    <Typography variant="body2" fontWeight={500} noWrap>
                                                        {task.text}
                                                    </Typography>
                                                </Box>
                                            }
                                            secondary={
                                                <Box sx={{ display: 'flex', gap: 0.5, mt: 0.3, flexWrap: 'wrap' }}>
                                                    {task.category && (
                                                        <Chip
                                                            label={task.category}
                                                            size="small"
                                                            sx={{ height: 18, fontSize: '0.6rem', fontWeight: 600, bgcolor: (task.categoryColor || '#3b82f6') + '20', color: task.categoryColor || '#3b82f6' }}
                                                        />
                                                    )}
                                                    {task.tags?.map(tag => (
                                                        <Chip
                                                            key={tag}
                                                            label={`#${tag}`}
                                                            size="small"
                                                            sx={{ height: 18, fontSize: '0.6rem', fontWeight: 600, bgcolor: getTagColor(tag) + '18', color: getTagColor(tag) }}
                                                        />
                                                    ))}
                                                </Box>
                                            }
                                        />
                                    </ListItemButton>
                                </ListItem>
                            ))}
                        </List>
                    </Paper>
                </Popper>
            </Box>
        </ClickAwayListener>
    );
};

export default SearchBar;
