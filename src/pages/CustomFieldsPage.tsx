// src/pages/CustomFieldsPage.tsx
import { useState } from 'react';
import {
  Box, Typography, Paper, Button, IconButton,
  alpha, useTheme, Fade, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Select, MenuItem,
  InputLabel, FormControl
} from '@mui/material';
import EditAttributesIcon from '@mui/icons-material/EditAttributes';
import AddIcon from '@mui/icons-material/Add';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import NumbersIcon from '@mui/icons-material/Numbers';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ArrowDropDownCircleIcon from '@mui/icons-material/ArrowDropDownCircle';
import LinkIcon from '@mui/icons-material/Link';
import CheckBoxOutlinedIcon from '@mui/icons-material/CheckBoxOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

import { useLanguage } from '../contexts/LanguageContext';
import { toast } from 'sonner';

const t = (lang: 'ko' | 'en', en: string, ko: string) => (lang === 'ko' ? ko : en);

type FieldType = 'text' | 'number' | 'date' | 'dropdown' | 'url' | 'checkbox';

interface CustomField {
  id: string;
  name: string;
  type: FieldType;
  options?: string[]; // For dropdown
  description: string;
  required: boolean;
}

const INITIAL_FIELDS: CustomField[] = [
  { id: 'cf_1', name: 'Figma URL', type: 'url', description: 'Design file link', required: false },
  { id: 'cf_2', name: 'Story Points', type: 'number', description: 'Agile estimation points', required: true },
  { id: 'cf_3', name: 'Client Type', type: 'dropdown', options: ['Enterprise', 'SMB', 'Startup'], description: 'Type of the client', required: false },
  { id: 'cf_4', name: 'Approved', type: 'checkbox', description: 'Is this task approved by manager?', required: false },
];

const TYPE_ICONS: Record<FieldType, React.ReactNode> = {
  text: <TextFieldsIcon fontSize="small" />,
  number: <NumbersIcon fontSize="small" />,
  date: <CalendarMonthIcon fontSize="small" />,
  dropdown: <ArrowDropDownCircleIcon fontSize="small" />,
  url: <LinkIcon fontSize="small" />,
  checkbox: <CheckBoxOutlinedIcon fontSize="small" />,
};

const TYPE_LABELS: Record<FieldType, { en: string; ko: string }> = {
  text: { en: 'Short Text', ko: '짧은 텍스트' },
  number: { en: 'Number', ko: '숫자' },
  date: { en: 'Date', ko: '날짜' },
  dropdown: { en: 'Dropdown', ko: '드롭다운' },
  url: { en: 'URL Link', ko: 'URL 링크' },
  checkbox: { en: 'Checkbox', ko: '체크박스' },
};

export default function CustomFieldsPage() {
  const theme = useTheme();
  const { lang } = useLanguage();

  const [fields, setFields] = useState<CustomField[]>(INITIAL_FIELDS);
  const [openBuilder, setOpenBuilder] = useState(false);

  // Builder state
  const [fieldName, setFieldName] = useState('');
  const [fieldType, setFieldType] = useState<FieldType>('text');
  const [fieldDesc, setFieldDesc] = useState('');
  const [dropdownOptions, setDropdownOptions] = useState('Option 1, Option 2, Option 3');

  const handleDelete = (id: string) => {
    if (confirm(t(lang, 'Are you sure you want to delete this custom field? This might affect existing tasks.', '이 커스텀 필드를 삭제하시겠습니까? 기존 태스크에 영향을 줄 수 있습니다.'))) {
      setFields(prev => prev.filter(f => f.id !== id));
      toast.success(t(lang, 'Field deleted', '필드가 삭제되었습니다'));
    }
  };

  const handleSaveField = () => {
    if (!fieldName.trim()) {
      toast.error(t(lang, 'Please enter a field name', '필드 이름을 입력해주세요'));
      return;
    }
    const newField: CustomField = {
      id: `cf_${Date.now()}`,
      name: fieldName,
      type: fieldType,
      description: fieldDesc,
      required: false,
      options: fieldType === 'dropdown' ? dropdownOptions.split(',').map(s => s.trim()) : undefined,
    };
    setFields([...fields, newField]);
    setOpenBuilder(false);
    // Reset
    setFieldName(''); setFieldType('text'); setFieldDesc(''); setDropdownOptions('Option 1, Option 2, Option 3');
    toast.success(t(lang, 'Custom field added!', '커스텀 필드가 추가되었습니다!'));
  };

  return (
    <Fade in timeout={400}>
      <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 900, mx: 'auto' }}>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4, flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <EditAttributesIcon sx={{ color: '#10b981', fontSize: 36 }} />
              <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: -0.5 }}>
                {t(lang, 'Custom Fields', '커스텀 필드')}
              </Typography>
            </Box>
            <Typography variant="body1" color="text.secondary">
              {t(lang, 'Add your own data fields to tasks to perfectly match your workflow workflows.', '워크플로우에 맞춰 태스크에 내 입맛대로 데이터 필드를 추가하세요.')}
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenBuilder(true)}
            sx={{ px: 3, py: 1, borderRadius: 2, fontWeight: 700, bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' }, textTransform: 'none' }}>
            {t(lang, 'Add Field', '필드 추가')}
          </Button>
        </Box>

        {/* Field List Container */}
        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>

          {/* Table Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', p: 2, bgcolor: theme.palette.mode === 'dark' ? alpha('#fff', 0.03) : '#f8fafc', borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ width: 40 }} /> {/* Drag handle placeholder */}
            <Typography variant="subtitle2" color="text.secondary" fontWeight={700} sx={{ flex: 1.5 }}>
              {t(lang, 'Field Name', '필드 이름')}
            </Typography>
            <Typography variant="subtitle2" color="text.secondary" fontWeight={700} sx={{ flex: 1, display: { xs: 'none', sm: 'block' } }}>
              {t(lang, 'Type', '유형')}
            </Typography>
            <Typography variant="subtitle2" color="text.secondary" fontWeight={700} sx={{ flex: 2, display: { xs: 'none', md: 'block' } }}>
              {t(lang, 'Description', '설명')}
            </Typography>
            <Box sx={{ width: 80 }} /> {/* Actions placeholder */}
          </Box>

          {/* List Of Fields */}
          {fields.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <EditAttributesIcon sx={{ fontSize: 48, color: 'text.disabled', opacity: 0.5, mb: 2 }} />
              <Typography variant="subtitle1" color="text.secondary" fontWeight={600}>
                {t(lang, 'No custom fields defined.', '커스텀 필드가 아직 없습니다.')}
              </Typography>
            </Box>
          ) : (
            fields.map((field, idx) => (
              <Box key={field.id} sx={{
                display: 'flex', alignItems: 'center', p: 2,
                borderBottom: idx < fields.length - 1 ? '1px solid' : 'none',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                transition: '0.2s',
                '&:hover': { bgcolor: alpha('#10b981', 0.03) }
              }}>
                <Box sx={{ width: 40, color: 'text.disabled', cursor: 'grab', display: 'flex', alignItems: 'center' }}>
                  <DragIndicatorIcon fontSize="small" />
                </Box>

                {/* Name */}
                <Box sx={{ flex: 1.5, display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                  <Typography variant="body1" fontWeight={700} noWrap>{field.name}</Typography>
                  {field.required && <Chip label="*" size="small" color="error" sx={{ height: 16, fontSize: '0.6rem' }} />}
                </Box>

                {/* Type */}
                <Box sx={{ flex: 1, display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1 }}>
                  <Chip
                    icon={TYPE_ICONS[field.type]}
                    label={lang === 'ko' ? TYPE_LABELS[field.type].ko : TYPE_LABELS[field.type].en}
                    size="small"
                    sx={{ borderRadius: 1.5, fontWeight: 600, color: 'text.secondary', bgcolor: alpha(theme.palette.text.secondary, 0.08) }}
                  />
                  {field.type === 'dropdown' && field.options && (
                    <Typography variant="caption" color="text.disabled" sx={{ ml: 1, maxWidth: 80 }} noWrap>
                      ({field.options.length})
                    </Typography>
                  )}
                </Box>

                {/* Description */}
                <Box sx={{ flex: 2, display: { xs: 'none', md: 'block' }, minWidth: 0, pr: 2 }}>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {field.description || '-'}
                  </Typography>
                </Box>

                {/* Actions */}
                <Box sx={{ width: 80, display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                  <IconButton size="small"><EditOutlinedIcon fontSize="small" /></IconButton>
                  <IconButton size="small" onClick={() => handleDelete(field.id)} sx={{ color: 'error.main' }}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            ))
          )}
        </Paper>

        {/* Create Dialog */}
        <Dialog open={openBuilder} onClose={() => setOpenBuilder(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 800, borderBottom: '1px solid', borderColor: 'divider', pb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <EditAttributesIcon sx={{ color: '#10b981' }} />
              {t(lang, 'Add Custom Field', '커스텀 필드 추가')}
            </Box>
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            <TextField fullWidth label={t(lang, 'Field Name', '필드 이름')} placeholder={t(lang, 'e.g. Budget', '예: 예산')}
              value={fieldName} onChange={e => setFieldName(e.target.value)} sx={{ mb: 3 }} />

            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>{t(lang, 'Field Type', '필드 유형')}</InputLabel>
              <Select value={fieldType} label={t(lang, 'Field Type', '필드 유형')} onChange={e => setFieldType(e.target.value as FieldType)}>
                {(Object.keys(TYPE_LABELS) as FieldType[]).map(key => (
                  <MenuItem key={key} value={key} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ display: 'flex', color: 'text.secondary' }}>{TYPE_ICONS[key]}</Box>
                    {lang === 'ko' ? TYPE_LABELS[key].ko : TYPE_LABELS[key].en}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {fieldType === 'dropdown' && (
              <TextField fullWidth label={t(lang, 'Options (comma separated)', '옵션 (쉼표로 구분)')}
                value={dropdownOptions} onChange={e => setDropdownOptions(e.target.value)}
                sx={{ mb: 3 }} helperText={t(lang, 'Example: High, Medium, Low', '예: 높음, 중간, 낮음')} />
            )}

            <TextField fullWidth label={t(lang, 'Description (Optional)', '설명 (선택사항)')} multiline rows={2}
              value={fieldDesc} onChange={e => setFieldDesc(e.target.value)} />

          </DialogContent>
          <DialogActions sx={{ p: 2, pt: 0, borderTop: '1px solid', borderColor: 'divider', mt: 2 }}>
            <Button onClick={() => setOpenBuilder(false)} sx={{ textTransform: 'none', fontWeight: 600 }}>{t(lang, 'Cancel', '취소')}</Button>
            <Button variant="contained" onClick={handleSaveField} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' } }}>
              {t(lang, 'Create Field', '필드 생성')}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Fade>
  );
}
