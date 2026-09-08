import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { addNotification, removeNotifications, setNotifications } from '../store/notificationSlice';
import { getNotifications, getRealtimeConfig } from '../api/notification';

export function useNotificationChannel(isAuthenticated: boolean) {
  const dispatch = useDispatch();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsConnected(false);
      return;
    }

    let isCancelled = false;
    let ch: RealtimeChannel | null = null;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let retryDelay = 1000;

    const fetchLatest = async () => {
      if (isCancelled) return;
      try {
        const res = await getNotifications({ limit: 20 });
        if (!isCancelled && res.success && res.data) {
          dispatch(setNotifications({
            items: res.data, 
            unreadCount: res.meta.unread,
          }));
        }
      } catch {
        // Abaikan
      }
    };

    const connectToRealtime = async () => {
      if (isCancelled) return;

      try {
        // 1. Ambil config terbaru dari API
        const cfgRes = await getRealtimeConfig();
        if (isCancelled) return;

        const cfg = cfgRes.data;
        if (!cfg.enabled || !cfg.url || !cfg.anon_key || !cfg.token || !cfg.topic) {
          setIsConnected(false);
          return; // Realtime dimatikan oleh backend
        }

        // 2. Buat client dan pasang Token JWT
        const supabase = createClient(cfg.url, cfg.anon_key);
        await supabase.realtime.setAuth(cfg.token);
        if (isCancelled) return;

        // 3. Masuk ke Private Channel
        ch = supabase.channel(cfg.topic, {
          config: { private: true },
        });

        // 4. Daftarkan event listener
        ch.on('broadcast', { event: 'notification.created' }, (msg) => {
          if (msg.payload?.data) {
            dispatch(addNotification(msg.payload.data));
          }
        });

        ch.on('broadcast', { event: 'notification.cleared' }, (msg) => {
          if (msg.payload?.ids) {
            dispatch(removeNotifications(msg.payload.ids));
          }
        });

        // 5. Berlangganan
        ch.subscribe((status, err) => {
          if (isCancelled) return;

          if (status === 'SUBSCRIBED') {
            console.log('[Supabase Realtime] SUBSCRIBED');
            setIsConnected(true);
            retryDelay = 1000; // Reset retry delay
            
            // Segera sapu bersih pesan yang mungkin terlewat
            void fetchLatest();
            
            // Atur timer refresh token di menit ke-50 (atau 5/6 dari expires_in)
            const expiresInSec = cfg.expires_in || 3600;
            const refreshMs = Math.max((expiresInSec * 1000) - (10 * 60 * 1000), 60000); // minimal 1 menit
            
            if (refreshTimer) clearTimeout(refreshTimer);
            refreshTimer = setTimeout(() => {
              console.log('[Supabase Realtime] Refreshing token...');
              if (ch) supabase.removeChannel(ch);
              connectToRealtime(); // Nyambung ulang dengan token baru
            }, refreshMs);

          } else if (status === 'TIMED_OUT') {
            console.log('[Supabase Realtime] TIMED_OUT, retrying...');
            setIsConnected(false);
            if (ch) supabase.removeChannel(ch);
            
            retryTimer = setTimeout(() => {
              retryDelay = Math.min(retryDelay * 2, 30000);
              connectToRealtime();
            }, retryDelay);
            
          } else if (status === 'CHANNEL_ERROR') {
            setIsConnected(false);
            if (err?.message?.includes('Unauthorized')) {
              console.error('[Supabase Realtime] Unauthorized. Aborting retry.');
              // Jangan retry kalau unauthorized
            } else {
              console.log('[Supabase Realtime] CHANNEL_ERROR, retrying...');
              if (ch) supabase.removeChannel(ch);
              retryTimer = setTimeout(() => {
                retryDelay = Math.min(retryDelay * 2, 30000);
                connectToRealtime();
              }, retryDelay);
            }
          } else {
            setIsConnected(false);
          }
        });

      } catch (err) {
        console.error('[Supabase Realtime] Gagal mengambil konfigurasi', err);
        // Retry mengambil konfigurasi jika gagal
        retryTimer = setTimeout(() => {
          retryDelay = Math.min(retryDelay * 2, 30000);
          connectToRealtime();
        }, retryDelay);
      }
    };

    connectToRealtime();

    return () => {
      isCancelled = true;
      if (refreshTimer) clearTimeout(refreshTimer);
      if (retryTimer) clearTimeout(retryTimer);
      
      if (ch) {
        ch.unsubscribe();
      }
    };
  }, [isAuthenticated, dispatch]);

  return { isConnected };
}
