import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
// import { VitePWA } from 'vite-plugin-pwa' // PWA плагин отключен

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    // VitePWA отключен для отключения Service Worker
    // VitePWA({
    //   registerType: 'autoUpdate',
    //   workbox: {
    //     globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}']
    //   },
    //   manifest: {
    //     name: 'Флорист - Управление заказами',
    //     short_name: 'Флорист',
    //     description: 'Приложение для управления заказами цветочного салона',
    //     theme_color: '#E63A62',
    //     background_color: '#E63A62',
    //     display: 'standalone',
    //     icons: [
    //       {
    //         src: 'pwa-192x192.png',
    //         sizes: '192x192',
    //         type: 'image/png'
    //       },
    //       {
    //         src: 'pwa-512x512.png',
    //         sizes: '512x512',
    //         type: 'image/png'
    //       }
    //     ]
    //   }
    // })
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
