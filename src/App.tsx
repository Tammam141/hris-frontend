import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthProvider';
import { AppRoutes } from './routes';

export function App() {
  useEffect(() => {
    // Hapus flag chunk-reload setelah aplikasi berhasil dimuat
    const timer = setTimeout(() => {
      sessionStorage.removeItem('chunk-reload');
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
