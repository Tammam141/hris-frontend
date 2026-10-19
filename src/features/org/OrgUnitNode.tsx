import React, { memo } from 'react';
import { OrgUnit, OrgPosition, OrgHolder } from '../../types/org';
import { UNIT_TYPE_LABELS } from './orgTreeUtils';
import { OrgPositionNode } from './OrgPositionNode';

interface OrgUnitNodeProps {
  unit: OrgUnit;
  depth: number;
  expandedIds: Set<string>;
  onToggle: (unitId: string) => void;
  positionIndex: Map<string, OrgPosition>;
  matchedIds: Set<string>;
  onHolderClick: (holder: OrgHolder) => void;
  unitStatsMap: Map<string, { positionsCount: number; holdersCount: number }>;
  collapsedPositions: Set<string>;
  onTogglePosition: (posId: string) => void;
}

export const OrgUnitNode: React.FC<OrgUnitNodeProps> = memo(({
  unit,
  depth,
  expandedIds,
  onToggle,
  positionIndex,
  matchedIds,
  onHolderClick,
  unitStatsMap,
  collapsedPositions,
  onTogglePosition,
}) => {
  const isExpanded = expandedIds.has(unit.id);
  const stats = unitStatsMap.get(unit.id) || { positionsCount: 0, holdersCount: 0 };
  const hasSubUnits = unit.children && unit.children.length > 0;
  const hasPositions = unit.positions && unit.positions.length > 0;

  const unitTypeClass = `org-badge-${unit.unit_type}`;

  return (
    <div
      className={`org-unit ${!unit.is_active ? 'inactive' : ''}`}
      role="treeitem"
      aria-expanded={isExpanded}
    >
      <div
        className={`org-unit-header ${isExpanded ? 'expanded' : ''}`}
        onClick={() => onToggle(unit.id)}
      >
        <div className="org-unit-header-left">
          <button
            type="button"
            className="org-unit-toggle-btn"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(unit.id);
            }}
            aria-label={isExpanded ? 'Ciutkan unit' : 'Bentangkan unit'}
            title={isExpanded ? 'Ciutkan unit' : 'Bentangkan unit'}
          >
            {isExpanded ? '▼' : '▶'}
          </button>

          <span className="org-unit-name">{unit.name}</span>
          <span className="org-unit-code">({unit.code})</span>

          <span className={`org-badge ${unitTypeClass}`}>
            {UNIT_TYPE_LABELS[unit.unit_type] || unit.unit_type}
          </span>

          {!unit.is_active && (
            <span className="org-badge org-badge-inactive">Nonaktif</span>
          )}
        </div>

        <div className="org-unit-header-right">
          <span className="org-badge org-badge-stats">
            {stats.positionsCount} jabatan · {stats.holdersCount} orang
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="org-unit-body">
          {/* Daftar Jabatan */}
          <div className="org-positions-section">
            <div className="org-unit-section-title">Jabatan ({unit.positions.length})</div>
            {hasPositions ? (
              <div className="org-positions-list">
                {unit.positions.map(pos => (
                  <OrgPositionNode
                    key={pos.id}
                    pos={pos}
                    positionIndex={positionIndex}
                    matchedIds={matchedIds}
                    onHolderClick={onHolderClick}
                    collapsedPositions={collapsedPositions}
                    onTogglePosition={onTogglePosition}
                  />
                ))}
              </div>
            ) : (
              <div style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '13px' }}>
                Belum ada jabatan di unit ini.
              </div>
            )}
          </div>

          {/* Sub Unit */}
          {hasSubUnits && (
            <div className="org-subunits-section">
              <div className="org-unit-section-title">Sub-Unit ({unit.children.length})</div>
              <div className="org-unit-children" role="group">
                {unit.children.map(childUnit => (
                  <OrgUnitNode
                    key={childUnit.id}
                    unit={childUnit}
                    depth={depth + 1}
                    expandedIds={expandedIds}
                    onToggle={onToggle}
                    positionIndex={positionIndex}
                    matchedIds={matchedIds}
                    onHolderClick={onHolderClick}
                    unitStatsMap={unitStatsMap}
                    collapsedPositions={collapsedPositions}
                    onTogglePosition={onTogglePosition}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

OrgUnitNode.displayName = 'OrgUnitNode';
