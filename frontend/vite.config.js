import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true // Lets you test the PWA installation on localhost
      },
      includeAssets: ['favicon.svg', 'icons.svg'], 
      manifest: {
        name: 'Noicee Life OS',
        short_name: 'Noicee',
        description: 'Automated personal command center and academic tracker.',
        theme_color: '#111827', // Matches your dark UI background
        background_color: '#111827',
        display: 'standalone', // Hides the browser URL bar
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ]
})