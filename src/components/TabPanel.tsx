import { Box } from '@mui/material';

interface TabPanelProps {
    children: React.ReactNode;
    value: number;
    index: number;
}

/**
 * Simple tab panel wrapper — renders children only when the
 * selected tab index matches this panel's index.
 */
const TabPanel = ({ children, value, index }: TabPanelProps) => (
    <Box
        role="tabpanel"
        hidden={value !== index}
        sx={{ display: value === index ? 'block' : 'none' }}
    >
        {value === index && children}
    </Box>
);

export default TabPanel;
