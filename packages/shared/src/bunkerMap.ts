/**
 * Mission 66 bunker maze map.
 *
 * Encodes each grid block position on both bunker card faces so server/client
 * code can share one source of truth for coordinates and icon semantics.
 *
 * Logical orientation:
 * - North points upward.
 * - Coordinates are normalized from card art (whose printed North points left).
 *
 * Grid coordinates:
 * - row: 0..2 (top -> bottom)
 * - col: 0..3 (left -> right)
 */

export type Mission66BunkerFloor = "front" | "back";

export type Mission66BunkerCellMarker =
  | "empty"
  | "start_helicopter"
  | "stairs"
  | "action"
  | "goal"
  | "trap"
  | "detonator";

export interface Mission66BunkerCell {
  floor: Mission66BunkerFloor;
  row: number;
  col: number;
  marker: Mission66BunkerCellMarker;
  /** True when the printed block is striped on the card artwork. */
  striped?: boolean;
  /** Optional clarification for non-obvious symbols. */
  note?: string;
}

export interface Mission66BunkerWallSegment {
  floor: Mission66BunkerFloor;
  row: number;
  col: number;
  direction: "north" | "east" | "south" | "west";
  kind: "wall" | "laser";
}

export interface Mission66BunkerConnectionEndpoint {
  floor: Mission66BunkerFloor;
  row: number;
  col: number;
}

export interface Mission66BunkerConnection {
  kind: "stairs";
  from: Mission66BunkerConnectionEndpoint;
  to: Mission66BunkerConnectionEndpoint;
}

export interface Mission66BunkerTrackPoint {
  /** Linear tracker index for mission 66's bunker flow. */
  index: number;
  floor: Mission66BunkerFloor;
  row: number;
  col: number;
}

const GRID_ROWS = 3;
const GRID_COLS = 4;

export const MISSION66_BUNKER_GRID_SIZE = {
  rows: GRID_ROWS,
  cols: GRID_COLS,
} as const;

const FRONT_CELLS: readonly Mission66BunkerCell[] = [
  { floor: "front", row: 0, col: 0, marker: "start_helicopter", note: "Mission start block" },
  { floor: "front", row: 0, col: 1, marker: "empty" },
  { floor: "front", row: 0, col: 2, marker: "empty" },
  { floor: "front", row: 0, col: 3, marker: "stairs", note: "Staircase to upper blue level" },
  { floor: "front", row: 1, col: 0, marker: "empty" },
  { floor: "front", row: 1, col: 1, marker: "empty" },
  { floor: "front", row: 1, col: 2, marker: "empty" },
  { floor: "front", row: 1, col: 3, marker: "goal", striped: true, note: "Skull objective block" },
  { floor: "front", row: 2, col: 0, marker: "empty" },
  { floor: "front", row: 2, col: 1, marker: "action", striped: true, note: "ACTION constraint block (key icon)" },
  { floor: "front", row: 2, col: 2, marker: "empty" },
  { floor: "front", row: 2, col: 3, marker: "empty" },
] as const;

const BACK_CELLS: readonly Mission66BunkerCell[] = [
  { floor: "back", row: 0, col: 0, marker: "detonator", note: "Detonator icon block" },
  { floor: "back", row: 0, col: 1, marker: "trap", note: "Saw icon" },
  { floor: "back", row: 0, col: 2, marker: "empty" },
  { floor: "back", row: 0, col: 3, marker: "stairs", note: "Staircase from front floor" },
  { floor: "back", row: 1, col: 0, marker: "empty" },
  { floor: "back", row: 1, col: 1, marker: "empty" },
  { floor: "back", row: 1, col: 2, marker: "empty" },
  { floor: "back", row: 1, col: 3, marker: "trap", note: "Saw icon" },
  { floor: "back", row: 2, col: 0, marker: "empty" },
  { floor: "back", row: 2, col: 1, marker: "trap", note: "Saw icon" },
  { floor: "back", row: 2, col: 2, marker: "empty" },
  { floor: "back", row: 2, col: 3, marker: "action", striped: true, note: "ACTION constraint block (alarm icon)" },
] as const;

export const MISSION66_BUNKER_CELLS: readonly Mission66BunkerCell[] = [
  ...FRONT_CELLS,
  ...BACK_CELLS,
] as const;

export const MISSION66_BUNKER_CELLS_BY_FLOOR: Record<
  Mission66BunkerFloor,
  readonly Mission66BunkerCell[]
> = {
  front: FRONT_CELLS,
  back: BACK_CELLS,
} as const;

/**
 * Cross-floor connectors.
 *
 * For mission 66 this is the staircase icon, linking the two faces at the
 * same logical coordinates.
 */
export const MISSION66_BUNKER_CONNECTIONS: readonly Mission66BunkerConnection[] = [
  {
    kind: "stairs",
    from: { floor: "front", row: 0, col: 3 },
    to: { floor: "back", row: 0, col: 3 },
  },
] as const;

/**
 * Mission 66 standee path (North-up logical orientation).
 *
 * The mission tracker is linear (default 0..10). This path maps each tracker
 * step to one bunker cell so UI can render the standee directly on the map.
 */
export const MISSION66_BUNKER_TRACK_PATH: readonly Mission66BunkerTrackPoint[] = [
  { index: 0, floor: "front", row: 0, col: 0 }, // Start (helicopter)
  { index: 1, floor: "front", row: 1, col: 0 },
  { index: 2, floor: "front", row: 2, col: 0 },
  { index: 3, floor: "front", row: 2, col: 1 }, // ACTION key
  { index: 4, floor: "front", row: 2, col: 2 },
  { index: 5, floor: "front", row: 0, col: 3 }, // Stairs (front)
  { index: 6, floor: "back", row: 0, col: 3 }, // Stairs (back)
  { index: 7, floor: "back", row: 0, col: 2 },
  { index: 8, floor: "back", row: 1, col: 2 },
  { index: 9, floor: "back", row: 2, col: 2 },
  { index: 10, floor: "back", row: 2, col: 3 }, // ACTION alarm
] as const;

/**
 * Internal wall/laser edges visible in bunker card artwork.
 *
 * Boundary walls at the outer card edges are implicit and not listed.
 */
export const MISSION66_BUNKER_WALLS: readonly Mission66BunkerWallSegment[] = [
  // Front side
  { floor: "front", row: 0, col: 3, direction: "south", kind: "wall" },
  { floor: "front", row: 0, col: 2, direction: "west", kind: "wall" },
  { floor: "front", row: 1, col: 2, direction: "west", kind: "wall" },

  // Back side
  { floor: "back", row: 0, col: 3, direction: "south", kind: "wall" },
  { floor: "back", row: 0, col: 2, direction: "west", kind: "laser" },
  { floor: "back", row: 1, col: 2, direction: "west", kind: "laser" },
  { floor: "back", row: 2, col: 2, direction: "west", kind: "laser" },
] as const;

export function getMission66BunkerCell(
  floor: Mission66BunkerFloor,
  row: number,
  col: number,
): Mission66BunkerCell | undefined {
  if (!Number.isInteger(row) || !Number.isInteger(col)) return undefined;
  if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) return undefined;
  return MISSION66_BUNKER_CELLS_BY_FLOOR[floor].find(
    (cell) => cell.row === row && cell.col === col,
  );
}

export function getMission66ConnectedCell(
  floor: Mission66BunkerFloor,
  row: number,
  col: number,
): Mission66BunkerCell | undefined {
  const link = MISSION66_BUNKER_CONNECTIONS.find((connection) => {
    return (
      (connection.from.floor === floor
        && connection.from.row === row
        && connection.from.col === col)
      || (connection.to.floor === floor
        && connection.to.row === row
        && connection.to.col === col)
    );
  });

  if (!link) return undefined;
  const endpoint =
    link.from.floor === floor && link.from.row === row && link.from.col === col
      ? link.to
      : link.from;
  return getMission66BunkerCell(endpoint.floor, endpoint.row, endpoint.col);
}

/**
 * Resolve the current bunker standee cell from tracker position/max.
 *
 * If max differs from the default 10, position is proportionally mapped to the
 * nearest step on the canonical mission 66 path.
 */
export function getMission66BunkerTrackPoint(
  position: number,
  max: number,
): Mission66BunkerTrackPoint {
  const safeMax = Math.max(1, Math.floor(max));
  const safePosition = Math.max(0, Math.min(Math.floor(position), safeMax));
  const lastPathIndex = MISSION66_BUNKER_TRACK_PATH.length - 1;
  const scaledPathIndex =
    safeMax === lastPathIndex
      ? safePosition
      : Math.round((safePosition / safeMax) * lastPathIndex);
  return MISSION66_BUNKER_TRACK_PATH[Math.max(0, Math.min(scaledPathIndex, lastPathIndex))]!;
}
