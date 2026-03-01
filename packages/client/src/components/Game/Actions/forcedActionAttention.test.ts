import { describe, expect, it } from "vitest";
import type { ClientGameState, GameState } from "@bomb-busters/shared";
import { makeGameState, makePlayer, makeTile } from "@bomb-busters/shared/testing";
import { deriveActionAttentionState } from "./forcedActionAttention.js";

function toClientGameState(state: GameState, playerId: string): ClientGameState {
  return {
    ...state,
    playerId,
    players: state.players.map((player) => ({
      ...player,
      remainingTiles: player.hand.filter((tile) => !tile.cut).length,
    })),
  } as unknown as ClientGameState;
}

describe("deriveActionAttentionState", () => {
  it("returns forced_actor when pending action targets local player", () => {
    const state = makeGameState({
      mission: 10,
      phase: "playing",
      players: [
        makePlayer({
          id: "captain",
          name: "Captain",
          isCaptain: true,
          hand: [makeTile({ id: "c1", gameValue: 2 })],
        }),
        makePlayer({
          id: "p2",
          name: "Buddy",
          hand: [makeTile({ id: "b1", gameValue: 5 })],
        }),
      ],
      currentPlayerIndex: 1,
      pendingForcedAction: {
        kind: "chooseNextPlayer",
        captainId: "captain",
      },
    });
    const clientState = toClientGameState(state, "captain");

    const attention = deriveActionAttentionState({
      gameState: clientState,
      playerId: "captain",
      revealRedsForcedNow: false,
    });

    expect(attention.state).toBe("forced_actor");
    expect(attention.forcedKind).toBe("chooseNextPlayer");
    expect(attention.forcedActorId).toBe("captain");
  });

  it("maps mission29HiddenNumberCard chooser as the forced actor", () => {
    const state = makeGameState({
      mission: 29,
      phase: "playing",
      players: [
        makePlayer({
          id: "actor",
          name: "Actor",
          hand: [makeTile({ id: "a1", gameValue: 4 })],
        }),
        makePlayer({
          id: "chooser",
          name: "Chooser",
          hand: [makeTile({ id: "c1", gameValue: 7 })],
        }),
      ],
      currentPlayerIndex: 0,
      pendingForcedAction: {
        kind: "mission29HiddenNumberCard",
        actorId: "actor",
        chooserId: "chooser",
      },
    });
    const clientState = toClientGameState(state, "chooser");

    const attention = deriveActionAttentionState({
      gameState: clientState,
      playerId: "chooser",
      revealRedsForcedNow: false,
    });

    expect(attention.state).toBe("forced_actor");
    expect(attention.forcedKind).toBe("mission29HiddenNumberCard");
    expect(attention.forcedActorId).toBe("chooser");
  });

  it("returns normal_waiting when reveal-reds condition exists but player cannot act now", () => {
    const state = makeGameState({
      mission: 1,
      phase: "playing",
      players: [
        makePlayer({
          id: "me",
          name: "Agent",
          hand: [makeTile({ id: "r1", color: "red", gameValue: "RED" })],
        }),
        makePlayer({
          id: "p2",
          name: "Buddy",
          hand: [makeTile({ id: "b1", gameValue: 5 })],
        }),
      ],
      currentPlayerIndex: 1,
    });
    const clientState = toClientGameState(state, "me");

    const attention = deriveActionAttentionState({
      gameState: clientState,
      playerId: "me",
      revealRedsForcedNow: false,
    });

    expect(attention.state).toBe("normal_waiting");
  });

  it("returns forced_reveal_reds only when actionable-now flag is true", () => {
    const state = makeGameState({
      mission: 1,
      phase: "playing",
      players: [
        makePlayer({
          id: "me",
          name: "Agent",
          hand: [makeTile({ id: "r1", color: "red", gameValue: "RED" })],
        }),
        makePlayer({
          id: "p2",
          name: "Buddy",
          hand: [makeTile({ id: "b1", gameValue: 5 })],
        }),
      ],
      currentPlayerIndex: 0,
    });
    const clientState = toClientGameState(state, "me");

    const attention = deriveActionAttentionState({
      gameState: clientState,
      playerId: "me",
      revealRedsForcedNow: true,
    });

    expect(attention.state).toBe("forced_reveal_reds");
    expect(attention.forcedActorId).toBe("me");
    expect(attention.forcedKind).toBe("revealRedsRequired");
  });
});
