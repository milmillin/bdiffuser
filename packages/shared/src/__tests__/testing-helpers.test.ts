import { describe, it, expect } from "vitest";
import {
  createSeededRng,
  createSeededShuffle,
  withSeededRandom,
  makeTile,
  makeRedTile,
  makeYellowTile,
  makePlayer,
  makeGameState,
  makeBoardState,
  makeEquipmentCard,
  makeInfoToken,
} from "../testing";

// ── Seeded RNG ─────────────────────────────────────────────

describe("createSeededRng", () => {
  it("produces identical sequences for the same seed", () => {
    const rng1 = createSeededRng(42);
    const rng2 = createSeededRng(42);
    const seq1 = Array.from({ length: 20 }, () => rng1());
    const seq2 = Array.from({ length: 20 }, () => rng2());
    expect(seq1).toEqual(seq2);
  });

  it("produces different sequences for different seeds", () => {
    const rng1 = createSeededRng(42);
    const rng2 = createSeededRng(99);
    const seq1 = Array.from({ length: 10 }, () => rng1());
    const seq2 = Array.from({ length: 10 }, () => rng2());
    expect(seq1).not.toEqual(seq2);
  });

  it("produces values in [0, 1)", () => {
    const rng = createSeededRng(12345);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

// ── Seeded Shuffle ─────────────────────────────────────────

describe("createSeededShuffle", () => {
  it("produces identical shuffles for the same seed", () => {
    const shuffle1 = createSeededShuffle(42);
    const shuffle2 = createSeededShuffle(42);
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(shuffle1(arr)).toEqual(shuffle2(arr));
  });

  it("produces different shuffles for different seeds", () => {
    const shuffle1 = createSeededShuffle(42);
    const shuffle2 = createSeededShuffle(99);
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(shuffle1(arr)).not.toEqual(shuffle2(arr));
  });

  it("does not mutate the input array", () => {
    const shuffle = createSeededShuffle(42);
    const arr = [1, 2, 3, 4, 5];
    const copy = [...arr];
    shuffle(arr);
    expect(arr).toEqual(copy);
  });

  it("preserves all elements (no duplicates, no missing)", () => {
    const shuffle = createSeededShuffle(42);
    const arr = [1, 2, 3, 4, 5, 6, 7, 8];
    const result = shuffle(arr);
    expect(result.sort((a, b) => a - b)).toEqual(arr);
  });
});

// ── withSeededRandom ───────────────────────────────────────

describe("withSeededRandom", () => {
  it("makes Math.random deterministic within the callback", () => {
    const result1 = withSeededRandom(42, () =>
      Array.from({ length: 5 }, () => Math.random()),
    );
    const result2 = withSeededRandom(42, () =>
      Array.from({ length: 5 }, () => Math.random()),
    );
    expect(result1).toEqual(result2);
  });

  it("restores Math.random after execution", () => {
    const original = Math.random;
    withSeededRandom(42, () => {});
    expect(Math.random).toBe(original);
  });

  it("restores Math.random even if callback throws", () => {
    const original = Math.random;
    expect(() =>
      withSeededRandom(42, () => {
        throw new Error("boom");
      }),
    ).toThrow("boom");
    expect(Math.random).toBe(original);
  });
});

// ── Builders ───────────────────────────────────────────────

describe("builders", () => {
  it("makeTile creates a blue tile by default", () => {
    const tile = makeTile();
    expect(tile.color).toBe("blue");
    expect(tile.cut).toBe(false);
  });

  it("makeTile accepts overrides", () => {
    const tile = makeTile({ id: "custom", gameValue: 7 });
    expect(tile.id).toBe("custom");
    expect(tile.gameValue).toBe(7);
    expect(tile.color).toBe("blue");
  });

  it("makeRedTile creates a red tile", () => {
    const tile = makeRedTile();
    expect(tile.color).toBe("red");
    expect(tile.gameValue).toBe("RED");
  });

  it("makeYellowTile creates a yellow tile", () => {
    const tile = makeYellowTile();
    expect(tile.color).toBe("yellow");
    expect(tile.gameValue).toBe("YELLOW");
  });

  it("makePlayer creates a player with one tile", () => {
    const player = makePlayer();
    expect(player.hand).toHaveLength(1);
    expect(player.isBot).toBe(false);
  });

  it("makeGameState creates a playing-phase game", () => {
    const state = makeGameState();
    expect(state.phase).toBe("playing");
    expect(state.players).toHaveLength(1);
    expect(state.board.detonatorPosition).toBe(0);
  });

  it("makeBoardState creates an empty board", () => {
    const board = makeBoardState();
    expect(board.markers).toEqual([]);
    expect(board.equipment).toEqual([]);
  });

  it("makeEquipmentCard creates an equipment card", () => {
    const card = makeEquipmentCard({ unlockValue: 5 });
    expect(card.unlockValue).toBe(5);
    expect(card.unlocked).toBe(false);
  });

  it("makeInfoToken creates an info token", () => {
    const token = makeInfoToken({ value: 3, position: 2 });
    expect(token.value).toBe(3);
    expect(token.position).toBe(2);
    expect(token.isYellow).toBe(false);
  });
});
