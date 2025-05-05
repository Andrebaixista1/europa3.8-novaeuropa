// vite.config.ts ou vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// ⚠️ TUDO deve estar dentro do defineConfig!
export default defineConfig({
  base: './',
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://177.153.62.236:5678',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
