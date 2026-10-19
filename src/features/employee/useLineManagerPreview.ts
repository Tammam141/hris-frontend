import { useState, useEffect, useRef } from 'react';
import { LineManagerInfo } from '../../types/employee';
import { getPositionLineManager } from '../../api/employee';
import { ApiError } from '../../api/client';

export type LineManagerPreviewStatus = 'idle' | 'loading' | 'ready' | 'forbidden' | 'error';

export interface UseLineManagerPreviewResult {
  status: LineManagerPreviewStatus;
  manager: LineManagerInfo | null;
}

export function useLineManagerPreview(
  positionId: string,
  excludeEmployeeId?: string
): UseLineManagerPreviewResult {
  const [status, setStatus] = useState<LineManagerPreviewStatus>('idle');
  const [manager, setManager] = useState<LineManagerInfo | null>(null);

  // Cache: key `${positionId}|${excludeEmployeeId ?? ''}` -> LineManagerInfo | null
  const cacheRef = useRef<Map<string, LineManagerInfo | null>>(new Map());

  // Request tracker to prevent race conditions / stale responses
  const requestIdRef = useRef<number>(0);

  useEffect(() => {
    // 1. Jika positionId kosong, reset ke idle tanpa request
    if (!positionId) {
      setStatus('idle');
      setManager(null);
      return;
    }

    const cacheKey = `${positionId}|${excludeEmployeeId ?? ''}`;

    // 2. Cek cache
    if (cacheRef.current.has(cacheKey)) {
      const cachedManager = cacheRef.current.get(cacheKey) ?? null;
      setManager(cachedManager);
      setStatus('ready');
      return;
    }

    // 3. Panggil API dengan request ID tracker
    const currentRequestId = ++requestIdRef.current;
    setStatus('loading');
    setManager(null);

    getPositionLineManager(positionId, excludeEmployeeId)
      .then(res => {
        // Abaikan jika ada request baru yang telah dimulai
        if (currentRequestId !== requestIdRef.current) return;

        if (res.success && res.data) {
          const lm = res.data.line_manager ?? null;
          cacheRef.current.set(cacheKey, lm);
          setManager(lm);
          setStatus('ready');
        } else {
          setStatus('error');
        }
      })
      .catch((err: any) => {
        // Abaikan jika ada request baru yang telah dimulai
        if (currentRequestId !== requestIdRef.current) return;

        const apiError = err as ApiError;
        if (apiError?.status === 403) {
          setStatus('forbidden');
        } else {
          setStatus('error');
        }
      });
  }, [positionId, excludeEmployeeId]);

  return { status, manager };
}
