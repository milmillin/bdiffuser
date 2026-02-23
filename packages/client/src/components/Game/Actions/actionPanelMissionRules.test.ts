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

  it("blocks numeric values that are not currently active in mission 9", () => {
    const state = makeMission9State(0);
    expect(isMission9BlockedCutValue(state, 5)).toBe(true);
  });

  it("allows the currently active numeric value in mission 9", () => {
    const state = makeMission9State(0);
    expect(isMission9BlockedCutValue(state, 2)).toBe(false);
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
