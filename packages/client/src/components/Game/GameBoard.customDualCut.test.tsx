import { describe, expect, it } from "vitest";
import { getUpdatedDualCutPendingActionForActorTile } from "./GameBoard.js";

describe("GameBoard dual cut actor selection helper", () => {
  it("keeps a custom announcement value when switching actor tiles", () => {
    const pendingAction = {
      kind: "dual_cut" as const,
      guessValue: 5,
      actorTileIndex: 0,
      targetPlayerId: "op",
      targetTileIndex: 0,
    };

  const nextAction = getUpdatedDualCutPendingActionForActorTile({
      pendingAction,
      tile: { gameValue: 8, color: "blue", cut: false },
      tileIndex: 1,
      preserveCustomGuess: true,
      isValueVisible: (value): value is number | "YELLOW" =>
        typeof value === "number" || value === "YELLOW",
    });

    expect(nextAction).toEqual({
      kind: "dual_cut",
      guessValue: 5,
      actorTileIndex: 1,
      targetPlayerId: "op",
      targetTileIndex: 0,
    });
  });

  it("recomputes announcement when value is not custom", () => {
    const pendingAction = {
      kind: "dual_cut" as const,
      guessValue: 5,
      actorTileIndex: 0,
      targetPlayerId: "op",
      targetTileIndex: 0,
    };

    const nextAction = getUpdatedDualCutPendingActionForActorTile({
      pendingAction,
      tile: { gameValue: 8, color: "blue", cut: false },
      tileIndex: 1,
      preserveCustomGuess: false,
      isValueVisible: (value): value is number | "YELLOW" =>
        typeof value === "number" || value === "YELLOW",
    });

    expect(nextAction).toEqual({
      kind: "dual_cut",
      guessValue: 8,
      actorTileIndex: 1,
      targetPlayerId: "op",
      targetTileIndex: 0,
    });
  });
});
