export type CardRotation = "none" | "cw90" | "ccw90";

export type GridCellPoint = {
  row: number;
  col: number;
};

/**
 * Convert a canonical North-up bunker cell coordinate into the displayed
 * coordinate space when the bunker card is rendered with a given rotation.
 */
export function mapBunkerCellForDisplay(
  point: GridCellPoint,
  rotation: CardRotation,
  rows: number,
  cols: number,
): GridCellPoint {
  if (rotation !== "ccw90") return point;
  return {
    row: rows - 1 - point.row,
    col: cols - 1 - point.col,
  };
}

export function getCardRotationTransform(rotation: CardRotation): string | undefined {
  switch (rotation) {
    case "ccw90":
      return "rotate(-90deg)";
    case "cw90":
      return "rotate(90deg)";
    default:
      return undefined;
  }
}
