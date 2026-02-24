import { describe, expect, it } from "vitest";
import { validateMission18DesignatedCutterTarget } from "../mission18.js";

describe("mission 18 designated cutter target validation", () => {
  it("rejects designating a player whose radar result is false", () => {
    const error = validateMission18DesignatedCutterTarget(
      7,
      "p2",
      { p1: true, p2: false },
    );
    expect(error).toMatchObject({
      code: "MISSION_RULE_VIOLATION",
    });
    expect(error?.message).toContain("value 7");
  });

  it("accepts designating a player whose radar result is true", () => {
    const error = validateMission18DesignatedCutterTarget(
      11,
      "p2",
      { p1: false, p2: true },
    );
    expect(error).toBeNull();
  });
});
