import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@shared': path.resolve(__dirname, 'shared'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    // Course package files are edited via the API (structure, notes, themes).
    // Watching them causes full page reloads that kick the presenter back to the library.
    watch: {
      ignored: ['**/courses/**', '**/data/**', '**/theme-templates/**'],
    },
  },
});
