import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
      '/__synthetic-people': {
        target: 'https://ambravo.github.io',
        changeOrigin: true,
        secure: true,
        rewrite: () => '/sigils-people/people/index.json',
      },
      '/__synthetic-avatar': {
        target: 'https://ambravo.github.io',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => {
          const id = new URL(path, 'http://127.0.0.1').searchParams.get('id') || ''
          return /^[a-z]{2}-\d{2}$/.test(id) ? `/sigils-people/portraits/l/${id}.avif` : '/__invalid_synthetic_avatar__'
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
