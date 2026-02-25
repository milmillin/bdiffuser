import { describe, it, expect } from "vitest";
import { PLAYER_COUNT_CONFIG, resolveMissionSetup } from "@bomb-busters/shared";
import { makePlayer } from "@bomb-busters/shared/testing";
import {
  resolveEquipmentPoolIds,
  setupGame,
  assignCharactersForGameStart,
  isNonCaptainCharacterForbidden,
} from "../setup";

const MISSION_BASE_CHARACTERS = new Set([
  "double_detector",
  "character_2",
  "character_3",
  "character_4",
  "character_5",
]);

describe("setupGame character assignment", () => {
  it("always assigns base characters for missions below Rule Sticker B", () => {
    const players = [
      makePlayer({
        id: "a",
        name: "A",
        isCaptain: true,
        character: "character_e1",
        characterUsed: false,
      }),
      makePlayer({
        id: "b",
        name: "B",
        isCaptain: false,
        character: "character_e2",
        characterUsed: false,
      }),
      makePlayer({
        id: "c",
        name: "C",
        isCaptain: false,
        character: "character_e3",
        characterUsed: false,
      }),
    ];

    assignCharactersForGameStart(players as any, 30);

    expect(players.every((player) => player.character)).toBe(true);
    expect(new Set(players.map((player) => player.character)).size).toBe(3);
    expect(players.every((player) => MISSION_BASE_CHARACTERS.has(player.character!))).toBe(true);
  });

  it("keeps non-captain preselected characters for missions with Rule Sticker B", () => {
    const players = [
      makePlayer({
        id: "captain",
        name: "Captain",
        isCaptain: true,
        character: "character_e1",
        characterUsed: false,
      }),
      makePlayer({
        id: "member",
        name: "Member",
        isCaptain: false,
        character: null,
      }),
      makePlayer({
        id: "helper",
        name: "Helper",
        isCaptain: false,
        character: "character_2",
        characterUsed: false,
      }),
    ];
    const originalRandom = Math.random;
    Math.random = () => 0;

    try {
      assignCharactersForGameStart(players as any, 31);
    } finally {
      Math.random = originalRandom;
    }

    expect(players[0].character).toBe("double_detector");
    expect(players[2].character).toBe("character_2");
    expect(players[1].character).not.toBeNull();
    expect(MISSION_BASE_CHARACTERS.has(players[1].character!)).toBe(true);
  });

  it("replaces duplicate captain-card selections so captain remains Double Detector", () => {
    const players = [
      makePlayer({
        id: "captain",
        name: "Captain",
        isCaptain: true,
        character: "character_e1",
        characterUsed: false,
      }),
      makePlayer({
        id: "member",
        name: "Member",
        isCaptain: false,
        character: "character_2",
        characterUsed: false,
      }),
      makePlayer({
        id: "helper",
        name: "Helper",
        isCaptain: false,
        character: "character_2",
        characterUsed: false,
      }),
    ];

    assignCharactersForGameStart(players as any, 31);

    expect(players[0].character).toBe("double_detector");
    expect(players[1].character).toBe("character_2");
    expect(MISSION_BASE_CHARACTERS.has(players[2].character!)).toBe(true);
    expect(players[2].character).not.toBe("character_2");
  });

  it.each([44, 45, 47, 49, 51, 54, 59, 63, 65])(
    "replaces mission %i preselected character_e4 for non-captains",
    (mission) => {
      const players = [
        makePlayer({
          id: "captain",
          name: "Captain",
          isCaptain: true,
          character: "double_detector",
          characterUsed: false,
        }),
        makePlayer({
          id: "member",
          name: "Member",
          isCaptain: false,
          character: "character_e4",
          characterUsed: false,
        }),
        makePlayer({
          id: "helper",
          name: "Helper",
          isCaptain: false,
          character: "character_2",
          characterUsed: false,
        }),
      ];

      assignCharactersForGameStart(players as any, mission as any);

      expect(players[0].character).toBe("double_detector");
      for (const player of players.slice(1)) {
        expect(player.character).not.toBe("character_e4");
        expect(MISSION_BASE_CHARACTERS.has(player.character!)).toBe(true);
      }
    },
  );

  it.each([44, 45, 47, 49, 51, 54, 59, 63, 65] as const)(
    "forbids mission %i non-captain character_e4 during setup selection",
    (mission) => {
      expect(isNonCaptainCharacterForbidden(mission, "character_e4")).toBe(true);
      expect(isNonCaptainCharacterForbidden(mission, "character_e1")).toBe(false);
    },
  );
});

describe("equipment pool resolution", () => {
  it("uses base pool by default", () => {
    const { setup } = resolveMissionSetup(4, 4);
    const ids = resolveEquipmentPoolIds(setup.equipment);

    expect(ids).toContain("rewinder");
    expect(ids).toContain("x_or_y_ray");
    expect(ids).not.toContain("false_bottom");
    expect(ids).not.toContain("disintegrator");
  });

  it("mission 41 includes campaign false_bottom in the setup pool", () => {
    const { setup } = resolveMissionSetup(41, 4);
    const ids = resolveEquipmentPoolIds(setup.equipment);

    expect(ids).toContain("rewinder");
    expect(ids).toContain("x_or_y_ray");
    expect(ids).toContain("false_bottom");
  });

  it("mission 57 includes campaign disintegrator in the setup pool", () => {
    const { setup } = resolveMissionSetup(57, 4);
    const ids = resolveEquipmentPoolIds(setup.equipment);

    expect(ids).toContain("x_or_y_ray");
    expect(ids).toContain("false_bottom");
    expect(ids).toContain("disintegrator");
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

  it("mission 52 keeps label equipment in setup pool while still forbidding redraw to board", () => {
    const { setup } = resolveMissionSetup(52, 4);
    const ids = resolveEquipmentPoolIds(setup.equipment);

    expect(ids).toContain("label_neq");
    expect(ids).toContain("label_eq");
  });
});

describe("setupGame equipmentReserve", () => {
  it("deals player-count equipment cards and keeps the rest in reserve", () => {
    const playerCount = 4;
    const mission = 9; // mission 9+ with yellow wires → Sticker A adds False Bottom to the pool
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
      (missionNumber >= 9 && setup.yellow.kind !== "none" ? 1 : 0);

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

  it("mission 41 setup avoids dealing false_bottom to board", () => {
    const playerCount = 4;
    const mission = 41;
    const players = Array.from({ length: playerCount }, (_, i) => ({
      id: `player-${i + 1}`,
      name: `Player ${i + 1}`,
      hand: [],
      standSizes: [],
      isCaptain: i === 0,
      character: `character_${i + 1}`,
      characterUsed: false,
    }));

    const originalRandom = Math.random;
    Math.random = () => 0.5;
    try {
      const { board } = setupGame(players as any, mission);
      expect(board.equipment.some((eq) => eq.id === "false_bottom")).toBe(false);
    } finally {
      Math.random = originalRandom;
    }
  });

  it("mission 57 setup avoids dealing disintegrator to board", () => {
    const playerCount = 4;
    const mission = 57;
    const players = Array.from({ length: playerCount }, (_, i) => ({
      id: `player-${i + 1}`,
      name: `Player ${i + 1}`,
      hand: [],
      standSizes: [],
      isCaptain: i === 0,
      character: `character_${i + 1}`,
      characterUsed: false,
    }));
    const setup = resolveMissionSetup(mission, playerCount).setup;
    const poolIds = resolveEquipmentPoolIds(setup.equipment);
    const poolSize = poolIds.length;
    const disintegratorIndex = poolIds.indexOf("disintegrator");
    expect(disintegratorIndex).toBeGreaterThan(0);

    const originalRandom = Math.random;
    const randomValues: number[] = [];
    for (let i = poolSize - 1; i >= 1; i--) {
      randomValues.push(i === disintegratorIndex ? 0 : i / (i + 1));
    }
    for (let i = poolSize - 1; i >= 1; i--) {
      randomValues.push(i / (i + 1));
    }
    let randomIdx = 0;
    Math.random = () => (randomValues[randomIdx++] ?? 0.5);

    try {
      const { board } = setupGame(players as any, mission);
      expect(board.equipment.some((eq) => eq.id === "disintegrator")).toBe(false);
    } finally {
      Math.random = originalRandom;
    }
  });

  it("mission 52 setup redraws label cards to board reserve instead of dealing them", () => {
    const playerCount = 4;
    const mission = 52;
    const players = Array.from({ length: playerCount }, (_, i) => ({
      id: `player-${i + 1}`,
      name: `Player ${i + 1}`,
      hand: [],
      standSizes: [],
      isCaptain: i === 0,
      character: `character_${i + 1}`,
      characterUsed: false,
    }));
    const setup = resolveMissionSetup(mission, playerCount).setup;
    const poolIds = resolveEquipmentPoolIds(setup.equipment);
    const poolSize = poolIds.length;
    const forbiddenIndices = [
      poolIds.indexOf("label_neq"),
      poolIds.indexOf("label_eq"),
    ];
    for (const index of forbiddenIndices) {
      expect(index).toBeGreaterThan(0);
    }

    const originalRandom = Math.random;
    const randomValues: number[] = [];
    for (let i = poolSize - 1; i >= 1; i--) {
      randomValues.push(forbiddenIndices.includes(i) ? 0 : i / (i + 1));
    }
    for (let i = poolSize - 1; i >= 1; i--) {
      randomValues.push(i / (i + 1));
    }
    let randomIdx = 0;
    Math.random = () => (randomValues[randomIdx++] ?? 0.5);

    try {
      const { board } = setupGame(players as any, mission);
      expect(board.equipment.some((eq) => eq.id === "label_neq")).toBe(false);
      expect(board.equipment.some((eq) => eq.id === "label_eq")).toBe(false);
    } finally {
      Math.random = originalRandom;
    }
  });

  it("mission 58 setup avoids dealing post-it and emergency batteries to board", () => {
    const playerCount = 4;
    const mission = 58;
    const players = Array.from({ length: playerCount }, (_, i) => ({
      id: `player-${i + 1}`,
      name: `Player ${i + 1}`,
      hand: [],
      standSizes: [],
      isCaptain: i === 0,
      character: `character_${i + 1}`,
      characterUsed: false,
    }));
    const setup = resolveMissionSetup(mission, playerCount).setup;
    const poolIds = resolveEquipmentPoolIds(setup.equipment);
    const poolSize = poolIds.length;
    const forbiddenIndices = [
      poolIds.indexOf("post_it"),
      poolIds.indexOf("emergency_batteries"),
    ];
    for (const index of forbiddenIndices) {
      expect(index).toBeGreaterThan(0);
    }

    const originalRandom = Math.random;
    const randomValues: number[] = [];
    for (let i = poolSize - 1; i >= 1; i--) {
      randomValues.push(forbiddenIndices.includes(i) ? 0 : i / (i + 1));
    }
    for (let i = poolSize - 1; i >= 1; i--) {
      randomValues.push(i / (i + 1));
    }
    let randomIdx = 0;
    Math.random = () => (randomValues[randomIdx++] ?? 0.5);

    try {
      const { board } = setupGame(players as any, mission);
      expect(board.equipment.some((eq) => eq.id === "post_it")).toBe(false);
      expect(board.equipment.some((eq) => eq.id === "emergency_batteries")).toBe(false);
    } finally {
      Math.random = originalRandom;
    }
  });

  it.each([44, 45, 47, 50, 54, 59, 63, 65] as const)(
    "mission %i setup avoids dealing x or y ray to board",
    (mission) => {
      const playerCount = 4;
      const players = Array.from({ length: playerCount }, (_, i) => ({
        id: `player-${i + 1}`,
        name: `Player ${i + 1}`,
        hand: [],
        standSizes: [],
        isCaptain: i === 0,
        character: `character_${i + 1}`,
        characterUsed: false,
      }));
      const setup = resolveMissionSetup(mission, playerCount).setup;
      const poolIds = resolveEquipmentPoolIds(setup.equipment);
      const poolSize = poolIds.length;
      const xOrYRayIndex = poolIds.indexOf("x_or_y_ray");
      expect(xOrYRayIndex).toBeGreaterThan(0);

      const originalRandom = Math.random;
      const randomValues: number[] = [];
      for (let i = poolSize - 1; i >= 1; i--) {
        randomValues.push(i === xOrYRayIndex ? 0 : i / (i + 1));
      }
      for (let i = poolSize - 1; i >= 1; i--) {
        randomValues.push(i / (i + 1));
      }
      let randomIdx = 0;
      Math.random = () => (randomValues[randomIdx++] ?? 0.5);

      try {
        const { board } = setupGame(players as any, mission);
        expect(board.equipment.some((eq) => eq.id === "x_or_y_ray")).toBe(false);
      } finally {
        Math.random = originalRandom;
      }
    },
  );

  it.each([
    { mission: 10, forbiddenId: "coffee_mug" },
    { mission: 45, forbiddenId: "coffee_mug" },
    { mission: 46, forbiddenId: "emergency_batteries" },
  ] as const)(
    "mission $mission setup avoids dealing $forbiddenId to board",
    ({ mission, forbiddenId }) => {
      const playerCount = 4;
      const players = Array.from({ length: playerCount }, (_, i) => ({
        id: `player-${i + 1}`,
        name: `Player ${i + 1}`,
        hand: [],
        standSizes: [],
        isCaptain: i === 0,
        character: `character_${i + 1}`,
        characterUsed: false,
      }));
      const setup = resolveMissionSetup(mission, playerCount).setup;
      const poolIds = resolveEquipmentPoolIds(setup.equipment);
      const poolSize = poolIds.length;
      const forbiddenIndex = poolIds.indexOf(forbiddenId);
      expect(forbiddenIndex).toBeGreaterThan(0);

      const originalRandom = Math.random;
      const randomValues: number[] = [];
      for (let i = poolSize - 1; i >= 1; i--) {
        randomValues.push(i === forbiddenIndex ? 0 : i / (i + 1));
      }
      for (let i = poolSize - 1; i >= 1; i--) {
        randomValues.push(i / (i + 1));
      }
      let randomIdx = 0;
      Math.random = () => (randomValues[randomIdx++] ?? 0.5);

      try {
        const { board } = setupGame(players as any, mission);
        expect(board.equipment.some((eq) => eq.id === forbiddenId)).toBe(false);
      } finally {
        Math.random = originalRandom;
      }
    },
  );

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
