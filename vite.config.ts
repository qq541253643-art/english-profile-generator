import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { handleSyntheticAvatar, handleSyntheticCatalog } from './scripts/synthetic-people-proxy.mjs'

function localPortraitDevProxy() {
  return {
    name: 'compatible-avatar-dev-proxy',
    configureServer(server: { middlewares: { use: (handler: (request: { url?: string; method?: string }, response: import('node:http').ServerResponse, next: () => void) => void) => void } }) {
      server.middlewares.use((request, response, next) => {
        const requestUrl = new URL(request.url || '/', 'http://127.0.0.1')
        if (requestUrl.pathname !== '/__synthetic-avatar' && requestUrl.pathname !== '/__synthetic-people') return next()
        if (request.method !== 'GET' && request.method !== 'HEAD') {
          response.writeHead(405, { Allow: 'GET, HEAD' })
          return response.end('Method Not Allowed')
        }
        if (requestUrl.pathname === '/__synthetic-people') {
          void handleSyntheticCatalog(requestUrl, response, request.method)
        } else {
          void handleSyntheticAvatar(requestUrl, response, request.method)
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [localPortraitDevProxy(), react(), tailwindcss()],
  build: {
    target: 'safari15',
    cssTarget: 'safari15',
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: false,
    proxy: {
      '/__avatar': {
        target: 'https://randomuser.me',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => {
          try {
            const requestUrl = new URL(path, 'http://127.0.0.1')
            const targetUrl = new URL(requestUrl.searchParams.get('url') || '')
            const allowedPath = /^\/api\/portraits\/(?:men|women)\/\d+\.jpg$/
            return targetUrl.protocol === 'https:' && targetUrl.hostname === 'randomuser.me' && allowedPath.test(targetUrl.pathname)
              ? targetUrl.pathname
              : '/__invalid_avatar__'
          } catch {
            return '/__invalid_avatar__'
          }
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: { reporter: ['text', 'json-summary'] },
  },
})
