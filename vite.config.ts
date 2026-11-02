import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script',
      workbox: {
        mode: process.env.CI ? 'production' : 'development',
        sourcemap: false,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,json}']
      },
      manifest: {
        name: 'Diff Checker',
        short_name: 'DiffChecker',
        description: 'Fast, secure in-browser text and Jupyter Notebook diff tool.',
        theme_color: '#f5f5fa',
        background_color: '#f5f5fa',
        scope: '/diff-checker/',
        start_url: '/diff-checker/',
        id: '/diff-checker/',
        display: 'standalone',
        categories: ['utilities', 'developer', 'productivity'],
        icons: [
          {
            src: 'pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any'
          }
        ]
      }
    })
  ],
  base: '/diff-checker/',
  worker: {
    format: 'es'
  }
});
