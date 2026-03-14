import { describe, expect, it } from "vitest";
import type { ClientGameState, ClientPlayer, VisibleTile } from "@bomb-busters/shared";
import { computeOpponentProbabilities, getTopProbabilities, type TileProbability } from "./scouter.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hidden(id = "h"): VisibleTile {
  return { id, cut: false };
}

function blue(value: number, cut = false, id = `b${value}`): VisibleTile {
  return { id, cut, color: "blue", gameValue: value, sortValue: value, image: `blue_${value}.png` };
}

function red(cut = true, id = "r"): VisibleTile {
  return { id, cut, color: "red", gameValue: "RED", sortValue: 1.5, image: "red.png" };
}

function yellow(cut = true, id = "y"): VisibleTile {
  return { id, cut, color: "yellow", gameValue: "YELLOW", sortValue: 1.1, image: "yellow.png" };
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
  // Pad to at least 3 players so resolveMissionSetup doesn't reject
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
// Mission 1 (3p): blue 1-6, no red, no yellow => 6 values × 4 = 24 blue tiles
// Mission 4 (3p): blue 1-12, 1 red, 2 yellow => 48 + 1 + 2 = 51 tiles
// Mission 5 (3p): blue 1-12, 1 red, 2 yellow (outOf(2,3)) => 48 + 1 + 2 = 51
// Mission 6 (3p): blue 1-12, 1 red, 4 yellow => 48 + 1 + 4 = 53 tiles
// ---------------------------------------------------------------------------

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

    it("all hidden tiles get the same marginal distribution", () => {
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
      // Mission 1 (3p): blue 1-6
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

    it("counts cut tiles from opponents as visible", () => {
      const me = makePlayer("me", [blue(1)]);
      const opp = makePlayer("opp", [blue(3, true, "cut3"), hidden("h0"), hidden("h1")]);
      const state = makeGameState([me, opp]);

      const prob = computeOpponentProbabilities(state, opp).get(1)!;

      // Visible: 1×val-1, 1×val-3. Remaining = 24 - 2 = 22.
      expect(prob.blues.get(1)).toBeCloseTo(3 / 22, 10);
      expect(prob.blues.get(3)).toBeCloseTo(3 / 22, 10);
      expect(prob.blues.get(5)).toBeCloseTo(4 / 22, 10);
      expect(sumProbs(prob)).toBeCloseTo(1.0, 10);
    });

    it("counts cut tiles from multiple opponents", () => {
      const me = makePlayer("me", [blue(1)]);
      const opp1 = makePlayer("opp1", [blue(2, true, "cut2a"), hidden("h0")]);
      const opp2 = makePlayer("opp2", [blue(2, true, "cut2b"), hidden("h1")]);
      const state = makeGameState([me, opp1, opp2]);

      const prob = computeOpponentProbabilities(state, opp1).get(1)!;

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

    it("red probability drops to 0 when all reds are cut", () => {
      // Mission 4 (3p): 1 red tile
      const me = makePlayer("me", [blue(1)]);
      const opp = makePlayer("opp", [red(true, "r1"), hidden("h0")]);
      const state = makeGameState([me, opp], 4);

      const prob = computeOpponentProbabilities(state, opp).get(1)!;
      expect(prob.red).toBe(0);
      expect(prob.yellow).toBeGreaterThan(0);
      expect(sumProbs(prob)).toBeCloseTo(1.0, 10);
    });

    it("yellow probability drops to 0 when all yellows are cut", () => {
      // Mission 4 (3p): 2 yellow tiles
      const me = makePlayer("me", [blue(1)]);
      const opp = makePlayer("opp", [
        yellow(true, "y1"), yellow(true, "y2"), hidden("h0"),
      ]);
      const state = makeGameState([me, opp], 4);

      const prob = computeOpponentProbabilities(state, opp).get(2)!;
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
      // Mission 1 (3p): blue 1-6 only
      const me = makePlayer("me", [blue(1)]);
      const opp = makePlayer("opp", [hidden()]);
      const state = makeGameState([me, opp], 1);

      const prob = computeOpponentProbabilities(state, opp).get(0)!;
      expect(prob.red).toBe(0);
      expect(prob.yellow).toBe(0);
      expect(prob.blues.size).toBe(6); // values 1-6 only
    });

    it("uses correct blue range from mission config", () => {
      // Mission 1 (3p): blue 1-6 → no values 7-12
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
    it("skips cut tiles", () => {
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
      const me = makePlayer("me", [blue(1)]);
      const opp = makePlayer("opp", [
        { id: "ud1", cut: false, color: "blue" as const, gameValue: 5, sortValue: 5, image: "blue_5.png" },
        hidden("h1"),
      ]);
      const state = makeGameState([me, opp]);

      const probs = computeOpponentProbabilities(state, opp);
      expect(probs.has(0)).toBe(false); // visible
      expect(probs.has(1)).toBe(true);  // hidden

      // The visible upside-down tile should count as seen
      const prob = probs.get(1)!;
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

      const probs = computeOpponentProbabilities(state, opp);
      expect(probs.size).toBe(0);
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
      // Both players have only hidden tiles (e.g. viewer is new / no tiles visible)
      const me = makePlayer("me", [hidden("mh0"), hidden("mh1")]);
      const opp = makePlayer("opp", [hidden("h0")]);
      const state = makeGameState([me, opp]);

      const prob = computeOpponentProbabilities(state, opp).get(0)!;

      // Mission 1 (3p): 24 blue tiles, 6 values, 4 each
      // Every value: 4/24 = 1/6
      for (let v = 1; v <= 6; v++) {
        expect(prob.blues.get(v)).toBeCloseTo(4 / 24, 10);
      }
    });

    it("handles when all copies of multiple values are visible", () => {
      // Mission 1 (3p): blue 1-6. Remove values 1 and 2 entirely (8 tiles).
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
      // Remaining: 24 - 8 = 16. 4 values × 4 copies.
      expect(prob.blues.get(3)).toBeCloseTo(4 / 16, 10);
      expect(sumProbs(prob)).toBeCloseTo(1.0, 10);
    });

    it("visible red tiles reduce red pool correctly", () => {
      // Mission 4 (3p): 1 red. Own hand has a visible red tile (upside-down).
      const me = makePlayer("me", [
        { id: "r1", cut: false, color: "red" as const, gameValue: "RED" as const, sortValue: 1.5, image: "red.png" },
      ]);
      const opp = makePlayer("opp", [hidden()]);
      const state = makeGameState([me, opp], 4);

      const prob = computeOpponentProbabilities(state, opp).get(0)!;
      // Red pool = 1. 1 visible = 0 remaining.
      expect(prob.red).toBe(0);
      // Blue values still untouched. Remaining: 48 + 0 + 2 = 50
      expect(prob.blues.get(1)).toBeCloseTo(4 / 50, 10);
      expect(prob.yellow).toBeCloseTo(2 / 50, 10);
      expect(sumProbs(prob)).toBeCloseTo(1.0, 10);
    });

    it("probabilities correct when many tiles are cut", () => {
      // Mission 4 (3p): blue 1-12, 1 red, 2 yellow = 51 total.
      // Heavy cuts: all val-1 cut, all val-2 cut, red cut, 1 yellow cut.
      const me = makePlayer("me", [blue(3), blue(4)]);
      const opp = makePlayer("opp", [
        blue(1, true, "c1a"), blue(1, true, "c1b"), blue(1, true, "c1c"), blue(1, true, "c1d"),
        blue(2, true, "c2a"), blue(2, true, "c2b"), blue(2, true, "c2c"), blue(2, true, "c2d"),
        red(true, "cr"),
        yellow(true, "cy"),
        hidden("h0"),
      ]);
      const state = makeGameState([me, opp], 4);

      const prob = computeOpponentProbabilities(state, opp).get(10)!;

      // Visible: 4×val-1 + 4×val-2 + 1×val-3 + 1×val-4 + 1 red + 1 yellow = 12
      // Remaining: 51 - 12 = 39
      // val-1: gone. val-2: gone. val-3: 3 left. val-4: 3 left.
      // val-5..12: 4 each = 32. red: 0. yellow: 1.
      // 3 + 3 + 32 + 0 + 1 = 39. Correct!
      expect(prob.blues.has(1)).toBe(false);
      expect(prob.blues.has(2)).toBe(false);
      expect(prob.blues.get(3)).toBeCloseTo(3 / 39, 10);
      expect(prob.blues.get(5)).toBeCloseTo(4 / 39, 10);
      expect(prob.red).toBe(0);
      expect(prob.yellow).toBeCloseTo(1 / 39, 10);
      expect(sumProbs(prob)).toBeCloseTo(1.0, 10);
    });

    it("handles all tiles accounted for (totalRemaining = 0)", () => {
      // If somehow every tile in the pool is visible, no probabilities can be computed.
      // Use mission 1 (blue 1-6, 24 tiles). Create a game where all 24 are visible.
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
      // totalRemaining = 0 → early return, no probabilities
      expect(probs.size).toBe(0);
    });
  });

  describe("probability correctness with partial information", () => {
    it("calculates correct probabilities with asymmetric visibility", () => {
      // Mission 1 (3p): blue 1-6, 24 tiles.
      // Me sees: two 3s and one 5. Opp has one cut 3.
      const me = makePlayer("me", [blue(3, false, "b3a"), blue(3, false, "b3b"), blue(5, false, "b5a")]);
      const opp = makePlayer("opp", [blue(3, true, "cut3"), hidden("h0")]);
      const state = makeGameState([me, opp]);

      const prob = computeOpponentProbabilities(state, opp).get(1)!;

      // Visible: 3×val-3, 1×val-5. Total seen = 4. Remaining = 24 - 4 = 20.
      // val-3: 4 - 3 = 1 remaining
      // val-5: 4 - 1 = 3 remaining
      // Other values (1,2,4,6): 4 remaining each = 16
      // Total check: 1 + 3 + 16 = 20. ✓
      expect(prob.blues.get(3)).toBeCloseTo(1 / 20, 10);
      expect(prob.blues.get(5)).toBeCloseTo(3 / 20, 10);
      expect(prob.blues.get(1)).toBeCloseTo(4 / 20, 10);
      expect(sumProbs(prob)).toBeCloseTo(1.0, 10);
    });

    it("mixed visible own tiles and opponent cut tiles across multiple opponents", () => {
      // Mission 4 (3p): blue 1-12, 1 red, 2 yellow = 51 total.
      const me = makePlayer("me", [blue(1), blue(1, false, "b1b"), blue(7)]);
      const opp1 = makePlayer("opp1", [blue(1, true, "c1"), red(true, "cr"), hidden("h0")]);
      const opp2 = makePlayer("opp2", [blue(7, true, "c7"), yellow(true, "cy"), hidden("h1")]);
      const state = makeGameState([me, opp1, opp2], 4);

      const prob = computeOpponentProbabilities(state, opp1).get(2)!;

      // Visible: 3×val-1 (2 me + 1 cut) + 2×val-7 (1 me + 1 cut) + 1 red + 1 yellow = 7
      // Remaining: 51 - 7 = 44
      // val-1: 4-3=1. val-7: 4-2=2. red: 1-1=0. yellow: 2-1=1.
      // Others: 10 values × 4 = 40. Total = 1+2+0+1+40 = 44. ✓
      expect(prob.blues.get(1)).toBeCloseTo(1 / 44, 10);
      expect(prob.blues.get(7)).toBeCloseTo(2 / 44, 10);
      expect(prob.blues.get(5)).toBeCloseTo(4 / 44, 10);
      expect(prob.red).toBe(0);
      expect(prob.yellow).toBeCloseTo(1 / 44, 10);
      expect(sumProbs(prob)).toBeCloseTo(1.0, 10);
    });
  });
});

// ---------------------------------------------------------------------------
// getTopProbabilities
// ---------------------------------------------------------------------------

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
