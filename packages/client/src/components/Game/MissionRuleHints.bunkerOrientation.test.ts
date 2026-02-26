import { describe, expect, it } from "vitest";
import { mapBunkerCellForDisplay } from "./cardRotation.js";
import { getMission66BunkerInlineRotation } from "./MissionRuleHints.js";

describe("Mission 66 bunker orientation helpers", () => {
  it("chooses desktop vs mobile bunker rotation direction", () => {
    expect(getMission66BunkerInlineRotation(false)).toBe("cw90");
    expect(getMission66BunkerInlineRotation(true)).toBe("ccw90");
  });

  it("maps bunker cell coordinates for ccw compensation on mobile", () => {
    const rows = 3;
    const cols = 4;

    expect(mapBunkerCellForDisplay({ row: 0, col: 0 }, "cw90", rows, cols)).toEqual({
      row: 0,
      col: 0,
    });
    expect(mapBunkerCellForDisplay({ row: 0, col: 0 }, "ccw90", rows, cols)).toEqual({
      row: 2,
      col: 3,
    });
    expect(mapBunkerCellForDisplay({ row: 2, col: 3 }, "ccw90", rows, cols)).toEqual({
      row: 0,
      col: 0,
    });
  });
});
