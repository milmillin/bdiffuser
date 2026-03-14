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
