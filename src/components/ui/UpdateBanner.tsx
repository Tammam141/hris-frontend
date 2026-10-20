import { useRegisterSW } from 'virtual:pwa-register/react';

export function UpdateBanner() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      if (reg) {
        // Cek pembaruan service worker setiap 1 jam secara berkala
        setInterval(() => {
          reg.update();
        }, 60 * 60 * 1000);
      }
    },
  });

  if (!needRefresh) {
    return null;
  }

  return (
    <aside
      aria-label="Notifikasi pembaruan aplikasi"
      className="pwa-update-banner"
      role="alert"
    >
      <div className="pwa-update-banner-content">
        <span className="pwa-update-banner-text">
          Versi baru tersedia
        </span>
      </div>
      <div className="pwa-update-banner-actions">
        <button
          type="button"
          className="pwa-update-btn pwa-update-btn-refresh"
          onClick={() => updateServiceWorker(true)}
        >
          Muat ulang
        </button>
        <button
          type="button"
          className="pwa-update-btn pwa-update-btn-close"
          onClick={() => setNeedRefresh(false)}
          aria-label="Tutup notifikasi"
          title="Tutup notifikasi"
        >
          ✕
        </button>
      </div>
    </aside>
  );
}
