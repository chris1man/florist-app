import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
const enablePWA = process.env.DISABLE_SW !== 'true'

export default defineConfig({
  plugins: [
    vue(),
    ...(enablePWA
      ? [
          VitePWA({
            registerType: 'autoUpdate',
            strategies: 'injectManifest',
            srcDir: 'src',
            filename: 'sw.js',
            workbox: {
              cleanupOutdatedCaches: true,
              skipWaiting: true,
              clientsClaim: true
            },
            manifest: {
              name: 'Флорист - Управление заказами',
              short_name: 'Флорист',
              description: 'Приложение для управления заказами цветочного салона',
              theme_color: '#933742',
              background_color: '#ffffff',
              display: 'standalone',
              orientation: 'portrait-primary',
              scope: '/',
              start_url: '/',
              icons: [
                {
                  src: '/pwa-192x192.png',
                  sizes: '192x192',
                  type: 'image/png',
                  purpose: 'any'
                },
                {
                  src: '/pwa-512x512.png',
                  sizes: '512x512',
                  type: 'image/png',
                  purpose: 'any'
                }
              ]
            }
          })
        ]
      : [])
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true
      },
      '/ws': {
        target: 'ws://127.0.0.1:3001',
        ws: true,
        changeOrigin: true
      }
    }
  }
})
