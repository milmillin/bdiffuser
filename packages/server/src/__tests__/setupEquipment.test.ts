import { describe, it, expect } from "vitest";
import { resolveMissionSetup } from "@bomb-busters/shared";
import { resolveEquipmentPoolIds } from "../setup";

describe("equipment pool resolution", () => {
  it("uses base pool by default", () => {
    const { setup } = resolveMissionSetup(4, 4);
    const ids = resolveEquipmentPoolIds(setup.equipment);

    expect(ids).toContain("rewinder");
    expect(ids).toContain("x_or_y_ray");
    expect(ids).not.toContain("false_bottom");
    expect(ids).not.toContain("disintegrator");
  });

  it("mission 41 excludes only campaign false_bottom (not base rewinder)", () => {
    const { setup } = resolveMissionSetup(41, 4);
    const ids = resolveEquipmentPoolIds(setup.equipment);

    expect(ids).toContain("rewinder");
    expect(ids).toContain("x_or_y_ray");
    expect(ids).not.toContain("false_bottom");
  });

  it("mission 57 excludes only campaign disintegrator (not base X/Y Ray)", () => {
    const { setup } = resolveMissionSetup(57, 4);
    const ids = resolveEquipmentPoolIds(setup.equipment);

    expect(ids).toContain("x_or_y_ray");
    expect(ids).toContain("false_bottom");
    expect(ids).not.toContain("disintegrator");
  });

  it("mission 18 fixed_pool only exposes General Radar", () => {
    const { setup } = resolveMissionSetup(18, 4);
    const ids = resolveEquipmentPoolIds(setup.equipment);

    expect(ids).toEqual(["general_radar"]);
  });

  it("fixed_pool preserves configured equipment ID order", () => {
    const ids = resolveEquipmentPoolIds({
      mode: "fixed_pool",
      fixedEquipmentIds: ["stabilizer", "talkies_walkies", "general_radar"],
    });

    expect(ids).toEqual(["stabilizer", "talkies_walkies", "general_radar"]);
  });
});
