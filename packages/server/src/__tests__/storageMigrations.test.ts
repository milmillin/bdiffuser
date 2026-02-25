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
    expect(normalized.failureCounters).toEqual({
      loss_red_wire: 0,
      loss_detonator: 0,
      loss_timer: 0,
    });
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
    expect(normalized.failureCounters).toEqual({
      loss_red_wire: 0,
      loss_detonator: 0,
      loss_timer: 0,
    });
    expect(normalized.players[0].connected).toBe(true);
    expect(normalized.players[0].isBot).toBe(false);
    expect(normalized.players[0].characterUsed).toBe(false);
  });

  it("preserves and normalizes failure counters from stored room data", () => {
    const legacy = {
      mission: 10,
      players: [],
      failureCounters: {
        loss_red_wire: 4,
        loss_detonator: Number.NaN,
        loss_timer: 2,
      },
    };

    const normalized = normalizeRoomState(legacy, "room-b2");
    expect(normalized.failureCounters).toEqual({
      loss_red_wire: 4,
      loss_detonator: 0,
      loss_timer: 2,
    });
  });

  it("preserves cleanup timestamps from stored room data", () => {
    const legacy = {
      mission: 10,
      players: [],
      finishedAt: 1_730_000_000_000,
      lastActivityAt: 1_730_000_500_000,
    };

    const normalized = normalizeRoomState(legacy, "room-b3");
    expect(normalized.finishedAt).toBe(1_730_000_000_000);
    expect(normalized.lastActivityAt).toBe(1_730_000_500_000);
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

  it("migrates false_bottom unlock value to YELLOW during restore", () => {
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
              id: "false_bottom",
              name: "False Bottom",
              description: "Draw 2 Equipment cards",
              unlockValue: 6,
              unlocked: false,
              used: false,
            },
          ],
        },
        currentPlayerIndex: 0,
        turnNumber: 1,
        mission: 9,
        result: null,
      },
    };

    const normalized = normalizeRoomState(legacy, "room-false-bottom-upgrade");
    expect(normalized.gameState).not.toBeNull();
    const card = normalized.gameState!.board.equipment[0];
    expect(card.unlockValue).toBe("YELLOW");
    expect(card.image).toBe("equipment_yellow.png");
  });

  it("preserves mission-specific secondary equipment lock fields", () => {
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
              secondaryLockValue: 8,
              secondaryLockCutsRequired: 2,
              unlocked: true,
              used: false,
              image: "equipment_6.png",
            },
          ],
        },
        currentPlayerIndex: 0,
        turnNumber: 1,
        mission: 12,
        result: null,
      },
    };

    const normalized = normalizeRoomState(legacy, "room-e");
    expect(normalized.gameState).not.toBeNull();
    const card = normalized.gameState!.board.equipment[0];
    expect(card.secondaryLockValue).toBe(8);
    expect(card.secondaryLockCutsRequired).toBe(2);
  });

  it("preserves faceDown equipment state during migration", () => {
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
              faceDown: true,
              unlocked: false,
              used: false,
              image: "equipment_back.png",
            },
          ],
        },
        currentPlayerIndex: 0,
        turnNumber: 1,
        mission: 15,
        result: null,
      },
    };

    const normalized = normalizeRoomState(legacy, "room-face-down");
    expect(normalized.gameState).not.toBeNull();
    const card = normalized.gameState!.board.equipment[0];
    expect(card.faceDown).toBe(true);
    expect(card.unlocked).toBe(false);
  });

  it("preserves pending forced action state for mission 10 restore", () => {
    const legacy = {
      gameState: {
        phase: "playing",
        players: [
          {
            id: "captain",
            name: "Alice",
            isCaptain: true,
            hand: [],
            infoTokens: [],
          },
          {
            id: "p2",
            name: "Bob",
            isCaptain: false,
            hand: [],
            infoTokens: [],
          },
        ],
        board: {
          detonatorPosition: 0,
          detonatorMax: 3,
          validationTrack: {},
          markers: [],
          equipment: [],
        },
        currentPlayerIndex: 0,
        turnNumber: 5,
        mission: 10,
        result: null,
        pendingForcedAction: {
          kind: "chooseNextPlayer",
          captainId: "captain",
          lastPlayerId: "p2",
        },
      },
    };

    const normalized = normalizeRoomState(legacy, "room-f");
    expect(normalized.gameState).not.toBeNull();
    expect(normalized.gameState!.pendingForcedAction).toEqual({
      kind: "chooseNextPlayer",
      captainId: "captain",
      lastPlayerId: "p2",
    });
  });

  it("normalizes campaign equipment reserve cards when present", () => {
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
          equipment: [],
        },
        currentPlayerIndex: 0,
        turnNumber: 3,
        mission: 24,
        result: null,
        campaign: {
          equipmentReserve: [
            {
              id: "rewinder",
              unlocked: false,
              used: false,
            },
            { id: "" },
          ],
        },
      },
    };

    const normalized = normalizeRoomState(legacy, "room-equip-reserve");
    expect(normalized.gameState).not.toBeNull();
    expect(normalized.gameState!.campaign?.equipmentReserve).toHaveLength(1);
    expect(normalized.gameState!.campaign?.equipmentReserve?.[0].id).toBe("rewinder");
    expect(normalized.gameState!.campaign?.equipmentReserve?.[0].image).toBe("equipment_6.png");
  });

  it("preserves mission22 token-pass forced action state across restore", () => {
    const legacy = {
      gameState: {
        phase: "playing",
        players: [
          {
            id: "captain",
            name: "Alice",
            isCaptain: true,
            hand: [],
            infoTokens: [],
          },
          {
            id: "p2",
            name: "Bob",
            isCaptain: false,
            hand: [],
            infoTokens: [],
          },
          {
            id: "p3",
            name: "Caro",
            isCaptain: false,
            hand: [],
            infoTokens: [],
          },
        ],
        board: {
          detonatorPosition: 0,
          detonatorMax: 3,
          validationTrack: {},
          markers: [],
          equipment: [],
        },
        currentPlayerIndex: 0,
        turnNumber: 6,
        mission: 22,
        result: null,
        pendingForcedAction: {
          kind: "mission22TokenPass",
          currentChooserIndex: 1,
          currentChooserId: "p2",
          passingOrder: [0, 1, "bad", 2],
          completedCount: 1,
        },
      },
    };

    const normalized = normalizeRoomState(legacy, "room-f2");
    expect(normalized.gameState).not.toBeNull();
    expect(normalized.gameState!.pendingForcedAction).toEqual({
      kind: "mission22TokenPass",
      currentChooserIndex: 1,
      currentChooserId: "p2",
      passingOrder: [0, 1, 2],
      completedCount: 1,
    });
  });

  it("normalizes mission22 token-pass board state across restore", () => {
    const legacy = {
      gameState: {
        phase: "playing",
        players: [
          {
            id: "captain",
            name: "Alice",
            isCaptain: true,
            hand: [],
            infoTokens: [],
          },
          {
            id: "p2",
            name: "Bob",
            isCaptain: false,
            hand: [],
            infoTokens: [],
          },
        ],
        board: {
          detonatorPosition: 0,
          detonatorMax: 3,
          validationTrack: {},
          markers: [],
          equipment: [],
        },
        currentPlayerIndex: 0,
        turnNumber: 6,
        mission: 22,
        result: null,
        campaign: {
          mission22TokenPassBoard: {
            numericTokens: [3, 13, 5, "bad"],
            yellowTokens: 2,
          },
        },
      },
    };

    const normalized = normalizeRoomState(legacy, "room-f4");
    expect(normalized.gameState).not.toBeNull();
    expect(normalized.gameState!.campaign?.mission22TokenPassBoard).toEqual({
      numericTokens: [3, 5],
      yellowTokens: 2,
    });
  });

  it("preserves mission46 sevens-cut forced action state across restore", () => {
    const legacy = {
      gameState: {
        phase: "playing",
        players: [
          {
            id: "captain",
            name: "Alice",
            isCaptain: true,
            hand: [],
            infoTokens: [],
          },
          {
            id: "p2",
            name: "Bob",
            isCaptain: false,
            hand: [],
            infoTokens: [],
          },
        ],
        board: {
          detonatorPosition: 0,
          detonatorMax: 3,
          validationTrack: {},
          markers: [],
          equipment: [],
        },
        currentPlayerIndex: 1,
        turnNumber: 9,
        mission: 46,
        result: null,
        pendingForcedAction: {
          kind: "mission46SevensCut",
          playerId: "p2",
        },
      },
    };

    const normalized = normalizeRoomState(legacy, "room-f3");
    expect(normalized.gameState).not.toBeNull();
    expect(normalized.gameState!.pendingForcedAction).toEqual({
      kind: "mission46SevensCut",
      playerId: "p2",
    });
  });

  it("preserves detector tile-choice forced action state across restore", () => {
    const legacy = {
      gameState: {
        phase: "playing",
        players: [
          {
            id: "captain",
            name: "Alice",
            isCaptain: true,
            hand: [],
            infoTokens: [],
          },
          {
            id: "p2",
            name: "Bob",
            isCaptain: false,
            hand: [],
            infoTokens: [],
          },
        ],
        board: {
          detonatorPosition: 0,
          detonatorMax: 3,
          validationTrack: {},
          markers: [],
          equipment: [],
        },
        currentPlayerIndex: 0,
        turnNumber: 4,
        mission: 6,
        result: null,
        pendingForcedAction: {
          kind: "detectorTileChoice",
          targetPlayerId: "p2",
          actorId: "captain",
          matchingTileIndices: [1, "bad", 3],
          guessValue: 7,
          source: "tripleDetector",
          originalTargetTileIndices: [0, "x", 2],
          actorTileIndex: 5,
          equipmentId: "triple_detector",
        },
      },
    };

    const normalized = normalizeRoomState(legacy, "room-f4");
    expect(normalized.gameState).not.toBeNull();
    expect(normalized.gameState!.pendingForcedAction).toEqual({
      kind: "detectorTileChoice",
      targetPlayerId: "p2",
      actorId: "captain",
      matchingTileIndices: [1, 3],
      guessValue: 7,
      source: "tripleDetector",
      originalTargetTileIndices: [0, 2],
      actorTileIndex: 5,
      equipmentId: "triple_detector",
    });
  });

  it("preserves campaign mission objects and timer state across restore", () => {
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
          {
            id: "p2",
            name: "Bob",
            isCaptain: false,
            hand: [],
            infoTokens: [],
          },
        ],
        board: {
          detonatorPosition: 1,
          detonatorMax: 3,
          validationTrack: {},
          markers: [],
          equipment: [],
        },
        currentPlayerIndex: 0,
        turnNumber: 8,
        mission: 31,
        result: null,
        timerDeadline: 1735689600000,
        campaign: {
          numberCards: {
            deck: [{ id: "d1", value: 11, faceUp: false }],
            discard: [{ id: "dc1", value: 3, faceUp: true }],
            visible: [{ id: "v1", value: 7, faceUp: true }],
            playerHands: {
              p1: [{ id: "h1", value: 6, faceUp: false }],
              p2: [{ id: "h2", value: 9, faceUp: false }],
            },
          },
          constraints: {
            global: [{ id: "cg1", name: "No 7", description: "No value 7", active: true }],
            perPlayer: {
              p1: [{ id: "cp1", name: "No solo", description: "Cannot solo cut", active: true }],
            },
          },
          challenges: {
            deck: [{ id: "chd", name: "Hidden", description: "Deck", completed: false }],
            active: [{ id: "cha", name: "Active", description: "A", completed: false }],
            completed: [{ id: "chc", name: "Done", description: "C", completed: true }],
          },
          oxygen: {
            pool: 5,
            playerOxygen: { p1: 2, p2: 1 },
          },
          nanoTracker: {
            position: 2,
            max: 6,
          },
          bunkerTracker: {
            position: 1,
            max: 4,
          },
          specialMarkers: [
            { kind: "x", value: 8 },
            { kind: "sequence_pointer", value: 1 },
          ],
        },
      },
    };

    const normalized = normalizeRoomState(legacy, "room-g");
    expect(normalized.gameState).not.toBeNull();
    expect(normalized.gameState!.timerDeadline).toBe(1735689600000);
    expect(normalized.gameState!.campaign).toEqual({
      ...legacy.gameState.campaign,
      constraints: {
        ...legacy.gameState.campaign.constraints,
        deck: [],
      },
    });
  });

  it("normalizes malformed campaign object shapes to safe defaults", () => {
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
          equipment: [],
        },
        currentPlayerIndex: 0,
        turnNumber: 1,
        mission: 36,
        result: null,
        campaign: {
          numberCards: {
            deck: "invalid",
            discard: null,
            visible: [{ id: "v1", value: 5, faceUp: true }],
            playerHands: "invalid",
          },
          constraints: {
            global: "invalid",
            perPlayer: null,
          },
          challenges: {
            deck: "invalid",
            active: null,
            completed: [],
          },
          oxygen: {
            pool: "invalid",
            playerOxygen: "invalid",
          },
          nanoTracker: {
            position: "invalid",
          },
          bunkerTracker: {
            max: "invalid",
          },
          specialMarkers: "invalid",
        },
      },
    };

    const normalized = normalizeRoomState(legacy, "room-h");
    expect(normalized.gameState).not.toBeNull();
    expect(normalized.gameState!.campaign).toEqual({
      numberCards: {
        deck: [],
        discard: [],
        visible: [{ id: "v1", value: 5, faceUp: true }],
        playerHands: {},
      },
      constraints: {
        global: [],
        perPlayer: {},
        deck: [],
      },
      challenges: {
        deck: [],
        active: [],
        completed: [],
      },
      oxygen: {
        pool: 0,
        playerOxygen: {},
      },
      nanoTracker: {
        position: 0,
        max: 0,
      },
      bunkerTracker: {
        position: 0,
        max: 0,
      },
      specialMarkers: [],
    });
  });

  it("filters malformed entries inside campaign arrays and per-player maps", () => {
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
          equipment: [],
        },
        currentPlayerIndex: 0,
        turnNumber: 1,
        mission: 36,
        result: null,
        campaign: {
          numberCards: {
            deck: [
              { id: "ok-deck", value: 8, faceUp: false },
              { id: "bad-deck", value: "x", faceUp: false },
            ],
            discard: [],
            visible: [{ id: "ok-visible", value: 4, faceUp: true }],
            playerHands: {
              p1: [
                { id: "ok-hand", value: 6, faceUp: false },
                { id: "bad-hand", value: null, faceUp: false },
              ],
              p2: "invalid",
            },
          },
          constraints: {
            global: [
              { id: "ok-c", name: "No 4", description: "rule", active: true },
              { id: "bad-c", name: 1, description: "rule", active: true },
            ],
            perPlayer: {
              p1: [
                { id: "ok-pc", name: "No solo", description: "rule", active: true },
                { id: "bad-pc", name: "bad", description: 5, active: true },
              ],
              p2: "invalid",
            },
          },
          challenges: {
            deck: [
              { id: "ok-ch", name: "Deck", description: "desc", completed: false },
              { id: "bad-ch", name: "Bad", description: null, completed: false },
            ],
            active: [],
            completed: [],
          },
          oxygen: {
            pool: 3,
            playerOxygen: {
              p1: 2,
              p2: "invalid",
            },
          },
          specialMarkers: [
            { kind: "x", value: 9 },
            { kind: "unknown", value: 1 },
            { kind: "sequence_pointer", value: "invalid" },
          ],
        },
      },
    };

    const normalized = normalizeRoomState(legacy, "room-i");
    expect(normalized.gameState).not.toBeNull();
    expect(normalized.gameState!.campaign).toEqual({
      numberCards: {
        deck: [{ id: "ok-deck", value: 8, faceUp: false }],
        discard: [],
        visible: [{ id: "ok-visible", value: 4, faceUp: true }],
        playerHands: {
          p1: [{ id: "ok-hand", value: 6, faceUp: false }],
          p2: [],
        },
      },
      constraints: {
        global: [{ id: "ok-c", name: "No 4", description: "rule", active: true }],
        perPlayer: {
          p1: [{ id: "ok-pc", name: "No solo", description: "rule", active: true }],
          p2: [],
        },
        deck: [],
      },
      challenges: {
        deck: [{ id: "ok-ch", name: "Deck", description: "desc", completed: false }],
        active: [],
        completed: [],
      },
      oxygen: {
        pool: 3,
        playerOxygen: { p1: 2 },
      },
      specialMarkers: [{ kind: "x", value: 9 }],
    });
  });

  it("does not persist empty campaign objects with no recognized fields", () => {
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
          equipment: [],
        },
        currentPlayerIndex: 0,
        turnNumber: 1,
        mission: 1,
        result: null,
        campaign: {},
      },
    };

    const normalized = normalizeRoomState(legacy, "room-j");
    expect(normalized.gameState).not.toBeNull();
    expect(normalized.gameState!.campaign).toBeUndefined();
  });

  it("treats null campaign sub-objects as explicit empty defaults when key exists", () => {
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
          equipment: [],
        },
        currentPlayerIndex: 0,
        turnNumber: 1,
        mission: 9,
        result: null,
        campaign: {
          numberCards: null,
          constraints: null,
          challenges: null,
          oxygen: null,
          nanoTracker: null,
          bunkerTracker: null,
          specialMarkers: null,
        },
      },
    };

    const normalized = normalizeRoomState(legacy, "room-k");
    expect(normalized.gameState).not.toBeNull();
    expect(normalized.gameState!.campaign).toEqual({
      numberCards: {
        deck: [],
        discard: [],
        visible: [],
        playerHands: {},
      },
      constraints: {
        global: [],
        perPlayer: {},
        deck: [],
      },
      challenges: {
        deck: [],
        active: [],
        completed: [],
      },
      oxygen: {
        pool: 0,
        playerOxygen: {},
      },
      nanoTracker: {
        position: 0,
        max: 0,
      },
      bunkerTracker: {
        position: 0,
        max: 0,
      },
      specialMarkers: [],
    });
  });
});
