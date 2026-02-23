import { describe, it, expect } from "vitest";
import {
  emptyNumberCardState,
  emptyConstraintCardState,
  emptyChallengeCardState,
  defaultOxygenState,
  defaultProgressTracker,
} from "../types.js";
import {
  makeGameState,
  makeNumberCard,
  makeNumberCardState,
  makeConstraintCard,
  makeConstraintCardState,
  makeChallengeCard,
  makeChallengeCardState,
  makeOxygenState,
  makeProgressTracker,
  makeSpecialMarker,
  makeCampaignState,
} from "../testing/builders.js";

// ── Default factory functions ─────────────────────────────

describe("emptyNumberCardState", () => {
  it("returns empty arrays and empty playerHands", () => {
    const s = emptyNumberCardState();
    expect(s.deck).toEqual([]);
    expect(s.discard).toEqual([]);
    expect(s.visible).toEqual([]);
    expect(s.playerHands).toEqual({});
  });
});

describe("emptyConstraintCardState", () => {
  it("returns empty global and perPlayer", () => {
    const s = emptyConstraintCardState();
    expect(s.global).toEqual([]);
    expect(s.perPlayer).toEqual({});
  });
});

describe("emptyChallengeCardState", () => {
  it("returns empty deck, active, and completed", () => {
    const s = emptyChallengeCardState();
    expect(s.deck).toEqual([]);
    expect(s.active).toEqual([]);
    expect(s.completed).toEqual([]);
  });
});

describe("defaultOxygenState", () => {
  it("defaults pool to 0", () => {
    const s = defaultOxygenState();
    expect(s.pool).toBe(0);
    expect(s.playerOxygen).toEqual({});
  });

  it("accepts a custom pool size", () => {
    const s = defaultOxygenState(25);
    expect(s.pool).toBe(25);
  });
});

describe("defaultProgressTracker", () => {
  it("starts at position 0 with the given max", () => {
    const t = defaultProgressTracker(8);
    expect(t.position).toBe(0);
    expect(t.max).toBe(8);
  });
});

// ── Builder functions ─────────────────────────────────────

describe("campaign builders", () => {
  it("makeNumberCard creates a face-down number card", () => {
    const c = makeNumberCard();
    expect(c.id).toBe("num-1");
    expect(c.value).toBe(1);
    expect(c.faceUp).toBe(false);
  });

  it("makeNumberCard accepts overrides", () => {
    const c = makeNumberCard({ value: 7, faceUp: true });
    expect(c.value).toBe(7);
    expect(c.faceUp).toBe(true);
  });

  it("makeNumberCardState defaults to empty", () => {
    const s = makeNumberCardState();
    expect(s.deck).toEqual([]);
    expect(s.playerHands).toEqual({});
  });

  it("makeConstraintCard creates an active constraint", () => {
    const c = makeConstraintCard();
    expect(c.active).toBe(true);
    expect(c.name).toBe("Test Constraint");
  });

  it("makeConstraintCardState defaults to empty", () => {
    const s = makeConstraintCardState();
    expect(s.global).toEqual([]);
    expect(s.perPlayer).toEqual({});
  });

  it("makeChallengeCard creates an incomplete challenge", () => {
    const c = makeChallengeCard();
    expect(c.completed).toBe(false);
  });

  it("makeChallengeCardState defaults to empty", () => {
    const s = makeChallengeCardState();
    expect(s.deck).toEqual([]);
    expect(s.active).toEqual([]);
    expect(s.completed).toEqual([]);
  });

  it("makeOxygenState defaults pool to 0", () => {
    const s = makeOxygenState();
    expect(s.pool).toBe(0);
    expect(s.playerOxygen).toEqual({});
  });

  it("makeOxygenState accepts overrides", () => {
    const s = makeOxygenState({ pool: 15, playerOxygen: { "p1": 3 } });
    expect(s.pool).toBe(15);
    expect(s.playerOxygen["p1"]).toBe(3);
  });

  it("makeProgressTracker defaults to position 0, max 10", () => {
    const t = makeProgressTracker();
    expect(t.position).toBe(0);
    expect(t.max).toBe(10);
  });

  it("makeProgressTracker accepts overrides", () => {
    const t = makeProgressTracker({ position: 3, max: 5 });
    expect(t.position).toBe(3);
    expect(t.max).toBe(5);
  });

  it("makeSpecialMarker defaults to x marker at value 0", () => {
    const m = makeSpecialMarker();
    expect(m.kind).toBe("x");
    expect(m.value).toBe(0);
  });

  it("makeSpecialMarker accepts overrides", () => {
    const m = makeSpecialMarker({ kind: "sequence_pointer", value: 4 });
    expect(m.kind).toBe("sequence_pointer");
    expect(m.value).toBe(4);
  });

  it("makeCampaignState creates an empty campaign by default", () => {
    const c = makeCampaignState();
    expect(c.numberCards).toBeUndefined();
    expect(c.constraints).toBeUndefined();
    expect(c.challenges).toBeUndefined();
    expect(c.oxygen).toBeUndefined();
    expect(c.nanoTracker).toBeUndefined();
    expect(c.bunkerTracker).toBeUndefined();
    expect(c.specialMarkers).toBeUndefined();
  });

  it("makeCampaignState accepts partial overrides", () => {
    const c = makeCampaignState({
      oxygen: makeOxygenState({ pool: 20 }),
      nanoTracker: makeProgressTracker({ max: 6 }),
    });
    expect(c.oxygen!.pool).toBe(20);
    expect(c.nanoTracker!.max).toBe(6);
    expect(c.challenges).toBeUndefined();
  });
});

// ── GameState backward-compatibility ──────────────────────

describe("GameState campaign field", () => {
  it("defaults to undefined when not provided", () => {
    const state = makeGameState();
    expect(state.campaign).toBeUndefined();
  });

  it("can be set with campaign state", () => {
    const state = makeGameState({
      campaign: makeCampaignState({
        oxygen: makeOxygenState({ pool: 10 }),
        specialMarkers: [makeSpecialMarker({ kind: "action_pointer", value: 2 })],
      }),
    });
    expect(state.campaign).toBeDefined();
    expect(state.campaign!.oxygen!.pool).toBe(10);
    expect(state.campaign!.specialMarkers).toHaveLength(1);
    expect(state.campaign!.specialMarkers![0].kind).toBe("action_pointer");
  });

  it("preserves all existing GameState fields when campaign is set", () => {
    const state = makeGameState({
      campaign: makeCampaignState({ nanoTracker: makeProgressTracker() }),
    });
    expect(state.phase).toBe("playing");
    expect(state.roomId).toBe("room-1");
    expect(state.players).toHaveLength(1);
    expect(state.board.detonatorPosition).toBe(0);
    expect(state.mission).toBe(1);
  });
});
