// src/components/TaskAutocomplete.tsx
import { Autocomplete, TextField, Chip, Box, Typography } from '@mui/material';
import type { Task } from '../types';
import { normalizePriority, PRIORITY_CONFIG, type PriorityLevel } from '../types';

interface TaskAutocompleteProps {
    tasks: Task[];
    selected: Task[];
    onChange: (tasks: Task[]) => void;
    multiple?: boolean;
    label?: string;
    placeholder?: string;
    size?: 'small' | 'medium';
}

const TaskAutocomplete = ({
    tasks, selected, onChange,
    multiple = false,
    label = 'Related Task',
    placeholder = 'Search tasks by ID or title...',
    size = 'small',
}: TaskAutocompleteProps) => (
    <Autocomplete
        multiple={multiple}
        options={tasks}
        value={multiple ? selected : (selected[0] || null)}
        onChange={(_, val) => {
            if (multiple) {
                onChange(val as Task[]);
            } else {
                onChange(val ? [val as Task] : []);
            }
        }}
        getOptionLabel={(opt) => {
            const t = opt as Task;
            return t.taskCode ? `${t.taskCode} ${t.text}` : t.text;
        }}
        isOptionEqualToValue={(opt, val) => opt.id === val.id}
        filterOptions={(options, { inputValue }) => {
            const q = inputValue.toLowerCase();
            if (!q) return options.slice(0, 20); // Show first 20
            return options.filter(o =>
                (o.taskCode?.toLowerCase().includes(q)) ||
                o.text.toLowerCase().includes(q) ||
                o.id.toLowerCase().includes(q)
            );
        }}
        renderOption={(props, opt) => {
            const p = normalizePriority(opt.priority);
            const pc = p ? PRIORITY_CONFIG[p as PriorityLevel] : null;
            return (
                <Box component="li" {...props} key={opt.id}
                    sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.6 }}>
                    {opt.taskCode && (
                        <Chip label={opt.taskCode} size="small"
                            sx={{ height: 20, fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 700 }} />
                    )}
                    {pc && (
                        <Chip label={p} size="small"
                            sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700, bgcolor: pc.bgColor, color: pc.color }} />
                    )}
                    <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0 }}>
                        {opt.text}
                    </Typography>
                    <Chip label={opt.status || 'todo'} size="small" variant="outlined"
                        sx={{ height: 18, fontSize: '0.55rem' }} />
                </Box>
            );
        }}
        renderTags={(tagValue, getTagProps) =>
            tagValue.map((opt, idx) => (
                <Chip
                    {...getTagProps({ index: idx })}
                    key={opt.id}
                    label={opt.taskCode || opt.text.slice(0, 20)}
                    size="small"
                    sx={{ height: 24, fontWeight: 600, fontSize: '0.72rem', fontFamily: opt.taskCode ? 'monospace' : undefined }}
                />
            ))
        }
        renderInput={(params) => (
            <TextField {...params} label={label} placeholder={placeholder} size={size} />
        )}
        size={size}
    />
);

export default TaskAutocomplete;
