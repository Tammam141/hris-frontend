import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../components/ui/dashboard.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';
const SPEC_URL = `${API_BASE}/api/v1/docs/openapi.json`;
const TRY_IT_OUT_HEADER = 'x-api-docs-try-it-out';

type HttpMethod = 'get' | 'put' | 'post' | 'delete' | 'options' | 'head' | 'patch' | 'trace';

export default function ApiDocsPage() {
  const navigate = useNavigate();
  // Method yang boleh dicoba dibaca dari dokumen: di production hanya ['get']
  const [methods, setMethods] = useState<HttpMethod[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(SPEC_URL, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => {
        if (r.status === 401) {
          navigate('/login');
          return null;
        }
        if (r.status === 403) {
          setErrorMessage('Anda tidak punya akses ke Dokumentasi API');
          return null;
        }
        if (!r.ok) {
          return Promise.reject(r.status);
        }
        return r.json();
      })
      .then((doc) => {
        if (doc) {
          setMethods((doc['x-try-it-out-methods'] ?? ['get']) as HttpMethod[]);
        }
      })
      .catch(() => {
        setMethods([]); // gagal → tidak ada yang bisa dicoba
      });
  }, [navigate]);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header-row">
        <div>
          <h1 className="dashboard-title">Dokumentasi API</h1>
          <p className="dashboard-subtitle">
            Dibangkitkan otomatis dari backend. Di production hanya permintaan GET yang bisa dicoba.
          </p>
        </div>
      </div>

      {errorMessage ? (
        <div style={{ marginTop: '20px', padding: '16px 20px', backgroundColor: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '14px' }}>
          {errorMessage}
        </div>
      ) : methods === null ? (
        <p style={{ marginTop: '20px', color: '#64748b', fontSize: '14px' }}>Memuat dokumentasi…</p>
      ) : (
        <div style={{ marginTop: '20px', overflowX: 'auto', maxWidth: '100%', backgroundColor: '#ffffff', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <SwaggerUI
            url={SPEC_URL}
            supportedSubmitMethods={methods}
            // Token login dipasang otomatis, dan setiap percobaan ditandai header
            // khusus. Di production server menolak percobaan selain GET
            requestInterceptor={(req) => {
              const token = localStorage.getItem('token');
              if (token) req.headers.Authorization = `Bearer ${token}`;
              if (req.url !== SPEC_URL) req.headers[TRY_IT_OUT_HEADER] = '1';
              return req;
            }}
            responseInterceptor={(res) => {
              if (res.status === 401) {
                navigate('/login');
              }
              return res;
            }}
            docExpansion="none"
            defaultModelsExpandDepth={-1}
            persistAuthorization={false}
            tryItOutEnabled={false}
          />
        </div>
      )}
    </div>
  );
}
