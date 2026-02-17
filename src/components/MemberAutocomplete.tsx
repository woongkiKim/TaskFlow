// src/components/MemberAutocomplete.tsx
import { Autocomplete, TextField, Avatar, Chip, Box, Typography } from '@mui/material';
import type { TeamMember } from '../types';

interface MemberAutocompleteProps {
    members: TeamMember[];
    selected: TeamMember[];
    onChange: (members: TeamMember[]) => void;
    multiple?: boolean;
    label?: string;
    placeholder?: string;
    size?: 'small' | 'medium';
}

const MemberAutocomplete = ({
    members, selected, onChange,
    multiple = false,
    label = 'Member',
    placeholder = '@ to search members...',
    size = 'small',
}: MemberAutocompleteProps) => (
    <Autocomplete
        multiple={multiple}
        options={members}
        value={multiple ? selected : (selected[0] || null)}
        onChange={(_, val) => {
            if (multiple) {
                onChange(val as TeamMember[]);
            } else {
                onChange(val ? [val as TeamMember] : []);
            }
        }}
        getOptionLabel={(opt) => (opt as TeamMember).displayName || ''}
        isOptionEqualToValue={(opt, val) => opt.uid === val.uid}
        filterOptions={(options, { inputValue }) => {
            const q = inputValue.replace(/^@/, '').toLowerCase();
            if (!q) return options;
            return options.filter(o =>
                o.displayName.toLowerCase().includes(q) ||
                o.email.toLowerCase().includes(q)
            );
        }}
        renderOption={(props, opt) => (
            <Box component="li" {...props} key={opt.uid}
                sx={{ display: 'flex', alignItems: 'center', gap: 1.2, py: 0.8 }}>
                <Avatar src={opt.photoURL} sx={{ width: 28, height: 28, fontSize: 12 }}>
                    {opt.displayName.charAt(0)}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>{opt.displayName}</Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>{opt.email}</Typography>
                </Box>
            </Box>
        )}
        renderTags={(tagValue, getTagProps) =>
            tagValue.map((opt, idx) => (
                <Chip
                    {...getTagProps({ index: idx })}
                    key={opt.uid}
                    avatar={<Avatar src={opt.photoURL} sx={{ width: 22, height: 22 }}>{opt.displayName.charAt(0)}</Avatar>}
                    label={opt.displayName}
                    size="small"
                    sx={{ height: 26, fontWeight: 600, fontSize: '0.75rem' }}
                />
            ))
        }
        renderInput={(params) => (
            <TextField {...params} label={label} placeholder={placeholder} size={size} />
        )}
        size={size}
        sx={{ '& .MuiAutocomplete-inputRoot': { flexWrap: 'wrap' } }}
    />
);

export default MemberAutocomplete;
