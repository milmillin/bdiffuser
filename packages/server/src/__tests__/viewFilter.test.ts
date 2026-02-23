import { describe, it, expect } from "vitest";
import {
  makeGameState,
  makePlayer,
  makeCampaignState,
  makeOxygenState,
  makeProgressTracker,
  makeSpecialMarker,
  makeNumberCardState,
  makeNumberCard,
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
    expect(filtered.campaign!.nanoTracker!.position).toBe(2);
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
});
