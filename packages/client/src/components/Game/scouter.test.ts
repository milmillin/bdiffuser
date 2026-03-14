import { describe, expect, it } from "vitest";
import type { ClientGameState, ClientPlayer, VisibleTile } from "@bomb-busters/shared";
import {
  computeOpponentProbabilities,
  getTopProbabilities,
  getPositionBounds,
  type TileProbability,
} from "./scouter.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hidden(id = "h"): VisibleTile {
  return { id, cut: false };
}

function blue(value: number, cut = false, id = `b${value}`): VisibleTile {
  return { id, cut, color: "blue", gameValue: value, sortValue: value, image: `blue_${value}.png` };
}

function red(sortValue: number, cut = true, id = "r"): VisibleTile {
  return { id, cut, color: "red", gameValue: "RED", sortValue, image: "red.png" };
}

function yellow(sortValue: number, cut = true, id = "y"): VisibleTile {
  return { id, cut, color: "yellow", gameValue: "YELLOW", sortValue, image: "yellow.png" };
}

function makePlayer(id: string, hand: VisibleTile[]): ClientPlayer {
  return {
    id, name: id, character: null, isCaptain: false, hand,
    standSizes: [hand.length], infoTokens: [], characterUsed: false,
    connected: true, isBot: false,
    remainingTiles: hand.filter((t) => !t.cut).length,
  };
}

/** Always builds a 3-player game to avoid player-count restrictions. */
function makeGameState(
  players: ClientPlayer[],
  mission: number = 1,
): ClientGameState {
  const padded = [...players];
  while (padded.length < 3) {
    padded.push(makePlayer(`__pad${padded.length}`, []));
  }
  return {
    phase: "playing",
    roomId: "test",
    playerId: padded[0].id,
    isHost: false,
    players: padded,
    board: {
      detonatorPosition: 0,
      detonatorMax: 3,
      validationTrack: {},
      markers: [],
      equipment: [],
    },
    currentPlayerIndex: 0,
    turnNumber: 1,
    mission: mission as any,
    result: null,
    log: [],
    chat: [],
  };
}

function sumProbs(prob: TileProbability): number {
  let total = 0;
  for (const p of prob.blues.values()) total += p;
  total += prob.red;
  total += prob.yellow;
  return total;
}

// ---------------------------------------------------------------------------
// Mission configs used in tests:
// Mission 1 (3p): blue 1-6, no red, no yellow => 6 values × 4 = 24 blue tiles
// Mission 4 (3p): blue 1-12, 1 red, 2 yellow => 48 + 1 + 2 = 51 tiles
// ---------------------------------------------------------------------------

// ===========================================================================
// getPositionBounds
// ===========================================================================

describe("getPositionBounds", () => {
  it("returns (-Infinity, Infinity) when no visible neighbors", () => {
    const hand = [hidden("h0"), hidden("h1"), hidden("h2")];
    expect(getPositionBounds(hand, 1)).toEqual({ lower: -Infinity, upper: Infinity });
  });

  it("uses nearest visible tile below as lower bound", () => {
    const hand = [blue(3, true), hidden("h1")];
    expect(getPositionBounds(hand, 1)).toEqual({ lower: 3, upper: Infinity });
  });

  it("uses nearest visible tile above as upper bound", () => {
    const hand = [hidden("h0"), blue(5, true)];
    expect(getPositionBounds(hand, 0)).toEqual({ lower: -Infinity, upper: 5 });
  });

  it("uses both bounds when between two visible tiles", () => {
    const hand = [blue(3, true), hidden("h1"), blue(8, true)];
    expect(getPositionBounds(hand, 1)).toEqual({ lower: 3, upper: 8 });
  });

  it("skips hidden tiles to find nearest visible", () => {
    const hand = [blue(2, true), hidden("h1"), hidden("h2"), hidden("h3"), blue(9, true)];
    expect(getPositionBounds(hand, 2)).toEqual({ lower: 2, upper: 9 });
  });

  it("uses red sortValue as bound", () => {
    const hand = [red(5.5, true), hidden("h1")];
    expect(getPositionBounds(hand, 1)).toEqual({ lower: 5.5, upper: Infinity });
  });

  it("uses yellow sortValue as bound", () => {
    const hand = [hidden("h0"), yellow(3.1, true)];
    expect(getPositionBounds(hand, 0)).toEqual({ lower: -Infinity, upper: 3.1 });
  });

  it("first position with visible above", () => {
    const hand = [hidden("h0"), blue(5, true), hidden("h2")];
    expect(getPositionBounds(hand, 0)).toEqual({ lower: -Infinity, upper: 5 });
  });

  it("last position with visible below", () => {
    const hand = [hidden("h0"), blue(5, true), hidden("h2")];
    expect(getPositionBounds(hand, 2)).toEqual({ lower: 5, upper: Infinity });
  });

  it("uses uncut visible tile with sortValue (upside-down)", () => {
    const visibleUncut: VisibleTile = {
      id: "ud1", cut: false, color: "blue", gameValue: 5, sortValue: 5, image: "x",
    };
    const hand = [visibleUncut, hidden("h1")];
    expect(getPositionBounds(hand, 1)).toEqual({ lower: 5, upper: Infinity });
  });

  it("picks closest visible, not farthest", () => {
    const hand = [blue(1, true), blue(3, true), hidden("h2"), blue(7, true), blue(10, true)];
    expect(getPositionBounds(hand, 2)).toEqual({ lower: 3, upper: 7 });
  });
});

// ===========================================================================
// computeOpponentProbabilities — basic pool counting (no bounds impact)
// ===========================================================================

describe("computeOpponentProbabilities", () => {
  describe("basic probability calculation", () => {
    it("returns empty map when opponent has no hidden tiles", () => {
      const me = makePlayer("me", [blue(1), blue(2), blue(3)]);
      const opp = makePlayer("opp", [blue(4, true), blue(5, true)]);
      const state = makeGameState([me, opp]);

      const probs = computeOpponentProbabilities(state, opp);
      expect(probs.size).toBe(0);
    });

    it("returns probabilities for each hidden tile", () => {
      const me = makePlayer("me", [blue(1), blue(2), blue(3)]);
      const opp = makePlayer("opp", [hidden("h0"), hidden("h1"), hidden("h2")]);
      const state = makeGameState([me, opp]);

      const probs = computeOpponentProbabilities(state, opp);
      expect(probs.size).toBe(3);
      expect(probs.has(0)).toBe(true);
      expect(probs.has(1)).toBe(true);
      expect(probs.has(2)).toBe(true);
    });

    it("probabilities sum to 1 for each hidden tile", () => {
      const me = makePlayer("me", [blue(1), blue(2), blue(3)]);
      const opp = makePlayer("opp", [hidden("h0"), hidden("h1")]);
      const state = makeGameState([me, opp]);

      const probs = computeOpponentProbabilities(state, opp);
      for (const [, prob] of probs) {
        expect(sumProbs(prob)).toBeCloseTo(1.0, 10);
      }
    });

    it("hidden tiles with no bounds get same marginal distribution", () => {
      const me = makePlayer("me", [blue(1), blue(2)]);
      const opp = makePlayer("opp", [hidden("h0"), hidden("h1"), hidden("h2")]);
      const state = makeGameState([me, opp]);

      const probs = computeOpponentProbabilities(state, opp);
      const p0 = probs.get(0)!;
      const p1 = probs.get(1)!;
      const p2 = probs.get(2)!;

      for (let v = 1; v <= 6; v++) {
        expect(p0.blues.get(v)).toBe(p1.blues.get(v));
        expect(p1.blues.get(v)).toBe(p2.blues.get(v));
      }
    });
  });

  describe("visible tile subtraction", () => {
    it("subtracts own visible tiles from the pool", () => {
      // Mission 1 (3p): blue 1-6, 4 copies each = 24 total.
      // Me holds three 1s → 1 copy of value-1 remains.
      const me = makePlayer("me", [blue(1, false, "b1a"), blue(1, false, "b1b"), blue(1, false, "b1c")]);
      const opp = makePlayer("opp", [hidden()]);
      const state = makeGameState([me, opp]);

      const prob = computeOpponentProbabilities(state, opp).get(0)!;

      // Remaining: 24 - 3 = 21
      expect(prob.blues.get(1)).toBeCloseTo(1 / 21, 10);
      expect(prob.blues.get(2)).toBeCloseTo(4 / 21, 10);
      expect(sumProbs(prob)).toBeCloseTo(1.0, 10);
    });

    it("removes a value entirely when all 4 copies are visible", () => {
      const me = makePlayer("me", [
        blue(3, false, "b3a"), blue(3, false, "b3b"),
        blue(3, false, "b3c"), blue(3, false, "b3d"),
      ]);
      const opp = makePlayer("opp", [hidden()]);
      const state = makeGameState([me, opp]);

      const prob = computeOpponentProbabilities(state, opp).get(0)!;

      expect(prob.blues.has(3)).toBe(false);
      // Remaining: 24 - 4 = 20. 5 values with 4 copies each.
      expect(prob.blues.get(1)).toBeCloseTo(4 / 20, 10);
      expect(sumProbs(prob)).toBeCloseTo(1.0, 10);
    });

    it("counts cut tiles from other players as visible", () => {
      // Cut tile on opp2 reduces pool for opp1
      const me = makePlayer("me", [blue(1)]);
      const opp1 = makePlayer("opp1", [hidden("h0")]);
      const opp2 = makePlayer("opp2", [blue(3, true, "cut3"), hidden("h1")]);
      const state = makeGameState([me, opp1, opp2]);

      const prob = computeOpponentProbabilities(state, opp1).get(0)!;

      // Visible: 1×val-1, 1×val-3. Remaining = 24 - 2 = 22.
      expect(prob.blues.get(1)).toBeCloseTo(3 / 22, 10);
      expect(prob.blues.get(3)).toBeCloseTo(3 / 22, 10);
      expect(prob.blues.get(5)).toBeCloseTo(4 / 22, 10);
      expect(sumProbs(prob)).toBeCloseTo(1.0, 10);
    });

    it("counts cut tiles from multiple opponents", () => {
      const me = makePlayer("me", [blue(1)]);
      const opp1 = makePlayer("opp1", [hidden("h0")]);
      const opp2 = makePlayer("opp2", [blue(2, true, "cut2a")]);
      const opp3 = makePlayer("opp3", [blue(2, true, "cut2b")]);
      const state = makeGameState([me, opp1, opp2, opp3]);

      const prob = computeOpponentProbabilities(state, opp1).get(0)!;

      // Visible: 1×val-1, 2×val-2. Remaining = 24 - 3 = 21.
      expect(prob.blues.get(1)).toBeCloseTo(3 / 21, 10);
      expect(prob.blues.get(2)).toBeCloseTo(2 / 21, 10);
      expect(sumProbs(prob)).toBeCloseTo(1.0, 10);
    });
  });

  describe("red and yellow tiles", () => {
    it("includes red and yellow probability for mission 4", () => {
      // Mission 4 (3p): blue 1-12, 1 red, 2 yellow = 51 total
      const me = makePlayer("me", [blue(1), blue(2), blue(3)]);
      const opp = makePlayer("opp", [hidden("h0"), hidden("h1")]);
      const state = makeGameState([me, opp], 4);

      const prob = computeOpponentProbabilities(state, opp).get(0)!;

      // Visible: 3 blue. Remaining: 51 - 3 = 48.
      expect(prob.red).toBeCloseTo(1 / 48, 10);
      expect(prob.yellow).toBeCloseTo(2 / 48, 10);
      expect(prob.blues.get(1)).toBeCloseTo(3 / 48, 10); // 4-1=3
      expect(prob.blues.get(4)).toBeCloseTo(4 / 48, 10); // untouched
      expect(sumProbs(prob)).toBeCloseTo(1.0, 10);
    });

    it("red probability drops to 0 when all reds are visible", () => {
      // Mission 4 (3p): 1 red tile. Put the red on a different player.
      const me = makePlayer("me", [
        { id: "r1", cut: false, color: "red" as const, gameValue: "RED" as const, sortValue: 1.5, image: "r.png" },
      ]);
      const opp = makePlayer("opp", [hidden("h0")]);
      const state = makeGameState([me, opp], 4);

      const prob = computeOpponentProbabilities(state, opp).get(0)!;
      expect(prob.red).toBe(0);
      expect(prob.yellow).toBeGreaterThan(0);
      expect(sumProbs(prob)).toBeCloseTo(1.0, 10);
    });

    it("yellow probability drops to 0 when all yellows are visible", () => {
      // Mission 4 (3p): 2 yellow tiles. Put both on me.
      const me = makePlayer("me", [
        { id: "y1", cut: false, color: "yellow" as const, gameValue: "YELLOW" as const, sortValue: 1.1, image: "y.png" },
        { id: "y2", cut: false, color: "yellow" as const, gameValue: "YELLOW" as const, sortValue: 2.1, image: "y.png" },
      ]);
      const opp = makePlayer("opp", [hidden("h0")]);
      const state = makeGameState([me, opp], 4);

      const prob = computeOpponentProbabilities(state, opp).get(0)!;
      expect(prob.yellow).toBe(0);
      expect(prob.red).toBeGreaterThan(0);
      expect(sumProbs(prob)).toBeCloseTo(1.0, 10);
    });

    it("handles missions with both red and yellow (mission 6)", () => {
      // Mission 6 (3p): blue 1-12, 1 red, 4 yellow = 53 total
      const me = makePlayer("me", [blue(1)]);
      const opp = makePlayer("opp", [hidden()]);
      const state = makeGameState([me, opp], 6);

      const prob = computeOpponentProbabilities(state, opp).get(0)!;

      // Remaining: 53 - 1 = 52
      expect(prob.red).toBeCloseTo(1 / 52, 10);
      expect(prob.yellow).toBeCloseTo(4 / 52, 10);
      expect(prob.blues.get(1)).toBeCloseTo(3 / 52, 10);
      expect(sumProbs(prob)).toBeCloseTo(1.0, 10);
    });
  });

  describe("blue-only missions", () => {
    it("returns zero for red and yellow on mission 1", () => {
      const me = makePlayer("me", [blue(1)]);
      const opp = makePlayer("opp", [hidden()]);
      const state = makeGameState([me, opp], 1);

      const prob = computeOpponentProbabilities(state, opp).get(0)!;
      expect(prob.red).toBe(0);
      expect(prob.yellow).toBe(0);
      expect(prob.blues.size).toBe(6);
    });

    it("uses correct blue range from mission config", () => {
      const me = makePlayer("me", [blue(1)]);
      const opp = makePlayer("opp", [hidden()]);
      const state = makeGameState([me, opp], 1);

      const prob = computeOpponentProbabilities(state, opp).get(0)!;
      expect(prob.blues.has(7)).toBe(false);
      expect(prob.blues.has(12)).toBe(false);
      expect(prob.blues.has(6)).toBe(true);
    });
  });

  describe("skipping visible/cut tiles on opponent stand", () => {
    it("skips cut tiles — no probabilities for them", () => {
      const me = makePlayer("me", [blue(1)]);
      const opp = makePlayer("opp", [
        blue(3, true, "cut3"),  // index 0: cut
        hidden("h1"),           // index 1: hidden
        blue(5, true, "cut5"),  // index 2: cut
      ]);
      const state = makeGameState([me, opp]);

      const probs = computeOpponentProbabilities(state, opp);
      expect(probs.has(0)).toBe(false);
      expect(probs.has(1)).toBe(true);
      expect(probs.has(2)).toBe(false);
    });

    it("skips tiles with color set (upside-down visible to viewer)", () => {
      // Put the visible uncut tile on a different player to avoid bounds impact
      const visible5: VisibleTile = {
        id: "ud1", cut: false, color: "blue", gameValue: 5, sortValue: 5, image: "blue_5.png",
      };
      const me = makePlayer("me", [blue(1)]);
      const playerWithVisible = makePlayer("vis", [visible5]);
      const opp = makePlayer("opp", [hidden("h0")]);
      const state = makeGameState([me, playerWithVisible, opp]);

      const probs = computeOpponentProbabilities(state, opp);
      expect(probs.has(0)).toBe(true);

      const prob = probs.get(0)!;
      // Visible: 1×val-1 (me), 1×val-5 (upside-down). Remaining = 24 - 2 = 22
      expect(prob.blues.get(1)).toBeCloseTo(3 / 22, 10);
      expect(prob.blues.get(5)).toBeCloseTo(3 / 22, 10);
    });
  });

  describe("edge cases", () => {
    it("returns empty map for opponent with empty hand", () => {
      const me = makePlayer("me", [blue(1)]);
      const opp = makePlayer("opp", []);
      const state = makeGameState([me, opp]);

      expect(computeOpponentProbabilities(state, opp).size).toBe(0);
    });

    it("handles single hidden tile correctly", () => {
      const me = makePlayer("me", [blue(1)]);
      const opp = makePlayer("opp", [hidden()]);
      const state = makeGameState([me, opp]);

      const probs = computeOpponentProbabilities(state, opp);
      expect(probs.size).toBe(1);
      expect(sumProbs(probs.get(0)!)).toBeCloseTo(1.0, 10);
    });

    it("returns uniform distribution when nothing is visible", () => {
      const me = makePlayer("me", [hidden("mh0"), hidden("mh1")]);
      const opp = makePlayer("opp", [hidden("h0")]);
      const state = makeGameState([me, opp]);

      const prob = computeOpponentProbabilities(state, opp).get(0)!;

      // Mission 1 (3p): 24 blue tiles, 6 values, 4 each → 4/24 = 1/6
      for (let v = 1; v <= 6; v++) {
        expect(prob.blues.get(v)).toBeCloseTo(4 / 24, 10);
      }
    });

    it("handles when all copies of multiple values are visible", () => {
      const me = makePlayer("me", [
        blue(1, false, "b1a"), blue(1, false, "b1b"),
        blue(1, false, "b1c"), blue(1, false, "b1d"),
        blue(2, false, "b2a"), blue(2, false, "b2b"),
        blue(2, false, "b2c"), blue(2, false, "b2d"),
      ]);
      const opp = makePlayer("opp", [hidden()]);
      const state = makeGameState([me, opp]);

      const prob = computeOpponentProbabilities(state, opp).get(0)!;

      expect(prob.blues.has(1)).toBe(false);
      expect(prob.blues.has(2)).toBe(false);
      expect(prob.blues.get(3)).toBeCloseTo(4 / 16, 10);
      expect(sumProbs(prob)).toBeCloseTo(1.0, 10);
    });

    it("handles all tiles accounted for (totalRemaining = 0)", () => {
      const allTiles: VisibleTile[] = [];
      for (let v = 1; v <= 6; v++) {
        for (let c = 0; c < 4; c++) {
          allTiles.push(blue(v, false, `b${v}_${c}`));
        }
      }
      const me = makePlayer("me", allTiles);
      const opp = makePlayer("opp", [hidden()]);
      const state = makeGameState([me, opp]);

      const probs = computeOpponentProbabilities(state, opp);
      expect(probs.size).toBe(0);
    });
  });

  // =========================================================================
  // Sort-aware filtering
  // =========================================================================

  describe("sort-aware filtering", () => {
    it("restricts values to those above lower bound", () => {
      // Sorted: [blue(3,true), hidden] → hidden must have sortValue > 3
      const me = makePlayer("me", []);
      const opp = makePlayer("opp", [blue(3, true, "cut3"), hidden("h1")]);
      const state = makeGameState([me, opp]);

      const prob = computeOpponentProbabilities(state, opp).get(1)!;

      expect(prob.blues.has(1)).toBe(false);
      expect(prob.blues.has(2)).toBe(false);
      expect(prob.blues.has(3)).toBe(false);
      expect(prob.blues.has(4)).toBe(true);
      expect(prob.blues.has(5)).toBe(true);
      expect(prob.blues.has(6)).toBe(true);
      expect(sumProbs(prob)).toBeCloseTo(1.0, 10);
    });

    it("restricts values to those below upper bound", () => {
      // Sorted: [hidden, blue(4,true)] → hidden must have sortValue < 4
      const me = makePlayer("me", []);
      const opp = makePlayer("opp", [hidden("h0"), blue(4, true, "cut4")]);
      const state = makeGameState([me, opp]);

      const prob = computeOpponentProbabilities(state, opp).get(0)!;

      expect(prob.blues.has(1)).toBe(true);
      expect(prob.blues.has(2)).toBe(true);
      expect(prob.blues.has(3)).toBe(true);
      expect(prob.blues.has(4)).toBe(false);
      expect(prob.blues.has(5)).toBe(false);
      expect(prob.blues.has(6)).toBe(false);
      expect(sumProbs(prob)).toBeCloseTo(1.0, 10);
    });

    it("restricts values to those within both bounds", () => {
      // Sorted: [blue(2,true), hidden, blue(5,true)]
      const me = makePlayer("me", []);
      const opp = makePlayer("opp", [blue(2, true, "cut2"), hidden("h1"), blue(5, true, "cut5")]);
      const state = makeGameState([me, opp]);

      const prob = computeOpponentProbabilities(state, opp).get(1)!;

      // sortValue must be in (2, 5): only blue 3, 4
      expect(prob.blues.has(1)).toBe(false);
      expect(prob.blues.has(2)).toBe(false);
      expect(prob.blues.has(3)).toBe(true);
      expect(prob.blues.has(4)).toBe(true);
      expect(prob.blues.has(5)).toBe(false);
      expect(prob.blues.has(6)).toBe(false);
      expect(sumProbs(prob)).toBeCloseTo(1.0, 10);
    });

    it("computes correct probabilities with bounds + pool subtraction", () => {
      // Me: [blue(3)] → 3 copies of val-3 remain
      // Opp: [blue(2,true), hidden, blue(5,true)]
      // Hidden bounds (2, 5) → eligible: blue 3 (3 left), blue 4 (4 left) = 7 total
      const me = makePlayer("me", [blue(3)]);
      const opp = makePlayer("opp", [blue(2, true, "cut2"), hidden("h1"), blue(5, true, "cut5")]);
      const state = makeGameState([me, opp]);

      const prob = computeOpponentProbabilities(state, opp).get(1)!;

      expect(prob.blues.get(3)).toBeCloseTo(3 / 7, 10);
      expect(prob.blues.get(4)).toBeCloseTo(4 / 7, 10);
      expect(sumProbs(prob)).toBeCloseTo(1.0, 10);
    });

    it("multiple hidden tiles between same bounds get same filtered pool", () => {
      // Sorted: [blue(2,true), hidden, hidden, blue(6,true)]
      const me = makePlayer("me", []);
      const opp = makePlayer("opp", [
        blue(2, true, "cut2"), hidden("h1"), hidden("h2"), blue(6, true, "cut6"),
      ]);
      const state = makeGameState([me, opp]);

      const prob1 = computeOpponentProbabilities(state, opp).get(1)!;
      const prob2 = computeOpponentProbabilities(state, opp).get(2)!;

      // Both bounded by (2, 6): eligible blue 3, 4, 5
      for (let v = 1; v <= 6; v++) {
        expect(prob1.blues.get(v)).toBe(prob2.blues.get(v));
      }
      expect(prob1.blues.has(3)).toBe(true);
      expect(prob1.blues.has(4)).toBe(true);
      expect(prob1.blues.has(5)).toBe(true);
      expect(prob1.blues.has(1)).toBe(false);
      expect(prob1.blues.has(6)).toBe(false);
    });

    it("different positions get different bounds from adjacent cut tiles", () => {
      // Sorted: [hidden, blue(3,true), hidden, blue(6,true), hidden]
      const me = makePlayer("me", []);
      const opp = makePlayer("opp", [
        hidden("h0"), blue(3, true, "cut3"), hidden("h2"), blue(6, true, "cut6"), hidden("h4"),
      ]);
      const state = makeGameState([me, opp]);

      const p0 = computeOpponentProbabilities(state, opp).get(0)!;
      const p2 = computeOpponentProbabilities(state, opp).get(2)!;
      const p4 = computeOpponentProbabilities(state, opp).get(4)!;

      // Position 0: bounds (-∞, 3) → blue 1, 2
      expect(p0.blues.has(1)).toBe(true);
      expect(p0.blues.has(2)).toBe(true);
      expect(p0.blues.has(3)).toBe(false);

      // Position 2: bounds (3, 6) → blue 4, 5
      expect(p2.blues.has(3)).toBe(false);
      expect(p2.blues.has(4)).toBe(true);
      expect(p2.blues.has(5)).toBe(true);
      expect(p2.blues.has(6)).toBe(false);

      // Position 4: bounds (6, +∞) → blue 6 is NOT eligible (sortValue 6 not > 6)
      // Mission 1 goes up to blue 6. So nothing is eligible → no entry.
      expect(computeOpponentProbabilities(state, opp).has(4)).toBe(false);
    });

    it("bounds with only one blue value possible → 100% probability", () => {
      // Sorted: [blue(3,true), hidden, blue(5,true)]
      // Bounds (3, 5): only blue 4
      const me = makePlayer("me", []);
      const opp = makePlayer("opp", [blue(3, true, "cut3"), hidden("h1"), blue(5, true, "cut5")]);
      const state = makeGameState([me, opp]);

      const prob = computeOpponentProbabilities(state, opp).get(1)!;

      expect(prob.blues.get(4)).toBeCloseTo(1.0, 10);
      expect(prob.blues.size).toBe(1);
    });

    it("bounds eliminate all values → no entry for that position", () => {
      // Sorted: [blue(4,true), hidden, blue(5,true)]
      // Bounds (4, 5): no integer sortValues. Mission 1 has no red/yellow.
      const me = makePlayer("me", []);
      const opp = makePlayer("opp", [blue(4, true, "cut4"), hidden("h1"), blue(5, true, "cut5")]);
      const state = makeGameState([me, opp]);

      const probs = computeOpponentProbabilities(state, opp);
      expect(probs.has(1)).toBe(false);
    });

    it("no cut tiles on opponent → unbounded (same as naive)", () => {
      const me = makePlayer("me", [blue(1)]);
      const opp = makePlayer("opp", [hidden("h0"), hidden("h1"), hidden("h2")]);
      const state = makeGameState([me, opp]);

      const prob = computeOpponentProbabilities(state, opp).get(0)!;

      // All 6 values present (mission 1)
      for (let v = 1; v <= 6; v++) {
        expect(prob.blues.has(v)).toBe(true);
      }
    });
  });

  // =========================================================================
  // Sort-aware red/yellow candidate filtering
  // =========================================================================

  describe("sort-aware red/yellow", () => {
    it("red/yellow with sortValues in bounds are included", () => {
      // Mission 4: blue 1-12, 1 red, 2 yellow
      // Sorted: [blue(4,true), hidden, blue(6,true)]
      // Bounds (4, 6): blue 5, red candidates {4.5, 5.5}, yellow candidates {4.1, 5.1}
      const me = makePlayer("me", []);
      const opp = makePlayer("opp", [blue(4, true, "cut4"), hidden("h1"), blue(6, true, "cut6")]);
      const state = makeGameState([me, opp], 4);

      const prob = computeOpponentProbabilities(state, opp).get(1)!;

      expect(prob.blues.has(5)).toBe(true);
      expect(prob.blues.has(4)).toBe(false);
      expect(prob.blues.has(6)).toBe(false);
      expect(prob.red).toBeGreaterThan(0);
      expect(prob.yellow).toBeGreaterThan(0);
      expect(sumProbs(prob)).toBeCloseTo(1.0, 10);
    });

    it("red candidates fully excluded by upper bound", () => {
      // Mission 4: Sorted: [hidden, blue(1,true)]
      // Bounds (-∞, 1): no blue/red/yellow with sortValue < 1 → no entry
      const me = makePlayer("me", []);
      const opp = makePlayer("opp", [hidden("h0"), blue(1, true, "cut1")]);
      const state = makeGameState([me, opp], 4);

      const probs = computeOpponentProbabilities(state, opp);
      expect(probs.has(0)).toBe(false);
    });

    it("yellow allowed but red excluded by tight bounds", () => {
      // Mission 4: Sorted: [blue(1,true), hidden, blue(2,true)]
      // Bounds (1, 2): no integer blues. Red candidates in (1,2) = {1.5}. Yellow in (1,2) = {1.1}.
      const me = makePlayer("me", []);
      const opp = makePlayer("opp", [blue(1, true, "cut1"), hidden("h1"), blue(2, true, "cut2")]);
      const state = makeGameState([me, opp], 4);

      const prob = computeOpponentProbabilities(state, opp).get(1)!;

      expect(prob.blues.size).toBe(0);
      // Red: 1 remaining, candidates in (1,2) = {1.5}, 1/11 of all candidates
      expect(prob.red).toBeGreaterThan(0);
      // Yellow: 2 remaining, candidates in (1,2) = {1.1}, 1/11 of all candidates
      expect(prob.yellow).toBeGreaterThan(0);
      expect(sumProbs(prob)).toBeCloseTo(1.0, 10);
    });

    it("exact red/yellow weights with bounded candidates", () => {
      // Mission 4: blue 1-12, 1 red, 2 yellow
      // Sorted: [blue(6,true), hidden]
      // Bounds (6, +∞)
      const me = makePlayer("me", []);
      const opp = makePlayer("opp", [blue(6, true, "cut6"), hidden("h1")]);
      const state = makeGameState([me, opp], 4);

      const prob = computeOpponentProbabilities(state, opp).get(1)!;

      // Blue 7-12: 6 values × 4 copies = 24 eligible blues (blue 6 was cut → 3 remaining, but excluded)
      // Red: 1 remaining. Candidates in (6, +∞) = {6.5,7.5,8.5,9.5,10.5,11.5} = 6 of 11.
      //   Weight = 1 × 6/11
      // Yellow: 2 remaining. Candidates in (6, +∞) = {6.1,7.1,8.1,9.1,10.1,11.1} = 6 of 11.
      //   Weight = 2 × 6/11 = 12/11
      const total = 24 + 6 / 11 + 12 / 11;
      expect(prob.blues.get(7)).toBeCloseTo(4 / total, 10);
      expect(prob.red).toBeCloseTo(6 / 11 / total, 10);
      expect(prob.yellow).toBeCloseTo(12 / 11 / total, 10);
      expect(sumProbs(prob)).toBeCloseTo(1.0, 10);
    });

    it("observed red sortValue narrows unobserved candidate pool", () => {
      // Mission 4: 2 yellow. One yellow cut on another player with sortValue 3.1.
      // Opp: [blue(5,true), hidden]
      // Bounds (5, +∞)
      // Remaining yellow: 1. Observed yellow sortValues: {3.1}.
      // Unobserved yellow candidates: 11 - 1 = 10 values.
      // Eligible yellow candidates in (5, +∞): {5.1,6.1,...,11.1} = 7 of 10.
      // Weight = 1 × 7/10
      const me = makePlayer("me", []);
      const playerWithCutYellow = makePlayer("vis", [yellow(3.1, true, "cy")]);
      const opp = makePlayer("opp", [blue(5, true, "cut5"), hidden("h1")]);
      const state = makeGameState([me, playerWithCutYellow, opp], 4);

      const prob = computeOpponentProbabilities(state, opp).get(1)!;

      // Blue 6-12: 7 values × 4 = 28. Blue 5 was cut → 3 remaining but excluded.
      // Red: 1 remaining, no observed red sortValues, candidates in (5,+∞) = {5.5,...,11.5} = 7 of 11.
      //   Weight = 7/11
      // Yellow: 1 remaining, unobserved candidates = 10, eligible in (5,+∞) = 7.
      //   Weight = 1 × 7/10
      const total = 28 + 7 / 11 + 7 / 10;
      expect(prob.yellow).toBeCloseTo(7 / 10 / total, 10);
      expect(prob.red).toBeCloseTo(7 / 11 / total, 10);
      expect(prob.blues.get(6)).toBeCloseTo(4 / total, 10);
      expect(sumProbs(prob)).toBeCloseTo(1.0, 10);
    });

    it("observed red sortValue fully eliminates remaining red candidates in range", () => {
      // Mission 4: 1 red. No reds remaining after one is visible.
      // But the red is on me, so opp's remaining reds = 0.
      const me = makePlayer("me", [red(5.5, false, "my_red")]);
      const opp = makePlayer("opp", [blue(5, true, "cut5"), hidden("h1")]);
      const state = makeGameState([me, opp], 4);

      const prob = computeOpponentProbabilities(state, opp).get(1)!;
      expect(prob.red).toBe(0);
    });

    it("red excluded from position below smallest red sortValue candidate", () => {
      // Mission 4: Sorted: [hidden, blue(1, true)]
      // Hidden at position 0: bounds (-∞, 1).
      // No blue < 1. No red candidates < 1 (smallest 1.5). No yellow < 1 (smallest 1.1).
      // Nothing fits → no entry.
      const me = makePlayer("me", []);
      const opp = makePlayer("opp", [hidden("h0"), blue(1, true, "cut1")]);
      const state = makeGameState([me, opp], 4);

      const probs = computeOpponentProbabilities(state, opp);
      expect(probs.has(0)).toBe(false);
    });

    it("properly sorted hand with interleaved colors", () => {
      // Mission 4: Sorted hand: [blue(1,true), yellow(1.1,true), red(3.5,true), blue(5,true), hidden]
      // SortValues: 1, 1.1, 3.5, 5, ?
      // Hidden at index 4: lower = 5, upper = +∞
      const me = makePlayer("me", []);
      const opp = makePlayer("opp", [
        blue(1, true, "cut1"),
        yellow(1.1, true, "cuty"),
        red(3.5, true, "cutr"),
        blue(5, true, "cut5"),
        hidden("h4"),
      ]);
      const state = makeGameState([me, opp], 4);

      const prob = computeOpponentProbabilities(state, opp).get(4)!;

      // Bounds (5, +∞): blue 6-12 eligible
      expect(prob.blues.has(5)).toBe(false);
      expect(prob.blues.has(6)).toBe(true);
      expect(prob.blues.has(12)).toBe(true);
      // Red: all cut (1 red total) → 0 remaining
      expect(prob.red).toBe(0);
      // Yellow: 2 - 1 = 1 remaining. Observed = {1.1}. Unobserved = 10.
      // Eligible in (5, +∞): {5.1, 6.1, ..., 11.1} = 7 of 10.
      expect(prob.yellow).toBeGreaterThan(0);
      expect(sumProbs(prob)).toBeCloseTo(1.0, 10);
    });

    it("hidden tile between red and blue bounds", () => {
      // Mission 4: Sorted: [red(3.5,true), hidden, blue(6,true)]
      // Bounds (3.5, 6): blue 4, 5 eligible
      const me = makePlayer("me", []);
      const opp = makePlayer("opp", [red(3.5, true, "cutr"), hidden("h1"), blue(6, true, "cut6")]);
      const state = makeGameState([me, opp], 4);

      const prob = computeOpponentProbabilities(state, opp).get(1)!;

      expect(prob.blues.has(3)).toBe(false); // sortValue 3 < 3.5
      expect(prob.blues.has(4)).toBe(true);  // sortValue 4 in (3.5, 6)
      expect(prob.blues.has(5)).toBe(true);  // sortValue 5 in (3.5, 6)
      expect(prob.blues.has(6)).toBe(false); // sortValue 6 not < 6
      // Red: 1 total - 1 cut = 0 remaining
      expect(prob.red).toBe(0);
      // Yellow: 2 remaining. Candidates in (3.5, 6) = {4.1, 5.1} = 2 of 11.
      expect(prob.yellow).toBeGreaterThan(0);
      expect(sumProbs(prob)).toBeCloseTo(1.0, 10);
    });
  });

  // =========================================================================
  // Combined pool + sort scenarios
  // =========================================================================

  describe("combined pool subtraction and sort filtering", () => {
    it("pool subtraction + bounds together", () => {
      // Mission 1: blue 1-6. Me: [blue(4), blue(4, false, "b4b")]
      // Opp: [blue(3, true, "cut3"), hidden, blue(6, true, "cut6")]
      // Hidden bounds (3, 6): blue 4 (2 remaining), blue 5 (4 remaining)
      const me = makePlayer("me", [blue(4, false, "b4a"), blue(4, false, "b4b")]);
      const opp = makePlayer("opp", [blue(3, true, "cut3"), hidden("h1"), blue(6, true, "cut6")]);
      const state = makeGameState([me, opp]);

      const prob = computeOpponentProbabilities(state, opp).get(1)!;

      // Visible: 2×val-4, 1×val-3, 1×val-6. Pool: val-3: 3, val-4: 2, val-5: 4, val-6: 3. Others: 4.
      // Eligible (3,6): val-4 (2), val-5 (4) = 6 total
      expect(prob.blues.get(4)).toBeCloseTo(2 / 6, 10);
      expect(prob.blues.get(5)).toBeCloseTo(4 / 6, 10);
      expect(prob.blues.size).toBe(2);
      expect(sumProbs(prob)).toBeCloseTo(1.0, 10);
    });

    it("all remaining copies of eligible value visible → no entry", () => {
      // Mission 1: All 4 copies of blue-4 visible.
      // Opp: [blue(3,true), hidden, blue(5,true)] → bounds (3, 5) → only blue 4 eligible
      // But blue 4 has 0 remaining → no entry
      const me = makePlayer("me", [
        blue(4, false, "b4a"), blue(4, false, "b4b"),
        blue(4, false, "b4c"), blue(4, false, "b4d"),
      ]);
      const opp = makePlayer("opp", [blue(3, true, "cut3"), hidden("h1"), blue(5, true, "cut5")]);
      const state = makeGameState([me, opp]);

      const probs = computeOpponentProbabilities(state, opp);
      expect(probs.has(1)).toBe(false);
    });

    it("heavy cuts with bounds on mission 4", () => {
      // Mission 4: blue 1-12, 1 red, 2 yellow = 51 total
      // Me: [blue(3), blue(4)]
      // Other player: all val-1 and val-2 cut + red + yellow
      // Opp: [blue(5,true), hidden, blue(10,true)]
      const me = makePlayer("me", [blue(3), blue(4)]);
      const cutsPlayer = makePlayer("cuts", [
        blue(1, true, "c1a"), blue(1, true, "c1b"), blue(1, true, "c1c"), blue(1, true, "c1d"),
        blue(2, true, "c2a"), blue(2, true, "c2b"), blue(2, true, "c2c"), blue(2, true, "c2d"),
        red(1.5, true, "cr"),
        yellow(1.1, true, "cy"),
      ]);
      const opp = makePlayer("opp", [blue(5, true, "cut5"), hidden("h1"), blue(10, true, "cut10")]);
      const state = makeGameState([me, cutsPlayer, opp], 4);

      const prob = computeOpponentProbabilities(state, opp).get(1)!;

      // Visible: 4×1 + 4×2 + 1×3 + 1×4 + 1×5 + 1×10 + 1red + 1yellow = 14
      // Remaining: 51 - 14 = 37
      // Bounds (5, 10): blue 6,7,8,9 eligible (4 each = 16)
      // val-5: 3 remaining but excluded (sortValue 5 not > 5)
      // val-10: 3 remaining but excluded (sortValue 10 not < 10)
      // Red: 0 remaining
      // Yellow: 1 remaining. Observed = {1.1}. Unobserved = 10.
      //   Candidates in (5,10): {5.1,6.1,7.1,8.1,9.1} = 5 of 10. Weight = 1 × 5/10 = 0.5
      const total = 16 + 0.5;
      expect(prob.blues.get(6)).toBeCloseTo(4 / total, 10);
      expect(prob.blues.get(9)).toBeCloseTo(4 / total, 10);
      expect(prob.blues.has(5)).toBe(false);
      expect(prob.blues.has(10)).toBe(false);
      expect(prob.red).toBe(0);
      expect(prob.yellow).toBeCloseTo(0.5 / total, 10);
      expect(sumProbs(prob)).toBeCloseTo(1.0, 10);
    });
  });

  // =========================================================================
  // First-principles: mathematical correctness
  // =========================================================================

  describe("first-principles: uniform distribution without constraints", () => {
    it("mission 1 (3p): 6 values × 4 copies = 24 tiles, uniform 1/6 each", () => {
      // No visible tiles → each value equally likely
      const me = makePlayer("me", [hidden("mh0")]);
      const opp = makePlayer("opp", [hidden("h0")]);
      const state = makeGameState([me, opp], 1);

      const prob = computeOpponentProbabilities(state, opp).get(0)!;

      // 24 tiles total, 6 values, 4 each → P(v) = 4/24 = 1/6
      for (let v = 1; v <= 6; v++) {
        expect(prob.blues.get(v)).toBeCloseTo(1 / 6, 10);
      }
      expect(prob.red).toBe(0);
      expect(prob.yellow).toBe(0);
      expect(sumProbs(prob)).toBeCloseTo(1.0, 10);
    });

    it("mission 4 (3p): 12 values × 4 + 1R + 2Y = 51, correct uniform", () => {
      const me = makePlayer("me", [hidden("mh0")]);
      const opp = makePlayer("opp", [hidden("h0")]);
      const state = makeGameState([me, opp], 4);

      const prob = computeOpponentProbabilities(state, opp).get(0)!;

      for (let v = 1; v <= 12; v++) {
        expect(prob.blues.get(v)).toBeCloseTo(4 / 51, 10);
      }
      expect(prob.red).toBeCloseTo(1 / 51, 10);
      expect(prob.yellow).toBeCloseTo(2 / 51, 10);
      expect(sumProbs(prob)).toBeCloseTo(1.0, 10);
    });
  });

  describe("first-principles: pool subtraction exactness", () => {
    it("seeing N copies of value V leaves (4-N) in pool", () => {
      // Mission 1: see 0,1,2,3 copies of val-1 on me; verify remaining ratio
      for (let n = 0; n <= 3; n++) {
        const myHand: VisibleTile[] = [];
        for (let i = 0; i < n; i++) myHand.push(blue(1, false, `b1_${i}`));
        const me = makePlayer("me", myHand);
        const opp = makePlayer("opp", [hidden("h0")]);
        const state = makeGameState([me, opp], 1);

        const prob = computeOpponentProbabilities(state, opp).get(0)!;

        // Total remaining = 24 - n
        const totalRemaining = 24 - n;
        const remainingVal1 = 4 - n;
        if (remainingVal1 > 0) {
          expect(prob.blues.get(1)).toBeCloseTo(remainingVal1 / totalRemaining, 10);
        } else {
          expect(prob.blues.has(1)).toBe(false);
        }
        // Other values unaffected
        expect(prob.blues.get(2)).toBeCloseTo(4 / totalRemaining, 10);
      }
    });

    it("visible tiles from ALL players reduce pool (not just own)", () => {
      // Me: val-1. Opp2 cut: val-1, val-1. Opp3 cut: val-1.
      // Total val-1 seen = 4 → val-1 eliminated from pool
      const me = makePlayer("me", [blue(1, false, "me1")]);
      const opp2 = makePlayer("opp2", [blue(1, true, "o2_1"), blue(1, true, "o2_2")]);
      const opp3 = makePlayer("opp3", [blue(1, true, "o3_1")]);
      const opp = makePlayer("opp", [hidden("h0")]);
      const state = makeGameState([me, opp2, opp3, opp], 1);

      const prob = computeOpponentProbabilities(state, opp).get(0)!;

      expect(prob.blues.has(1)).toBe(false); // all 4 copies visible
      // Remaining: 24 - 4 = 20, 5 values × 4 each
      for (let v = 2; v <= 6; v++) {
        expect(prob.blues.get(v)).toBeCloseTo(4 / 20, 10);
      }
    });

    it("cut tiles on the target opponent also reduce the pool", () => {
      // Opp's own cut tiles are visible → counted
      const me = makePlayer("me", []);
      const opp = makePlayer("opp", [blue(2, true, "opp_cut2"), hidden("h1")]);
      const state = makeGameState([me, opp], 1);

      const prob = computeOpponentProbabilities(state, opp).get(1)!;

      // Visible: 1×val-2. Remaining: 24 - 1 = 23. Hidden bounds: (2, +∞) → val 3-6
      // Eligible: val-3(4) + val-4(4) + val-5(4) + val-6(4) = 16. val-2: 3 remaining but excluded by bound.
      expect(prob.blues.has(1)).toBe(false); // sortValue 1 < 2
      expect(prob.blues.has(2)).toBe(false); // sortValue 2 not > 2
      expect(prob.blues.get(3)).toBeCloseTo(4 / 16, 10);
      expect(prob.blues.get(6)).toBeCloseTo(4 / 16, 10);
    });
  });

  describe("first-principles: sort bounds mechanics", () => {
    it("bounds are exclusive (equal sortValue excluded)", () => {
      // [blue(3,true), hidden, blue(5,true)] → bounds (3,5)
      // Value 3 (sortValue=3) NOT > 3 → excluded. Value 5 (sortValue=5) NOT < 5 → excluded.
      const me = makePlayer("me", []);
      const opp = makePlayer("opp", [blue(3, true), hidden("h1"), blue(5, true)]);
      const state = makeGameState([me, opp], 1);

      const prob = computeOpponentProbabilities(state, opp).get(1)!;
      expect(prob.blues.has(3)).toBe(false);
      expect(prob.blues.has(5)).toBe(false);
      expect(prob.blues.get(4)).toBeCloseTo(1.0, 10); // only blue 4 fits
    });

    it("adjacent integer bounds with gap allow fractional sortValues", () => {
      // [blue(5,true), hidden, blue(6,true)] → bounds (5,6)
      // No integer blues fit. But on mission 4, red 5.5 and yellow 5.1 fit.
      const me = makePlayer("me", []);
      const opp = makePlayer("opp", [blue(5, true), hidden("h1"), blue(6, true)]);
      const state = makeGameState([me, opp], 4);

      const prob = computeOpponentProbabilities(state, opp).get(1)!;

      expect(prob.blues.size).toBe(0);
      // Red candidates in (5,6): only 5.5. Weight = 1 × (1/11)
      // Yellow candidates in (5,6): only 5.1. Weight = 2 × (1/11)
      const redW = 1 / 11;
      const yellowW = 2 / 11;
      const total = redW + yellowW;
      expect(prob.red).toBeCloseTo(redW / total, 10);
      expect(prob.yellow).toBeCloseTo(yellowW / total, 10);
      expect(sumProbs(prob)).toBeCloseTo(1.0, 10);
    });

    it("multiple hidden tiles between same two cuts share bounds but are independent", () => {
      // [blue(2,true), hidden_A, hidden_B, hidden_C, blue(6,true)]
      // All three hidden tiles have bounds (2,6) → eligible: blue 3,4,5
      const me = makePlayer("me", []);
      const opp = makePlayer("opp", [
        blue(2, true), hidden("hA"), hidden("hB"), hidden("hC"), blue(6, true),
      ]);
      const state = makeGameState([me, opp], 1);

      const probs = computeOpponentProbabilities(state, opp);
      // All three get identical marginal distributions
      const pA = probs.get(1)!;
      const pB = probs.get(2)!;
      const pC = probs.get(3)!;

      for (let v = 3; v <= 5; v++) {
        expect(pA.blues.get(v)).toBeCloseTo(4 / 12, 10); // 3 values × 4 copies = 12
        expect(pA.blues.get(v)).toBe(pB.blues.get(v));
        expect(pB.blues.get(v)).toBe(pC.blues.get(v));
      }
      expect(pA.blues.has(2)).toBe(false);
      expect(pA.blues.has(6)).toBe(false);
    });

    it("hidden tile at start of stand: lower = -Infinity", () => {
      // [hidden, blue(4,true)] → bounds (-∞, 4) → blue 1,2,3
      const me = makePlayer("me", []);
      const opp = makePlayer("opp", [hidden("h0"), blue(4, true)]);
      const state = makeGameState([me, opp], 1);

      const prob = computeOpponentProbabilities(state, opp).get(0)!;
      expect(prob.blues.has(1)).toBe(true);
      expect(prob.blues.has(2)).toBe(true);
      expect(prob.blues.has(3)).toBe(true);
      expect(prob.blues.has(4)).toBe(false);
      expect(prob.blues.size).toBe(3);
      for (let v = 1; v <= 3; v++) {
        expect(prob.blues.get(v)).toBeCloseTo(4 / 12, 10);
      }
    });

    it("hidden tile at end of stand: upper = +Infinity", () => {
      // [blue(4,true), hidden] → bounds (4, +∞) → blue 5,6
      const me = makePlayer("me", []);
      const opp = makePlayer("opp", [blue(4, true), hidden("h1")]);
      const state = makeGameState([me, opp], 1);

      const prob = computeOpponentProbabilities(state, opp).get(1)!;
      expect(prob.blues.has(4)).toBe(false);
      expect(prob.blues.has(5)).toBe(true);
      expect(prob.blues.has(6)).toBe(true);
      expect(prob.blues.size).toBe(2);
    });

    it("three separate bounded regions on one stand", () => {
      // [hidden, blue(2,true), hidden, blue(4,true), hidden]
      // Region 0: (-∞, 2) → blue 1
      // Region 2: (2, 4) → blue 3
      // Region 4: (4, +∞) → blue 5, 6
      const me = makePlayer("me", []);
      const opp = makePlayer("opp", [
        hidden("h0"), blue(2, true), hidden("h2"), blue(4, true), hidden("h4"),
      ]);
      const state = makeGameState([me, opp], 1);

      const probs = computeOpponentProbabilities(state, opp);

      // Region 0: only blue 1
      const p0 = probs.get(0)!;
      expect(p0.blues.size).toBe(1);
      expect(p0.blues.get(1)).toBeCloseTo(1.0, 10);

      // Region 2: only blue 3
      const p2 = probs.get(2)!;
      expect(p2.blues.size).toBe(1);
      expect(p2.blues.get(3)).toBeCloseTo(1.0, 10);

      // Region 4: blue 5 and 6
      const p4 = probs.get(4)!;
      expect(p4.blues.size).toBe(2);
      expect(p4.blues.get(5)).toBeCloseTo(0.5, 10);
      expect(p4.blues.get(6)).toBeCloseTo(0.5, 10);
    });

    it("bound from red cut tile (fractional sortValue)", () => {
      // [red(3.5,true), hidden] → bounds (3.5, +∞) → blue 4,5,6,...
      const me = makePlayer("me", []);
      const opp = makePlayer("opp", [red(3.5, true, "cutr"), hidden("h1")]);
      const state = makeGameState([me, opp], 4);

      const prob = computeOpponentProbabilities(state, opp).get(1)!;

      // Blue 1-3 excluded (sortValue ≤ 3.5). Blue 4-12 eligible.
      expect(prob.blues.has(1)).toBe(false);
      expect(prob.blues.has(2)).toBe(false);
      expect(prob.blues.has(3)).toBe(false);
      expect(prob.blues.has(4)).toBe(true);
      expect(prob.blues.has(12)).toBe(true);
    });

    it("bound from yellow cut tile (fractional sortValue)", () => {
      // [hidden, yellow(6.1,true)] → bounds (-∞, 6.1) → blue 1-6
      const me = makePlayer("me", []);
      const opp = makePlayer("opp", [hidden("h0"), yellow(6.1, true, "cuty")]);
      const state = makeGameState([me, opp], 4);

      const prob = computeOpponentProbabilities(state, opp).get(0)!;

      // Blue 1-6 eligible (sortValue < 6.1). Blue 7+ excluded.
      for (let v = 1; v <= 6; v++) expect(prob.blues.has(v)).toBe(true);
      expect(prob.blues.has(7)).toBe(false);
    });
  });

  describe("first-principles: red/yellow candidate weighting", () => {
    it("red weight = remainingRed × (eligibleCandidates / totalUnobservedCandidates)", () => {
      // Mission 4 (3p): 1 red, candidates = {1.5,2.5,...,11.5} = 11 values
      // Bounds (5, +∞): eligible red candidates = {5.5,6.5,7.5,8.5,9.5,10.5,11.5} = 7/11
      // No red observed → unobserved = all 11
      // Weight = 1 × 7/11
      const me = makePlayer("me", []);
      const opp = makePlayer("opp", [blue(5, true), hidden("h1")]);
      const state = makeGameState([me, opp], 4);

      const prob = computeOpponentProbabilities(state, opp).get(1)!;

      // Blue 6-12: 7 values × 4 = 28. Blue 5: cut so 3 remaining, but excluded by bound.
      // Yellow: 2 remaining, candidates in (5, +∞) = {5.1,...,11.1} = 7/11. Weight = 2 × 7/11 = 14/11
      const redW = 7 / 11;
      const yellowW = 14 / 11;
      const total = 28 + redW + yellowW;
      expect(prob.red).toBeCloseTo(redW / total, 10);
      expect(prob.yellow).toBeCloseTo(yellowW / total, 10);
      expect(prob.blues.get(7)).toBeCloseTo(4 / total, 10);
    });

    it("observed red sortValue reduces unobserved candidates", () => {
      // Mission 4: 1 red. Another player has cut red with sortValue 5.5.
      // Now red is fully consumed (remaining = 0).
      const me = makePlayer("me", []);
      const other = makePlayer("other", [red(5.5, true, "cr")]);
      const opp = makePlayer("opp", [hidden("h0")]);
      const state = makeGameState([me, other, opp], 4);

      const prob = computeOpponentProbabilities(state, opp).get(0)!;
      expect(prob.red).toBe(0);
    });

    it("observed yellow sortValues narrow the candidate pool", () => {
      // Mission 4: 2 yellow. One cut yellow at 3.1 on another player.
      // Remaining yellow = 1. Unobserved candidates = 11 - 1 = 10.
      // Bounds (6, +∞): eligible yellow = {6.1,7.1,8.1,9.1,10.1,11.1} = 6 of 10.
      // Weight = 1 × 6/10 = 0.6
      const me = makePlayer("me", []);
      const other = makePlayer("other", [yellow(3.1, true, "cy")]);
      const opp = makePlayer("opp", [blue(6, true), hidden("h1")]);
      const state = makeGameState([me, other, opp], 4);

      const prob = computeOpponentProbabilities(state, opp).get(1)!;

      // Blue 7-12: 6 × 4 = 24. Blue 6 cut → 3 remain but excluded.
      // Red: 1 remaining, candidates in (6,+∞) = {6.5,...,11.5} = 6 of 11. Weight = 6/11
      // Yellow: 1 remaining, unobserved = 10, eligible in (6,+∞) = 6. Weight = 6/10
      const redW = 6 / 11;
      const yellowW = 6 / 10;
      const total = 24 + redW + yellowW;
      expect(prob.red).toBeCloseTo(redW / total, 10);
      expect(prob.yellow).toBeCloseTo(yellowW / total, 10);
    });

    it("no candidates in bounds → red/yellow probability is 0 for that position", () => {
      // Bounds (0, 1): no red/yellow candidates (smallest red=1.5, smallest yellow=1.1)
      // Also no blue (smallest blue=1, not < 1)
      // This results in no entry.
      const me = makePlayer("me", []);
      const opp = makePlayer("opp", [hidden("h0"), blue(1, true)]);
      const state = makeGameState([me, opp], 4);

      expect(computeOpponentProbabilities(state, opp).has(0)).toBe(false);
    });

    it("exactly one red candidate in bounds gives exact fraction", () => {
      // Bounds (4, 5): red candidates in range = {4.5}. 1 of 11.
      // Yellow candidates in range = {4.1}. 1 of 11.
      // No blue (no integer in (4,5)).
      const me = makePlayer("me", []);
      const opp = makePlayer("opp", [blue(4, true), hidden("h1"), blue(5, true)]);
      const state = makeGameState([me, opp], 4);

      const prob = computeOpponentProbabilities(state, opp).get(1)!;

      expect(prob.blues.size).toBe(0);
      // Red: 1 × 1/11. Yellow: 2 × 1/11.
      const redW = 1 / 11;
      const yellowW = 2 / 11;
      const total = redW + yellowW;
      expect(prob.red).toBeCloseTo(redW / total, 10);
      expect(prob.yellow).toBeCloseTo(yellowW / total, 10);
      expect(sumProbs(prob)).toBeCloseTo(1.0, 10);
    });

    it("all red candidates observed but red remaining > 0 gives red = 0", () => {
      // Edge case: can't happen in practice (if all candidates observed, remaining should be 0).
      // But testing the code path: if unobservedRedCandidates is empty, red weight = 0.
      // This naturally happens when all reds are cut.
      const me = makePlayer("me", []);
      const other = makePlayer("other", [red(5.5, true, "cr")]);
      const opp = makePlayer("opp", [hidden("h0")]);
      const state = makeGameState([me, other, opp], 4);

      const prob = computeOpponentProbabilities(state, opp).get(0)!;
      expect(prob.red).toBe(0); // 0 remaining reds
    });
  });

  describe("first-principles: interaction between bounds and pool", () => {
    it("pool depletion + bounds can leave only one value", () => {
      // See all copies of value 5 (4 seen). Bounds (4,6) → only blue 5 eligible, but 0 remaining.
      // No red/yellow on mission 1 → no entry.
      const me = makePlayer("me", [
        blue(5, false, "b5a"), blue(5, false, "b5b"),
        blue(5, false, "b5c"), blue(5, false, "b5d"),
      ]);
      const opp = makePlayer("opp", [blue(4, true), hidden("h1"), blue(6, true)]);
      const state = makeGameState([me, opp], 1);

      expect(computeOpponentProbabilities(state, opp).has(1)).toBe(false);
    });

    it("partial pool depletion changes probability ratios within bounds", () => {
      // Me: 3 copies of value 4. Bounds (3, 6) → eligible: val-4(1 left), val-5(4 left)
      const me = makePlayer("me", [
        blue(4, false, "b4a"), blue(4, false, "b4b"), blue(4, false, "b4c"),
      ]);
      const opp = makePlayer("opp", [blue(3, true), hidden("h1"), blue(6, true)]);
      const state = makeGameState([me, opp], 1);

      const prob = computeOpponentProbabilities(state, opp).get(1)!;

      expect(prob.blues.get(4)).toBeCloseTo(1 / 5, 10); // 1 of 5
      expect(prob.blues.get(5)).toBeCloseTo(4 / 5, 10); // 4 of 5
      expect(prob.blues.size).toBe(2);
    });

    it("mixed blue depletion and red/yellow bounds", () => {
      // Mission 4: me has all 4 copies of val-7 and val-8.
      // Opp: [blue(6,true), hidden, blue(9,true)]
      // Bounds (6,9) → eligible blues: val-7(0 left), val-8(0 left) = nothing.
      // Red candidates in (6,9): {6.5, 7.5, 8.5} = 3 of 11. Weight = 1 × 3/11.
      // Yellow candidates in (6,9): {6.1, 7.1, 8.1} = 3 of 11. Weight = 2 × 3/11.
      const me = makePlayer("me", [
        blue(7, false, "b7a"), blue(7, false, "b7b"), blue(7, false, "b7c"), blue(7, false, "b7d"),
        blue(8, false, "b8a"), blue(8, false, "b8b"), blue(8, false, "b8c"), blue(8, false, "b8d"),
      ]);
      const opp = makePlayer("opp", [blue(6, true), hidden("h1"), blue(9, true)]);
      const state = makeGameState([me, opp], 4);

      const prob = computeOpponentProbabilities(state, opp).get(1)!;

      expect(prob.blues.size).toBe(0);
      const redW = 3 / 11;
      const yellowW = 6 / 11;
      const total = redW + yellowW;
      expect(prob.red).toBeCloseTo(redW / total, 10);
      expect(prob.yellow).toBeCloseTo(yellowW / total, 10);
      expect(sumProbs(prob)).toBeCloseTo(1.0, 10);
    });
  });

  describe("first-principles: multi-position consistency", () => {
    it("two hidden tiles with different bounds get different distributions", () => {
      // [hidden_A, blue(3,true), hidden_B]
      // A: bounds (-∞, 3) → blue 1, 2
      // B: bounds (3, +∞) → blue 4, 5, 6
      const me = makePlayer("me", []);
      const opp = makePlayer("opp", [hidden("hA"), blue(3, true), hidden("hB")]);
      const state = makeGameState([me, opp], 1);

      const pA = computeOpponentProbabilities(state, opp).get(0)!;
      const pB = computeOpponentProbabilities(state, opp).get(2)!;

      // A: 2 values × 4 = 8 eligible
      expect(pA.blues.size).toBe(2);
      expect(pA.blues.get(1)).toBeCloseTo(0.5, 10);
      expect(pA.blues.get(2)).toBeCloseTo(0.5, 10);

      // B: 3 values × 4 = 12 eligible
      expect(pB.blues.size).toBe(3);
      expect(pB.blues.get(4)).toBeCloseTo(1 / 3, 10);
      expect(pB.blues.get(5)).toBeCloseTo(1 / 3, 10);
      expect(pB.blues.get(6)).toBeCloseTo(1 / 3, 10);
    });

    it("probabilities consistent across different opponents", () => {
      // Same mission, same pool depletion, same bounds → same probabilities
      const me = makePlayer("me", [blue(1)]);
      const opp1 = makePlayer("opp1", [hidden("h0")]);
      const opp2 = makePlayer("opp2", [hidden("h0")]);
      const state = makeGameState([me, opp1, opp2], 1);

      const p1 = computeOpponentProbabilities(state, opp1).get(0)!;
      const p2 = computeOpponentProbabilities(state, opp2).get(0)!;

      for (let v = 1; v <= 6; v++) {
        expect(p1.blues.get(v)).toBe(p2.blues.get(v));
      }
    });
  });

  describe("first-principles: edge cases and invariants", () => {
    it("every entry's probabilities sum to exactly 1", () => {
      // Complex scenario with mixed visibility and bounds
      const me = makePlayer("me", [blue(1), blue(3), blue(5)]);
      const other = makePlayer("other", [
        blue(2, true, "cut2"), red(4.5, true, "cutr"),
        yellow(2.1, true, "cuty"),
      ]);
      const opp = makePlayer("opp", [
        hidden("h0"), blue(4, true), hidden("h2"), blue(8, true), hidden("h4"),
      ]);
      const state = makeGameState([me, other, opp], 4);

      const probs = computeOpponentProbabilities(state, opp);
      for (const [, prob] of probs) {
        expect(sumProbs(prob)).toBeCloseTo(1.0, 10);
      }
    });

    it("hidden tile with no eligible values produces no map entry", () => {
      // Bounds (5, 6) on mission 1: no blue with 5 < sortValue < 6, no R/Y
      const me = makePlayer("me", []);
      const opp = makePlayer("opp", [blue(5, true), hidden("h1"), blue(6, true)]);
      const state = makeGameState([me, opp], 1);

      const probs = computeOpponentProbabilities(state, opp);
      expect(probs.has(1)).toBe(false);
    });

    it("total visible tiles can never exceed pool size", () => {
      // 24 tiles visible = entire pool. Any hidden tile → no entry.
      const allTiles: VisibleTile[] = [];
      for (let v = 1; v <= 6; v++) {
        for (let c = 0; c < 4; c++) {
          allTiles.push(blue(v, false, `b${v}_${c}`));
        }
      }
      const me = makePlayer("me", allTiles);
      const opp = makePlayer("opp", [hidden("h0"), hidden("h1")]);
      const state = makeGameState([me, opp], 1);

      const probs = computeOpponentProbabilities(state, opp);
      expect(probs.size).toBe(0);
    });

    it("hidden (uncut) own tiles on 'me' count as visible (viewer sees own tiles)", () => {
      // Me has uncut blue 3 → it reduces pool. Opp's hidden tile reflects this.
      const me = makePlayer("me", [blue(3, false, "myBlue3")]);
      const opp = makePlayer("opp", [hidden("h0")]);
      const state = makeGameState([me, opp], 1);

      const prob = computeOpponentProbabilities(state, opp).get(0)!;

      // val-3: 4-1=3 remaining vs val-1: 4 remaining → different probabilities
      expect(prob.blues.get(3)).toBeCloseTo(3 / 23, 10);
      expect(prob.blues.get(1)).toBeCloseTo(4 / 23, 10);
    });

    it("hidden tiles on OTHER opponents do not affect pool (not visible to viewer)", () => {
      // opp2 has hidden tiles → viewer can't see them → not counted
      const me = makePlayer("me", []);
      const opp2 = makePlayer("opp2", [hidden("opp2_h0"), hidden("opp2_h1")]);
      const opp = makePlayer("opp", [hidden("h0")]);
      const state = makeGameState([me, opp2, opp], 1);

      const prob = computeOpponentProbabilities(state, opp).get(0)!;

      // Nothing visible → uniform 4/24 = 1/6 for each
      for (let v = 1; v <= 6; v++) {
        expect(prob.blues.get(v)).toBeCloseTo(1 / 6, 10);
      }
    });

    it("correctly handles stand with only cut tiles and one hidden", () => {
      // [blue(1,true), blue(2,true), blue(3,true), blue(4,true), hidden]
      // Hidden at end: bounds (4, +∞) → blue 5, 6
      const me = makePlayer("me", []);
      const opp = makePlayer("opp", [
        blue(1, true, "c1"), blue(2, true, "c2"), blue(3, true, "c3"), blue(4, true, "c4"), hidden("h4"),
      ]);
      const state = makeGameState([me, opp], 1);

      const prob = computeOpponentProbabilities(state, opp).get(4)!;

      // Pool: val-1(3), val-2(3), val-3(3), val-4(3), val-5(4), val-6(4)
      // Eligible (4, +∞): val-5(4) + val-6(4) = 8
      expect(prob.blues.get(5)).toBeCloseTo(4 / 8, 10);
      expect(prob.blues.get(6)).toBeCloseTo(4 / 8, 10);
      expect(prob.blues.size).toBe(2);
    });

    it("stand with all tiles hidden → all get same unbounded distribution", () => {
      const me = makePlayer("me", [blue(2)]);
      const opp = makePlayer("opp", [hidden("h0"), hidden("h1"), hidden("h2"), hidden("h3")]);
      const state = makeGameState([me, opp], 1);

      const probs = computeOpponentProbabilities(state, opp);
      expect(probs.size).toBe(4);

      // All should be identical (unbounded)
      const p0 = probs.get(0)!;
      for (let i = 1; i <= 3; i++) {
        const pi = probs.get(i)!;
        for (let v = 1; v <= 6; v++) {
          expect(p0.blues.get(v)).toBe(pi.blues.get(v));
        }
      }
    });
  });

  describe("first-principles: complete hand-worked examples", () => {
    it("example 1: simple bounded tile on mission 1", () => {
      // Mission 1 (3p): blue 1-6, 4 copies each, no R/Y. Total = 24.
      //
      // Me: [blue(2), blue(6)]  → 2 tiles visible
      // Opp: [blue(1,true), hidden, blue(4,true), hidden]
      //
      // Visible: val-1(1), val-2(1), val-4(1), val-6(1) = 4 tiles
      // Remaining: val-1(3), val-2(3), val-3(4), val-4(3), val-5(4), val-6(3) = 20
      //
      // Hidden at index 1: bounds (1, 4) → eligible: val-2(3), val-3(4) = 7
      // P(2) = 3/7, P(3) = 4/7
      //
      // Hidden at index 3: bounds (4, +∞) → eligible: val-5(4), val-6(3) = 7
      // P(5) = 4/7, P(6) = 3/7
      const me = makePlayer("me", [blue(2), blue(6)]);
      const opp = makePlayer("opp", [blue(1, true), hidden("h1"), blue(4, true), hidden("h3")]);
      const state = makeGameState([me, opp], 1);

      const probs = computeOpponentProbabilities(state, opp);

      const p1 = probs.get(1)!;
      expect(p1.blues.get(2)).toBeCloseTo(3 / 7, 10);
      expect(p1.blues.get(3)).toBeCloseTo(4 / 7, 10);
      expect(p1.blues.size).toBe(2);
      expect(sumProbs(p1)).toBeCloseTo(1.0, 10);

      const p3 = probs.get(3)!;
      expect(p3.blues.get(5)).toBeCloseTo(4 / 7, 10);
      expect(p3.blues.get(6)).toBeCloseTo(3 / 7, 10);
      expect(p3.blues.size).toBe(2);
      expect(sumProbs(p3)).toBeCloseTo(1.0, 10);
    });

    it("example 2: mission 4 with red/yellow and bounds", () => {
      // Mission 4 (3p): blue 1-12 (×4), 1R, 2Y. Total = 51.
      //
      // Me: [blue(5), blue(10)]  → 2 visible
      // Other: [red(2.5,cut), yellow(7.1,cut)]  → 2 visible
      // Opp: [blue(3,true), hidden, blue(9,true)]
      //
      // Visible: val-3(1), val-5(1), val-9(1), val-10(1), 1R, 1Y = 6
      // Remaining: 51 - 6 = 45
      //   val-1(4), val-2(4), val-3(3), val-4(4), val-5(3), val-6(4), val-7(4), val-8(4),
      //   val-9(3), val-10(3), val-11(4), val-12(4) = 44 blue
      //   0R, 1Y = 1 non-blue → total remaining = 45 ✓
      //
      // Hidden at index 1: bounds (3, 9)
      //   Eligible blues: val-4(4), val-5(3), val-6(4), val-7(4), val-8(4) = 19
      //   Red: 0 remaining → 0
      //   Yellow: 1 remaining. Observed yellow sortValues = {7.1}. Unobserved = 10.
      //     Candidates in (3, 9): {3.1, 4.1, 5.1, 6.1, 7.1, 8.1} → but 7.1 is observed
      //     Wait, unobserved candidates in (3, 9) = {3.1, 4.1, 5.1, 6.1, 8.1} = 5 of 10
      //     Weight = 1 × 5/10 = 0.5
      //   Total = 19 + 0.5 = 19.5
      const me = makePlayer("me", [blue(5), blue(10)]);
      const other = makePlayer("other", [red(2.5, true, "cr"), yellow(7.1, true, "cy")]);
      const opp = makePlayer("opp", [blue(3, true), hidden("h1"), blue(9, true)]);
      const state = makeGameState([me, other, opp], 4);

      const prob = computeOpponentProbabilities(state, opp).get(1)!;

      const yellowW = 0.5;
      const total = 19 + yellowW;
      expect(prob.blues.get(4)).toBeCloseTo(4 / total, 10);
      expect(prob.blues.get(5)).toBeCloseTo(3 / total, 10);
      expect(prob.blues.get(6)).toBeCloseTo(4 / total, 10);
      expect(prob.blues.get(7)).toBeCloseTo(4 / total, 10);
      expect(prob.blues.get(8)).toBeCloseTo(4 / total, 10);
      expect(prob.blues.has(3)).toBe(false);
      expect(prob.blues.has(9)).toBe(false);
      expect(prob.red).toBe(0);
      expect(prob.yellow).toBeCloseTo(yellowW / total, 10);
      expect(sumProbs(prob)).toBeCloseTo(1.0, 10);
    });

    it("example 3: heavily depleted pool with tight bounds", () => {
      // Mission 1 (3p): 24 tiles total.
      // Me: 3×val-3, 4×val-4, 2×val-5 = 9 visible
      // Other: 4×val-1(cut), 2×val-6(cut) = 6 visible
      // Opp: [blue(2,true), hidden, blue(6,true)]
      //
      // Visible: 4×val-1, 1×val-2, 3×val-3, 4×val-4, 2×val-5, 3×val-6 = 17
      // Remaining: val-1(0), val-2(3), val-3(1), val-4(0), val-5(2), val-6(1) = 7
      //
      // Hidden at index 1: bounds (2, 6)
      //   Eligible: val-3(1), val-4(0), val-5(2) = 3
      //   P(3) = 1/3, P(5) = 2/3
      const me = makePlayer("me", [
        blue(3, false, "b3a"), blue(3, false, "b3b"), blue(3, false, "b3c"),
        blue(4, false, "b4a"), blue(4, false, "b4b"), blue(4, false, "b4c"), blue(4, false, "b4d"),
        blue(5, false, "b5a"), blue(5, false, "b5b"),
      ]);
      const other = makePlayer("other", [
        blue(1, true, "c1a"), blue(1, true, "c1b"), blue(1, true, "c1c"), blue(1, true, "c1d"),
        blue(6, true, "c6a"), blue(6, true, "c6b"),
      ]);
      const opp = makePlayer("opp", [blue(2, true, "cut2"), hidden("h1"), blue(6, true, "cut6")]);
      const state = makeGameState([me, other, opp], 1);

      const prob = computeOpponentProbabilities(state, opp).get(1)!;

      expect(prob.blues.get(3)).toBeCloseTo(1 / 3, 10);
      expect(prob.blues.get(5)).toBeCloseTo(2 / 3, 10);
      expect(prob.blues.has(4)).toBe(false); // 0 remaining
      expect(prob.blues.size).toBe(2);
      expect(sumProbs(prob)).toBeCloseTo(1.0, 10);
    });
  });

  // =========================================================================
  // WirePoolSpec kind coverage: out_of, fixed
  // =========================================================================

  describe("WirePoolSpec kinds", () => {
    it("out_of: mission 5 (3p) — yellow outOf(2,3) uses keep=2 as count", () => {
      // Mission 5 (3p): blue 1-12 (×4=48), red exact(1), yellow outOf(2,3)
      // outOf(2,3) → keep=2 yellows drawn from 3 candidates, but scouter uses keep=2 as count
      // Total = 48 + 1 + 2 = 51
      const me = makePlayer("me", [blue(1)]);
      const opp = makePlayer("opp", [hidden("h0")]);
      const state = makeGameState([me, opp], 5);

      const prob = computeOpponentProbabilities(state, opp).get(0)!;

      // Remaining: 51 - 1 = 50
      expect(prob.red).toBeCloseTo(1 / 50, 10);
      expect(prob.yellow).toBeCloseTo(2 / 50, 10);
      expect(prob.blues.get(1)).toBeCloseTo(3 / 50, 10); // 4-1=3
      expect(prob.blues.get(2)).toBeCloseTo(4 / 50, 10);
      expect(sumProbs(prob)).toBeCloseTo(1.0, 10);
    });

    it("out_of: yellow bounded by sort position", () => {
      // Mission 5 (3p): yellow outOf(2,3), candidates = full YELLOW_WIRE_SORT_VALUES (11 values)
      // Opp: [blue(10,true), hidden]  → bounds (10, +∞)
      // Yellow candidates in (10, +∞): {10.1, 11.1} = 2 of 11. Weight = 2 × 2/11
      const me = makePlayer("me", []);
      const opp = makePlayer("opp", [blue(10, true), hidden("h1")]);
      const state = makeGameState([me, opp], 5);

      const prob = computeOpponentProbabilities(state, opp).get(1)!;

      // Blue 11,12: 2×4 = 8. Blue 10: cut → 3 remaining but excluded.
      // Red: 1 remaining, candidates in (10,+∞) = {10.5, 11.5} = 2 of 11. Weight = 2/11
      // Yellow: 2 remaining, candidates in (10,+∞) = {10.1, 11.1} = 2 of 11. Weight = 2×2/11 = 4/11
      const redW = 2 / 11;
      const yellowW = 4 / 11;
      const total = 8 + redW + yellowW;
      expect(prob.red).toBeCloseTo(redW / total, 10);
      expect(prob.yellow).toBeCloseTo(yellowW / total, 10);
      expect(prob.blues.get(11)).toBeCloseTo(4 / total, 10);
      expect(sumProbs(prob)).toBeCloseTo(1.0, 10);
    });

    it("fixed: mission 46 — yellow fixed([5.1,6.1,7.1,8.1]) has restricted candidates", () => {
      // Mission 46 (3p): blue 1-12 (×4=48), no red, yellow fixed([5.1,6.1,7.1,8.1])
      // yellowCount = 4, yellowCandidates = [5.1, 6.1, 7.1, 8.1] (only 4 values, not 11!)
      // Total = 48 + 0 + 4 = 52
      const me = makePlayer("me", [blue(1)]);
      const opp = makePlayer("opp", [hidden("h0")]);
      const state = makeGameState([me, opp], 46);

      const prob = computeOpponentProbabilities(state, opp).get(0)!;

      // Remaining: 52 - 1 = 51
      expect(prob.red).toBe(0);
      expect(prob.yellow).toBeCloseTo(4 / 51, 10);
      expect(prob.blues.get(1)).toBeCloseTo(3 / 51, 10);
      expect(prob.blues.get(2)).toBeCloseTo(4 / 51, 10);
      expect(sumProbs(prob)).toBeCloseTo(1.0, 10);
    });

    it("fixed: restricted candidates affect sort-aware weighting", () => {
      // Mission 46: yellow candidates are ONLY [5.1, 6.1, 7.1, 8.1]
      // Opp: [blue(6,true), hidden, blue(8,true)]  → bounds (6, 8)
      // Yellow candidates in (6, 8): {6.1, 7.1} = 2 of 4 (not 2 of 11!)
      // Weight = 4 × 2/4 = 2
      const me = makePlayer("me", []);
      const opp = makePlayer("opp", [blue(6, true), hidden("h1"), blue(8, true)]);
      const state = makeGameState([me, opp], 46);

      const prob = computeOpponentProbabilities(state, opp).get(1)!;

      // Blue: only val-7 in (6,8). 4 copies. Blue 6 cut → 3 remain but excluded.
      // Yellow: weight = 4 × 2/4 = 2
      const total = 4 + 2;
      expect(prob.blues.get(7)).toBeCloseTo(4 / total, 10);
      expect(prob.blues.size).toBe(1);
      expect(prob.yellow).toBeCloseTo(2 / total, 10);
      expect(prob.red).toBe(0);
      expect(sumProbs(prob)).toBeCloseTo(1.0, 10);
    });

    it("fixed: no yellow candidates in bounds → yellow = 0", () => {
      // Mission 46: yellow candidates [5.1, 6.1, 7.1, 8.1]
      // Opp: [blue(9,true), hidden]  → bounds (9, +∞)
      // Yellow candidates in (9, +∞): none! → yellow = 0
      const me = makePlayer("me", []);
      const opp = makePlayer("opp", [blue(9, true), hidden("h1")]);
      const state = makeGameState([me, opp], 46);

      const prob = computeOpponentProbabilities(state, opp).get(1)!;

      expect(prob.yellow).toBe(0);
      // Blue 10,11,12: 3×4 = 12. Blue 9: cut → 3 remain but excluded.
      expect(prob.blues.get(10)).toBeCloseTo(4 / 12, 10);
      expect(sumProbs(prob)).toBeCloseTo(1.0, 10);
    });

    it("fixed: mission 54 — red fixed(redAll) has all 11 red candidates", () => {
      // Mission 54 (3p): blue 1-12 (×4=48), red fixed(redAll) = 11 reds, no yellow
      // redCandidates = redAll = [1.5,2.5,...,11.5], count = 11
      // Total = 48 + 11 = 59
      const me = makePlayer("me", [blue(1)]);
      const opp = makePlayer("opp", [hidden("h0")]);
      const state = makeGameState([me, opp], 54);

      const prob = computeOpponentProbabilities(state, opp).get(0)!;

      // Remaining: 59 - 1 = 58
      expect(prob.red).toBeCloseTo(11 / 58, 10);
      expect(prob.yellow).toBe(0);
      expect(prob.blues.get(1)).toBeCloseTo(3 / 58, 10);
      expect(sumProbs(prob)).toBeCloseTo(1.0, 10);
    });

    it("fixed: mission 54 red with sort bounds", () => {
      // Mission 54: 11 reds, candidates = [1.5,...,11.5]
      // Opp: [blue(3,true), hidden, blue(5,true)]  → bounds (3, 5)
      // Blue in (3,5): val-4 (4 copies)
      // Red candidates in (3,5): {3.5, 4.5} = 2 of 11.
      // But since this is fixed, all 11 candidates ARE the reds.
      // Weight = 11 × 2/11 = 2
      const me = makePlayer("me", []);
      const opp = makePlayer("opp", [blue(3, true), hidden("h1"), blue(5, true)]);
      const state = makeGameState([me, opp], 54);

      const prob = computeOpponentProbabilities(state, opp).get(1)!;

      const total = 4 + 2; // blue-4(4) + red weight(2)
      expect(prob.blues.get(4)).toBeCloseTo(4 / total, 10);
      expect(prob.blues.size).toBe(1);
      expect(prob.red).toBeCloseTo(2 / total, 10);
      expect(prob.yellow).toBe(0);
      expect(sumProbs(prob)).toBeCloseTo(1.0, 10);
    });

    it("fixed: observed red sortValues narrow fixed candidates", () => {
      // Mission 54: 11 reds. Cut 3 reds on another player.
      // Remaining = 8. Observed sortValues = {1.5, 2.5, 3.5}. Unobserved = 8 candidates.
      // Opp: [blue(4,true), hidden]  → bounds (4, +∞)
      // Unobserved red candidates in (4, +∞): {4.5,5.5,...,11.5} = 8. But remove observed: all 8 are unobserved.
      // Wait: observed = {1.5,2.5,3.5}, unobserved = {4.5,5.5,...,11.5} = 8
      // Eligible in (4, +∞): all 8 of 8. Weight = 8 × 8/8 = 8
      const me = makePlayer("me", []);
      const other = makePlayer("other", [
        red(1.5, true, "cr1"), red(2.5, true, "cr2"), red(3.5, true, "cr3"),
      ]);
      const opp = makePlayer("opp", [blue(4, true), hidden("h1")]);
      const state = makeGameState([me, other, opp], 54);

      const prob = computeOpponentProbabilities(state, opp).get(1)!;

      // Blue 5-12: 8×4 = 32. Blue 4 cut → 3 remain but excluded.
      // Red: 8 remaining, unobserved = 8 candidates, eligible in (4,+∞) = 8/8. Weight = 8.
      const total = 32 + 8;
      expect(prob.red).toBeCloseTo(8 / total, 10);
      expect(prob.blues.get(5)).toBeCloseTo(4 / total, 10);
      expect(sumProbs(prob)).toBeCloseTo(1.0, 10);
    });
  });

  // =========================================================================
  // Player count variations
  // =========================================================================

  describe("player count variations", () => {
    function makeGameStateExact(
      players: ClientPlayer[],
      mission: number = 1,
    ): ClientGameState {
      return {
        phase: "playing",
        roomId: "test",
        playerId: players[0].id,
        isHost: false,
        players,
        board: {
          detonatorPosition: 0,
          detonatorMax: 3,
          validationTrack: {},
          markers: [],
          equipment: [],
        },
        currentPlayerIndex: 0,
        turnNumber: 1,
        mission: mission as any,
        result: null,
        log: [],
        chat: [],
      };
    }

    it("mission 1, 2 players — pool is blue 1-6 (24 tiles)", () => {
      const me = makePlayer("me", [hidden("h1"), hidden("h2")]);
      const opp = makePlayer("opp", [hidden("h3"), hidden("h4")]);
      const state = makeGameStateExact([me, opp], 1);

      const probs = computeOpponentProbabilities(state, opp);
      expect(probs.size).toBe(2);

      const prob = probs.get(0)!;
      for (let v = 1; v <= 6; v++) {
        expect(prob.blues.has(v)).toBe(true);
      }
      for (let v = 7; v <= 12; v++) {
        expect(prob.blues.has(v)).toBe(false);
      }
      expect(prob.red).toBe(0);
      expect(prob.yellow).toBe(0);
    });

    it("mission 1, 4 players — pool is still blue 1-6 (24 tiles)", () => {
      const me = makePlayer("me", [hidden("h1")]);
      const p2 = makePlayer("p2", [hidden("h2")]);
      const p3 = makePlayer("p3", [hidden("h3")]);
      const p4 = makePlayer("p4", [hidden("h4")]);
      const state = makeGameStateExact([me, p2, p3, p4], 1);

      const probs = computeOpponentProbabilities(state, p2);
      expect(probs.size).toBe(1);

      const prob = probs.get(0)!;
      for (let v = 1; v <= 6; v++) {
        expect(prob.blues.has(v)).toBe(true);
      }
      expect(prob.blues.has(7)).toBe(false);
      expect(prob.red).toBe(0);
      expect(prob.yellow).toBe(0);
    });

    it("mission 1, 5 players — pool is still blue 1-6 (24 tiles)", () => {
      const me = makePlayer("me", [hidden("h1")]);
      const p2 = makePlayer("p2", [hidden("h2")]);
      const p3 = makePlayer("p3", [hidden("h3")]);
      const p4 = makePlayer("p4", [hidden("h4")]);
      const p5 = makePlayer("p5", [hidden("h5")]);
      const state = makeGameStateExact([me, p2, p3, p4, p5], 1);

      const probs = computeOpponentProbabilities(state, p2);
      expect(probs.size).toBe(1);

      const prob = probs.get(0)!;
      for (let v = 1; v <= 6; v++) {
        expect(prob.blues.has(v)).toBe(true);
      }
      expect(prob.blues.has(7)).toBe(false);
    });

    it("mission 1 — uniform distribution identical across player counts", () => {
      const states: ClientGameState[] = [];
      for (const count of [2, 3, 4, 5]) {
        const players: ClientPlayer[] = [];
        for (let i = 0; i < count; i++) {
          players.push(makePlayer(`p${i}`, [hidden(`h${i}`)]));
        }
        states.push(makeGameStateExact(players, 1));
      }

      const distributions = states.map((s) => {
        const probs = computeOpponentProbabilities(s, s.players[1]);
        return probs.get(0)!;
      });

      for (const dist of distributions) {
        expect(dist.blues.size).toBe(6);
        for (const [, p] of dist.blues) {
          expect(p).toBeCloseTo(1 / 6, 10);
        }
      }
    });

    it("mission 4, 2 players — 1 red + 4 yellow = 53 total", () => {
      const me = makePlayer("me", [hidden("h1"), hidden("h2")]);
      const opp = makePlayer("opp", [hidden("h3"), hidden("h4")]);
      const state = makeGameStateExact([me, opp], 4);

      const prob = computeOpponentProbabilities(state, opp).get(0)!;

      for (let v = 1; v <= 12; v++) {
        expect(prob.blues.has(v)).toBe(true);
      }
      expect(prob.red).toBeGreaterThan(0);
      expect(prob.yellow).toBeGreaterThan(0);
      expect(sumProbs(prob)).toBeCloseTo(1, 10);
    });

    it("mission 4, 2p vs 3p — yellow probability differs due to count change", () => {
      const me2 = makePlayer("me", [hidden("h1")]);
      const opp2 = makePlayer("opp", [hidden("h2")]);
      const state2 = makeGameStateExact([me2, opp2], 4);

      const me3 = makePlayer("me", [hidden("h1")]);
      const opp3 = makePlayer("opp", [hidden("h2")]);
      const pad3 = makePlayer("pad", [hidden("h3")]);
      const state3 = makeGameStateExact([me3, opp3, pad3], 4);

      const prob2 = computeOpponentProbabilities(state2, opp2).get(0)!;
      const prob3 = computeOpponentProbabilities(state3, opp3).get(0)!;

      // 2p: 4 yellow / 53. 3p: 2 yellow / 51.
      expect(prob2.yellow).toBeCloseTo(4 / 53, 10);
      expect(prob3.yellow).toBeCloseTo(2 / 51, 10);
      expect(prob2.yellow).toBeGreaterThan(prob3.yellow);
    });

    it("mission 4, 2p vs 3p — red probability differs due to pool size", () => {
      const me2 = makePlayer("me", [hidden("h1")]);
      const opp2 = makePlayer("opp", [hidden("h2")]);
      const state2 = makeGameStateExact([me2, opp2], 4);

      const me3 = makePlayer("me", [hidden("h1")]);
      const opp3 = makePlayer("opp", [hidden("h2")]);
      const pad3 = makePlayer("pad", [hidden("h3")]);
      const state3 = makeGameStateExact([me3, opp3, pad3], 4);

      const prob2 = computeOpponentProbabilities(state2, opp2).get(0)!;
      const prob3 = computeOpponentProbabilities(state3, opp3).get(0)!;

      // Both 1 red, but pool 53 vs 51
      expect(prob2.red).toBeCloseTo(1 / 53, 10);
      expect(prob3.red).toBeCloseTo(1 / 51, 10);
    });

    it("mission 4, 4p and 5p — same config as 3p", () => {
      const makePlayers = (count: number): ClientPlayer[] =>
        Array.from({ length: count }, (_, i) => makePlayer(`p${i}`, [hidden(`h${i}`)]));

      const players3 = makePlayers(3);
      const players4 = makePlayers(4);
      const players5 = makePlayers(5);

      const prob3 = computeOpponentProbabilities(makeGameStateExact(players3, 4), players3[1]).get(0)!;
      const prob4 = computeOpponentProbabilities(makeGameStateExact(players4, 4), players4[1]).get(0)!;
      const prob5 = computeOpponentProbabilities(makeGameStateExact(players5, 4), players5[1]).get(0)!;

      expect(prob4.yellow).toBeCloseTo(prob3.yellow, 10);
      expect(prob5.yellow).toBeCloseTo(prob3.yellow, 10);
      expect(prob4.red).toBeCloseTo(prob3.red, 10);
      expect(prob5.red).toBeCloseTo(prob3.red, 10);
    });

    it("padded makeGameState sees 3 players even when given 2", () => {
      const me = makePlayer("me", [hidden("h1")]);
      const opp = makePlayer("opp", [hidden("h2")]);

      const padded = makeGameState([me, opp], 4);
      const exact = makeGameStateExact([me, opp], 4);

      expect(padded.players.length).toBe(3);
      expect(exact.players.length).toBe(2);

      const probPadded = computeOpponentProbabilities(padded, opp).get(0)!;
      const probExact = computeOpponentProbabilities(exact, opp).get(0)!;

      expect(probExact.yellow).toBeCloseTo(4 / 53, 10);
      expect(probPadded.yellow).toBeCloseTo(2 / 51, 10);
    });
  });

  // =========================================================================
  // Upside-down / visible uncut tiles
  // =========================================================================

  describe("upside-down / visible uncut tiles", () => {
    it("upside-down tile on opponent stand is counted as visible for pool subtraction", () => {
      const me = makePlayer("me", [blue(1)]);
      const opp = makePlayer("opp", [
        blue(2, false, "ud2"), // upside-down: visible + uncut
        hidden("h1"),
      ]);
      const state = makeGameState([me, opp]);

      const prob = computeOpponentProbabilities(state, opp).get(1)!;

      // Visible: 1×val-1, 1×val-2. Remaining = 22. Bounds (2, +∞) for h1.
      // Eligible: val-3(4), val-4(4), val-5(4), val-6(4) = 16
      expect(prob.blues.get(3)).toBeCloseTo(4 / 16, 10);
      expect(prob.blues.has(1)).toBe(false);
      expect(prob.blues.has(2)).toBe(false);
      expect(sumProbs(prob)).toBeCloseTo(1.0, 10);
    });

    it("upside-down tile on opponent stand is skipped (no probability entry)", () => {
      const me = makePlayer("me", [blue(1)]);
      const opp = makePlayer("opp", [
        blue(3, false, "ud3"),
        hidden("h1"),
        hidden("h2"),
      ]);
      const state = makeGameState([me, opp]);

      const probs = computeOpponentProbabilities(state, opp);
      expect(probs.has(0)).toBe(false); // skipped — already known
      expect(probs.has(1)).toBe(true);
      expect(probs.has(2)).toBe(true);
    });

    it("upside-down tile provides sort bounds for adjacent hidden tiles", () => {
      const me = makePlayer("me", [blue(1)]);
      const opp = makePlayer("opp", [
        hidden("h0"),
        blue(4, false, "ud4"),
        hidden("h2"),
      ]);
      const state = makeGameState([me, opp]);

      const probs = computeOpponentProbabilities(state, opp);
      const p0 = probs.get(0)!;
      const p2 = probs.get(2)!;

      // h0: bounds (-∞, 4) → values 1,2,3
      expect(p0.blues.has(1)).toBe(true);
      expect(p0.blues.has(2)).toBe(true);
      expect(p0.blues.has(3)).toBe(true);
      expect(p0.blues.has(4)).toBe(false);
      expect(sumProbs(p0)).toBeCloseTo(1.0, 10);

      // h2: bounds (4, +∞) → values 5,6
      expect(p2.blues.has(5)).toBe(true);
      expect(p2.blues.has(6)).toBe(true);
      expect(p2.blues.has(4)).toBe(false);
      expect(sumProbs(p2)).toBeCloseTo(1.0, 10);
    });

    it("multiple upside-down tiles with hidden tiles between them", () => {
      const me = makePlayer("me", [blue(1)]);
      const opp = makePlayer("opp", [
        blue(2, false, "ud2"),
        hidden("h1"),
        blue(5, false, "ud5"),
      ]);
      const state = makeGameState([me, opp]);

      const probs = computeOpponentProbabilities(state, opp);
      expect(probs.has(0)).toBe(false);
      expect(probs.has(2)).toBe(false);

      const p1 = probs.get(1)!;
      // Bounded (2, 5) → values 3,4. Visible: val-1, val-2, val-5.
      expect(p1.blues.get(3)).toBeCloseTo(4 / 8, 10);
      expect(p1.blues.get(4)).toBeCloseTo(4 / 8, 10);
      expect(sumProbs(p1)).toBeCloseTo(1.0, 10);
    });

    it("mix of cut, upside-down, and hidden tiles on same stand", () => {
      const me = makePlayer("me", [blue(2)]);
      const opp = makePlayer("opp", [
        blue(1, true, "cut1"),
        blue(3, false, "ud3"),
        hidden("h2"),
        hidden("h3"),
      ]);
      const state = makeGameState([me, opp]);

      const probs = computeOpponentProbabilities(state, opp);
      expect(probs.has(0)).toBe(false); // cut
      expect(probs.has(1)).toBe(false); // upside-down
      expect(probs.has(2)).toBe(true);
      expect(probs.has(3)).toBe(true);

      const p2 = probs.get(2)!;
      // Visible: val-1(cut), val-3(ud), val-2(me). Remaining = 21.
      // Bounds (3, +∞) → values 4,5,6. Each 4 copies. Total eligible = 12.
      expect(p2.blues.get(4)).toBeCloseTo(4 / 12, 10);
      expect(p2.blues.get(5)).toBeCloseTo(4 / 12, 10);
      expect(p2.blues.get(6)).toBeCloseTo(4 / 12, 10);
      expect(sumProbs(p2)).toBeCloseTo(1.0, 10);
    });

    it("upside-down tiles on a different opponent reduce pool for target", () => {
      const me = makePlayer("me", [blue(1)]);
      const opp1 = makePlayer("opp1", [hidden("h0")]);
      const opp2 = makePlayer("opp2", [
        blue(4, false, "ud4a"),
        blue(4, false, "ud4b"),
      ]);
      const state = makeGameState([me, opp1, opp2]);

      const prob = computeOpponentProbabilities(state, opp1).get(0)!;

      // Visible: val-1(me), 2×val-4(opp2). Remaining = 21.
      expect(prob.blues.get(1)).toBeCloseTo(3 / 21, 10);
      expect(prob.blues.get(4)).toBeCloseTo(2 / 21, 10);
      expect(prob.blues.get(2)).toBeCloseTo(4 / 21, 10);
      expect(sumProbs(prob)).toBeCloseTo(1.0, 10);
    });
  });

  // =========================================================================
  // Large/complex stands and stress scenarios
  // =========================================================================

  describe("large/complex stands and stress scenarios", () => {
    it("stand with 12 tiles: multiple bounded regions verified independently", () => {
      // Mission 4 (3p): 51 total. Opp has 6 cut blues + 6 hidden tiles.
      const me = makePlayer("me", []);
      const opp = makePlayer("opp", [
        blue(1, true, "o0"), hidden("o1"), blue(3, true, "o2"), hidden("o3"),
        blue(5, true, "o4"), hidden("o5"), hidden("o6"), blue(8, true, "o7"),
        hidden("o8"), blue(10, true, "o9"), hidden("o10"), blue(12, true, "o11"),
      ]);
      const gs = makeGameState([me, opp], 4);
      const probs = computeOpponentProbabilities(gs, opp);

      // idx 1: bounds (1, 3) → blue2. Red: {1.5,2.5}→2/11. Yellow: {1.1,2.1}→2×2/11=4/11
      // total = 4 + 2/11 + 4/11 = 50/11
      const p1 = probs.get(1)!;
      expect(sumProbs(p1)).toBeCloseTo(1.0, 10);
      expect(p1.blues.get(2)).toBeCloseTo(22 / 25, 10);
      expect(p1.red).toBeCloseTo(1 / 25, 10);
      expect(p1.yellow).toBeCloseTo(2 / 25, 10);

      // idx 5,6: bounds (5, 8) → blue6, blue7. Red: 3/11. Yellow: 6/11. Total = 97/11.
      const p5 = probs.get(5)!;
      expect(sumProbs(p5)).toBeCloseTo(1.0, 10);
      expect(p5.blues.get(6)).toBeCloseTo(44 / 97, 10);
      expect(p5.blues.get(7)).toBeCloseTo(44 / 97, 10);
      expect(p5.red).toBeCloseTo(3 / 97, 10);
      expect(p5.yellow).toBeCloseTo(6 / 97, 10);

      // idx 6 same as idx 5
      const p6 = probs.get(6)!;
      expect(p6.blues.get(6)).toBeCloseTo(44 / 97, 10);
    });

    it("near-complete information: 50 of 51 tiles visible, 1 hidden", () => {
      // Mission 4 (3p): 51 total. Viewer sees 44 blue + 1 red + 2 yellow + 3 cut blue12.
      const viewerHand: VisibleTile[] = [];
      for (let v = 1; v <= 11; v++) {
        for (let c = 0; c < 4; c++) {
          viewerHand.push(blue(v, false, `me_b${v}_${c}`));
        }
      }
      viewerHand.push(red(5.5, true, "me_r0"));
      viewerHand.push(yellow(3.1, true, "me_y0"));
      viewerHand.push(yellow(7.1, true, "me_y1"));

      const other = makePlayer("other", [
        blue(12, true, "ot_b12_0"), blue(12, true, "ot_b12_1"), blue(12, true, "ot_b12_2"),
      ]);
      const opp = makePlayer("opp", [hidden("opp_h0")]);
      const me = makePlayer("me", viewerHand);
      const gs = makeGameState([me, opp, other], 4);

      const p0 = computeOpponentProbabilities(gs, opp).get(0)!;
      expect(p0.blues.get(12)).toBeCloseTo(1.0, 10);
      expect(p0.red).toBeCloseTo(0, 10);
      expect(p0.yellow).toBeCloseTo(0, 10);
      expect(p0.blues.size).toBe(1);
    });

    it("all but one blue value depleted: only that value + red/yellow remain", () => {
      // Mission 4: viewer sees all copies of blue 1-11. Remaining: blue12×4, red×1, yellow×2 = 7.
      const viewerHand: VisibleTile[] = [];
      for (let v = 1; v <= 11; v++) {
        for (let c = 0; c < 4; c++) {
          viewerHand.push(blue(v, false, `me_b${v}_${c}`));
        }
      }
      const me = makePlayer("me", viewerHand);
      const opp = makePlayer("opp", [hidden("opp_h0")]);
      const gs = makeGameState([me, opp], 4);

      const p0 = computeOpponentProbabilities(gs, opp).get(0)!;
      expect(p0.blues.get(12)).toBeCloseTo(4 / 7, 10);
      expect(p0.red).toBeCloseTo(1 / 7, 10);
      expect(p0.yellow).toBeCloseTo(2 / 7, 10);
      for (let v = 1; v <= 11; v++) {
        expect(p0.blues.has(v)).toBe(false);
      }
    });

    it("maximum pool depletion with tight bounds", () => {
      // Mission 4: viewer sees all blue 1-5 and 8-12, plus red and one yellow.
      // Remaining: blue6×4, blue7×4, yellow×1. Bounds (5, 8).
      const viewerHand: VisibleTile[] = [];
      for (const v of [1, 2, 3, 4, 5, 8, 9, 10, 11, 12]) {
        for (let c = 0; c < 4; c++) {
          viewerHand.push(blue(v, false, `me_b${v}_${c}`));
        }
      }
      viewerHand.push(red(5.5, true, "me_r0"));
      viewerHand.push(yellow(3.1, true, "me_y0"));

      const me = makePlayer("me", viewerHand);
      const opp = makePlayer("opp", [
        blue(5, true, "opp_b5"), hidden("opp_h"), blue(8, true, "opp_b8"),
      ]);
      const gs = makeGameState([me, opp], 4);

      const p1 = computeOpponentProbabilities(gs, opp).get(1)!;
      // Blue6(4), blue7(4). Yellow: 1 remaining, unobserved=10, eligible in (5,8)={5.1,6.1,7.1}=3/10=0.3
      // Total = 8 + 0.3 = 83/10
      expect(p1.blues.get(6)).toBeCloseTo(40 / 83, 10);
      expect(p1.blues.get(7)).toBeCloseTo(40 / 83, 10);
      expect(p1.red).toBeCloseTo(0, 10);
      expect(p1.yellow).toBeCloseTo(3 / 83, 10);
      expect(sumProbs(p1)).toBeCloseTo(1.0, 10);
    });

    it("8 all-hidden tiles get identical unbounded distributions", () => {
      const oppHand = Array.from({ length: 8 }, (_, i) => hidden(`opp_h${i}`));
      const me = makePlayer("me", []);
      const opp = makePlayer("opp", oppHand);
      const gs = makeGameState([me, opp], 4);
      const probs = computeOpponentProbabilities(gs, opp);

      expect(probs.size).toBe(8);
      const ref = probs.get(0)!;
      for (let i = 0; i < 8; i++) {
        const p = probs.get(i)!;
        expect(sumProbs(p)).toBeCloseTo(1.0, 10);
        for (let v = 1; v <= 12; v++) {
          expect(p.blues.get(v)).toBeCloseTo(4 / 51, 10);
        }
        expect(p.red).toBeCloseTo(1 / 51, 10);
        expect(p.yellow).toBeCloseTo(2 / 51, 10);
      }
    });

    it("alternating cut-hidden pattern: each hidden has unique tight bounds", () => {
      // [blue2(cut), H, blue4(cut), H, blue7(cut), H, blue11(cut)]
      const me = makePlayer("me", []);
      const opp = makePlayer("opp", [
        blue(2, true, "opp_b2"), hidden("opp_h1"), blue(4, true, "opp_b4"),
        hidden("opp_h3"), blue(7, true, "opp_b7"), hidden("opp_h5"), blue(11, true, "opp_b11"),
      ]);
      const gs = makeGameState([me, opp], 4);
      const probs = computeOpponentProbabilities(gs, opp);

      expect(probs.size).toBe(3);

      // idx 1: bounds (2,4) → blue3. Red: 2/11. Yellow: 4/11. Total = 50/11
      const p1 = probs.get(1)!;
      expect(p1.blues.get(3)).toBeCloseTo(44 / 50, 10);
      expect(p1.red).toBeCloseTo(2 / 50, 10);
      expect(p1.yellow).toBeCloseTo(4 / 50, 10);

      // idx 3: bounds (4,7) → blue5,6. Red: 3/11. Yellow: 6/11. Total = 97/11
      const p3 = probs.get(3)!;
      expect(p3.blues.get(5)).toBeCloseTo(44 / 97, 10);
      expect(p3.blues.get(6)).toBeCloseTo(44 / 97, 10);
      expect(p3.red).toBeCloseTo(3 / 97, 10);
      expect(p3.yellow).toBeCloseTo(6 / 97, 10);

      // idx 5: bounds (7,11) → blue8,9,10. Red: 4/11. Yellow: 8/11. Total = 144/11
      const p5 = probs.get(5)!;
      expect(p5.blues.get(8)).toBeCloseTo(44 / 144, 10);
      expect(p5.blues.get(9)).toBeCloseTo(44 / 144, 10);
      expect(p5.blues.get(10)).toBeCloseTo(44 / 144, 10);
      expect(p5.red).toBeCloseTo(4 / 144, 10);
      expect(p5.yellow).toBeCloseTo(8 / 144, 10);
    });

    it("near-boundary sortValues: .5 and .1 boundaries are exclusive", () => {
      // Bound at red 3.5: blue3 excluded (3 < 3.5), blue4 included
      const me = makePlayer("me", []);
      const opp1 = makePlayer("opp1", [
        red(3.5, true, "opp1_r"), hidden("opp1_h"), blue(7, true, "opp1_b7"),
      ]);
      const gs1 = makeGameState([me, opp1], 4);
      const p1 = computeOpponentProbabilities(gs1, opp1).get(1)!;

      expect(p1.blues.has(3)).toBe(false);
      expect(p1.blues.has(4)).toBe(true);
      expect(p1.red).toBeCloseTo(0, 10); // red fully depleted
      expect(sumProbs(p1)).toBeCloseTo(1.0, 10);

      // Bound at yellow 3.1: blue3 excluded (3 < 3.1), blue4 included
      const opp2 = makePlayer("opp2", [
        yellow(3.1, true, "opp2_y"), hidden("opp2_h"), blue(7, true, "opp2_b7"),
      ]);
      const gs2 = makeGameState([me, opp2], 4);
      const p2 = computeOpponentProbabilities(gs2, opp2).get(1)!;

      expect(p2.blues.has(3)).toBe(false);
      expect(p2.blues.has(4)).toBe(true);
      expect(sumProbs(p2)).toBeCloseTo(1.0, 10);

      // Bound at exact integer 3: blue3 excluded (3 not > 3)
      const opp3 = makePlayer("opp3", [
        blue(3, true, "opp3_b3"), hidden("opp3_h"), blue(5, true, "opp3_b5"),
      ]);
      const gs3 = makeGameState([me, opp3], 4);
      const p3 = computeOpponentProbabilities(gs3, opp3).get(1)!;

      expect(p3.blues.has(3)).toBe(false);
      expect(p3.blues.has(5)).toBe(false);
      expect(p3.blues.has(4)).toBe(true);
    });
  });

  // =========================================================================
  // Custom candidate restrictions
  // =========================================================================

  describe("custom candidate restrictions", () => {
    it("mission 46 fixed yellow: bounded weighting uses 4 candidates not 11", () => {
      // Bounds (7, +∞): with 4 candidates [5.1,6.1,7.1,8.1], eligible = {7.1,8.1} → 2/4
      // Weight = 4 × 2/4 = 2 (vs 4 × 5/11 ≈ 1.818 if 11 candidates)
      const me = makePlayer("me", []);
      const opp = makePlayer("opp", [blue(7, true, "cut7"), hidden("h1")]);
      const state = makeGameState([me, opp], 46);

      const prob = computeOpponentProbabilities(state, opp).get(1)!;

      const yellowW = 4 * (2 / 4); // = 2
      const total = 20 + yellowW; // blue 8-12 = 5×4 = 20
      expect(prob.yellow).toBeCloseTo(yellowW / total, 10);
      expect(prob.blues.get(8)).toBeCloseTo(4 / total, 10);
      expect(prob.red).toBe(0);
      expect(sumProbs(prob)).toBeCloseTo(1.0, 10);
    });

    it("mission 46: bounds include ALL fixed candidates", () => {
      // Bounds (4, 9): all 4 candidates eligible → weight = 4 × 4/4 = 4
      const me = makePlayer("me", []);
      const opp = makePlayer("opp", [blue(4, true), hidden("h1"), blue(9, true)]);
      const state = makeGameState([me, opp], 46);

      const prob = computeOpponentProbabilities(state, opp).get(1)!;
      const total = 16 + 4; // blue5-8 = 4×4, yellow weight = 4
      expect(prob.yellow).toBeCloseTo(4 / total, 10);
      expect(prob.blues.has(4)).toBe(false);
      expect(prob.blues.has(9)).toBe(false);
      expect(sumProbs(prob)).toBeCloseTo(1.0, 10);
    });

    it("mission 46: bounds include NONE of the fixed candidates", () => {
      // Bounds (9, +∞): no yellow candidates → yellow = 0
      const me = makePlayer("me", []);
      const opp = makePlayer("opp", [blue(9, true), hidden("h1")]);
      const state = makeGameState([me, opp], 46);

      const prob = computeOpponentProbabilities(state, opp).get(1)!;
      expect(prob.yellow).toBe(0);
      expect(prob.red).toBe(0);
      expect(prob.blues.get(10)).toBeCloseTo(4 / 12, 10);
      expect(sumProbs(prob)).toBeCloseTo(1.0, 10);
    });

    it("mission 46: observed yellow narrows fixed candidate pool", () => {
      // 2 yellows cut at 5.1 and 6.1. Remaining=2. Unobserved={7.1,8.1}.
      // Bounds (6, 8): eligible unobserved = {7.1} → 1 of 2. Weight = 2 × 1/2 = 1.
      const me = makePlayer("me", []);
      const other1 = makePlayer("other1", [yellow(5.1, true, "cy1")]);
      const other2 = makePlayer("other2", [yellow(6.1, true, "cy2")]);
      const opp = makePlayer("opp", [blue(6, true), hidden("h1"), blue(8, true)]);
      const state = makeGameState([me, other1, other2, opp], 46);

      const prob = computeOpponentProbabilities(state, opp).get(1)!;
      const total = 4 + 1; // blue7(4) + yellow weight(1)
      expect(prob.blues.get(7)).toBeCloseTo(4 / total, 10);
      expect(prob.yellow).toBeCloseTo(1 / total, 10);
      expect(sumProbs(prob)).toBeCloseTo(1.0, 10);
    });

    it("mission 54: fixed(redAll) has 11 candidates", () => {
      const me = makePlayer("me", []);
      const opp = makePlayer("opp", [hidden("h0")]);
      const state = makeGameState([me, opp], 54);

      const prob = computeOpponentProbabilities(state, opp).get(0)!;
      // 48 blue + 11 red = 59
      expect(prob.red).toBeCloseTo(11 / 59, 10);
      expect(prob.yellow).toBe(0);
      expect(sumProbs(prob)).toBeCloseTo(1.0, 10);
    });
  });

  // =========================================================================
  // Error handling and robustness
  // =========================================================================

  describe("error handling and robustness", () => {
    it("invalid mission number (9999) returns empty map", () => {
      const me = makePlayer("me", [blue(1)]);
      const opp = makePlayer("opp", [hidden("h0")]);
      const state = makeGameState([me, opp], 9999);

      expect(computeOpponentProbabilities(state, opp).size).toBe(0);
    });

    it("mission 0 returns empty map", () => {
      const me = makePlayer("me", [blue(1)]);
      const opp = makePlayer("opp", [hidden("h0")]);
      const state = makeGameState([me, opp], 0);

      expect(computeOpponentProbabilities(state, opp).size).toBe(0);
    });

    it("negative mission number returns empty map", () => {
      const me = makePlayer("me", [blue(1)]);
      const opp = makePlayer("opp", [hidden("h0")]);
      const state = makeGameState([me, opp], -5);

      expect(computeOpponentProbabilities(state, opp).size).toBe(0);
    });

    it("opponent not in players list still returns probabilities", () => {
      const me = makePlayer("me", [blue(1), blue(2)]);
      const inGameOpp = makePlayer("inGame", [blue(3, true, "cut3")]);
      const state = makeGameState([me, inGameOpp], 1);

      const outsideOpp = makePlayer("outsider", [hidden("h0"), hidden("h1")]);

      const probs = computeOpponentProbabilities(state, outsideOpp);
      expect(probs.size).toBe(2);

      // Pool reduced by me's tiles and inGameOpp's cut. Remaining = 21.
      const p0 = probs.get(0)!;
      expect(p0.blues.get(1)).toBeCloseTo(3 / 21, 10);
      expect(p0.blues.get(4)).toBeCloseTo(4 / 21, 10);
      expect(sumProbs(p0)).toBeCloseTo(1.0, 10);
    });

    it("duplicate tile IDs do not affect probability calculation", () => {
      const me = makePlayer("me", [
        blue(1, false, "dupeId"),
        blue(2, false, "dupeId"),
      ]);
      const opp = makePlayer("opp", [hidden("h0")]);
      const state = makeGameState([me, opp], 1);

      const prob = computeOpponentProbabilities(state, opp).get(0)!;
      expect(prob.blues.get(1)).toBeCloseTo(3 / 22, 10);
      expect(prob.blues.get(2)).toBeCloseTo(3 / 22, 10);
      expect(prob.blues.get(3)).toBeCloseTo(4 / 22, 10);
      expect(sumProbs(prob)).toBeCloseTo(1.0, 10);
    });

    it("isXMarked tiles are counted normally if visible", () => {
      const xMarkedBlue: VisibleTile = {
        id: "xm1", cut: false, color: "blue", gameValue: 3, sortValue: 3,
        image: "blue_3.png", isXMarked: true,
      };
      const me = makePlayer("me", [xMarkedBlue]);
      const opp = makePlayer("opp", [hidden("h0")]);
      const state = makeGameState([me, opp], 1);

      const prob = computeOpponentProbabilities(state, opp).get(0)!;
      expect(prob.blues.get(3)).toBeCloseTo(3 / 23, 10);
      expect(prob.blues.get(1)).toBeCloseTo(4 / 23, 10);
      expect(sumProbs(prob)).toBeCloseTo(1.0, 10);
    });

    it("isXMarked cut tile provides sort bounds", () => {
      const xMarkedCut: VisibleTile = {
        id: "xmc", cut: true, color: "blue", gameValue: 5, sortValue: 5,
        image: "blue_5.png", isXMarked: true,
      };
      const me = makePlayer("me", []);
      const opp = makePlayer("opp", [xMarkedCut, hidden("h1")]);
      const state = makeGameState([me, opp], 1);

      const prob = computeOpponentProbabilities(state, opp).get(1)!;
      // Bounds (5, +∞) → only blue 6
      expect(prob.blues.size).toBe(1);
      expect(prob.blues.get(6)).toBeCloseTo(1.0, 10);
    });
  });

  // =========================================================================
  // Multi-opponent independence
  // =========================================================================

  describe("multi-opponent independence", () => {
    it("same visible info → same probabilities for different opponents", () => {
      const me = makePlayer("me", [blue(1), blue(2), blue(3), blue(4), blue(5), blue(6)]);
      const opp1 = makePlayer("opp1", [hidden("h0")]);
      const opp2 = makePlayer("opp2", [hidden("h1")]);
      const gs = makeGameState([me, opp1, opp2]);

      const p1 = computeOpponentProbabilities(gs, opp1).get(0)!;
      const p2 = computeOpponentProbabilities(gs, opp2).get(0)!;

      for (let v = 1; v <= 6; v++) {
        expect(p1.blues.get(v)).toBe(p2.blues.get(v));
        expect(p1.blues.get(v)).toBeCloseTo(3 / 18, 10);
      }
    });

    it("cut tiles on opponent A affect probabilities for opponent B", () => {
      const me = makePlayer("me", [blue(1), blue(2)]);
      const opp1 = makePlayer("opp1", [blue(3, true, "b3cut"), hidden("h0")]);
      const opp2 = makePlayer("opp2", [hidden("h1")]);
      const gs = makeGameState([me, opp1, opp2]);

      const p = computeOpponentProbabilities(gs, opp2).get(0)!;

      // Visible: val-1, val-2, val-3. Remaining = 21.
      expect(p.blues.get(1)).toBeCloseTo(3 / 21, 10);
      expect(p.blues.get(3)).toBeCloseTo(3 / 21, 10);
      expect(p.blues.get(4)).toBeCloseTo(4 / 21, 10);
      expect(sumProbs(p)).toBeCloseTo(1.0, 10);
    });

    it("hidden tiles on opponent A do NOT affect opponent B pool", () => {
      const me = makePlayer("me", [blue(1)]);
      const opp1 = makePlayer("opp1", [
        hidden("h0"), hidden("h1"), hidden("h2"), hidden("h3"), hidden("h4"),
      ]);
      const opp2 = makePlayer("opp2", [hidden("h5")]);
      const gs = makeGameState([me, opp1, opp2]);

      const p = computeOpponentProbabilities(gs, opp2).get(0)!;

      // Only me's blue-1 visible. Remaining = 23.
      expect(p.blues.get(1)).toBeCloseTo(3 / 23, 10);
      for (let v = 2; v <= 6; v++) {
        expect(p.blues.get(v)).toBeCloseTo(4 / 23, 10);
      }
    });

    it("computing probs for opp1 then opp2 is order-independent", () => {
      const me = makePlayer("me", [blue(1), blue(2), blue(3)]);
      const opp1 = makePlayer("opp1", [blue(4, true, "b4cut"), hidden("h0")]);
      const opp2 = makePlayer("opp2", [blue(5, true, "b5cut"), hidden("h1")]);
      const gs = makeGameState([me, opp1, opp2]);

      const p1A = computeOpponentProbabilities(gs, opp1).get(1)!;
      const p2A = computeOpponentProbabilities(gs, opp2).get(1)!;
      const p2B = computeOpponentProbabilities(gs, opp2).get(1)!;
      const p1B = computeOpponentProbabilities(gs, opp1).get(1)!;

      for (let v = 1; v <= 6; v++) {
        expect(p1A.blues.get(v) ?? 0).toBe(p1B.blues.get(v) ?? 0);
        expect(p2A.blues.get(v) ?? 0).toBe(p2B.blues.get(v) ?? 0);
      }
    });

    it("4-player game: cuts from 3 opponents all reduce pool", () => {
      const me = makePlayer("me", [blue(1), blue(2)]);
      const opp1 = makePlayer("opp1", [blue(3, true, "b3cut"), hidden("h0")]);
      const opp2 = makePlayer("opp2", [blue(3, true, "b3cut2"), hidden("h1")]);
      const opp3 = makePlayer("opp3", [blue(4, true, "b4cut"), hidden("h2")]);
      const gs = makeGameState([me, opp1, opp2, opp3]);

      // Visible: val-1, val-2, 2×val-3, val-4. Remaining = 19.
      // opp3's hidden tile is at index 1 (after cut blue-4), bounds (4, +∞) → val 5, 6.
      const p3 = computeOpponentProbabilities(gs, opp3).get(1)!;
      // Eligible in (4, +∞): val-5(4), val-6(4) = 8
      expect(p3.blues.get(5)).toBeCloseTo(4 / 8, 10);
      expect(p3.blues.get(6)).toBeCloseTo(4 / 8, 10);
      expect(sumProbs(p3)).toBeCloseTo(1.0, 10);
    });
  });

  // =========================================================================
  // Tile transfer and special properties
  // =========================================================================

  describe("tile transfer and special properties", () => {
    it("tile with originalOwnerId is counted normally in pool subtraction", () => {
      const transferredBlue: VisibleTile = {
        id: "b2t", cut: false, color: "blue", gameValue: 2,
        sortValue: 2, image: "blue_2.png", originalOwnerId: "opp1",
      };
      const me = makePlayer("me", [blue(1), transferredBlue]);
      const opp = makePlayer("opp", [hidden("h0")]);
      const gs = makeGameState([me, opp]);

      const p = computeOpponentProbabilities(gs, opp).get(0)!;
      expect(p.blues.get(1)).toBeCloseTo(3 / 22, 10);
      expect(p.blues.get(2)).toBeCloseTo(3 / 22, 10);
      expect(p.blues.get(3)).toBeCloseTo(4 / 22, 10);
      expect(sumProbs(p)).toBeCloseTo(1.0, 10);
    });

    it("mixed transferred and normal tiles both reduce the pool", () => {
      const transferredBlue2: VisibleTile = {
        id: "b2t", cut: false, color: "blue", gameValue: 2,
        sortValue: 2, image: "blue_2.png", originalOwnerId: "opp1",
      };
      const xMarkedBlue3: VisibleTile = {
        id: "b3x", cut: false, color: "blue", gameValue: 3,
        sortValue: 3, image: "blue_3.png", isXMarked: true,
      };
      const opp1CutBlue1: VisibleTile = {
        id: "b1c", cut: true, color: "blue", gameValue: 1,
        sortValue: 1, image: "blue_1.png", originalOwnerId: "me",
      };

      const me = makePlayer("me", [blue(1), transferredBlue2, xMarkedBlue3]);
      const opp = makePlayer("opp", [opp1CutBlue1, hidden("h0")]);
      const gs = makeGameState([me, opp]);

      const p = computeOpponentProbabilities(gs, opp).get(1)!;
      // Visible: 2×val-1, val-2, val-3. Remaining = 20.
      // Bounds (1, +∞) → values 2-6. Eligible: val-2(3), val-3(3), val-4(4), val-5(4), val-6(4) = 18
      expect(p.blues.has(1)).toBe(false);
      expect(p.blues.get(2)).toBeCloseTo(3 / 18, 10);
      expect(p.blues.get(4)).toBeCloseTo(4 / 18, 10);
      expect(sumProbs(p)).toBeCloseTo(1.0, 10);
    });
  });
});

// ===========================================================================
// multi-stand bounds
// ===========================================================================

describe("multi-stand bounds", () => {
  describe("getPositionBounds with standSizes", () => {
    it("single stand (default) — no standSizes arg", () => {
      const hand = [blue(3, true), hidden(), blue(7, true)];
      expect(getPositionBounds(hand, 1)).toEqual({ lower: 3, upper: 7 });
    });

    it("single stand explicit — standSizes: [3]", () => {
      const hand = [blue(3, true), hidden(), blue(7, true)];
      expect(getPositionBounds(hand, 1, [3])).toEqual({ lower: 3, upper: 7 });
    });

    it("two stands, first stand — bounded within stand 1 only", () => {
      const hand = [blue(3, true), hidden(), blue(7, true), blue(1, true), hidden()];
      // Index 1 is in stand 1 [0..2]. blue(1) at index 3 is in stand 2 and must NOT affect bounds.
      expect(getPositionBounds(hand, 1, [3, 2])).toEqual({ lower: 3, upper: 7 });
    });

    it("two stands, second stand — bounded within stand 2 only", () => {
      const hand = [blue(3, true), hidden(), blue(7, true), blue(1, true), hidden()];
      // Index 4 is in stand 2 [3..4]. blue(7) at index 2 is in stand 1 and must NOT affect bounds.
      expect(getPositionBounds(hand, 4, [3, 2])).toEqual({ lower: 1, upper: Infinity });
    });

    it("stand boundary: hidden at end of first stand has no upper from stand 2", () => {
      const hand = [blue(3, true), hidden(), hidden(), blue(1, true), blue(5, true)];
      // Index 2 is in stand 1 [0..2]. No visible tile above within stand 1 → upper = Infinity.
      expect(getPositionBounds(hand, 2, [3, 2])).toEqual({ lower: 3, upper: Infinity });
    });

    it("stand boundary: hidden at start of second stand has no lower from stand 1", () => {
      const hand = [blue(3, true), blue(5, true), blue(7, true), hidden(), blue(9, true)];
      // Index 3 is in stand 2 [3..4]. blue(7) at index 2 is in stand 1 and must NOT affect bounds.
      expect(getPositionBounds(hand, 3, [3, 2])).toEqual({ lower: -Infinity, upper: 9 });
    });
  });

  describe("computeOpponentProbabilities with multi-stand", () => {
    it("multi-stand opponent: bounds are per-stand", () => {
      // Mission 4 (3p): blue 1-12 (x4), 1 red, 2 yellow = 51 total
      const me = makePlayer("me", []);
      const opp = makePlayer("opp", [
        blue(10, true, "b10c"), hidden("h1"), blue(12, true, "b12c"),
        blue(1, true, "b1c"), hidden("h2"),
      ]);
      opp.standSizes = [3, 2];
      const gs = makeGameState([me, opp], 4);

      const probs = computeOpponentProbabilities(gs, opp);

      // h1 at index 1: stand 1 bounds (10, 12) → only blue 11 qualifies
      const p1 = probs.get(1)!;
      expect(p1.blues.get(11)!).toBeGreaterThan(0);
      // blue values outside (10, 12) should not appear
      expect(p1.blues.has(10)).toBe(false);
      expect(p1.blues.has(12)).toBe(false);
      expect(p1.blues.has(1)).toBe(false);
      expect(p1.blues.has(5)).toBe(false);

      // h2 at index 4: stand 2 bounds (1, +Infinity) → blues 2-12 qualify
      const p2 = probs.get(4)!;
      expect(p2.blues.has(1)).toBe(false); // not > 1
      expect(p2.blues.get(2)!).toBeGreaterThan(0);
      expect(p2.blues.get(11)!).toBeGreaterThan(0);
    });

    it("multi-stand: no cross-contamination between stands", () => {
      // Mission 4 (3p): blue 1-12 (x4), 1 red, 2 yellow
      // Stand 1: high values. Stand 2: low values.
      const me = makePlayer("me", []);
      const opp = makePlayer("opp", [
        blue(10, true, "b10c"), hidden("h1"),
        hidden("h2"), blue(3, true, "b3c"),
      ]);
      opp.standSizes = [2, 2];
      const gs = makeGameState([me, opp], 4);

      const probs = computeOpponentProbabilities(gs, opp);

      // h1 at index 1: stand 1 bounds (10, +Infinity) → blues > 10
      const p1 = probs.get(1)!;
      expect(p1.blues.has(3)).toBe(false);
      expect(p1.blues.has(10)).toBe(false);
      expect(p1.blues.get(11)!).toBeGreaterThan(0);
      expect(p1.blues.get(12)!).toBeGreaterThan(0);

      // h2 at index 2: stand 2 bounds (-Infinity, 3) → blues < 3
      const p2 = probs.get(2)!;
      expect(p2.blues.get(1)!).toBeGreaterThan(0);
      expect(p2.blues.get(2)!).toBeGreaterThan(0);
      expect(p2.blues.has(3)).toBe(false);
      expect(p2.blues.has(10)).toBe(false);
      expect(p2.blues.has(11)).toBe(false);
    });

    it("three stands — each stand is independent", () => {
      // Mission 4 (3p): blue 1-12 (x4), 1 red, 2 yellow
      const me = makePlayer("me", []);
      const opp = makePlayer("opp", [
        blue(5, true, "b5c"), hidden("h1"),
        blue(8, true, "b8c"), hidden("h2"),
        blue(2, true, "b2c"), hidden("h3"),
      ]);
      opp.standSizes = [2, 2, 2];
      const gs = makeGameState([me, opp], 4);

      const probs = computeOpponentProbabilities(gs, opp);

      // h1 at index 1: stand 1 bounds (5, +Infinity) → blues > 5
      const p1 = probs.get(1)!;
      expect(p1.blues.has(5)).toBe(false);
      expect(p1.blues.get(6)!).toBeGreaterThan(0);
      // Must not be bounded by blue(8) from stand 2
      expect(p1.blues.get(9)!).toBeGreaterThan(0);
      expect(p1.blues.get(12)!).toBeGreaterThan(0);

      // h2 at index 3: stand 2 bounds (8, +Infinity) → blues > 8
      const p2 = probs.get(3)!;
      expect(p2.blues.has(8)).toBe(false);
      expect(p2.blues.has(5)).toBe(false);
      expect(p2.blues.get(9)!).toBeGreaterThan(0);
      expect(p2.blues.get(12)!).toBeGreaterThan(0);

      // h3 at index 5: stand 3 bounds (2, +Infinity) → blues > 2
      const p3 = probs.get(5)!;
      expect(p3.blues.has(2)).toBe(false);
      expect(p3.blues.get(3)!).toBeGreaterThan(0);
      // Must not be bounded by blue(5) or blue(8) from other stands
      expect(p3.blues.get(6)!).toBeGreaterThan(0);
      expect(p3.blues.get(12)!).toBeGreaterThan(0);
    });
  });
});

// ===========================================================================
// getTopProbabilities
// ===========================================================================

describe("getTopProbabilities", () => {
  it("returns entries sorted by probability descending", () => {
    const prob: TileProbability = {
      blues: new Map([[1, 0.1], [2, 0.3], [3, 0.05]]),
      red: 0.4,
      yellow: 0.15,
    };

    const top = getTopProbabilities(prob, 5);
    expect(top.length).toBe(5);
    expect(top[0]).toEqual({ label: "R", pct: 40, color: "red" });
    expect(top[1]).toEqual({ label: "2", pct: 30, color: "blue" });
    expect(top[2]).toEqual({ label: "Y", pct: 15, color: "yellow" });
    expect(top[3]).toEqual({ label: "1", pct: 10, color: "blue" });
    expect(top[4]).toEqual({ label: "3", pct: 5, color: "blue" });
  });

  it("truncates to topN entries", () => {
    const prob: TileProbability = {
      blues: new Map([[1, 0.1], [2, 0.2], [3, 0.3], [4, 0.15], [5, 0.25]]),
      red: 0,
      yellow: 0,
    };

    const top = getTopProbabilities(prob, 2);
    expect(top.length).toBe(2);
    expect(top[0].label).toBe("3");
    expect(top[1].label).toBe("5");
  });

  it("defaults to 3 entries", () => {
    const prob: TileProbability = {
      blues: new Map([[1, 0.1], [2, 0.2], [3, 0.3], [4, 0.15], [5, 0.25]]),
      red: 0,
      yellow: 0,
    };

    const top = getTopProbabilities(prob);
    expect(top.length).toBe(3);
  });

  it("returns empty array when all probabilities are zero", () => {
    const prob: TileProbability = { blues: new Map(), red: 0, yellow: 0 };
    expect(getTopProbabilities(prob).length).toBe(0);
  });

  it("rounds percentages correctly", () => {
    const prob: TileProbability = {
      blues: new Map([[1, 1 / 3]]),
      red: 0,
      yellow: 0,
    };
    const top = getTopProbabilities(prob, 1);
    expect(top[0].pct).toBe(33);
  });

  it("assigns correct color labels", () => {
    const prob: TileProbability = {
      blues: new Map([[7, 0.5]]),
      red: 0.3,
      yellow: 0.2,
    };

    const top = getTopProbabilities(prob, 3);
    expect(top.find((e) => e.label === "7")!.color).toBe("blue");
    expect(top.find((e) => e.label === "R")!.color).toBe("red");
    expect(top.find((e) => e.label === "Y")!.color).toBe("yellow");
  });

  it("excludes red/yellow when their probability is zero", () => {
    const prob: TileProbability = {
      blues: new Map([[1, 0.5], [2, 0.5]]),
      red: 0,
      yellow: 0,
    };

    const top = getTopProbabilities(prob, 10);
    expect(top.length).toBe(2);
    expect(top.find((e) => e.label === "R")).toBeUndefined();
    expect(top.find((e) => e.label === "Y")).toBeUndefined();
  });

  it("returns fewer than topN when not enough distinct values", () => {
    const prob: TileProbability = {
      blues: new Map([[1, 0.8]]),
      red: 0.2,
      yellow: 0,
    };

    const top = getTopProbabilities(prob, 5);
    expect(top.length).toBe(2);
  });
});
