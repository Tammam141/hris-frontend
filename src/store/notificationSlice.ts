import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Notification } from '../types/notification';

interface NotificationState {
  items: Notification[];
  unreadCount: number;
}

const initialState: NotificationState = {
  items: [],
  unreadCount: 0,
};

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    // Timpa ulang semua state setelah mendapat respons dari server
    setNotifications: (state, action: PayloadAction<{ items: Notification[]; unreadCount: number }>) => {
      state.items = action.payload.items;
      state.unreadCount = action.payload.unreadCount;
    },
    // Set angka lonceng notifikasi
    setUnreadCount: (state, action: PayloadAction<number>) => {
      state.unreadCount = action.payload;
    },
    // Update data satu notifikasi (misal: saat diklik dan dibaca)
    updateNotification: (state, action: PayloadAction<Notification>) => {
      const index = state.items.findIndex(n => n.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
    },
    // Tandai semua terbaca di lokal
    markAllAsReadLocal: (state) => {
      state.items.forEach(n => { n.is_read = true; });
      state.unreadCount = 0;
    },
    // Tambah notifikasi dari socket ke daftar teratas
    addNotification: (state, action: PayloadAction<Notification>) => {
      if (state.items.some(n => n.id === action.payload.id)) return;
      state.items.unshift(action.payload);
      if (!action.payload.is_read) {
        state.unreadCount += 1;
      }
    },
    // Hapus notifikasi yang ditarik/usang dari server
    removeNotifications: (state, action: PayloadAction<string[]>) => {
      const ids = new Set(action.payload);
      const belumDibaca = state.items.filter(n => ids.has(n.id) && !n.is_read).length;
      state.items = state.items.filter(n => !ids.has(n.id));
      state.unreadCount = Math.max(0, state.unreadCount - belumDibaca);
    },
  },
});

export const { 
  setNotifications, 
  setUnreadCount, 
  updateNotification, 
  markAllAsReadLocal,
  addNotification,
  removeNotifications
} = notificationSlice.actions;
export default notificationSlice.reducer;
