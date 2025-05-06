import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // tudo que bater em /webhook vai para o seu n8n
      '/webhook': {
        target: 'http://177.153.62.236:5678',
        changeOrigin: true,
        secure: false,
        // opcional: remove qualquer //extra do path
        rewrite: path => path.replace(/^\/webhook\/+/, '/webhook/')
      }
    }
  }
})
