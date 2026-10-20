import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store';
import './components/ui/global.css';

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  // reload sekali saja untuk mengambil index.html baru; cegah loop
  if (!sessionStorage.getItem('chunk-reload')) {
    sessionStorage.setItem('chunk-reload', '1');
    window.location.reload();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <App />
      </PersistGate>
    </Provider>
  </StrictMode>
);
