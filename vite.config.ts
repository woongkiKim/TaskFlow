import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const useMock = env.VITE_USE_MOCK === 'true'

  const mockTarget = path.resolve(__dirname, 'src/services/mock/mockServices.ts')

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: false, // we use public/manifest.json
        workbox: {
          // Pre-cache app shell (JS, CSS, fonts)
          globPatterns: ['**/*.{js,css,woff2,svg}'],
          // Limit precache to 5 MB to keep install fast on slow connections
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          // Runtime caching strategies
          runtimeCaching: [
            {
              // API calls — NetworkFirst with 5-min cache fallback
              urlPattern: /\/api\//,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                expiration: { maxEntries: 200, maxAgeSeconds: 5 * 60 },
                networkTimeoutSeconds: 10,
              },
            },
            {
              // Google Fonts
              urlPattern: /^https:\/\/fonts\.googleapis\.com/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'google-fonts-stylesheets',
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                expiration: { maxEntries: 30, maxAgeSeconds: 365 * 24 * 60 * 60 },
              },
            },
          ],
        },
      }),
    ],
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
              // tldraw is ~1.3MB — isolate for whiteboard page only
              if (id.includes('@tldraw') || id.includes('tldraw')) {
                return 'vendor-tldraw-draw';
              }
              // DnD kit — shared by WeeklyPlanner & TasksPage
              if (id.includes('@dnd-kit')) {
                return 'vendor-dndkit';
              }
            }
          },
        },
      },
      // Disable source maps in production (saves ~40% deploy size)
      sourcemap: false,
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
