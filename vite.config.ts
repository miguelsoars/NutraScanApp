import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    // IMPORTANT for GitHub Pages (repo subpath). Relative base avoids 404s and "black screen".
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icons/pwa-192.png', 'icons/pwa-512.png'],
        manifest: {
          name: 'NutraScan',
          short_name: 'NutraScan',
          description: 'Análise de refeições por foto com estimativas de macros e micros.',
          theme_color: '#2563eb',
          background_color: '#f8fafc',
          display: 'standalone',
          scope: './',
          start_url: './',
          icons: [
            { src: 'icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
          ],
        },
        workbox: {
          navigateFallback: 'index.html',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
