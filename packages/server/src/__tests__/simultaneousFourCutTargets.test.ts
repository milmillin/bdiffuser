import { describe, expect, it } from "vitest";
import {
  makeCampaignState,
  makeGameState,
  makeNumberCard,
  makeNumberCardState,
  makePlayer,
  makeTile,
  makeYellowTile,
} from "@bomb-busters/shared/testing";
import {
  buildSimultaneousFourCutTargets,
  getSimultaneousFourCutTargetValue,
} from "../simultaneousFourCutTargets";

describe("simultaneousFourCutTargets", () => {
  it("mission 46 uses fixed target value 7 without requiring a visible Number card", () => {
    const state = makeGameState({
      mission: 46,
      players: [
        makePlayer({
          id: "p1",
          hand: [
            makeYellowTile({ id: "p1-7a", sortValue: 7.1 }),
            makeYellowTile({ id: "p1-4", sortValue: 4.1 }),
          ],
        }),
        makePlayer({
          id: "p2",
          hand: [
            makeYellowTile({ id: "p2-7", sortValue: 7.1 }),
            makeYellowTile({ id: "p2-5", sortValue: 5.1 }),
          ],
        }),
        makePlayer({
          id: "p3",
          hand: [
            makeYellowTile({ id: "p3-7a", sortValue: 7.1 }),
            makeYellowTile({ id: "p3-7b", sortValue: 7.1 }),
          ],
        }),
      ],
      campaign: makeCampaignState({
        numberCards: makeNumberCardState({
          visible: [],
          deck: [],
          discard: [],
          playerHands: {},
        }),
      }),
    });

    expect(getSimultaneousFourCutTargetValue(state)).toBe(7);
    expect(buildSimultaneousFourCutTargets(state)).toEqual([
      { playerId: "p1", tileIndex: 0 },
      { playerId: "p2", tileIndex: 0 },
      { playerId: "p3", tileIndex: 0 },
      { playerId: "p3", tileIndex: 1 },
    ]);
  });

  it("non-mission-46 uses visible Number card target value", () => {
    const state = makeGameState({
      mission: 39,
      players: [
        makePlayer({ id: "p1", hand: [makeTile({ id: "p1-3", gameValue: 3 })] }),
        makePlayer({ id: "p2", hand: [makeTile({ id: "p2-3", gameValue: 3 })] }),
        makePlayer({ id: "p3", hand: [makeTile({ id: "p3-3", gameValue: 3 })] }),
        makePlayer({ id: "p4", hand: [makeTile({ id: "p4-3", gameValue: 3 })] }),
      ],
      campaign: makeCampaignState({
        numberCards: makeNumberCardState({
          visible: [makeNumberCard({ id: "n3", value: 3, faceUp: true })],
          deck: [],
          discard: [],
          playerHands: {},
        }),
      }),
    });

    expect(getSimultaneousFourCutTargetValue(state)).toBe(3);
    expect(buildSimultaneousFourCutTargets(state)).toEqual([
      { playerId: "p1", tileIndex: 0 },
      { playerId: "p2", tileIndex: 0 },
      { playerId: "p3", tileIndex: 0 },
      { playerId: "p4", tileIndex: 0 },
    ]);
  });

  it("returns null when fewer than four matching targets are available", () => {
    const state = makeGameState({
      mission: 46,
      players: [
        makePlayer({ id: "p1", hand: [makeYellowTile({ id: "p1-7", sortValue: 7.1 })] }),
        makePlayer({ id: "p2", hand: [makeYellowTile({ id: "p2-7", sortValue: 7.1 })] }),
      ],
    });

    expect(buildSimultaneousFourCutTargets(state)).toBeNull();
  });
});
