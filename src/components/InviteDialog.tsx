import { useState } from 'react';
import { toast } from 'sonner';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Box, Tabs, Tab, TextField, Button, Typography,
    IconButton, Tooltip, Alert,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LinkIcon from '@mui/icons-material/Link';
import EmailIcon from '@mui/icons-material/Email';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import { useLanguage } from '../contexts/LanguageContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { createLinkInvite, createEmailInvite } from '../services/invitationService';
import { useAuth } from '../contexts/AuthContext';

interface InviteDialogProps {
    open: boolean;
    onClose: () => void;
}

const InviteDialog = ({ open, onClose }: InviteDialogProps) => {
    const { t } = useLanguage();
    const { user } = useAuth();
    const { currentWorkspace } = useWorkspace();
    const [tab, setTab] = useState(0);
    const [email, setEmail] = useState('');
    const [inviteLink, setInviteLink] = useState('');
    const [emailSent, setEmailSent] = useState(false);
    const [linkCreated, setLinkCreated] = useState(false);

    const handleCreateLink = async () => {
        if (!currentWorkspace || !user) return;
        try {
            const inv = await createLinkInvite(currentWorkspace.id, user.uid);
            const link = `${window.location.origin}?invite=${inv.token}`;
            setInviteLink(link);
            setLinkCreated(true);
        } catch (e) {
            console.error(e);
            toast.error(t('loadFailed') as string);
        }
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(inviteLink);
        toast.success(t('copied') as string);
    };

    const handleSendEmail = async () => {
        if (!currentWorkspace || !user || !email.trim()) return;
        try {
            await createEmailInvite(currentWorkspace.id, email.trim(), user.uid);
            setEmailSent(true);
            setEmail('');
        } catch (e) {
            console.error(e);
            toast.error(t('loadFailed') as string);
        }
    };

    const copyInviteCode = () => {
        if (currentWorkspace?.inviteCode) {
            navigator.clipboard.writeText(currentWorkspace.inviteCode);
            toast.success(t('copied') as string);
        }
    };

    const handleClose = () => {
        setEmail(''); setInviteLink(''); setEmailSent(false); setLinkCreated(false);
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
            <DialogTitle sx={{ fontWeight: 700 }}>{t('inviteMembers') as string}</DialogTitle>
            <DialogContent>
                <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
                    <Tab icon={<VpnKeyIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={t('inviteCode') as string} sx={{ textTransform: 'none', fontWeight: 600 }} />
                    <Tab icon={<LinkIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={t('inviteLink') as string} sx={{ textTransform: 'none', fontWeight: 600 }} />
                    <Tab icon={<EmailIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={t('emailInvite') as string} sx={{ textTransform: 'none', fontWeight: 600 }} />
                </Tabs>

                {/* 초대 코드 */}
                {tab === 0 && (
                    <Box sx={{ textAlign: 'center', py: 3 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{t('shareCodeDesc') as string}</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, bgcolor: 'grey.100', p: 3, borderRadius: 2 }}>
                            <Typography variant="h3" fontWeight={800} sx={{ letterSpacing: 8, fontFamily: 'monospace' }}>
                                {currentWorkspace?.inviteCode || '------'}
                            </Typography>
                            <Tooltip title={t('copyCode') as string}>
                                <IconButton onClick={copyInviteCode}><ContentCopyIcon /></IconButton>
                            </Tooltip>
                        </Box>
                    </Box>
                )}

                {/* 초대 링크 */}
                {tab === 1 && (
                    <Box sx={{ py: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{t('linkDesc') as string}</Typography>
                        {!linkCreated ? (
                            <Button fullWidth variant="contained" onClick={handleCreateLink} startIcon={<LinkIcon />} sx={{ borderRadius: 2 }}>
                                {t('generateLink') as string}
                            </Button>
                        ) : (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'grey.100', p: 2, borderRadius: 2 }}>
                                <Typography variant="body2" sx={{ flex: 1, wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                    {inviteLink}
                                </Typography>
                                <Tooltip title={t('copyLink') as string}>
                                    <IconButton onClick={handleCopyLink}><ContentCopyIcon /></IconButton>
                                </Tooltip>
                            </Box>
                        )}
                    </Box>
                )}

                {/* 이메일 초대 */}
                {tab === 2 && (
                    <Box sx={{ py: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{t('emailDesc') as string}</Typography>
                        {emailSent && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>{t('inviteSent') as string}</Alert>}
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <TextField
                                fullWidth size="small"
                                placeholder={t('emailPlaceholder') as string}
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSendEmail()}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                            />
                            <Button variant="contained" onClick={handleSendEmail} disabled={!email.trim()} sx={{ borderRadius: 2, px: 3, whiteSpace: 'nowrap' }}>
                                {t('sendInvite') as string}
                            </Button>
                        </Box>
                    </Box>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={handleClose} color="inherit" sx={{ borderRadius: 2, fontWeight: 600 }}>{t('close') as string}</Button>
            </DialogActions>
        </Dialog>
    );
};

export default InviteDialog;
