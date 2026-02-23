import { describe, expect, it } from "vitest";
import {
  makeCampaignState,
  makeGameState,
  makeNumberCard,
  makeNumberCardState,
  makePlayer,
  makeSpecialMarker,
  makeTile,
} from "@bomb-busters/shared/testing";
import {
  getMission9SequenceGate,
  isMission9BlockedCutValue,
} from "./actionPanelMissionRules.js";

function makeMission9State(pointer = 0) {
  return makeGameState({
    mission: 9,
    players: [
      makePlayer({
        id: "p1",
        hand: [
          makeTile({ id: "a1", color: "blue", gameValue: 2, cut: true }),
          makeTile({ id: "a2", color: "blue", gameValue: 5, cut: false }),
        ],
      }),
      makePlayer({
        id: "p2",
        hand: [makeTile({ id: "b1", color: "yellow", gameValue: "YELLOW" })],
      }),
    ],
    campaign: makeCampaignState({
      numberCards: makeNumberCardState({
        visible: [
          makeNumberCard({ id: "c1", value: 2, faceUp: true }),
          makeNumberCard({ id: "c2", value: 5, faceUp: true }),
          makeNumberCard({ id: "c3", value: 8, faceUp: true }),
        ],
      }),
      specialMarkers: [makeSpecialMarker({ kind: "sequence_pointer", value: pointer })],
    }),
  });
}

describe("actionPanelMissionRules", () => {
  it("returns mission 9 active sequence value and progress", () => {
    const state = makeMission9State(0);
    expect(getMission9SequenceGate(state)).toEqual({
      activeValue: 2,
      requiredCuts: 2,
      activeProgress: 1,
    });
  });

  it("blocks later sequence card values when pointer is 0", () => {
    const state = makeMission9State(0);
    // Cards are [2, 5, 8] — pointer=0 blocks values[1]=5 and values[2]=8
    expect(isMission9BlockedCutValue(state, 5)).toBe(true);
    expect(isMission9BlockedCutValue(state, 8)).toBe(true);
  });

  it("allows the active value and non-sequence values when pointer is 0", () => {
    const state = makeMission9State(0);
    // Active value (2) is allowed
    expect(isMission9BlockedCutValue(state, 2)).toBe(false);
    // Non-sequence values (e.g. 3, 7) are also allowed
    expect(isMission9BlockedCutValue(state, 3)).toBe(false);
    expect(isMission9BlockedCutValue(state, 7)).toBe(false);
  });

  it("only blocks the last card value when pointer is 1", () => {
    const state = makeMission9State(1);
    // Cards are [2, 5, 8] — pointer=1 blocks only values[2]=8
    expect(isMission9BlockedCutValue(state, 8)).toBe(true);
    expect(isMission9BlockedCutValue(state, 2)).toBe(false);
    expect(isMission9BlockedCutValue(state, 5)).toBe(false);
    expect(isMission9BlockedCutValue(state, 3)).toBe(false);
  });

  it("blocks nothing when pointer is 2", () => {
    const state = makeMission9State(2);
    expect(isMission9BlockedCutValue(state, 2)).toBe(false);
    expect(isMission9BlockedCutValue(state, 5)).toBe(false);
    expect(isMission9BlockedCutValue(state, 8)).toBe(false);
  });

  it("allows yellow values in mission 9 sequence gate", () => {
    const state = makeMission9State(0);
    expect(isMission9BlockedCutValue(state, "YELLOW")).toBe(false);
  });

  it("never blocks values outside mission 9", () => {
    const state = makeGameState({
      mission: 1,
      players: [makePlayer({ id: "p1" })],
    });
    expect(getMission9SequenceGate(state)).toBeNull();
    expect(isMission9BlockedCutValue(state, 7)).toBe(false);
  });
});
