import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setNotifications } from '../store/notificationSlice';
import { getNotifications } from '../api/notification';
import { supabase } from '../lib/supabase';

export function useNotificationChannel(channel: string | null) {
  const dispatch = useDispatch();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!channel) {
      setIsConnected(false);
      return;
    }

    let dibatalkan = false;

    const ambilUlang = async () => {
      if (dibatalkan) return;
      try {
        const res = await getNotifications({ limit: 20 });
        if (!dibatalkan && res.success && res.data) {
          dispatch(setNotifications({
            items: res.data, 
            unreadCount: res.meta.unread,
          }));
        }
      } catch {
        // Abaikan error jaringan agar tidak mengganggu UI
      }
    };

    const ch = supabase.channel(channel);
    ch.on('broadcast', { event: 'refresh' }, () => { 
      void ambilUlang(); 
    });
    
    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setIsConnected(true);
        // setiap kali (re)connect, ambil yang tertinggal saat putus
        void ambilUlang();
      } else {
        setIsConnected(false);
      }
    });

    return () => {
      dibatalkan = true;
      supabase.removeChannel(ch);
    };
  }, [channel, dispatch]);

  return { isConnected };
}
