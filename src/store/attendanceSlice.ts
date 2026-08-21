import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Model untuk data absensi offline
export interface OfflineAttendanceItem {
  id: string; 
  type: 'check-in' | 'check-out';
  note?: string; 
  offline_time: string; 
}

export interface AttendanceState {
  offlineQueue: OfflineAttendanceItem[];
}

const initialState: AttendanceState = {
  offlineQueue: [],
};

// Slice Redux untuk mengelola antrean absen
const attendanceSlice = createSlice({
  name: 'attendance',
  initialState,
  reducers: {
    addOfflineAttendance: (state, action: PayloadAction<OfflineAttendanceItem>) => {
      state.offlineQueue.push(action.payload);
    },
    
    removeOfflineAttendance: (state, action: PayloadAction<string>) => {
      state.offlineQueue = state.offlineQueue.filter(item => item.id !== action.payload);
    },
    clearOfflineQueue: (state) => {
      state.offlineQueue = [];
    }
  },
});

export const { addOfflineAttendance, removeOfflineAttendance, clearOfflineQueue } = attendanceSlice.actions;

export default attendanceSlice.reducer;
