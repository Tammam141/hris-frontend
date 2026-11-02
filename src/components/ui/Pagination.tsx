import React, { useState, useEffect } from 'react';
import './pagination.css';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemLabel?: string;
  align?: 'center' | 'between';
  prevLabel?: string;
  nextLabel?: string;
  hideOnSinglePage?: boolean;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemLabel = 'data',
  align,
  prevLabel = 'Sebelumnya',
  nextLabel = 'Selanjutnya',
  hideOnSinglePage = false,
}: PaginationProps) {
  const maxPages = Math.max(1, totalPages || 1);
  const [inputVal, setInputVal] = useState<string>(String(currentPage));

  // Sinkronkan input angka dengan halaman aktif
  useEffect(() => {
    setInputVal(String(currentPage));
  }, [currentPage]);

  if (hideOnSinglePage && maxPages <= 1 && totalItems === undefined) {
    return null;
  }

  // Validasi dan komit perpindahan halaman
  const commitPage = (val: string) => {
    let parsed = parseInt(val, 10);
    if (isNaN(parsed) || parsed < 1) {
      parsed = 1;
    } else if (parsed > maxPages) {
      parsed = maxPages;
    }

    setInputVal(String(parsed));
    if (parsed !== currentPage) {
      onPageChange(parsed);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Validasi: hanya izinkan karakter angka (digit positif), tidak boleh minus atau huruf
    const cleanDigits = e.target.value.replace(/[^0-9]/g, '');
    setInputVal(cleanDigits);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      commitPage(inputVal);
      (e.target as HTMLInputElement).blur();
    }
  };

  const handleBlur = () => {
    commitPage(inputVal);
  };

  const containerAlign = align || (totalItems !== undefined ? 'between' : 'center');

  return (
    <div className={`app-pagination-container ${containerAlign === 'center' ? 'align-center' : ''}`}>
      {totalItems !== undefined && (
        <div className="app-pagination-info">
          Menampilkan total <strong>{totalItems}</strong> {itemLabel}
        </div>
      )}

      <div className="app-pagination-controls">
        <button
          type="button"
          className="app-pagination-btn"
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
        >
          First
        </button>
        <button
          type="button"
          className="app-pagination-btn"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
        >
          {prevLabel}
        </button>

        <div className="app-pagination-input-wrap">
          <span>Halaman</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className="app-pagination-input"
            value={inputVal}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            title={`Masukkan halaman (1 - ${maxPages})`}
            aria-label="Nomor halaman"
          />
          <span>dari {maxPages}</span>
        </div>

        <button
          type="button"
          className="app-pagination-btn"
          onClick={() => onPageChange(Math.min(maxPages, currentPage + 1))}
          disabled={currentPage >= maxPages}
        >
          {nextLabel}
        </button>

        <button
          type="button"
          className="app-pagination-btn"
          onClick={() => onPageChange(maxPages)}
          disabled={currentPage >= maxPages}
        >
          Last
        </button>
      </div>
    </div>
  );
}
