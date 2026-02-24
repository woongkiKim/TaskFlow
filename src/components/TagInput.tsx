import { useState, useCallback } from 'react';
import { Box, Chip, InputBase, Paper } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useLanguage } from '../contexts/LanguageContext';
import { getTagColor, parseTagsFromText } from '../utils/tagUtils';

interface TagInputProps {
    onSubmit: (text: string, tags: string[]) => void;
    placeholder?: string;
    disabled?: boolean;
}

const TagInput = ({ onSubmit, placeholder, disabled }: TagInputProps) => {
    const { t } = useLanguage();
    const [inputValue, setInputValue] = useState('');
    const [tags, setTags] = useState<string[]>([]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            e.preventDefault();
            const { cleanText, tags: parsedTags } = parseTagsFromText(inputValue);
            const allTags = [...new Set([...tags, ...parsedTags])];
            const finalText = cleanText || inputValue.replace(/#[\w\uAC00-\uD7A3]+/g, '').trim();

            if (finalText.trim()) {
                onSubmit(finalText.trim(), allTags);
                setInputValue('');
                setTags([]);
            }
        } else if (e.key === 'Escape') {
            setInputValue('');
            setTags([]);
        }
    }, [inputValue, tags, onSubmit]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setInputValue(value);

        // 실시간 태그 감지
        const { tags: detectedTags } = parseTagsFromText(value);
        setTags(detectedTags);
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setTags(tags.filter(t => t !== tagToRemove));
        // 입력값에서도 해당 태그 제거
        setInputValue(prev => prev.replace(new RegExp(`#${tagToRemove}\\s?`, 'g'), ''));
    };

    return (
        <Paper
            elevation={0}
            sx={{
                p: '2px 4px',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ p: 2, color: 'primary.main' }}>
                    <AddIcon />
                </Box>
                <InputBase
                    sx={{ ml: 1, flex: 1, fontSize: '1.1rem' }}
                    placeholder={placeholder || (t('addNewTask') as string)}
                    value={inputValue}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    disabled={disabled}
                />
                <Box sx={{ p: 1, mr: 1 }}>
                    <Chip label="Enter" size="small" variant="outlined" sx={{ borderRadius: 1, height: 24, fontSize: '0.7rem' }} />
                </Box>
            </Box>

            {/* 감지된 태그 표시 */}
            {tags.length > 0 && (
                <Box sx={{ px: 2, pb: 1.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {tags.map(tag => (
                        <Chip
                            key={tag}
                            label={`#${tag}`}
                            size="small"
                            onDelete={() => handleRemoveTag(tag)}
                            sx={{
                                height: 22,
                                fontSize: '0.7rem',
                                fontWeight: 'bold',
                                bgcolor: getTagColor(tag) + '18',
                                color: getTagColor(tag),
                                '& .MuiChip-deleteIcon': { fontSize: 14, color: getTagColor(tag) },
                            }}
                        />
                    ))}
                </Box>
            )}
        </Paper>
    );
};

export default TagInput;

