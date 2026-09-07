import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { addNotification, removeNotifications, setUnreadCount } from '../store/notificationSlice';

export function useNotificationSocket(isAuthenticated: boolean) {
  // State untuk melacak apakah pipa komunikasi (socket) sedang tersambung atau tidak
  const [isConnected, setIsConnected] = useState(false);
  
  const dispatch = useDispatch();
  
  // Ref digunakan agar kita bisa menyimpan objek socket tanpa memicu render ulang React
  const socketRef = useRef<WebSocket | null>(null);
  
  // Ref untuk mengatur jeda waktu sebelum mencoba menyambung ulang (dimulai dari 1 detik)
  const reconnectDelayRef = useRef(1000);
  const maxReconnectDelay = 30000; // Maksimal jeda adalah 30 detik
  
  // Penanda apakah koneksi memang sengaja ditutup (misal saat user logout)
  const isIntentionalCloseRef = useRef(false);
  
  // Ref untuk menyimpan ID timer agar bisa dibatalkan jika komponen unmount
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Kalau belum login, jangan buka koneksi socket sama sekali
    if (!isAuthenticated) return;
    
    isIntentionalCloseRef.current = false;

    let socket: WebSocket;
    
    // Fungsi utama untuk membuka pipa komunikasi ke server
    const connect = () => {
      const url = window.location.origin.replace(/^http/, 'ws') + '/ws';
      socket = new WebSocket(url);
      socketRef.current = socket;

      // Event 1: Ketika pipa akhirnya berhasil tersambung
      socket.onopen = () => {
        console.log('[WebSocket] Terhubung ke server');
        setIsConnected(true);
        // Karena berhasil nyambung, kita kembalikan jeda reconnect ke 1 detik lagi
        reconnectDelayRef.current = 1000;
        
        // Begitu nyambung, hal pertama yang harus dilakukan adalah "Kenalan"
        // Kita kirim token rahasia kita ke server agar server tahu ini siapa
        const token = localStorage.getItem('token');
        if (token) {
          console.log('[WebSocket] Mengirim token autentikasi...');
          socket.send(JSON.stringify({ action: 'auth', token }));
        }
      };

      // Event 2: Ketika server tiba-tiba mengirimkan paket pesan lewat pipa
      socket.onmessage = (event) => {
        try {
          // Pesan dari server bentuknya teks murni, kita ubah jadi objek (JSON)
          const msg = JSON.parse(event.data);
          console.log('[WebSocket] Pesan diterima:', msg);
          
          if (msg.event === 'ready') {
            dispatch(setUnreadCount(msg.unread));
          } else if (msg.event === 'notification.created' && msg.data) {
            dispatch(addNotification(msg.data));
          } else if (msg.event === 'notification.cleared' && Array.isArray(msg.ids)) {
            dispatch(removeNotifications(msg.ids));
          }
        } catch (err) {
          // Abaikan jika pesan yang dikirim server berantakan (bukan JSON valid)
          console.warn('[WebSocket] Pesan masuk gagal di-parse:', event.data);
        }
      };

      // Event 3: Ketika pipa tiba-tiba terputus
      socket.onclose = (event) => {
        console.log(`[WebSocket] Terputus (Code: ${event.code})`);
        setIsConnected(false);
        socketRef.current = null;

        // Kalau memang disengaja (user logout/pindah halaman), jangan berusaha nyambung lagi
        if (isIntentionalCloseRef.current) return;

        // Kode 4001: Token salah (User pembohong)
        // Kode 4002: Telat kirim token dalam 10 detik
        if (event.code === 4001 || event.code === 4002) {
          return;
        }

        // Percobaan 1: tunggu 1 dtk, Percobaan 2: tunggu 2 dtk, Percobaan 3: 4 dtk, dst.
        reconnectTimerRef.current = setTimeout(() => {
          connect();
          reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 2, maxReconnectDelay);
        }, reconnectDelayRef.current);
      };

      // Event 4: Ketika terjadi error jaringan
      socket.onerror = () => {
        // Biarkan 'onclose' di atas yang mengambil alih urusan menyambung ulang
      };
    };

    // Mulai proses penyambungan!
    connect();

    // Fungsi bersih-bersih: Dijalankan otomatis oleh React saat user Logout 
    // atau komponen ini dimatikan.
    return () => {
      isIntentionalCloseRef.current = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [isAuthenticated, dispatch]);

  return { isConnected };
}
