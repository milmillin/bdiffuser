import { describe, it, expect } from "vitest";
import {
  makeGameState,
  makePlayer,
  makeTile,
} from "@bomb-busters/shared/testing";
import { isRepeatNextPlayerSelectionDisallowed } from "../turnOrderRules";

describe("isRepeatNextPlayerSelectionDisallowed", () => {
  it("disallows selecting the same player in mission 10 with 3+ players when alternatives exist", () => {
    const p1 = makePlayer({ id: "p1", hand: [makeTile({ id: "p1-1" })] });
    const p2 = makePlayer({ id: "p2", hand: [makeTile({ id: "p2-1" })] });
    const p3 = makePlayer({ id: "p3", hand: [makeTile({ id: "p3-1" })] });
    const state = makeGameState({
      mission: 10,
      players: [p1, p2, p3],
    });

    expect(isRepeatNextPlayerSelectionDisallowed(state, "p2", "p2")).toBe(true);
  });

  it("allows selecting a different player in mission 10 with 3+ players", () => {
    const p1 = makePlayer({ id: "p1", hand: [makeTile({ id: "p1-1" })] });
    const p2 = makePlayer({ id: "p2", hand: [makeTile({ id: "p2-1" })] });
    const p3 = makePlayer({ id: "p3", hand: [makeTile({ id: "p3-1" })] });
    const state = makeGameState({
      mission: 10,
      players: [p1, p2, p3],
    });

    expect(isRepeatNextPlayerSelectionDisallowed(state, "p2", "p3")).toBe(false);
  });

  it("allows selecting the same player in 2-player mission 10 games", () => {
    const p1 = makePlayer({ id: "p1", hand: [makeTile({ id: "p1-1" })] });
    const p2 = makePlayer({ id: "p2", hand: [makeTile({ id: "p2-1" })] });
    const state = makeGameState({
      mission: 10,
      players: [p1, p2],
    });

    expect(isRepeatNextPlayerSelectionDisallowed(state, "p2", "p2")).toBe(false);
  });

  it("allows repeat selection when there is no alternative active player", () => {
    const p1 = makePlayer({
      id: "p1",
      hand: [makeTile({ id: "p1-1", cut: true })],
    });
    const p2 = makePlayer({
      id: "p2",
      hand: [makeTile({ id: "p2-1" })],
    });
    const p3 = makePlayer({
      id: "p3",
      hand: [makeTile({ id: "p3-1", cut: true })],
    });
    const state = makeGameState({
      mission: 10,
      players: [p1, p2, p3],
    });

    expect(isRepeatNextPlayerSelectionDisallowed(state, "p2", "p2")).toBe(false);
  });
});
