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
        theme_color: '#34495e',
        background_color: '#f5f5fa',
        scope: '/diff-checker/',
        start_url: '/diff-checker/',
        display: 'standalone',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml'
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
