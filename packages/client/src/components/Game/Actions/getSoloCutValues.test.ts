import { describe, it, expect } from "vitest";
import type { ClientGameState } from "@bomb-busters/shared";
import {
  makeGameState,
  makePlayer,
  makeRedTile,
  makeTile,
  makeYellowTile,
} from "@bomb-busters/shared/testing";
import { canRevealReds, getSoloCutValues } from "./actionRules.js";

// Mission 2 with 2 players has yellow: exact(2) in its schema.

describe("getSoloCutValues yellow logic", () => {
  it("offers YELLOW when player holds all remaining yellows (even if opponents have uncut non-yellow tiles)", () => {
    const state = makeGameState({
      mission: 2,
      players: [
        makePlayer({
          id: "me",
          hand: [
            makeYellowTile({ id: "y1" }),
            makeYellowTile({ id: "y2" }),
          ],
        }),
        makePlayer({
          id: "opponent",
          hand: [
            makeTile({ id: "o1", color: "blue", gameValue: 3 }),
            makeTile({ id: "o2", color: "blue", gameValue: 5 }),
          ],
        }),
      ],
    }) as unknown as ClientGameState;

    const values = getSoloCutValues(state, "me");
    expect(values).toContain("YELLOW");
  });

  it("does NOT offer YELLOW when player does not hold all remaining yellows", () => {
    const state = makeGameState({
      mission: 2,
      players: [
        makePlayer({
          id: "me",
          hand: [
            makeYellowTile({ id: "y1" }),
          ],
        }),
        makePlayer({
          id: "opponent",
          hand: [
            makeYellowTile({ id: "y2" }),
            makeTile({ id: "o1", color: "blue", gameValue: 3 }),
          ],
        }),
      ],
    }) as unknown as ClientGameState;

    const values = getSoloCutValues(state, "me");
    expect(values).not.toContain("YELLOW");
  });

  it("offers YELLOW when some yellows are already cut and player holds all remaining", () => {
    const state = makeGameState({
      mission: 2,
      players: [
        makePlayer({
          id: "me",
          hand: [
            makeYellowTile({ id: "y1" }),
          ],
        }),
        makePlayer({
          id: "opponent",
          hand: [
            makeYellowTile({ id: "y2", cut: true }),
            makeTile({ id: "o1", color: "blue", gameValue: 3 }),
          ],
        }),
      ],
    }) as unknown as ClientGameState;

    // Mission 2 has 2 yellows total, 1 is cut, 1 remaining — player holds the 1 remaining
    const values = getSoloCutValues(state, "me");
    expect(values).toContain("YELLOW");
  });

  it("does NOT offer YELLOW when all yellows are already cut", () => {
    const state = makeGameState({
      mission: 2,
      players: [
        makePlayer({
          id: "me",
          hand: [
            makeTile({ id: "b1", color: "blue", gameValue: 3 }),
          ],
        }),
        makePlayer({
          id: "opponent",
          hand: [
            makeYellowTile({ id: "y1", cut: true }),
            makeYellowTile({ id: "y2", cut: true }),
          ],
        }),
      ],
    }) as unknown as ClientGameState;

    const values = getSoloCutValues(state, "me");
    expect(values).not.toContain("YELLOW");
  });

  it("does NOT offer YELLOW in mission 48 where yellow must use simultaneous action", () => {
    const state = makeGameState({
      mission: 48,
      players: [
        makePlayer({
          id: "me",
          hand: [
            makeYellowTile({ id: "y1" }),
            makeYellowTile({ id: "y2" }),
            makeYellowTile({ id: "y3" }),
          ],
        }),
        makePlayer({
          id: "opponent",
          hand: [makeTile({ id: "o1", color: "blue", gameValue: 3 })],
        }),
      ],
    }) as unknown as ClientGameState;

    const values = getSoloCutValues(state, "me");
    expect(values).not.toContain("YELLOW");
  });
});

describe("canRevealReds mission rules", () => {
  it("returns false in mission 13 even when all remaining wires are red", () => {
    const state = makeGameState({
      mission: 13,
      players: [
        makePlayer({
          id: "me",
          hand: [makeRedTile({ id: "r1" })],
        }),
      ],
    }) as unknown as ClientGameState;

    expect(canRevealReds(state, "me")).toBe(false);
  });

  it("returns true outside mission 13 when all remaining wires are red", () => {
    const state = makeGameState({
      mission: 3,
      players: [
        makePlayer({
          id: "me",
          hand: [makeRedTile({ id: "r1" })],
        }),
      ],
    }) as unknown as ClientGameState;

    expect(canRevealReds(state, "me")).toBe(true);
  });
});
