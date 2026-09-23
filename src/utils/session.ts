import { store } from '../store';

import { clearNotifications } from '../store/notificationSlice';

export async function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  
  store.dispatch(clearNotifications());
}
