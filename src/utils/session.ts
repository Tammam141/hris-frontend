import { store, persistor } from '../store';
import { clearOfflineQueue } from '../store/attendanceSlice';
import { clearNotifications } from '../store/notificationSlice';

export async function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  
  store.dispatch(clearOfflineQueue());
  store.dispatch(clearNotifications());
  
  try {
    await persistor.purge();
  } catch (e) {
    console.error('Failed to purge persistor', e);
  }
}
