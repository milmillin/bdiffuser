import { describe, expect, it } from "vitest";
import { mapBunkerCellForDisplay } from "./cardRotation.js";
import { getMission66BunkerInlineRotation } from "./MissionRuleHints.js";

describe("Mission 66 bunker orientation helpers", () => {
  it("uses the same bunker rotation direction for desktop and mobile", () => {
    expect(getMission66BunkerInlineRotation(false)).toBe("cw90");
    expect(getMission66BunkerInlineRotation(true)).toBe("cw90");
  });

  it("keeps bunker cell coordinates unchanged for mobile parity rotation", () => {
    const rows = 3;
    const cols = 4;
    const mobileRotation = getMission66BunkerInlineRotation(true);

    expect(mapBunkerCellForDisplay({ row: 0, col: 0 }, "cw90", rows, cols)).toEqual({
      row: 0,
      col: 0,
    });
    expect(mapBunkerCellForDisplay({ row: 0, col: 0 }, mobileRotation, rows, cols)).toEqual({
      row: 0,
      col: 0,
    });
    expect(mapBunkerCellForDisplay({ row: 2, col: 3 }, mobileRotation, rows, cols)).toEqual({
      row: 2,
      col: 3,
    });
  });
});
