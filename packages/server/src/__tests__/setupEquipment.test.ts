import { describe, it, expect } from "vitest";
import { EQUIPMENT_DEFS, PLAYER_COUNT_CONFIG, resolveMissionSetup } from "@bomb-busters/shared";
import { resolveEquipmentPoolIds, setupGame } from "../setup";

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

describe("setupGame equipmentReserve", () => {
  it("returns non-empty equipmentReserve when candidates exceed dealt count", () => {
    const playerCount = 4;
    const mission = 10; // mission 9+ with yellow wires → has base pool equipment
    const players = Array.from({ length: playerCount }, (_, i) => ({
      id: `player-${i + 1}`,
      name: `Player ${i + 1}`,
      hand: [],
      standSizes: [],
      isCaptain: i === 0,
      character: `character_${i + 1}`,
      characterUsed: false,
    }));

    const { board, equipmentReserve } = setupGame(players as any, mission);

    const basePoolSize = EQUIPMENT_DEFS.filter((def) => def.pool === "base").length;
    const equipmentCount = PLAYER_COUNT_CONFIG[playerCount]!.equipmentCount;

    // The dealt equipment plus the reserve should account for all base candidates
    // (minus any that were force-added by Rule Sticker A/C and filtered out of reserve).
    expect(board.equipment.length).toBeGreaterThanOrEqual(equipmentCount);
    expect(equipmentReserve.length).toBeGreaterThan(0);

    // No card should appear in both dealt and reserve
    const dealtIds = new Set(board.equipment.map((eq) => eq.id));
    for (const card of equipmentReserve) {
      expect(dealtIds.has(card.id)).toBe(false);
    }

    // Together they should cover most of the base pool
    const allIds = new Set([...dealtIds, ...equipmentReserve.map((eq: { id: string }) => eq.id)]);
    expect(allIds.size).toBeLessThanOrEqual(basePoolSize + 6); // +6 for potential campaign cards
  });

  it("returns empty equipmentReserve for fixed_pool missions", () => {
    const playerCount = 4;
    const mission = 18; // fixed_pool with only general_radar
    const players = Array.from({ length: playerCount }, (_, i) => ({
      id: `player-${i + 1}`,
      name: `Player ${i + 1}`,
      hand: [],
      standSizes: [],
      isCaptain: i === 0,
      character: `character_${i + 1}`,
      characterUsed: false,
    }));

    const { equipmentReserve } = setupGame(players as any, mission);
    expect(equipmentReserve).toHaveLength(0);
  });
});
