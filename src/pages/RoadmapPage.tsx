import { Box, Typography, Paper, Chip } from '@mui/material';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useNavigate } from 'react-router-dom';
import GanttChart from '../components/GanttChart';
import { useLanguage } from '../contexts/LanguageContext';

const ROADMAP_TEXT_BY_LANG: Record<'en' | 'ko', {
  title: string;
  overview: string;
  activeInitiatives: string;
  noActiveInitiatives: string;
  noCompletedInitiatives: string;
}> = {
  en: {
    title: 'Roadmap',
    overview: 'High-level overview of all initiatives and their timelines.',
    activeInitiatives: 'Active Initiatives',
    noActiveInitiatives: 'No active initiatives found.',
    noCompletedInitiatives: 'No completed initiatives.',
  },
  ko: {
    title: '\uB85C\uB4DC\uB9F5',
    overview: '\uBAA8\uB4E0 \uC774\uB2C8\uC2DC\uC5D0\uC774\uD2F0\uBE0C\uC640 \uC77C\uC815\uC744 \uD55C\uB208\uC5D0 \uBCFC \uC218 \uC788\uB294 \uB85C\uB4DC\uB9F5\uC785\uB2C8\uB2E4.',
    activeInitiatives: '\uC9C4\uD589 \uC911\uC778 \uC774\uB2C8\uC2DC\uC5D0\uC774\uD2F0\uBE0C',
    noActiveInitiatives: '\uC9C4\uD589 \uC911\uC778 \uC774\uB2C8\uC2DC\uC5D0\uC774\uD2F0\uBE0C\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.',
    noCompletedInitiatives: '\uC644\uB8CC\uB41C \uC774\uB2C8\uC2DC\uC5D0\uC774\uD2F0\uBE0C\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.',
  },
};

const RoadmapPage = () => {
  const { initiatives } = useWorkspace();
  const navigate = useNavigate();
  const { t, lang } = useLanguage();

  const text = ROADMAP_TEXT_BY_LANG[lang];

  const activeInitiatives = initiatives.filter(i => i.status !== 'completed');
  const completedInitiatives = initiatives.filter(i => i.status === 'completed');

  return (
    <Box sx={{ p: 4, flex: 1, overflow: 'auto', bgcolor: 'background.default', minHeight: '100%' }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: -1, mb: 1 }}>{text.title}</Typography>
        <Typography variant="body1" color="text.secondary">
          {text.overview}
        </Typography>
      </Box>

      <Box sx={{ mb: 5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" fontWeight={700}>{text.activeInitiatives}</Typography>
        </Box>
        {activeInitiatives.length > 0 ? (
          <GanttChart
            items={activeInitiatives.map(i => ({
              id: i.id,
              name: i.name,
              startDate: i.createdAt,
              targetDate: i.targetDate,
              createdAt: i.createdAt,
              color: i.color || '#3b82f6',
            }))}
            onItemClick={(item) => navigate(`/initiative/${item.id}`)}
          />
        ) : (
          <Paper sx={{ p: 4, textAlign: 'center', border: '1px dashed', borderColor: 'divider', bgcolor: 'transparent' }}>
            <Typography variant="body2" color="text.secondary">{text.noActiveInitiatives}</Typography>
          </Paper>
        )}
      </Box>

      <Box sx={{ mb: 5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" fontWeight={700}>{t('completed') as string}</Typography>
        </Box>
        {completedInitiatives.length > 0 ? (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {completedInitiatives.map(i => (
              <Chip
                key={i.id}
                label={i.name}
                onClick={() => navigate(`/initiative/${i.id}`)}
                sx={{ bgcolor: (i.color || '#10b981') + '20', color: i.color || '#10b981', borderColor: (i.color || '#10b981') + '40', border: '1px solid', cursor: 'pointer' }}
              />
            ))}
          </Box>
        ) : (
          <Typography variant="caption" color="text.secondary">{text.noCompletedInitiatives}</Typography>
        )}
      </Box>
    </Box>
  );
};

export default RoadmapPage;
