import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const useMock = env.VITE_USE_MOCK === 'true'

  const mockTarget = path.resolve(__dirname, 'src/services/mock/mockServices.ts')

  return {
    plugins: [react()],
    resolve: {
      alias: useMock
        ? [
            // When VITE_USE_MOCK=true, redirect all service file imports to mock
            { find: /^(.*)\/services\/taskService$/, replacement: mockTarget },
            { find: /^(.*)\/services\/projectService$/, replacement: mockTarget },
            { find: /^(.*)\/services\/sprintService$/, replacement: mockTarget },
            { find: /^(.*)\/services\/workspaceService$/, replacement: mockTarget },
            { find: /^(.*)\/services\/opsService$/, replacement: mockTarget },
            { find: /^(.*)\/services\/notificationService$/, replacement: mockTarget },
            { find: /^(.*)\/services\/initiativeService$/, replacement: mockTarget },
            { find: /^(.*)\/services\/customViewService$/, replacement: mockTarget },
            { find: /^(.*)\/services\/issueTemplateService$/, replacement: mockTarget },
            { find: /^(.*)\/services\/automationService$/, replacement: mockTarget },
            { find: /^(.*)\/services\/invitationService$/, replacement: mockTarget },
            { find: /^(.*)\/services\/projectUpdateService$/, replacement: mockTarget },
          ]
        : [],
    },
  }
})
