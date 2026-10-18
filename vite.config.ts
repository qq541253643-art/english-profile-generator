import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
