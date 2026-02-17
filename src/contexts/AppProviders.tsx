import type { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import { LanguageProvider } from './LanguageContext';
import { PomodoroProvider } from './PomodoroContext';
import { WorkspaceProvider } from './WorkspaceContext';
import { Toaster } from 'sonner';

interface AppProvidersProps {
    children: ReactNode;
}

export const AppProviders = ({ children }: AppProvidersProps) => {
    return (
        <LanguageProvider>
            <AuthProvider>
                <WorkspaceProvider>
                    <PomodoroProvider>
                        <BrowserRouter>
                            {children}
                        </BrowserRouter>
                        <Toaster richColors position="top-right" closeButton theme="system" />
                    </PomodoroProvider>
                </WorkspaceProvider>
            </AuthProvider>
        </LanguageProvider>
    );
};
