import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Typography, Box, IconButton, useTheme, alpha,
  Fade
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import BugReportIcon from '@mui/icons-material/BugReport';
import SendIcon from '@mui/icons-material/Send';
import { toast } from 'sonner';
import { useLanguage } from '../contexts/LanguageContext';
import { useThemeMode } from '../contexts/ThemeContext';

interface ErrorReportDialogProps {
  open: boolean;
  onClose: () => void;
  errorInfo?: string;
  context?: string;
}

export const ErrorReportDialog = ({ open, onClose, errorInfo, context }: ErrorReportDialogProps) => {
  const theme = useTheme();
  const { lang } = useLanguage();
  const { mode } = useThemeMode();

  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDark = mode === 'dark';
  const t = (en: string, ko: string) => (lang === 'ko' ? ko : en);

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error(t('Please describe what happened', '발생한 상황을 설명해주세요'));
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate API call to send error report
      await new Promise(resolve => setTimeout(resolve, 800));

      console.log('Error Report Submitted:', {
        description,
        errorInfo,
        context,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString()
      });

      toast.success(t('Error report sent successfully', '오류 보고가 성공적으로 전송되었습니다'));
      setDescription('');
      onClose();
    } catch {
      toast.error(t('Failed to send report', '보고 전송에 실패했습니다'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      TransitionComponent={Fade}
      PaperProps={{
        sx: {
          borderRadius: 3,
          bgcolor: isDark ? alpha('#1e293b', 0.9) : alpha('#ffffff', 0.9),
          backdropFilter: 'blur(20px)',
          border: '1px solid',
          borderColor: isDark ? alpha('#e2e8f0', 0.1) : alpha('#e2e8f0', 0.8),
          boxShadow: isDark
            ? '0 25px 50px -12px rgba(0,0,0,0.5)'
            : '0 25px 50px -12px rgba(0,0,0,0.1)',
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            p: 1, borderRadius: 2,
            bgcolor: alpha(theme.palette.error.main, 0.1),
            color: theme.palette.error.main,
            display: 'flex'
          }}>
            <BugReportIcon />
          </Box>
          <Typography variant="h6" fontWeight={700}>
            {t('Report an Issue', '문제 보고하기')}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pb: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {t(
            'We apologize for the inconvenience. Please describe what you were trying to do when the error occurred.',
            '불편을 드려 죄송합니다. 문제가 발생했을 때 어떤 작업을 하고 계셨는지 자세히 설명해 주세요.'
          )}
        </Typography>

        <TextField
          autoFocus
          fullWidth
          multiline
          rows={4}
          variant="outlined"
          placeholder={t('Example: I clicked the save button an the screen went blank...', '예시: 저장 버튼을 눌렀는데 화면이 하얗게 변했습니다...')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: isDark ? alpha('#0f172a', 0.5) : alpha('#f8fafc', 0.8),
            }
          }}
        />

        {errorInfo && (
          <Box sx={{
            mt: 3, p: 2, borderRadius: 2,
            bgcolor: isDark ? alpha('#0f172a', 0.8) : alpha('#f1f5f9', 0.8),
            border: '1px solid',
            borderColor: isDark ? alpha('#334155', 0.5) : alpha('#e2e8f0', 0.8),
          }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} gutterBottom display="block">
              {t('Error Details (Included in report)', '오류 세부 정보 (보고서에 포함됨)')}
            </Typography>
            <Typography variant="caption" sx={{
              fontFamily: 'monospace',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              color: theme.palette.error.main,
              opacity: 0.8
            }}>
              {errorInfo}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
        <Button onClick={onClose} color="inherit" disabled={isSubmitting}>
          {t('Cancel', '취소')}
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          disabled={!description.trim() || isSubmitting}
          startIcon={<SendIcon />}
          sx={{ borderRadius: 2, px: 3 }}
        >
          {t('Submit Report', '버그 보고하기')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
