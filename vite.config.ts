import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src/pwa',
      filename: 'sw.ts',
      injectRegister: false,
      registerType: 'prompt',
      injectManifest: {
        globPatterns: [
          'assets/*.{js,css}',
          'icons/*.png',
          'favicon.svg',
          'manifest.webmanifest',
          'offline.html',
        ],
      },
      manifest: {
        id: '/',
        name: 'Digital Closet',
        short_name: 'Closet',
        description: 'Your wardrobe and outfit combinations, in one place.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        lang: 'en',
        theme_color: '#fafaf9',
        background_color: '#fafaf9',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  server: { port: 5173, strictPort: true },
})
