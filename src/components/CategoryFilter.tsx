import { Box, Chip } from '@mui/material';
import { useLanguage } from '../contexts/LanguageContext';
import { getTagColor } from './TagInput';

interface CategoryFilterProps {
    allTags: string[];
    selectedTag: string | null;
    onSelectTag: (tag: string | null) => void;
}

const CategoryFilter = ({ allTags, selectedTag, onSelectTag }: CategoryFilterProps) => {
    const { t } = useLanguage();

    if (allTags.length === 0) return null;

    return (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <Chip
                label={t('allTags') as string}
                size="small"
                onClick={() => onSelectTag(null)}
                sx={{
                    height: 28,
                    fontWeight: 'bold',
                    fontSize: '0.75rem',
                    bgcolor: selectedTag === null ? 'primary.main' : 'action.hover',
                    color: selectedTag === null ? 'white' : 'text.secondary',
                    cursor: 'pointer',
                    '&:hover': { opacity: 0.85 },
                }}
            />
            {allTags.map(tag => {
                const color = getTagColor(tag);
                const isSelected = selectedTag === tag;
                return (
                    <Chip
                        key={tag}
                        label={`#${tag}`}
                        size="small"
                        onClick={() => onSelectTag(isSelected ? null : tag)}
                        sx={{
                            height: 28,
                            fontWeight: 'bold',
                            fontSize: '0.75rem',
                            bgcolor: isSelected ? color : color + '15',
                            color: isSelected ? 'white' : color,
                            cursor: 'pointer',
                            border: '1px solid',
                            borderColor: isSelected ? color : 'transparent',
                            '&:hover': { opacity: 0.85, bgcolor: isSelected ? color : color + '25' },
                        }}
                    />
                );
            })}
        </Box>
    );
};

export default CategoryFilter;
