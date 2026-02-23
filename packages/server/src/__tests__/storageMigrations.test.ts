import { describe, it, expect } from "vitest";
import { normalizeRoomState } from "../storageMigrations";

describe("normalizeRoomState", () => {
  it("returns default room snapshot for invalid payloads", () => {
    const normalized = normalizeRoomState(null, "room-a");

    expect(normalized.gameState).toBeNull();
    expect(normalized.players).toEqual([]);
    expect(normalized.mission).toBe(1);
    expect(normalized.hostId).toBeNull();
    expect(normalized.botCount).toBe(0);
    expect(normalized.botLastActionTurn).toEqual({});
  });

  it("backfills missing top-level defaults from legacy room data", () => {
    const legacy = {
      mission: 34,
      players: [
        {
          id: "p1",
          name: "Alice",
          isCaptain: true,
          hand: [],
          infoTokens: [],
        },
      ],
    };

    const normalized = normalizeRoomState(legacy, "room-b");

    expect(normalized.hostId).toBe("p1");
    expect(normalized.botCount).toBe(0);
    expect(normalized.botLastActionTurn).toEqual({});
    expect(normalized.players[0].connected).toBe(true);
    expect(normalized.players[0].isBot).toBe(false);
    expect(normalized.players[0].characterUsed).toBe(false);
  });

  it("normalizes legacy gameState shape with missing arrays and invalid index", () => {
    const legacy = {
      mission: 41,
      players: [],
      gameState: {
        phase: "playing",
        players: [
          {
            id: "p1",
            name: "Alice",
            isCaptain: true,
            hand: [],
            infoTokens: [],
          },
        ],
        board: {
          detonatorPosition: 2,
          detonatorMax: 5,
          validationTrack: { 1: 2, 3: 1 },
          markers: [],
        },
        currentPlayerIndex: 7,
        turnNumber: 9,
        mission: 41,
        result: null,
      },
    };

    const normalized = normalizeRoomState(legacy, "room-c");

    expect(normalized.gameState).not.toBeNull();
    expect(normalized.players[0].id).toBe("p1");
    expect(normalized.gameState!.players[0].id).toBe("p1");
    expect(normalized.gameState!.currentPlayerIndex).toBe(0);
    expect(normalized.gameState!.board.equipment).toEqual([]);
    expect(normalized.gameState!.chat).toEqual([]);
    expect(normalized.gameState!.log).toEqual([]);
    expect(normalized.gameState!.board.validationTrack[1]).toBe(2);
    expect(normalized.gameState!.board.validationTrack[2]).toBe(0);
    expect(normalized.gameState!.board.validationTrack[3]).toBe(1);
    expect(normalized.gameState!.board.validationTrack[12]).toBe(0);
  });

  it("backfills missing equipment image fields from equipment definitions", () => {
    const legacy = {
      gameState: {
        phase: "playing",
        players: [
          {
            id: "p1",
            name: "Alice",
            isCaptain: true,
            hand: [],
            infoTokens: [],
          },
        ],
        board: {
          detonatorPosition: 0,
          detonatorMax: 3,
          validationTrack: {},
          markers: [],
          equipment: [
            {
              id: "rewinder",
              name: "Rewinder",
              description: "Move detonator back one notch",
              unlockValue: 6,
              unlocked: true,
              used: false,
            },
          ],
        },
        currentPlayerIndex: 0,
        turnNumber: 1,
        mission: 1,
        result: null,
      },
    };

    const normalized = normalizeRoomState(legacy, "room-d");
    expect(normalized.gameState).not.toBeNull();
    expect(normalized.gameState!.board.equipment).toHaveLength(1);
    expect(normalized.gameState!.board.equipment[0].image).toBe("equipment_6.png");
  });
});
