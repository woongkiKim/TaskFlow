import type { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import { LanguageProvider } from './LanguageContext';
import { ThemeContextProvider } from './ThemeContext';
import { PomodoroProvider } from './PomodoroContext';
import { WorkspaceProvider } from './WorkspaceContext';
import { Toaster } from 'sonner';

interface AppProvidersProps {
    children: ReactNode;
}

export const AppProviders = ({ children }: AppProvidersProps) => {
    return (
        <LanguageProvider>
            <ThemeContextProvider>
                <AuthProvider>
                    <WorkspaceProvider>
                        <PomodoroProvider>
                            <BrowserRouter>
                                {children}
                                <Toaster richColors position="top-right" closeButton theme="system" />
                            </BrowserRouter>
                        </PomodoroProvider>
                    </WorkspaceProvider>
                </AuthProvider>
            </ThemeContextProvider>
        </LanguageProvider>
    );
};

