import React, { memo } from 'react';
import { OrgPosition, OrgHolder } from '../../types/org';
import { Avatar } from '../../components/ui/Avatar';

interface OrgPositionNodeProps {
  pos: OrgPosition;
  positionIndex: Map<string, OrgPosition>;
  matchedIds: Set<string>;
  onHolderClick: (holder: OrgHolder) => void;
  collapsedPositions: Set<string>;
  onTogglePosition: (posId: string) => void;
  isDirectReport?: boolean;
}

export const OrgPositionNode: React.FC<OrgPositionNodeProps> = memo(({
  pos,
  positionIndex,
  matchedIds,
  onHolderClick,
  collapsedPositions,
  onTogglePosition,
  isDirectReport = false,
}) => {
  const hasReports = pos.direct_reports && pos.direct_reports.length > 0;
  const isCollapsed = collapsedPositions.has(pos.id);
  const isHighlighted = matchedIds.has(pos.id);

  // Jika punya reports_to_position_id dan bukan merupakan direct report di unit yang sama (misal kepala unit)
  const showReportsTo = !isDirectReport && pos.reports_to_position_id;
  const supervisorName = pos.reports_to_position_id
    ? positionIndex.get(pos.reports_to_position_id)?.name ?? '—'
    : null;

  const isFull = pos.max_holders !== null && pos.holders.length >= pos.max_holders;

  return (
    <div className="org-position-wrapper" role="treeitem" aria-expanded={hasReports ? !isCollapsed : undefined}>
      <div
        className={`org-position-card ${isHighlighted ? 'highlighted' : ''} ${!pos.is_active ? 'inactive' : ''}`}
      >
        {hasReports ? (
          <button
            type="button"
            className="org-position-toggle"
            onClick={() => onTogglePosition(pos.id)}
            aria-label={isCollapsed ? 'Bentangkan bawahan' : 'Ciutkan bawahan'}
            title={isCollapsed ? 'Bentangkan bawahan' : 'Ciutkan bawahan'}
          >
            {isCollapsed ? '▶' : '▼'}
          </button>
        ) : (
          <span className="org-position-dot">•</span>
        )}

        <div className="org-position-content">
          <div className="org-position-header-row">
            <span className="org-position-title">{pos.name}</span>
            <span className="org-position-code">{pos.code}</span>

            {pos.is_unit_head && (
              <span className="org-badge org-badge-head">Kepala Unit</span>
            )}

            {!pos.is_active && (
              <span className="org-badge org-badge-inactive">Nonaktif</span>
            )}

            {pos.max_holders !== null && (
              <span className={`org-position-capacity ${isFull ? 'full' : ''}`} title="Kapasitas Pemegang Jabatan">
                ({pos.holders.length}/{pos.max_holders})
              </span>
            )}
          </div>

          {showReportsTo && supervisorName && (
            <div className="org-position-reports-to">
              Melapor ke: <strong>{supervisorName}</strong>
            </div>
          )}

          <div className="org-holders-container">
            <span className="org-holders-label">Pemegang:</span>
            {pos.holders.length > 0 ? (
              pos.holders.map(holder => (
                <button
                  key={holder.id}
                  type="button"
                  className="org-holder-chip"
                  onClick={() => onHolderClick(holder)}
                  title={`Lihat atasan langsung untuk ${holder.full_name}`}
                >
                  <Avatar name={holder.full_name} photoUrl={null} size="24px" fontSize="10px" />
                  <span>{holder.full_name}</span>
                </button>
              ))
            ) : (
              <span className="org-vacant-chip">Kosong</span>
            )}
          </div>
        </div>
      </div>

      {hasReports && !isCollapsed && (
        <div className="org-direct-reports" role="group">
          {pos.direct_reports.map(childPos => (
            <OrgPositionNode
              key={childPos.id}
              pos={childPos}
              positionIndex={positionIndex}
              matchedIds={matchedIds}
              onHolderClick={onHolderClick}
              collapsedPositions={collapsedPositions}
              onTogglePosition={onTogglePosition}
              isDirectReport={true}
            />
          ))}
        </div>
      )}
    </div>
  );
});

OrgPositionNode.displayName = 'OrgPositionNode';
