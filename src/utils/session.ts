import { store } from '../store';

import { clearNotifications } from '../store/notificationSlice';

export async function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  
  Object.keys(localStorage)
    .filter(k => k.startsWith('cached_') || k === 'employee')
    .forEach(k => localStorage.removeItem(k));
  
  store.dispatch(clearNotifications());
}
