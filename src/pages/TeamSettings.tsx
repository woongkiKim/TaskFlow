import { useState, useCallback, useRef } from 'react';
import {
    Box, Typography, Avatar, Chip, Button, Tabs, Tab,
} from '@mui/material';
import { useLanguage } from '../contexts/LanguageContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import InviteDialog from '../components/InviteDialog';
import TabPanel from '../components/TabPanel';
import GeneralTab from './team-settings/GeneralTab';
import ProjectsSprintsTab from './team-settings/ProjectsSprintsTab';
import AutomationPrefsTab from './team-settings/AutomationPrefsTab';
import IntegrationsTab from './team-settings/IntegrationsTab';

const TeamSettings = ({ hideHeader = false }: { hideHeader?: boolean }) => {
    const { t, lang } = useLanguage();
    const textByLang = useCallback((enText: string, koText: string) => (lang === 'ko' ? koText : enText), [lang]);
    const { currentWorkspace, currentMembers } = useWorkspace();

    const [settingsTab, setSettingsTab] = useState(0);
    const [inviteOpen, setInviteOpen] = useState(false);

    // Ref used by ProjectsSprintsTab to trigger GitHub sync from IntegrationsTab
    const integrationsRef = useRef<{ openGhSync: (projectId: string) => void }>({ openGhSync: () => {} });

    if (!currentWorkspace) {
        return <Box sx={{ p: 3 }}><Typography>{t('noTeamSelected') as string}</Typography></Box>;
    }

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto' }}>
            {/* Header */}
            {!hideHeader && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Avatar sx={{ width: 56, height: 56, bgcolor: currentWorkspace.color, fontSize: 24, fontWeight: 700 }}>
                        {currentWorkspace.name.charAt(0)}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="h5" fontWeight={700}>{currentWorkspace.name}</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip label={currentWorkspace.type} size="small" sx={{ fontWeight: 600 }} />
                            <Typography variant="body2" color="text.secondary">{currentMembers.length} {t('members') as string}</Typography>
                        </Box>
                    </Box>
                    <Button variant="outlined" onClick={() => setInviteOpen(true)} sx={{ borderRadius: 2, fontWeight: 600 }}>
                        {t('inviteMembers') as string}
                    </Button>
                </Box>
            )}

            {/* Tab Navigation */}
            <Tabs value={settingsTab} onChange={(_, v) => setSettingsTab(v)} sx={{ mb: 3, '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: '0.9rem' } }}>
                <Tab label={textByLang('General', '일반')} />
                <Tab label={textByLang('Projects & Sprints', '프로젝트 & 스프린트')} />
                <Tab label={textByLang('Automation & Preferences', '자동화 & 환경설정')} />
                <Tab label={textByLang('Integrations', '외부 서비스 연동')} />
            </Tabs>

            <TabPanel value={settingsTab} index={0}>
                <GeneralTab />
            </TabPanel>

            <TabPanel value={settingsTab} index={1}>
                <ProjectsSprintsTab
                    onOpenGhSync={(projectId: string) => {
                        setSettingsTab(3);
                        // Allow the IntegrationsTab to mount, then trigger sync
                        setTimeout(() => integrationsRef.current.openGhSync(projectId), 100);
                    }}
                />
            </TabPanel>

            <TabPanel value={settingsTab} index={2}>
                <AutomationPrefsTab />
            </TabPanel>

            <TabPanel value={settingsTab} index={3}>
                <IntegrationsTab />
            </TabPanel>

            {/* Invite Dialog */}
            <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
        </Box>
    );
};

export default TeamSettings;
