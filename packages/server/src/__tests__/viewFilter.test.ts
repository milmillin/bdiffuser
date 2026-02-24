import { describe, it, expect } from "vitest";
import {
  makeGameState,
  makePlayer,
  makeBoardState,
  makeEquipmentCard,
  makeCampaignState,
  makeOxygenState,
  makeProgressTracker,
  makeSpecialMarker,
  makeNumberCardState,
  makeNumberCard,
  makeConstraintCardState,
  makeConstraintCard,
  makeChallengeCard,
  makeChallengeCardState,
} from "@bomb-busters/shared/testing";
import { filterStateForPlayer } from "../viewFilter";

describe("filterStateForPlayer – campaign state", () => {
  it("omits campaign when GameState has no campaign", () => {
    const state = makeGameState();
    const filtered = filterStateForPlayer(state, "player-1");
    expect(filtered.campaign).toBeUndefined();
  });

  it("forwards public campaign fields unchanged", () => {
    const state = makeGameState({
      campaign: makeCampaignState({
        oxygen: makeOxygenState({ pool: 12 }),
        nanoTracker: makeProgressTracker({ position: 2, max: 8 }),
        specialMarkers: [makeSpecialMarker({ kind: "x", value: 5 })],
      }),
    });
    const filtered = filterStateForPlayer(state, "player-1");
    expect(filtered.campaign).toBeDefined();
    expect(filtered.campaign!.oxygen!.pool).toBe(12);
    expect(filtered.campaign!.nanoTracker).toEqual({ position: 2, max: 8 });
    expect(filtered.campaign!.specialMarkers).toHaveLength(1);
  });

  it("redacts number card deck values", () => {
    const state = makeGameState({
      campaign: makeCampaignState({
        numberCards: makeNumberCardState({
          deck: [makeNumberCard({ id: "n1", value: 3 })],
        }),
      }),
    });
    const filtered = filterStateForPlayer(state, "player-1");
    expect(filtered.campaign!.numberCards!.deck).toHaveLength(1);
    expect(filtered.campaign!.numberCards!.deck[0].value).toBe(0);
    expect(filtered.campaign!.numberCards!.deck[0].faceUp).toBe(false);
  });

  it("preserves own number card hand, redacts others' face-down cards", () => {
    const state = makeGameState({
      players: [
        makePlayer({ id: "p1" }),
        makePlayer({ id: "p2", name: "Bob" }),
      ],
      campaign: makeCampaignState({
        numberCards: makeNumberCardState({
          playerHands: {
            p1: [makeNumberCard({ id: "n2", value: 5, faceUp: false })],
            p2: [
              makeNumberCard({ id: "n3", value: 7, faceUp: false }),
              makeNumberCard({ id: "n4", value: 9, faceUp: true }),
            ],
          },
        }),
      }),
    });
    const filtered = filterStateForPlayer(state, "p1");
    // Own hand: value preserved
    expect(filtered.campaign!.numberCards!.playerHands["p1"][0].value).toBe(5);
    // Other's face-down: value redacted
    expect(filtered.campaign!.numberCards!.playerHands["p2"][0].value).toBe(0);
    // Other's face-up: value preserved
    expect(filtered.campaign!.numberCards!.playerHands["p2"][1].value).toBe(9);
  });

  it("redacts challenge deck details", () => {
    const state = makeGameState({
      campaign: makeCampaignState({
        challenges: makeChallengeCardState({
          deck: [makeChallengeCard({ id: "ch1", name: "Secret", description: "Hidden" })],
          active: [makeChallengeCard({ id: "ch2", name: "Active" })],
        }),
      }),
    });
    const filtered = filterStateForPlayer(state, "player-1");
    // Deck card redacted
    expect(filtered.campaign!.challenges!.deck[0].name).toBe("");
    expect(filtered.campaign!.challenges!.deck[0].description).toBe("");
    // Active card preserved
    expect(filtered.campaign!.challenges!.active[0].name).toBe("Active");
  });

  it("preserves existing fields alongside campaign", () => {
    const state = makeGameState({
      campaign: makeCampaignState({ oxygen: makeOxygenState({ pool: 5 }) }),
    });
    const filtered = filterStateForPlayer(state, "player-1");
    expect(filtered.phase).toBe("playing");
    expect(filtered.playerId).toBe("player-1");
    expect(filtered.board.detonatorPosition).toBe(0);
    expect(filtered.campaign!.oxygen!.pool).toBe(5);
  });

  it("redacts face-down locked equipment cards for clients", () => {
    const state = makeGameState({
      board: makeBoardState({
        equipment: [
          makeEquipmentCard({
            id: "rewinder",
            name: "Rewinder",
            unlockValue: 6,
            faceDown: true,
            unlocked: false,
            image: "equipment_6_rewinder.png",
          }),
        ],
      }),
    });

    const filtered = filterStateForPlayer(state, "player-1");
    expect(filtered.board.equipment).toHaveLength(1);
    expect(filtered.board.equipment[0].id).toBe("hidden_equipment_1");
    expect(filtered.board.equipment[0].name).toBe("Face-down Equipment");
    expect(filtered.board.equipment[0].unlockValue).toBe(0);
    expect(filtered.board.equipment[0].image).toBe("equipment_back.png");
  });

  it("does not redact already-revealed face-down equipment cards", () => {
    const state = makeGameState({
      board: makeBoardState({
        equipment: [
          makeEquipmentCard({
            id: "rewinder",
            name: "Rewinder",
            unlockValue: 6,
            faceDown: false,
            unlocked: true,
            image: "equipment_6_rewinder.png",
          }),
        ],
      }),
    });

    const filtered = filterStateForPlayer(state, "player-1");
    expect(filtered.board.equipment[0].id).toBe("rewinder");
    expect(filtered.board.equipment[0].unlockValue).toBe(6);
  });

  it("preserves X marker flag for hidden and visible tiles", () => {
    const state = makeGameState({
      players: [
        makePlayer({
          id: "viewer",
          hand: [
            { id: "v1", color: "blue", gameValue: 2, sortValue: 2, image: "wire_2.png", cut: false, isXMarked: true },
          ],
        }),
        makePlayer({
          id: "other",
          hand: [
            { id: "o1", color: "blue", gameValue: 7, sortValue: 7, image: "wire_7.png", cut: false, isXMarked: true },
          ],
        }),
      ],
    });

    const filtered = filterStateForPlayer(state, "viewer");
    expect(filtered.players[0].hand[0].isXMarked).toBe(true);
    expect(filtered.players[1].hand[0]).toMatchObject({
      id: "o1",
      cut: false,
      isXMarked: true,
    });
    expect(filtered.players[1].hand[0].gameValue).toBeUndefined();
  });

  it("redacts mission-11 hidden blue-as-red setup log from client view", () => {
    const state = makeGameState({
      log: [
        {
          turn: 0,
          playerId: "system",
          action: "hookSetup",
          detail: "blue_as_red:7",
          timestamp: 1000,
        },
        {
          turn: 1,
          playerId: "p1",
          action: "dualCut",
          detail: "some public action",
          timestamp: 2000,
        },
      ],
    });
    const filtered = filterStateForPlayer(state, "player-1");
    expect(filtered.log).toHaveLength(1);
    expect(filtered.log[0].detail).toBe("some public action");
  });

  it("redacts mission-12 equipment lock number lists in client logs", () => {
    const state = makeGameState({
      log: [
        {
          turn: 0,
          playerId: "system",
          action: "hookSetup",
          detail: "equipment_double_lock:number_cards:3,8,11",
          timestamp: 1000,
        },
      ],
    });
    const filtered = filterStateForPlayer(state, "player-1");
    expect(filtered.log).toHaveLength(1);
    expect(filtered.log[0].detail).toBe("equipment_double_lock:number_cards:[redacted]");
  });

  it("redacts mission-15 number deck setup values in client logs", () => {
    const state = makeGameState({
      log: [
        {
          turn: 0,
          playerId: "system",
          action: "hookSetup",
          detail: "m15:number_deck:init:7",
          timestamp: 1000,
        },
      ],
    });
    const filtered = filterStateForPlayer(state, "player-1");
    expect(filtered.log).toHaveLength(1);
    expect(filtered.log[0].detail).toBe("m15:number_deck:init:[redacted]");
  });

  it("redacts mission-15 completion/next/skipped values in client logs", () => {
    const state = makeGameState({
      log: [
        {
          turn: 2,
          playerId: "p1",
          action: "hookEffect",
          detail:
            "m15:number_complete:4|revealed_equipment:rewinder|next:7|skipped:9,11",
          timestamp: 2000,
        },
      ],
    });
    const filtered = filterStateForPlayer(state, "player-1");
    expect(filtered.log).toHaveLength(1);
    expect(filtered.log[0].detail).toBe(
      "m15:number_complete:[redacted]|revealed_equipment:rewinder|next:[redacted]|skipped:[redacted]",
    );
  });

  it("keeps visible-number mission logs unchanged", () => {
    const state = makeGameState({
      log: [
        {
          turn: 0,
          playerId: "system",
          action: "hookSetup",
          detail: "m23:number_card:init:6",
          timestamp: 1000,
        },
      ],
    });
    const filtered = filterStateForPlayer(state, "player-1");
    expect(filtered.log).toHaveLength(1);
    expect(filtered.log[0].detail).toBe("m23:number_card:init:6");
  });

  it("preserves pending forced-action state for clients", () => {
    const state = makeGameState({
      pendingForcedAction: {
        kind: "chooseNextPlayer",
        captainId: "p1",
        lastPlayerId: "p2",
      },
    });

    const filtered = filterStateForPlayer(state, "player-1");
    expect(filtered.pendingForcedAction).toEqual({
      kind: "chooseNextPlayer",
      captainId: "p1",
      lastPlayerId: "p2",
    });
  });

  it("preserves timer deadline when mission timer is active", () => {
    const state = makeGameState({
      timerDeadline: 1_700_000_000_000,
    });

    const filtered = filterStateForPlayer(state, "player-1");
    expect(filtered.timerDeadline).toBe(1_700_000_000_000);
  });

  it("preserves constraints visibility for global and per-player entries", () => {
    const state = makeGameState({
      players: [
        makePlayer({ id: "p1", name: "Alice" }),
        makePlayer({ id: "p2", name: "Bob" }),
      ],
      campaign: makeCampaignState({
        constraints: makeConstraintCardState({
          global: [
            makeConstraintCard({
              id: "g1",
              name: "No 5",
              description: "Cannot cut 5",
              active: true,
            }),
          ],
          perPlayer: {
            p1: [
              makeConstraintCard({
                id: "p1c",
                name: "No Solo",
                description: "Cannot solo",
                active: true,
              }),
            ],
            p2: [
              makeConstraintCard({
                id: "p2c",
                name: "No 7",
                description: "Cannot say 7",
                active: false,
              }),
            ],
          },
        }),
      }),
    });

    const filtered = filterStateForPlayer(state, "p1");
    expect(filtered.campaign!.constraints).toEqual({
      global: [
        {
          id: "g1",
          name: "No 5",
          description: "Cannot cut 5",
          active: true,
        },
      ],
      perPlayer: {
        p1: [
          {
            id: "p1c",
            name: "No Solo",
            description: "Cannot solo",
            active: true,
          },
        ],
        p2: [
          {
            id: "p2c",
            name: "No 7",
            description: "Cannot say 7",
            active: false,
          },
        ],
      },
    });
  });

  it("preserves oxygen ownership map and bunker tracker", () => {
    const state = makeGameState({
      players: [
        makePlayer({ id: "p1", name: "Alice" }),
        makePlayer({ id: "p2", name: "Bob" }),
      ],
      campaign: makeCampaignState({
        oxygen: makeOxygenState({
          pool: 6,
          playerOxygen: { p1: 2, p2: 1 },
        }),
        bunkerTracker: makeProgressTracker({ position: 3, max: 9 }),
      }),
    });

    const filtered = filterStateForPlayer(state, "p1");
    expect(filtered.campaign!.oxygen).toEqual({
      pool: 6,
      playerOxygen: { p1: 2, p2: 1 },
    });
    expect(filtered.campaign!.bunkerTracker).toEqual({
      position: 3,
      max: 9,
    });
  });

  it("preserves visible/discard number cards and redacts only deck cards", () => {
    const state = makeGameState({
      campaign: makeCampaignState({
        numberCards: makeNumberCardState({
          deck: [makeNumberCard({ id: "d1", value: 10, faceUp: false })],
          discard: [makeNumberCard({ id: "dc1", value: 4, faceUp: true })],
          visible: [makeNumberCard({ id: "v1", value: 8, faceUp: true })],
        }),
      }),
    });

    const filtered = filterStateForPlayer(state, "player-1");
    expect(filtered.campaign!.numberCards!.deck[0]).toEqual({
      id: "d1",
      value: 0,
      faceUp: false,
    });
    expect(filtered.campaign!.numberCards!.discard[0]).toEqual({
      id: "dc1",
      value: 4,
      faceUp: true,
    });
    expect(filtered.campaign!.numberCards!.visible[0]).toEqual({
      id: "v1",
      value: 8,
      faceUp: true,
    });
  });

  it("preserves all special marker kinds for client mission hints", () => {
    const state = makeGameState({
      campaign: makeCampaignState({
        specialMarkers: [
          makeSpecialMarker({ kind: "x", value: 5 }),
          makeSpecialMarker({ kind: "sequence_pointer", value: 1 }),
          makeSpecialMarker({ kind: "action_pointer", value: 2 }),
        ],
      }),
    });

    const filtered = filterStateForPlayer(state, "player-1");
    expect(filtered.campaign!.specialMarkers).toEqual([
      { kind: "x", value: 5 },
      { kind: "sequence_pointer", value: 1 },
      { kind: "action_pointer", value: 2 },
    ]);
  });
});
