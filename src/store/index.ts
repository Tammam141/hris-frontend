import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER, WebStorage } from 'redux-persist';

import attendanceReducer from './attendanceSlice';
import notificationReducer from './notificationSlice';

// membuat penyambung LocalStorage
const storage: WebStorage = {
  getItem: (key) => Promise.resolve(window.localStorage.getItem(key)),
  setItem: (key, value) => {
    window.localStorage.setItem(key, value);
    return Promise.resolve();
  },
  removeItem: (key) => {
    window.localStorage.removeItem(key);
    return Promise.resolve();
  },
};

// 1. Menggabungkan semua reducer (slice)
const rootReducer = combineReducers({
  attendance: attendanceReducer,
  notification: notificationReducer,
});

// 2. Konfigurasi Redux Persist
const persistConfig = {
  key: 'root', 
  storage,     
  whitelist: ['attendance', 'notification'], 
};

// 3. Membungkus rootReducer dengan fungsi persist
const persistedReducer = persistReducer(persistConfig, rootReducer);

// 4. Membuat Redux Store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

// 6. Mendefinisikan tipe RootState dan AppDispatch untuk TypeScript
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
