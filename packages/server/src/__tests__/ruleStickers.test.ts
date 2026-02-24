import { describe, expect, it } from "vitest";
import {
  EQUIPMENT_DEFS,
  MISSION_SCHEMAS,
  PLAYER_COUNT_CONFIG,
  type MissionId,
} from "@bomb-busters/shared";
import { makePlayer } from "@bomb-busters/shared/testing";
import { setupGame } from "../setup";

function createPlayers(count: number) {
  return Array.from({ length: count }, (_, i) =>
    makePlayer({
      id: `player-${i + 1}`,
      name: `Player ${i + 1}`,
      isCaptain: i === 0,
      hand: [],
    }),
  );
}

function firstAllowedPlayerCount(missionId: MissionId): number {
  return MISSION_SCHEMAS[missionId].allowedPlayerCounts![0];
}

function createPlayersWithCharacters(count: number) {
  return Array.from({ length: count }, (_, i) =>
    makePlayer({
      id: `player-${i + 1}`,
      name: `Player ${i + 1}`,
      isCaptain: i === 0,
      hand: [],
      character: i === 0 ? "double_detector" : "character_2",
      characterUsed: i % 2 === 0,
    }),
  );
}

const campaignEquipmentIds = EQUIPMENT_DEFS.filter((def) => def.pool === "campaign").map(
  (def) => def.id,
);

function allEquipmentIdsFromSetupResult(
  board: { equipment: Array<{ id: string }> },
  equipmentReserve: Array<{ id: string }>,
): Set<string> {
  return new Set([
    ...board.equipment.map((eq) => eq.id),
    ...equipmentReserve.map((eq) => eq.id),
  ]);
}

describe("Rule Sticker A — False Bottom (missions 9+)", () => {
  it("does NOT add false_bottom for missions below 9", () => {
    const missionId = 8 as MissionId;
    const players = createPlayers(firstAllowedPlayerCount(missionId));
    const { board, equipmentReserve } = setupGame(players, missionId);

    const allIds = allEquipmentIdsFromSetupResult(board, equipmentReserve);
    expect(allIds.has("false_bottom")).toBe(false);
  });

  it("adds false_bottom to the equipment pool for missions 9+ with yellow wires", () => {
    const missionId = 9 as MissionId;
    const playerCount = firstAllowedPlayerCount(missionId);
    const players = createPlayers(playerCount);
    const { board, equipmentReserve } = setupGame(players, missionId);

    const allIds = allEquipmentIdsFromSetupResult(board, equipmentReserve);
    expect(allIds.has("false_bottom")).toBe(true);
    expect(board.equipment).toHaveLength(
      PLAYER_COUNT_CONFIG[playerCount]!.equipmentCount,
    );
  });

  it("mission 41 excludes false_bottom from the setup equipment pool", () => {
    const missionId = 41 as MissionId;
    const players = createPlayers(firstAllowedPlayerCount(missionId));
    const { board, equipmentReserve } = setupGame(players, missionId);

    const allIds = allEquipmentIdsFromSetupResult(board, equipmentReserve);
    expect(allIds.has("false_bottom")).toBe(false);
  });
});

describe("Rule Sticker C — Campaign Equipment (missions 55+)", () => {
  it("does NOT add campaign equipment for missions below 55", () => {
    const missionId = 54 as MissionId;
    const players = createPlayers(firstAllowedPlayerCount(missionId));
    const { board, equipmentReserve } = setupGame(players, missionId);

    const allIds = allEquipmentIdsFromSetupResult(board, equipmentReserve);
    const hasCampaign = [...allIds].some((id) => campaignEquipmentIds.includes(id));
    expect(hasCampaign).toBe(false);
  });

  it("adds campaign equipment to the pool for missions 55+ when not already included", () => {
    const missionId = 55 as MissionId;
    const playerCount = firstAllowedPlayerCount(missionId);
    const players = createPlayers(playerCount);
    const { board, equipmentReserve } = setupGame(players, missionId);

    const equipmentIds = allEquipmentIdsFromSetupResult(board, equipmentReserve);
    for (const campaignId of campaignEquipmentIds) {
      expect(equipmentIds.has(campaignId)).toBe(true);
    }
    expect(board.equipment).toHaveLength(
      PLAYER_COUNT_CONFIG[playerCount]!.equipmentCount,
    );
  });
});

describe("Rule Sticker B — Expert Characters (missions 31+)", () => {
  it("missions below 31 keep setup character state unchanged", () => {
    const missionId = 30 as MissionId;
    const players = createPlayersWithCharacters(firstAllowedPlayerCount(missionId));
    const expected = players.map((player) => ({
      id: player.id,
      character: player.character,
      characterUsed: player.characterUsed,
    }));

    const { players: setupPlayers } = setupGame(players, missionId);

    for (const player of setupPlayers) {
      const before = expected.find((item) => item.id === player.id);
      expect(before).toBeDefined();
      expect(player.character).toBe(before!.character);
      expect(player.characterUsed).toBe(before!.characterUsed);
    }
  });

  it("missions 31+ keep setup character state unchanged", () => {
    const missionId = 31 as MissionId;
    const players = createPlayersWithCharacters(firstAllowedPlayerCount(missionId));
    const expected = players.map((player) => ({
      id: player.id,
      character: player.character,
      characterUsed: player.characterUsed,
    }));

    const { players: setupPlayers } = setupGame(players, missionId);

    for (const player of setupPlayers) {
      const before = expected.find((item) => item.id === player.id);
      expect(before).toBeDefined();
      expect(player.character).toBe(before!.character);
      expect(player.characterUsed).toBe(before!.characterUsed);
    }
  });
});
