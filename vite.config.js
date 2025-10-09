import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/webhook': {
        target: 'https://n8n.sistemavieira.com.br',
        changeOrigin: true,
        secure: true,
        logLevel: 'debug',
        // Manter o path original
        rewrite: (path) => path,
      },
      '/api': {
        target: 'https://n8n.sistemavieira.com.br',
        changeOrigin: true,
        secure: true,
        logLevel: 'debug',
        // Manter o path original
        rewrite: (path) => path,
      },
    },
  },
})
