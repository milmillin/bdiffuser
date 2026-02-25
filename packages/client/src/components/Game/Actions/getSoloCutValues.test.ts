import { describe, it, expect } from "vitest";
import type { ClientGameState } from "@bomb-busters/shared";
import { logText } from "@bomb-busters/shared";
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

  it("does NOT offer a numeric solo-cut value when 3 remaining copies are held", () => {
    const state = makeGameState({
      mission: 2,
      board: {
        detonatorPosition: 0,
        detonatorMax: 3,
        validationTrack: { 5: 1 },
        markers: [],
        equipment: [],
      },
      players: [
        makePlayer({
          id: "me",
          hand: [
            makeTile({ id: "my-1", gameValue: 5 }),
            makeTile({ id: "my-2", gameValue: 5 }),
            makeTile({ id: "my-3", gameValue: 5 }),
          ],
        }),
        makePlayer({
          id: "opponent",
          hand: [
            makeTile({ id: "opp-1", gameValue: 5 }),
          ],
        }),
      ],
    }) as unknown as ClientGameState;

    const values = getSoloCutValues(state, "me");
    expect(values).not.toContain(5);
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

  it("does NOT offer protected mission 23 value for solo cut before special action", () => {
    const state = makeGameState({
      mission: 23,
      players: [
        makePlayer({
          id: "me",
          hand: [
            makeTile({ id: "s1", gameValue: 5 }),
            makeTile({ id: "s2", gameValue: 5 }),
            makeTile({ id: "s3", gameValue: 5 }),
            makeTile({ id: "s4", gameValue: 5 }),
          ],
        }),
      ],
      campaign: {
        numberCards: {
          visible: [{ id: "m23", value: 5, faceUp: true }],
          deck: [],
          discard: [],
          playerHands: {},
        },
      },
    }) as unknown as ClientGameState;

    const values = getSoloCutValues(state, "me");
    expect(values).not.toContain(5);
  });

  it("does NOT offer protected mission 39 value for solo cut before special action", () => {
    const state = makeGameState({
      mission: 39,
      players: [
        makePlayer({
          id: "me",
          hand: [
            makeTile({ id: "s1", gameValue: 6 }),
            makeTile({ id: "s2", gameValue: 6 }),
            makeTile({ id: "s3", gameValue: 6 }),
            makeTile({ id: "s4", gameValue: 6 }),
          ],
        }),
      ],
      campaign: {
        numberCards: {
          visible: [{ id: "m39", value: 6, faceUp: true }],
          deck: [],
          discard: [],
          playerHands: {},
        },
      },
    }) as unknown as ClientGameState;

    const values = getSoloCutValues(state, "me");
    expect(values).not.toContain(6);
  });

  it("offers protected value again after mission 23 special action completes", () => {
    const state = makeGameState({
      mission: 23,
      players: [
        makePlayer({
          id: "me",
          hand: [
            makeTile({ id: "s1", gameValue: 5 }),
            makeTile({ id: "s2", gameValue: 5 }),
            makeTile({ id: "s3", gameValue: 5 }),
            makeTile({ id: "s4", gameValue: 5 }),
          ],
        }),
      ],
      campaign: {
        mission23SpecialActionDone: true,
        numberCards: {
          visible: [{ id: "m23", value: 5, faceUp: true }],
          deck: [],
          discard: [],
          playerHands: {},
        },
      },
    }) as unknown as ClientGameState;

    const values = getSoloCutValues(state, "me");
    expect(values).toContain(5);
  });

  it("does NOT offer numeric solo cut values for mission 35 X-marked wires while yellow wires remain", () => {
    const state = makeGameState({
      mission: 35,
      board: {
        detonatorPosition: 0,
        detonatorMax: 3,
        validationTrack: { 5: 2 },
        markers: [],
        equipment: [],
      },
      players: [
        makePlayer({
          id: "me",
          hand: [
            makeTile({ id: "x1", gameValue: 5, isXMarked: true }),
            makeTile({ id: "x2", gameValue: 5 }),
          ],
        }),
        makePlayer({
          id: "teammate",
          hand: [makeYellowTile({ id: "y1" })],
        }),
      ],
    }) as unknown as ClientGameState;

    const values = getSoloCutValues(state, "me");
    expect(values).not.toContain(5);
  });

  it("offers mission 35 X-marked numeric solo value after all yellow wires are cut", () => {
    const state = makeGameState({
      mission: 35,
      board: {
        detonatorPosition: 0,
        detonatorMax: 3,
        validationTrack: { 5: 2 },
        markers: [],
        equipment: [],
      },
      players: [
        makePlayer({
          id: "me",
          hand: [
            makeTile({ id: "x1", gameValue: 5, isXMarked: true }),
            makeTile({ id: "x2", gameValue: 5 }),
          ],
        }),
        makePlayer({
          id: "teammate",
          hand: [makeYellowTile({ id: "y1", cut: true })],
        }),
      ],
    }) as unknown as ClientGameState;

    const values = getSoloCutValues(state, "me");
    expect(values).toContain(5);
  });
});

describe("canRevealReds mission rules", () => {
  it("returns true in mission 11 when all remaining wires match the blue-as-red value", () => {
    const state = makeGameState({
      mission: 11,
      players: [
        makePlayer({
          id: "me",
          hand: [
            makeTile({ id: "b1", color: "blue", gameValue: 7 }),
            makeTile({ id: "b2", color: "blue", gameValue: 7 }),
          ],
        }),
      ],
      log: [
        {
          turn: 0,
          playerId: "system",
          action: "hookSetup",
          detail: logText("blue_as_red:7"),
          timestamp: 1000,
        },
      ],
    }) as unknown as ClientGameState;

    expect(canRevealReds(state, "me")).toBe(true);
  });

  it("returns false in mission 11 when remaining wires do not all match blue-as-red", () => {
    const state = makeGameState({
      mission: 11,
      players: [
        makePlayer({
          id: "me",
          hand: [
            makeTile({ id: "b1", color: "blue", gameValue: 7 }),
            makeTile({ id: "b2", color: "blue", gameValue: 5 }),
          ],
        }),
      ],
      log: [
        {
          turn: 0,
          playerId: "system",
          action: "hookSetup",
          detail: logText("blue_as_red:7"),
          timestamp: 1000,
        },
      ],
    }) as unknown as ClientGameState;

    expect(canRevealReds(state, "me")).toBe(false);
  });

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
