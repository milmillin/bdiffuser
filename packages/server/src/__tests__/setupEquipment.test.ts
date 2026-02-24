import { describe, it, expect } from "vitest";
import { PLAYER_COUNT_CONFIG, resolveMissionSetup } from "@bomb-busters/shared";
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
  it("deals player-count equipment cards and keeps the rest in reserve", () => {
    const playerCount = 4;
    const mission = 10; // mission 9+ with yellow wires → Sticker A adds False Bottom to the pool
    const { setup } = resolveMissionSetup(mission, playerCount);
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

    const equipmentCount = PLAYER_COUNT_CONFIG[playerCount]!.equipmentCount;
    const basePoolSize = resolveEquipmentPoolIds(setup.equipment).length;
    const missionNumber: number = mission;
    const expectedPoolSize =
      basePoolSize +
      (missionNumber >= 9 && missionNumber !== 41 && setup.yellow.kind !== "none"
        ? 1
        : 0);

    // Deal count should stay at the player-count baseline.
    expect(board.equipment).toHaveLength(equipmentCount);
    expect(equipmentReserve.length).toBeGreaterThan(0);

    // No card should appear in both dealt and reserve
    const dealtIds = new Set(board.equipment.map((eq) => eq.id));
    for (const card of equipmentReserve) {
      expect(dealtIds.has(card.id)).toBe(false);
    }

    // Combined dealt + reserve should equal the full setup pool.
    const allIds = new Set([...dealtIds, ...equipmentReserve.map((eq: { id: string }) => eq.id)]);
    expect(allIds.size).toBe(expectedPoolSize);
    expect(allIds.has("false_bottom")).toBe(true);
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

    const { board, equipmentReserve } = setupGame(players as any, mission);
    expect(board.equipment).toHaveLength(1);
    expect(equipmentReserve).toHaveLength(0);
  });
});
