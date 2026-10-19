import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getOrgTree } from '../api/org';
import { OrgTree, OrgHolder, LineManagerResponse } from '../types/org';
import { ApiError } from '../api/client';
import {
  indexPositions,
  summarize,
  buildUnitStatsMap,
  searchTree,
  collectUnitIds,
} from '../features/org/orgTreeUtils';
import { OrgUnitNode } from '../features/org/OrgUnitNode';
import { LineManagerPopover } from '../features/org/LineManagerPopover';
import '../components/ui/dashboard.css';
import '../components/ui/org-chart.css';

export function OrgChartPage() {
  const [tree, setTree] = useState<OrgTree | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Expanded units state
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Collapsed positions state (positions with direct_reports, default expanded)
  const [collapsedPositions, setCollapsedPositions] = useState<Set<string>>(new Set());

  // Search input state with debounce
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Selected holder for line manager modal
  const [selectedHolder, setSelectedHolder] = useState<OrgHolder | null>(null);

  // Line manager cache ref
  const lineManagerCache = useRef<Map<string, LineManagerResponse>>(new Map());

  // Debounce search query ~250ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 250);
    return () => clearTimeout(handler);
  }, [query]);

  // Load tree function
  const loadTree = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getOrgTree();
      if (res.success && res.data) {
        setTree(res.data);
        // Default: buka 2 tingkat teratas (depth 0 dan 1)
        const initialExpanded = collectUnitIds(res.data, 2);
        setExpanded(initialExpanded);
      } else {
        setError('Gagal memuat struktur organisasi');
      }
    } catch (e: any) {
      const err = e as ApiError;
      setError(err.message || 'Gagal memuat struktur organisasi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  // Memoized helpers
  const positionIndex = useMemo(() => {
    return tree ? indexPositions(tree) : new Map();
  }, [tree]);

  const summary = useMemo(() => {
    return tree ? summarize(tree) : { units: 0, positions: 0, holders: 0, vacant: 0 };
  }, [tree]);

  const unitStatsMap = useMemo(() => {
    return tree ? buildUnitStatsMap(tree) : new Map();
  }, [tree]);

  const searchResults = useMemo(() => {
    return tree ? searchTree(tree, debouncedQuery) : { matchedPositionIds: new Set<string>(), expandUnitIds: new Set<string>() };
  }, [tree, debouncedQuery]);

  // Unit yang terbuka: expanded ∪ expandUnitIds ketika query terisi
  const effectiveExpanded = useMemo(() => {
    if (!debouncedQuery.trim()) {
      return expanded;
    }
    const combined = new Set(expanded);
    searchResults.expandUnitIds.forEach(id => combined.add(id));
    return combined;
  }, [expanded, debouncedQuery, searchResults.expandUnitIds]);

  // Handlers
  const handleExpandAll = useCallback(() => {
    if (!tree) return;
    setExpanded(collectUnitIds(tree));
  }, [tree]);

  const handleCollapseAll = useCallback(() => {
    setExpanded(new Set());
  }, []);

  const handleToggleUnit = useCallback((unitId: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(unitId)) {
        next.delete(unitId);
      } else {
        next.add(unitId);
      }
      return next;
    });
  }, []);

  const handleTogglePosition = useCallback((posId: string) => {
    setCollapsedPositions(prev => {
      const next = new Set(prev);
      if (next.has(posId)) {
        next.delete(posId);
      } else {
        next.add(posId);
      }
      return next;
    });
  }, []);

  const handleHolderClick = useCallback((holder: OrgHolder) => {
    setSelectedHolder(holder);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedHolder(null);
  }, []);

  const isSearchEmpty = Boolean(
    debouncedQuery.trim() &&
    searchResults.matchedPositionIds.size === 0 &&
    searchResults.expandUnitIds.size === 0
  );

  return (
    <div className="dashboard-container" style={{ padding: '0', maxWidth: '100%' }}>
      <div className="dashboard-card" style={{ padding: '32px', borderRadius: '0', border: 'none', boxShadow: 'none', minHeight: '100%' }}>
        
        {/* Header */}
        <div className="employee-header-actions" style={{ marginBottom: '24px' }}>
          <div>
            <h1 className="dashboard-title">Struktur Organisasi</h1>
            <p className="dashboard-subtitle">
              Visualisasi struktur unit organisasi, hierarki jabatan, dan pemegang jabatan.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleExpandAll}
              disabled={loading || !tree}
            >
              Buka semua
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleCollapseAll}
              disabled={loading || !tree}
            >
              Tutup semua
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={loadTree}
              disabled={loading}
            >
              {loading ? 'Memuat...' : 'Muat ulang'}
            </button>
          </div>
        </div>

        {/* 4 Ringkasan Kartu */}
        <div className="org-summary">
          <div className="org-summary-card">
            <span className="org-summary-label">Unit</span>
            <span className="org-summary-value">{summary.units}</span>
          </div>
          <div className="org-summary-card">
            <span className="org-summary-label">Jabatan</span>
            <span className="org-summary-value">{summary.positions}</span>
          </div>
          <div className="org-summary-card">
            <span className="org-summary-label">Pemegang</span>
            <span className="org-summary-value">{summary.holders}</span>
          </div>
          <div className="org-summary-card">
            <span className="org-summary-label">Jabatan kosong</span>
            <span className={`org-summary-value ${summary.vacant > 0 ? 'amber' : ''}`}>
              {summary.vacant}
            </span>
          </div>
        </div>

        {/* Input Cari */}
        <div className="org-search-wrapper">
          <input
            type="text"
            className="org-search-input input-field"
            placeholder="Cari nama karyawan, jabatan, atau unit"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>

        {/* Alert Error */}
        {error && (
          <div className="alert-error" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{error}</span>
            <button type="button" className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={loadTree}>
              Coba lagi
            </button>
          </div>
        )}

        {/* Konten Pohon */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px 0', width: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: '#64748b', fontSize: '14px' }}>
              <div style={{ width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTopColor: '#1a78d7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <span>Memuat struktur organisasi...</span>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          </div>
        ) : !tree ? (
          <div className="org-empty-state">
            Data struktur organisasi belum tersedia.
          </div>
        ) : tree.units.length === 0 ? (
          <div className="org-empty-state">
            Struktur organisasi belum disusun.
            <Link to="/department" className="org-empty-state-link">
              Atur di halaman Department
            </Link>
          </div>
        ) : (
          <div className="org-tree-container" role="tree" aria-label="Bagan Struktur Organisasi">
            {isSearchEmpty ? (
              <div className="org-empty-state">
                Tidak ada yang cocok dengan &quot;{debouncedQuery}&quot;
              </div>
            ) : (
              tree.units.map(unit => (
                <OrgUnitNode
                  key={unit.id}
                  unit={unit}
                  depth={0}
                  expandedIds={effectiveExpanded}
                  onToggle={handleToggleUnit}
                  positionIndex={positionIndex}
                  matchedIds={searchResults.matchedPositionIds}
                  onHolderClick={handleHolderClick}
                  unitStatsMap={unitStatsMap}
                  collapsedPositions={collapsedPositions}
                  onTogglePosition={handleTogglePosition}
                />
              ))
            )}
          </div>
        )}

        {/* Bagian Unassigned Positions */}
        {tree && tree.unassigned_positions && tree.unassigned_positions.length > 0 && (
          <div className="org-unassigned-card">
            <div className="org-unassigned-header">
              <div className="org-unassigned-title">
                <span>⚠️</span>
                <span>{tree.unassigned_positions.length} jabatan belum punya unit dan tidak masuk struktur</span>
              </div>
              <Link to="/position" className="org-unassigned-link">
                Atur di halaman Jabatan →
              </Link>
            </div>
            <div className="org-unassigned-desc">
              Jabatan di bawah ini belum ditempatkan ke dalam unit organisasi manapun.
            </div>

            <div className="org-unassigned-grid">
              {tree.unassigned_positions.map(pos => (
                <div key={pos.id} className="org-unassigned-item">
                  <div className="org-unassigned-item-title">
                    {pos.name} <span style={{ color: '#64748b', fontSize: '12px' }}>({pos.code})</span>
                  </div>
                  <div className="org-unassigned-item-holders">
                    Pemegang:{' '}
                    {pos.holders.length > 0 ? (
                      pos.holders.map(h => (
                        <button
                          key={h.id}
                          type="button"
                          className="org-holder-chip"
                          style={{ margin: '2px 4px 2px 0' }}
                          onClick={() => handleHolderClick(h)}
                        >
                          {h.full_name}
                        </button>
                      ))
                    ) : (
                      <span className="org-vacant-chip">Kosong</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Popover / Modal Line Manager */}
      <LineManagerPopover
        holder={selectedHolder}
        onClose={handleCloseModal}
        cacheRef={lineManagerCache}
      />
    </div>
  );
}
