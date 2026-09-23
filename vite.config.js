import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// Trigger full reload
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Membuka akses jaringan lokal (HP)
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
        xfwd: true,
      },
      '/ws': {
        target: 'http://127.0.0.1:8080',
        ws: true,
      },
    },
  },
})