import { describe, expect, it } from "vitest";
import { resetDualCutToDraft } from "./dualCutStaging.js";

describe("resetDualCutToDraft", () => {
  it("returns to draft mode and keeps the newly selected own wire", () => {
    const result = resetDualCutToDraft(
      {
        kind: "dual_cut",
      },
      3,
    );

    expect(result).toEqual({
      pendingAction: null,
      selectedGuessTile: 3,
      mission59RotateNano: false,
      mission43NanoStandIndex: 0,
    });
  });

  it("preserves mission 59 rotate flag from staged dual cut", () => {
    const result = resetDualCutToDraft(
      {
        kind: "dual_cut",
        mission59RotateNano: true,
      },
      1,
    );

    expect(result.mission59RotateNano).toBe(true);
    expect(result.mission43NanoStandIndex).toBe(0);
    expect(result.selectedGuessTile).toBe(1);
    expect(result.pendingAction).toBeNull();
  });

  it("defaults mission 59 rotate flag to false when staged action did not set it", () => {
    const result = resetDualCutToDraft(
      {
        kind: "dual_cut",
        mission59RotateNano: undefined,
      },
      0,
    );

    expect(result.mission59RotateNano).toBe(false);
    expect(result.mission43NanoStandIndex).toBe(0);
  });

  it("preserves mission 43 receiving-stand selection from staged dual cut", () => {
    const result = resetDualCutToDraft(
      {
        kind: "dual_cut",
        mission43NanoStandIndex: 1,
      },
      2,
    );

    expect(result.mission43NanoStandIndex).toBe(1);
  });
});
