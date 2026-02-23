import { describe, expect, it } from "vitest";
import {
  makeBoardState,
  makeCampaignState,
  makeEquipmentCard,
  makeGameState,
  makePlayer,
  makeTile,
} from "@bomb-busters/shared/testing";
import type { BaseEquipmentId, WireTile } from "@bomb-busters/shared";
import { validateUseEquipment } from "../equipment";

function makeMission9StateForEquipment(
  equipmentId: BaseEquipmentId,
  actorHand: WireTile[],
  targetHand: WireTile[],
  pointer = 0,
) {
  return makeGameState({
    mission: 9,
    players: [
      makePlayer({ id: "actor", hand: actorHand }),
      makePlayer({ id: "target", hand: targetHand }),
    ],
    currentPlayerIndex: 0,
    board: makeBoardState({
      equipment: [
        makeEquipmentCard({
          id: equipmentId,
          name: equipmentId,
          unlockValue: 5,
          unlocked: true,
          used: false,
        }),
      ],
    }),
    campaign: makeCampaignState({
      numberCards: {
        visible: [
          { id: "c1", value: 2, faceUp: true },
          { id: "c2", value: 5, faceUp: true },
          { id: "c3", value: 8, faceUp: true },
        ],
        deck: [],
        discard: [],
        playerHands: {},
      },
      specialMarkers: [{ kind: "sequence_pointer", value: pointer }],
    }),
  });
}

describe("equipment mission hook validation", () => {
  it("mission 9: blocks triple detector guess on a sequence-locked value", () => {
    const state = makeMission9StateForEquipment(
      "triple_detector",
      [makeTile({ id: "a1", color: "blue", gameValue: 5 })],
      [
        makeTile({ id: "t1", color: "blue", gameValue: 2 }),
        makeTile({ id: "t2", color: "blue", gameValue: 3 }),
        makeTile({ id: "t3", color: "blue", gameValue: 8 }),
      ],
    );

    const error = validateUseEquipment(state, "actor", "triple_detector", {
      kind: "triple_detector",
      targetPlayerId: "target",
      targetTileIndices: [0, 1, 2],
      guessValue: 5,
    });

    expect(error?.code).toBe("MISSION_RULE_VIOLATION");
  });

  it("mission 9: blocks super detector guess on a sequence-locked value", () => {
    const state = makeMission9StateForEquipment(
      "super_detector",
      [makeTile({ id: "a1", color: "blue", gameValue: 5 })],
      [
        makeTile({ id: "t1", color: "blue", gameValue: 2 }),
        makeTile({ id: "t2", color: "blue", gameValue: 8 }),
      ],
    );

    const error = validateUseEquipment(state, "actor", "super_detector", {
      kind: "super_detector",
      targetPlayerId: "target",
      guessValue: 5,
    });

    expect(error?.code).toBe("MISSION_RULE_VIOLATION");
  });

  it("mission 9: blocks x_or_y_ray when the effective guess is sequence-locked", () => {
    const state = makeMission9StateForEquipment(
      "x_or_y_ray",
      [
        makeTile({ id: "a1", color: "blue", gameValue: 5 }),
        makeTile({ id: "a2", color: "blue", gameValue: 7 }),
      ],
      [makeTile({ id: "t1", color: "blue", gameValue: 1 })],
    );

    const error = validateUseEquipment(state, "actor", "x_or_y_ray", {
      kind: "x_or_y_ray",
      targetPlayerId: "target",
      targetTileIndex: 0,
      guessValueA: 5,
      guessValueB: 7,
    });

    expect(error?.code).toBe("MISSION_RULE_VIOLATION");
  });

  it("mission 9: allows detector cut values once the sequence pointer unlocks them", () => {
    const state = makeMission9StateForEquipment(
      "triple_detector",
      [makeTile({ id: "a1", color: "blue", gameValue: 5 })],
      [
        makeTile({ id: "t1", color: "blue", gameValue: 2 }),
        makeTile({ id: "t2", color: "blue", gameValue: 3 }),
        makeTile({ id: "t3", color: "blue", gameValue: 8 }),
      ],
      1,
    );

    const error = validateUseEquipment(state, "actor", "triple_detector", {
      kind: "triple_detector",
      targetPlayerId: "target",
      targetTileIndices: [0, 1, 2],
      guessValue: 5,
    });

    expect(error).toBeNull();
  });
});
