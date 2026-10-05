import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa' // [PWA] Import plugin VitePWA untuk mengubah web app menjadi PWA

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // [PWA Configuration] Konfigurasi Progressive Web App
    VitePWA({
      registerType: 'autoUpdate', // Otomatis memperbarui Service Worker saat ada kode baru
      includeAssets: ['favicon.png', 'apple-touch-icon.png', 'pwa-android-192x192.png', 'pwa-android-512x512.png', 'pwa-maskable-512x512.png'], // Aset statis yang di-cache di browser
      manifest: {
        id: '/', // [PWA] ID unik aplikasi
        name: 'HRIS', // [PWA] Nama lengkap aplikasi saat di-install
        short_name: 'HRIS', // [PWA] Nama pendek di bawah icon layar utama HP
        description: 'Human Resource Information System', // [PWA] Deskripsi aplikasi
        theme_color: '#0b5796', // [PWA] Warna status bar dan header di perangkat mobile (disesuaikan dengan warna logo baru)
        background_color: '#ffffff', // [PWA] Warna latar splash screen saat pertama dibuka
        display: 'standalone', // [PWA] Menjalankan aplikasi seperti native app (tanpa address bar browser)
        start_url: '/', // [PWA] Rute awal ketika aplikasi dibuka dari homescreen
        icons: [
          {
            src: '/pwa-android-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any' // [PWA] Icon standar untuk launcher Android (layar utama HP)
          },
          {
            src: '/pwa-android-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any' // [PWA] Icon resolusi tinggi untuk layar Splash Screen & Desktop
          },
          {
            src: '/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable' // [PWA] Khusus maskable icon (menyesuaikan bentuk bulat/kotak di Android)
          }
        ]
      },
      workbox: {
        // [PWA Workbox] Mengatur file yang otomatis disimpan di cache browser untuk akses cepat/offline
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}']
      },
      devOptions: {
        enabled: true // [PWA Dev] Mengaktifkan PWA di mode development (localhost) agar bisa di-test langsung
      }
    })
  ],
  server: {
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