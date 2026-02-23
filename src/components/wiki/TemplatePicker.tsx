// src/components/wiki/TemplatePicker.tsx
import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, Box, Typography, Paper, TextField, IconButton, Button, Chip,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { renderMarkdown } from '../../utils/wikiUtils';
import { DOC_TEMPLATES, TEMPLATE_CATEGORY_LABELS, type DocTemplate } from '../../data/wikiTemplates';

interface TemplatePickerProps {
  lang: string;
  open: boolean;
  onClose: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  previewTemplate: DocTemplate | null;
  setPreviewTemplate: (t: DocTemplate | null) => void;
  onSelectTemplate: (tpl: DocTemplate) => void;
}

const TemplatePicker: React.FC<TemplatePickerProps> = ({
  lang, open, onClose, searchQuery, setSearchQuery, previewTemplate, setPreviewTemplate, onSelectTemplate,
}) => {
  return (
    <Dialog open={open} onClose={() => { onClose(); setPreviewTemplate(null); }} maxWidth="md" fullWidth
      PaperProps={{ sx: { borderRadius: 4, overflow: 'hidden', height: '80vh' } }}>
      <Box sx={{ display: 'flex', height: '100%' }}>
        {/* Main List Sidebar */}
        <Box sx={{ width: previewTemplate ? '40%' : '100%', borderRight: previewTemplate ? '1px solid' : 'none', borderColor: 'divider', display: 'flex', flexDirection: 'column', transition: 'width 0.3s' }}>
          <DialogTitle sx={{ fontWeight: 800, fontSize: '1.3rem', pb: 1, pt: 3, px: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AutoAwesomeIcon color="primary" />
              {lang === 'ko' ? '문서 템플릿' : 'Document Templates'}
            </Box>
            <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
          </DialogTitle>
          <Box sx={{ px: 3, pb: 2 }}>
            <TextField fullWidth size="small" placeholder={lang === 'ko' ? '템플릿 검색...' : 'Search templates...'} value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              InputProps={{ startAdornment: <SearchIcon sx={{ fontSize: 18, color: 'text.disabled', mr: 1 }} />, sx: { borderRadius: 2.5 } }} />
          </Box>
          <DialogContent sx={{ p: 0, overflow: 'auto' }}>
            {Object.entries(TEMPLATE_CATEGORY_LABELS).map(([catKey, catInfo]) => {
              const filteredTemplates = DOC_TEMPLATES.filter(tp =>
                tp.category === catKey &&
                (tp.nameKo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  tp.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  tp.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())))
              );
              if (filteredTemplates.length === 0) return null;
              return (
                <Box key={catKey} sx={{ px: 3, mb: 3 }}>
                  <Typography variant="caption" fontWeight={800} sx={{ color: catInfo.color, letterSpacing: 1, textTransform: 'uppercase', display: 'block', mb: 1, opacity: 0.8 }}>
                    {lang === 'ko' ? catInfo.ko : catInfo.en}
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {filteredTemplates.map(tpl => (
                      <Paper key={tpl.id} onClick={() => setPreviewTemplate(tpl)} onDoubleClick={() => onSelectTemplate(tpl)}
                        sx={{
                          p: 1.5, borderRadius: 2.5, cursor: 'pointer', border: '1.5px solid',
                          borderColor: previewTemplate?.id === tpl.id ? catInfo.color : 'divider',
                          bgcolor: previewTemplate?.id === tpl.id ? alpha(catInfo.color, 0.04) : 'transparent',
                          transition: 'all 0.2s', '&:hover': { bgcolor: alpha(catInfo.color, 0.02), transform: 'translateX(4px)' },
                        }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Typography sx={{ fontSize: '1.2rem' }}>{tpl.icon}</Typography>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" fontWeight={700} sx={{ lineHeight: 1.2 }}>{lang === 'ko' ? tpl.nameKo : tpl.nameEn}</Typography>
                            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>{lang === 'ko' ? tpl.descKo : tpl.descEn}</Typography>
                          </Box>
                        </Box>
                      </Paper>
                    ))}
                  </Box>
                </Box>
              );
            })}
          </DialogContent>
        </Box>

        {/* Preview Panel */}
        {previewTemplate && (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: alpha('#f8fafc', 0.5), animation: 'fadeIn 0.3s' }}>
            <Box sx={{ px: 3, py: 2.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'white' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography sx={{ fontSize: '1.8rem' }}>{previewTemplate.icon}</Typography>
                <Box>
                  <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.2 }}>{lang === 'ko' ? previewTemplate.nameKo : previewTemplate.nameEn}</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                    {previewTemplate.tags.map(t => <Chip key={t} label={t} size="small" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700 }} />)}
                  </Box>
                </Box>
              </Box>
              <Button variant="contained" onClick={() => onSelectTemplate(previewTemplate)}
                sx={{ borderRadius: 2, fontWeight: 700, px: 3, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                {lang === 'ko' ? '이 템플릿 사용' : 'Use Template'}
              </Button>
            </Box>
            <Box sx={{ flex: 1, p: 3, overflow: 'auto' }}>
              <Typography variant="caption" color="text.disabled" fontWeight={700} sx={{ display: 'block', mb: 2, textTransform: 'uppercase' }}>Preview</Typography>
              <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, bgcolor: 'white', minHeight: '100%' }}>
                <Box sx={{ '& h1, & h2, & h3': { color: 'text.primary', mt: 2, mb: 1 }, '& table': { borderCollapse: 'collapse', my: 2 }, '& pre': { background: '#f8fafc', p: 2, borderRadius: 2, fontSize: '0.8rem' }, lineHeight: 1.6, fontSize: '0.85rem' }}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(previewTemplate.content) }} />
              </Paper>
            </Box>
          </Box>
        )}
      </Box>
    </Dialog>
  );
};

export default TemplatePicker;
