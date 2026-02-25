import { describe, it, expect } from "vitest";
import type { ClientGameState } from "@bomb-busters/shared";
import { logText } from "@bomb-busters/shared";
import {
  makeGameState,
  makePlayer,
  makeConstraintCard,
  makeRedTile,
  makeTile,
  makeYellowTile,
} from "@bomb-busters/shared/testing";
import {
  canRevealReds,
  getSoloCutValues,
  getMission59ForwardValues,
  isMission59DualCutActorTileValueAllowed,
  isMission26CutValueVisible,
  isMission59CutValueVisible,
  isRevealRedsForced,
} from "./actionRules.js";

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

  it("does NOT offer YELLOW in mission 41 where yellow tripwires are special-action-only", () => {
    const state = makeGameState({
      mission: 41,
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
          hand: [makeTile({ id: "o1", color: "blue", gameValue: 4 })],
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

  it("does NOT offer solo cut values when Constraint K (No Solo Cut) is active", () => {
    const state = makeGameState({
      mission: 2,
      players: [
        makePlayer({
          id: "me",
          hand: [
            makeTile({ id: "s1", gameValue: 5 }),
            makeTile({ id: "s2", gameValue: 5 }),
          ],
        }),
        makePlayer({
          id: "opponent",
          hand: [
            makeTile({ id: "o1", gameValue: 8 }),
            makeTile({ id: "o2", gameValue: 8 }),
            makeTile({ id: "o3", gameValue: 5 }),
          ],
        }),
      ],
      campaign: {
        constraints: {
          global: [makeConstraintCard({ id: "K", active: true })],
          perPlayer: {},
        },
      },
    }) as unknown as ClientGameState;

    expect(getSoloCutValues(state, "me")).toEqual([]);
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

  it("filters numeric solo cut options for active global value constraints", () => {
    const state = makeGameState({
      mission: 2,
      players: [
        makePlayer({
          id: "me",
          hand: [
            makeTile({ id: "a1", gameValue: 5 }),
            makeTile({ id: "a2", gameValue: 5 }),
            makeTile({ id: "b1", gameValue: 6 }),
            makeTile({ id: "b2", gameValue: 6 }),
          ],
        }),
        makePlayer({
          id: "opponent",
          hand: [makeTile({ id: "o1", gameValue: 3 })],
        }),
      ],
      campaign: {
        constraints: {
          global: [makeConstraintCard({ id: "A", active: true })],
          perPlayer: {},
        },
      },
    }) as unknown as ClientGameState;

    const values = getSoloCutValues(state, "me");

    expect(values).toContain(6);
    expect(values).not.toContain(5);
  });

  it("filters numeric solo cut options for active per-player value constraints", () => {
    const state = makeGameState({
      mission: 2,
      players: [
        makePlayer({
          id: "me",
          hand: [
            makeTile({ id: "a1", gameValue: 2 }),
            makeTile({ id: "a2", gameValue: 2 }),
            makeTile({ id: "b1", gameValue: 6 }),
            makeTile({ id: "b2", gameValue: 6 }),
          ],
        }),
        makePlayer({
          id: "opponent",
          hand: [makeTile({ id: "o1", gameValue: 4 })],
        }),
      ],
      campaign: {
        constraints: {
          global: [makeConstraintCard({ id: "A", active: true })],
          perPlayer: {
            me: [makeConstraintCard({ id: "F", active: true })],
          },
        },
      },
    }) as unknown as ClientGameState;

    const values = getSoloCutValues(state, "me");

    expect(values).toContain(2);
    expect(values).not.toContain(6);
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

  it("does NOT offer solo cut 7 in mission 46 when actor still has non-7 uncut wires", () => {
    const state = makeGameState({
      mission: 46,
      players: [
        makePlayer({
          id: "me",
          hand: [
            makeYellowTile({ id: "s1", sortValue: 7.1 }),
            makeYellowTile({ id: "s2", sortValue: 7.1 }),
            makeYellowTile({ id: "s3", sortValue: 6.1 }),
          ],
        }),
        makePlayer({
          id: "opponent",
          hand: [makeTile({ id: "o1", gameValue: 5 })],
        }),
      ],
    }) as unknown as ClientGameState;

    const values = getSoloCutValues(state, "me");
    expect(values).not.toContain(7);
  });

  it("only offers solo cut values currently visible in mission 26 number cards", () => {
    const state = makeGameState({
      mission: 26,
      players: [
        makePlayer({
          id: "me",
          hand: [
            makeTile({ id: "m1", gameValue: 5 }),
            makeTile({ id: "m2", gameValue: 5 }),
          ],
        }),
        makePlayer({
          id: "opponent",
          hand: [makeTile({ id: "o1", gameValue: 7 })],
        }),
      ],
      campaign: {
        numberCards: {
          visible: [
            { id: "n5", value: 5, faceUp: true },
            { id: "n7", value: 7, faceUp: false },
          ],
          deck: [],
          discard: [],
          playerHands: {},
        },
      },
    }) as unknown as ClientGameState;

    const values = getSoloCutValues(state, "me");

    expect(values).toContain(5);
    expect(values).not.toContain(7);
  });

  it("does not offer mission 26 solo values when no visible numbers exist", () => {
    const state = makeGameState({
      mission: 26,
      players: [
        makePlayer({
          id: "me",
          hand: [
            makeTile({ id: "m1", gameValue: 5 }),
            makeTile({ id: "m2", gameValue: 5 }),
          ],
        }),
      ],
      campaign: {
        numberCards: {
          visible: [
            { id: "n5", value: 5, faceUp: false },
          ],
          deck: [],
          discard: [],
          playerHands: {},
        },
      },
    }) as unknown as ClientGameState;

    const values = getSoloCutValues(state, "me");

    expect(values).toEqual([]);
  });

  it("offers only legal mission 59 forward-segment values from Nano", () => {
    const state = makeGameState({
      mission: 59,
      players: [
        makePlayer({
          id: "me",
          hand: [
            makeTile({ id: "m1", gameValue: 2 }),
            makeTile({ id: "m2", gameValue: 2 }),
            makeTile({ id: "m3", gameValue: 9 }),
            makeTile({ id: "m4", gameValue: 9 }),
            makeTile({ id: "m5", gameValue: 7 }),
            makeTile({ id: "m6", gameValue: 7 }),
            makeYellowTile({ id: "y1" }),
          ],
        }),
      ],
      campaign: {
        numberCards: {
          visible: [
            { id: "n11", value: 11, faceUp: true },
            { id: "n5", value: 5, faceUp: true },
            { id: "n2", value: 2, faceUp: true },
            { id: "n9", value: 9, faceUp: true },
            { id: "n4", value: 4, faceUp: true },
            { id: "n7", value: 7, faceUp: false },
          ],
          deck: [],
          discard: [],
          playerHands: {},
        },
        mission59Nano: {
          position: 2,
          facing: 1,
        },
      },
    }) as unknown as ClientGameState;

    const values = getSoloCutValues(state, "me");

    expect(values).toContain(2);
    expect(values).toContain(9);
    expect(values).not.toContain(5);
    expect(values).not.toContain("YELLOW");
    expect(values).not.toContain(4);
  });

  it("includes mission 59 current Nano value for solo cuts even when facedown", () => {
    const state = makeGameState({
      mission: 59,
      players: [
        makePlayer({
          id: "me",
          hand: [
            makeTile({ id: "m1", gameValue: 4 }),
            makeTile({ id: "m2", gameValue: 4 }),
          ],
        }),
      ],
      campaign: {
        numberCards: {
          visible: [
            { id: "n4", value: 4, faceUp: false },
            { id: "n6", value: 6, faceUp: true },
            { id: "n7", value: 7, faceUp: true },
          ],
          deck: [],
          discard: [],
          playerHands: {},
        },
        mission59Nano: {
          position: 0,
          facing: 1,
        },
      },
    }) as unknown as ClientGameState;

    const values = getSoloCutValues(state, "me");

    expect(values).toContain(4);
  });

  it("checks mission 59 forward visibility from Nano-facing direction", () => {
    const state = makeGameState({
      mission: 59,
      players: [
        makePlayer({
          id: "me",
          hand: [makeTile({ id: "m1", gameValue: 3 })],
        }),
      ],
      campaign: {
        numberCards: {
          visible: [
            { id: "n3", value: 3, faceUp: true },
            { id: "n1", value: 1, faceUp: false },
            { id: "n8", value: 8, faceUp: true },
            { id: "n9", value: 9, faceUp: true },
          ],
          deck: [],
          discard: [],
          playerHands: {},
        },
        mission59Nano: {
          position: 2,
          facing: -1,
        },
      },
    }) as unknown as ClientGameState;

    expect(isMission59CutValueVisible(state, 8)).toBe(true);
    expect(isMission59CutValueVisible(state, 9)).toBe(false);
    expect(isMission59CutValueVisible(state, 1)).toBe(false);
  });

  it("allows selecting current Nano value as a dual-cut guess even if it is face-down", () => {
    const state = makeGameState({
      mission: 59,
      players: [
        makePlayer({
          id: "me",
          hand: [makeTile({ id: "m1", gameValue: 4 })],
        }),
      ],
      campaign: {
        numberCards: {
          visible: [
            { id: "n4", value: 4, faceUp: false },
            { id: "n1", value: 1, faceUp: true },
            { id: "n9", value: 9, faceUp: true },
          ],
          deck: [],
          discard: [],
          playerHands: {},
        },
        mission59Nano: {
          position: 0,
          facing: 1,
        },
      },
    }) as unknown as ClientGameState;

    expect(isMission59DualCutActorTileValueAllowed(state, 4)).toBe(true);
  });

  it("disallows non-forward mission 59 dual-cut guesses", () => {
    const state = makeGameState({
      mission: 59,
      players: [
        makePlayer({
          id: "me",
          hand: [makeTile({ id: "m1", gameValue: 4 })],
        }),
      ],
      campaign: {
        numberCards: {
          visible: [
            { id: "n4", value: 4, faceUp: false },
            { id: "n1", value: 1, faceUp: true },
            { id: "n9", value: 9, faceUp: true },
          ],
          deck: [],
          discard: [],
          playerHands: {},
        },
        mission59Nano: {
          position: 0,
          facing: 1,
        },
      },
    }) as unknown as ClientGameState;

    expect(isMission59DualCutActorTileValueAllowed(state, 12)).toBe(false);
  });

  it("extracts visible Mission 59 Number values from Nano direction", () => {
    const state = makeGameState({
      mission: 59,
      players: [
        makePlayer({
          id: "me",
          hand: [makeTile({ id: "m1", gameValue: 1 })],
        }),
      ],
      campaign: {
        numberCards: {
          visible: [
            { id: "n3", value: 3, faceUp: true },
            { id: "n5", value: 5, faceUp: false },
            { id: "n1", value: 1, faceUp: true },
            { id: "n8", value: 8, faceUp: true },
            { id: "n2", value: 2, faceUp: false },
            { id: "n9", value: 9, faceUp: true },
          ],
          deck: [],
          discard: [],
          playerHands: {},
        },
        mission59Nano: {
          position: 1,
          facing: 1,
        },
      },
    }) as unknown as ClientGameState;

    expect(getMission59ForwardValues(state)).toEqual([1, 8, 9]);
  });

  it("filters out mission 54 solo cut values that exceed depth-based oxygen availability", () => {
    const state = makeGameState({
      mission: 54,
      players: [
        makePlayer({
          id: "me",
          hand: [
            makeTile({ id: "m1", gameValue: 3 }),
            makeTile({ id: "m2", gameValue: 3 }),
            makeTile({ id: "m3", gameValue: 5 }),
            makeTile({ id: "m4", gameValue: 5 }),
          ],
        }),
        makePlayer({
          id: "other",
          hand: [
            makeTile({ id: "o1", gameValue: 7 }),
            makeTile({ id: "o2", gameValue: 7 }),
          ],
        }),
      ],
      campaign: {
        oxygen: {
          pool: 0,
          playerOxygen: { me: 1 },
        },
      },
    }) as unknown as ClientGameState;

    const values = getSoloCutValues(state, "me");

    expect(values).toContain(3);
    expect(values).not.toContain(5);
  });

  it("does not use reserve oxygen to fund mission 54 solo cuts", () => {
    const state = makeGameState({
      mission: 54,
      players: [
        makePlayer({
          id: "me",
          hand: [
            makeTile({ id: "m1", gameValue: 2 }),
            makeTile({ id: "m2", gameValue: 2 }),
            makeTile({ id: "m3", gameValue: 7 }),
            makeTile({ id: "m4", gameValue: 7 }),
          ],
        }),
      ],
      campaign: {
        oxygen: {
          pool: 2,
          playerOxygen: { me: 0 },
        },
      },
    }) as unknown as ClientGameState;

    const values = getSoloCutValues(state, "me");

    expect(values).toEqual([]);
  });

  it("filters out mission 63 solo cut values that exceed player-only oxygen availability", () => {
    const state = makeGameState({
      mission: 63,
      players: [
        makePlayer({
          id: "me",
          hand: [
            makeTile({ id: "m1", gameValue: 5 }),
            makeTile({ id: "m2", gameValue: 5 }),
            makeTile({ id: "m3", gameValue: 10 }),
            makeTile({ id: "m4", gameValue: 10 }),
          ],
        }),
        makePlayer({
          id: "other",
          hand: [
            makeTile({ id: "o1", gameValue: 4 }),
            makeTile({ id: "o2", gameValue: 6 }),
            makeTile({ id: "o3", gameValue: 6 }),
            makeTile({ id: "o4", gameValue: 7 }),
            makeTile({ id: "o5", gameValue: 7 }),
          ],
        }),
      ],
      campaign: {
        oxygen: {
          pool: 100,
          playerOxygen: { me: 5, other: 100 },
        },
      },
    }) as unknown as ClientGameState;

    const values = getSoloCutValues(state, "me");

    expect(values).toContain(5);
    expect(values).not.toContain(10);
  });

  it("filters out mission 44 solo cut values using shared oxygen reserve", () => {
    const state = makeGameState({
      mission: 44,
      players: [
        makePlayer({
          id: "me",
          hand: [
            makeTile({ id: "m1", gameValue: 4 }),
            makeTile({ id: "m2", gameValue: 4 }),
            makeTile({ id: "m3", gameValue: 9 }),
            makeTile({ id: "m4", gameValue: 9 }),
          ],
        }),
      ],
      campaign: {
        oxygen: {
          pool: 1,
          playerOxygen: { me: 0 },
        },
      },
    }) as unknown as ClientGameState;

    const values = getSoloCutValues(state, "me");

    expect(values).toContain(4);
    expect(values).not.toContain(9);
  });

  it("checks mission 26 number visibility with isMission26CutValueVisible", () => {
    const state = makeGameState({
      mission: 26,
      players: [
        makePlayer({ id: "me", hand: [makeTile({ id: "m1", gameValue: 5 })] }),
      ],
      campaign: {
        numberCards: {
          visible: [
            { id: "n5", value: 5, faceUp: true },
            { id: "n7", value: 7, faceUp: false },
          ],
          deck: [],
          discard: [],
          playerHands: {},
        },
      },
    }) as unknown as ClientGameState;

    expect(isMission26CutValueVisible(state, 5)).toBe(true);
    expect(isMission26CutValueVisible(state, 7)).toBe(false);
    expect(isMission26CutValueVisible(state, "YELLOW")).toBe(false);
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

  it("returns false in mission 59 even when all remaining wires are red", () => {
    const state = makeGameState({
      mission: 59,
      players: [
        makePlayer({
          id: "me",
          hand: [makeRedTile({ id: "r1" })],
        }),
      ],
    }) as unknown as ClientGameState;

    expect(canRevealReds(state, "me")).toBe(false);
  });

  it("returns false in mission 26 even when all remaining wires are red", () => {
    const state = makeGameState({
      mission: 26,
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

describe("isRevealRedsForced", () => {
  it("returns true in mission 11 when all remaining wires are the hidden red-like value", () => {
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

    expect(isRevealRedsForced(state, "me")).toBe(true);
  });

  it("returns false in mission 26 even when all remaining wires are red", () => {
    const state = makeGameState({
      mission: 26,
      players: [
        makePlayer({
          id: "me",
          hand: [makeRedTile({ id: "r1" })],
        }),
      ],
    }) as unknown as ClientGameState;

    expect(isRevealRedsForced(state, "me")).toBe(false);
  });

  it("returns false in mission 59 even when all remaining wires are red", () => {
    const state = makeGameState({
      mission: 59,
      players: [
        makePlayer({
          id: "me",
          hand: [makeRedTile({ id: "r1" })],
        }),
      ],
    }) as unknown as ClientGameState;

    expect(isRevealRedsForced(state, "me")).toBe(false);
  });

  it("returns true in mission 13 even when all remaining wires are red", () => {
    const state = makeGameState({
      mission: 13,
      players: [
        makePlayer({
          id: "me",
          hand: [makeRedTile({ id: "r1" })],
        }),
      ],
    }) as unknown as ClientGameState;

    expect(isRevealRedsForced(state, "me")).toBe(true);
  });

  it("returns false in mission 18 when the mission18 designator is active", () => {
    const state = makeGameState({
      mission: 18,
      players: [
        makePlayer({
          id: "me",
          hand: [makeRedTile({ id: "r1" })],
        }),
      ],
      campaign: {
        mission18DesignatorIndex: 0,
      },
    }) as unknown as ClientGameState;

    expect(isRevealRedsForced(state, "me")).toBe(false);
  });
});
