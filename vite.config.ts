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
    server: {
      port: 2017,
      strictPort: true,
    },
    resolve: {
      alias: useMock
        ? [
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

    // ─── Build Optimization ────────────────────────────────
    build: {
      // Manual chunk splitting for optimal caching:
      // - vendor chunks rarely change → long cache TTL
      // - app code changes more often → separate chunk
      rollupOptions: {
        output: {
          manualChunks(id) {
            // Vendor chunk splitting by package name
            if (id.includes('node_modules')) {
              if (id.includes('react-dom') || id.includes('react-router')) {
                return 'vendor-react';
              }
              if (id.includes('@mui/')) {
                return 'vendor-mui';
              }
              if (id.includes('recharts') || id.includes('d3-')) {
                return 'vendor-charts';
              }
              if (id.includes('@tiptap/') || id.includes('prosemirror')) {
                return 'vendor-tiptap';
              }
              if (id.includes('firebase')) {
                return 'vendor-firebase';
              }
              if (id.includes('framer-motion')) {
                return 'vendor-motion';
              }
            }
          },
        },
      },
      // Generate source maps for production debugging
      sourcemap: true,
      // Increase warning limit since we have large vendor chunks
      chunkSizeWarningLimit: 600,
    },

    // ─── Preview Server (for testing prod builds locally) ──
    preview: {
      port: 2017,
      headers: {
        // Static assets (JS/CSS with hash) — cache forever
        // Vite adds content hashes to filenames automatically
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    },
  }
})
