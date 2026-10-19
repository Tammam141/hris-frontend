import { OrgTree, OrgUnit, OrgPosition, UnitType } from '../../types/org';

export const UNIT_TYPE_LABELS: Record<UnitType, string> = {
  company: 'Perusahaan',
  directorate: 'Direktorat',
  division: 'Divisi',
  department: 'Departemen',
  team: 'Tim',
};

/**
 * Membuat indeks Map id -> OrgPosition secara rekursif dari seluruh unit dan unassigned_positions.
 */
export function indexPositions(tree: OrgTree): Map<string, OrgPosition> {
  const map = new Map<string, OrgPosition>();

  function traversePosition(pos: OrgPosition) {
    map.set(pos.id, pos);
    if (pos.direct_reports && pos.direct_reports.length > 0) {
      pos.direct_reports.forEach(traversePosition);
    }
  }

  function traverseUnit(unit: OrgUnit) {
    if (unit.positions && unit.positions.length > 0) {
      unit.positions.forEach(traversePosition);
    }
    if (unit.children && unit.children.length > 0) {
      unit.children.forEach(traverseUnit);
    }
  }

  if (tree.units) {
    tree.units.forEach(traverseUnit);
  }
  if (tree.unassigned_positions) {
    tree.unassigned_positions.forEach(traversePosition);
  }

  return map;
}

/**
 * Ringkasan total unit, jabatan, pemegang, dan jabatan kosong (aktif tanpa pemegang).
 */
export function summarize(tree: OrgTree): {
  units: number;
  positions: number;
  holders: number;
  vacant: number;
} {
  let units = 0;
  let positions = 0;
  let holders = 0;
  let vacant = 0;

  function processPosition(pos: OrgPosition) {
    positions++;
    const count = pos.holders?.length || 0;
    holders += count;
    if (pos.is_active && count === 0) {
      vacant++;
    }
    if (pos.direct_reports && pos.direct_reports.length > 0) {
      pos.direct_reports.forEach(processPosition);
    }
  }

  function processUnit(unit: OrgUnit) {
    units++;
    if (unit.positions && unit.positions.length > 0) {
      unit.positions.forEach(processPosition);
    }
    if (unit.children && unit.children.length > 0) {
      unit.children.forEach(processUnit);
    }
  }

  if (tree.units) {
    tree.units.forEach(processUnit);
  }
  if (tree.unassigned_positions) {
    tree.unassigned_positions.forEach(processPosition);
  }

  return { units, positions, holders, vacant };
}

/**
 * Menghitung total jabatan dan pemegang di dalam sebuah unit beserta seluruh turunannya.
 */
export function unitStats(unit: OrgUnit): { positions: number; holders: number } {
  let positions = 0;
  let holders = 0;

  function countPosition(pos: OrgPosition) {
    positions++;
    holders += pos.holders?.length || 0;
    if (pos.direct_reports && pos.direct_reports.length > 0) {
      pos.direct_reports.forEach(countPosition);
    }
  }

  function countUnit(u: OrgUnit) {
    if (u.positions && u.positions.length > 0) {
      u.positions.forEach(countPosition);
    }
    if (u.children && u.children.length > 0) {
      u.children.forEach(countUnit);
    }
  }

  countUnit(unit);
  return { positions, holders };
}

/**
 * Membangun cache Map unitId -> unitStats untuk seluruh unit agar tidak dihitung ulang di tiap render node.
 */
export function buildUnitStatsMap(tree: OrgTree): Map<string, { positions: number; holders: number }> {
  const map = new Map<string, { positions: number; holders: number }>();
  function traverse(u: OrgUnit) {
    map.set(u.id, unitStats(u));
    if (u.children && u.children.length > 0) {
      u.children.forEach(traverse);
    }
  }
  if (tree.units) {
    tree.units.forEach(traverse);
  }
  return map;
}

/**
 * Mencari query (case-insensitive, trimmed) di dalam tree.
 * Mencocokkan:
 * - Nama / kode jabatan
 * - Nama / nomor karyawan pemegang jabatan
 * - Nama / kode unit
 * Mengembalikan matchedPositionIds untuk highlight kartu, dan expandUnitIds (termasuk leluhur) agar terbuka.
 */
export function searchTree(
  tree: OrgTree,
  query: string
): { matchedPositionIds: Set<string>; expandUnitIds: Set<string> } {
  const matchedPositionIds = new Set<string>();
  const expandUnitIds = new Set<string>();

  const q = query.trim().toLowerCase();
  if (!q) {
    return { matchedPositionIds, expandUnitIds };
  }

  function searchPositions(positions: OrgPosition[], ancestorUnitIds: string[]): boolean {
    let hasMatch = false;
    for (const pos of positions) {
      let isPosMatched = false;
      if (
        pos.name.toLowerCase().includes(q) ||
        pos.code.toLowerCase().includes(q)
      ) {
        isPosMatched = true;
      }
      if (pos.holders && pos.holders.length > 0) {
        for (const h of pos.holders) {
          if (
            h.full_name.toLowerCase().includes(q) ||
            h.employee_number.toLowerCase().includes(q)
          ) {
            isPosMatched = true;
            break;
          }
        }
      }

      if (isPosMatched) {
        matchedPositionIds.add(pos.id);
        ancestorUnitIds.forEach(uid => expandUnitIds.add(uid));
        hasMatch = true;
      }

      if (pos.direct_reports && pos.direct_reports.length > 0) {
        const childMatch = searchPositions(pos.direct_reports, ancestorUnitIds);
        if (childMatch) {
          hasMatch = true;
        }
      }
    }
    return hasMatch;
  }

  function searchUnit(unit: OrgUnit, ancestors: string[]) {
    const currentAncestors = [...ancestors, unit.id];

    if (
      unit.name.toLowerCase().includes(q) ||
      unit.code.toLowerCase().includes(q)
    ) {
      currentAncestors.forEach(uid => expandUnitIds.add(uid));
    }

    if (unit.positions && unit.positions.length > 0) {
      searchPositions(unit.positions, currentAncestors);
    }

    if (unit.children && unit.children.length > 0) {
      unit.children.forEach(child => searchUnit(child, currentAncestors));
    }
  }

  if (tree.units) {
    tree.units.forEach(u => searchUnit(u, []));
  }

  if (tree.unassigned_positions) {
    for (const pos of tree.unassigned_positions) {
      let isPosMatched = false;
      if (
        pos.name.toLowerCase().includes(q) ||
        pos.code.toLowerCase().includes(q)
      ) {
        isPosMatched = true;
      }
      if (pos.holders && pos.holders.length > 0) {
        for (const h of pos.holders) {
          if (
            h.full_name.toLowerCase().includes(q) ||
            h.employee_number.toLowerCase().includes(q)
          ) {
            isPosMatched = true;
            break;
          }
        }
      }
      if (isPosMatched) {
        matchedPositionIds.add(pos.id);
      }
      if (pos.direct_reports && pos.direct_reports.length > 0) {
        searchPositions(pos.direct_reports, []);
      }
    }
  }

  return { matchedPositionIds, expandUnitIds };
}

/**
 * Mengumpulkan id unit untuk membuka semua atau membuka hingga maxDepth (misal tingkat 0–1).
 */
export function collectUnitIds(tree: OrgTree, maxDepth?: number): Set<string> {
  const ids = new Set<string>();

  function traverse(unit: OrgUnit, depth: number) {
    if (maxDepth !== undefined && depth >= maxDepth) {
      return;
    }
    ids.add(unit.id);
    if (unit.children && unit.children.length > 0) {
      unit.children.forEach(child => traverse(child, depth + 1));
    }
  }

  if (tree.units) {
    tree.units.forEach(u => traverse(u, 0));
  }

  return ids;
}
