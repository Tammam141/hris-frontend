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
  },
});

export const { setNotifications, setUnreadCount, updateNotification, markAllAsReadLocal } = notificationSlice.actions;
export default notificationSlice.reducer;
