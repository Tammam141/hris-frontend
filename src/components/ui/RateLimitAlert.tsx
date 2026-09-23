import { useState, useEffect } from 'react';
import { ApiError } from '../../api/client';
import { isRateLimit, getRateLimitMessage } from '../../utils/rateLimit';

interface RateLimitAlertProps {
  error: unknown;
  onRetryTimerEnd?: () => void;
  className?: string;
}

export function RateLimitAlert({ error, onRetryTimerEnd, className = '' }: RateLimitAlertProps) {
  const isRateLimited = isRateLimit(error);
  const apiErr = isRateLimited ? (error as ApiError) : null;
  const initialRetryAfter = apiErr?.details?.retryAfter || apiErr?.details?.retry_after;

  const [countdown, setCountdown] = useState<number | null>(() => {
    return typeof initialRetryAfter === 'number' && initialRetryAfter > 0 ? initialRetryAfter : null;
  });

  useEffect(() => {
    if (typeof initialRetryAfter === 'number' && initialRetryAfter > 0) {
      setCountdown(initialRetryAfter);
    }
  }, [initialRetryAfter]);

  useEffect(() => {
    if (countdown === null || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          if (onRetryTimerEnd) onRetryTimerEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, onRetryTimerEnd]);

  if (!isRateLimited) return null;

  const defaultMsg = getRateLimitMessage(error);

  return (
    <div
      className={`rate-limit-alert ${className}`}
      style={{
        backgroundColor: '#fff7ed',
        border: '1px solid #fdba74',
        borderRadius: '8px',
        padding: '12px 16px',
        color: '#c2410c',
        fontSize: '14px',
        lineHeight: '1.5',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        marginBottom: '16px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      }}
    >
      <div style={{ fontSize: '20px', lineHeight: '1', flexShrink: 0, marginTop: '2px' }}>
        ⏱️
      </div>
      <div style={{ flex: 1 }}>
        <strong style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '2px', color: '#9a3412' }}>
          Akses Dibatasi (Rate Limit Exceeded)
        </strong>
        <div>
          {countdown !== null && countdown > 0 ? (
            <span>
              Terlalu banyak permintaan dalam waktu singkat. Silakan tunggu{' '}
              <strong style={{ textDecoration: 'underline' }}>{countdown} detik</strong> lagi sebelum mencoba kembali.
            </span>
          ) : (
            <span>{defaultMsg}</span>
          )}
        </div>
      </div>
    </div>
  );
}
