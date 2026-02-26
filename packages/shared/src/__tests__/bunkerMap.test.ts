import { describe, expect, it } from "vitest";

import {
  MISSION66_BUNKER_CELLS,
  MISSION66_BUNKER_CELLS_BY_FLOOR,
  MISSION66_BUNKER_CONNECTIONS,
  MISSION66_BUNKER_GRID_SIZE,
  MISSION66_BUNKER_TRACK_PATH,
  MISSION66_BUNKER_WALLS,
  getMission66BunkerCell,
  getMission66BunkerTrackPoint,
  getMission66ConnectedCell,
} from "../bunkerMap";

describe("mission 66 bunker map", () => {
  it("defines a full 3x4 grid on each floor", () => {
    const expectedPerFloor = MISSION66_BUNKER_GRID_SIZE.rows * MISSION66_BUNKER_GRID_SIZE.cols;
    expect(MISSION66_BUNKER_CELLS_BY_FLOOR.front).toHaveLength(expectedPerFloor);
    expect(MISSION66_BUNKER_CELLS_BY_FLOOR.back).toHaveLength(expectedPerFloor);
    expect(MISSION66_BUNKER_CELLS).toHaveLength(expectedPerFloor * 2);
  });

  it("keeps floor cell coordinates unique", () => {
    const frontIds = new Set(
      MISSION66_BUNKER_CELLS_BY_FLOOR.front.map((cell) => `${cell.row}:${cell.col}`),
    );
    const backIds = new Set(
      MISSION66_BUNKER_CELLS_BY_FLOOR.back.map((cell) => `${cell.row}:${cell.col}`),
    );
    expect(frontIds.size).toBe(MISSION66_BUNKER_CELLS_BY_FLOOR.front.length);
    expect(backIds.size).toBe(MISSION66_BUNKER_CELLS_BY_FLOOR.back.length);
  });

  it("resolves known cells by floor/row/col", () => {
    expect(getMission66BunkerCell("front", 0, 0)?.marker).toBe("start_helicopter");
    expect(getMission66BunkerCell("back", 0, 0)?.marker).toBe("detonator");
    expect(getMission66BunkerCell("front", 2, 1)?.marker).toBe("action");
  });

  it("defines wall segments within grid bounds", () => {
    for (const wall of MISSION66_BUNKER_WALLS) {
      expect(wall.row).toBeGreaterThanOrEqual(0);
      expect(wall.row).toBeLessThan(MISSION66_BUNKER_GRID_SIZE.rows);
      expect(wall.col).toBeGreaterThanOrEqual(0);
      expect(wall.col).toBeLessThan(MISSION66_BUNKER_GRID_SIZE.cols);
    }
  });

  it("connects staircase cells between front and back floors", () => {
    expect(MISSION66_BUNKER_CONNECTIONS).toHaveLength(1);

    const link = MISSION66_BUNKER_CONNECTIONS[0];
    const fromCell = getMission66BunkerCell(link.from.floor, link.from.row, link.from.col);
    const toCell = getMission66BunkerCell(link.to.floor, link.to.row, link.to.col);
    expect(fromCell?.marker).toBe("stairs");
    expect(toCell?.marker).toBe("stairs");

    const nextFromFront = getMission66ConnectedCell("front", 0, 3);
    const nextFromBack = getMission66ConnectedCell("back", 0, 3);
    expect(nextFromFront?.floor).toBe("back");
    expect(nextFromBack?.floor).toBe("front");
    expect(nextFromFront?.row).toBe(0);
    expect(nextFromFront?.col).toBe(3);
    expect(nextFromBack?.row).toBe(0);
    expect(nextFromBack?.col).toBe(3);
  });

  it("maps tracker positions to bunker path points", () => {
    expect(MISSION66_BUNKER_TRACK_PATH).toHaveLength(11);

    expect(getMission66BunkerTrackPoint(0, 10)).toMatchObject({
      floor: "front",
      row: 0,
      col: 0,
    });
    expect(getMission66BunkerTrackPoint(5, 10)).toMatchObject({
      floor: "front",
      row: 0,
      col: 3,
    });
    expect(getMission66BunkerTrackPoint(6, 10)).toMatchObject({
      floor: "back",
      row: 0,
      col: 3,
    });
    expect(getMission66BunkerTrackPoint(10, 10)).toMatchObject({
      floor: "back",
      row: 2,
      col: 3,
    });
  });
});
