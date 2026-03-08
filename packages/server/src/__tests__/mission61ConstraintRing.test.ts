import { describe, expect, it } from "vitest";
import {
  makeBoardState,
  makeCampaignState,
  makeConstraintCard,
  makeGameState,
  makePlayer,
  makeTile,
} from "@bomb-busters/shared/testing";
import {
  applyMission61ConstraintReplacement,
  dispatchHooks,
  rotateMission61Constraint,
} from "../missionHooks";

describe("mission61 constraint ring", () => {
  it("sets up public ring slots for a three-player game", () => {
    const state = makeGameState({
      mission: 61,
      players: [
        makePlayer({ id: "captain", isCaptain: true }),
        makePlayer({ id: "p2" }),
        makePlayer({ id: "p3" }),
      ],
    });

    dispatchHooks(61, {
      point: "setup",
      state,
    });

    expect(state.campaign?.mission61Ring?.slots).toHaveLength(4);
    expect(state.campaign?.mission61Ring?.slots[0]?.playerId).toBe("captain");
    expect(state.campaign?.mission61Ring?.slots[1]?.kind).toBe("extra");
    expect(state.campaign?.constraintSelection).toBeUndefined();
  });

  it("rotates the full ring clockwise", () => {
    const state = makeGameState({
      mission: 61,
      campaign: makeCampaignState({
        mission61Ring: {
          slots: [
            { id: "s1", kind: "player", playerId: "captain", card: makeConstraintCard({ id: "A", active: true }) },
            { id: "s2", kind: "extra", label: "Captain's Left", card: makeConstraintCard({ id: "B", active: true }) },
            { id: "s3", kind: "player", playerId: "p2", card: makeConstraintCard({ id: "C", active: true }) },
          ],
          replacementPool: [],
        },
      }),
    });

    expect(rotateMission61Constraint(state, "clockwise")).toBe(true);
    expect(state.campaign?.mission61Ring?.slots.map((slot) => slot.card.id)).toEqual([
      "C",
      "A",
      "B",
    ]);
  });

  it("lets a player replace their own seat card by paying +1 detonator", () => {
    const state = makeGameState({
      mission: 61,
      phase: "playing",
      board: makeBoardState({ detonatorPosition: 0, detonatorMax: 5 }),
      players: [
        makePlayer({ id: "captain", isCaptain: true, hand: [makeTile({ id: "c-1", gameValue: 1 })] }),
        makePlayer({ id: "p2", hand: [makeTile({ id: "p2-1", gameValue: 2 })] }),
      ],
      campaign: makeCampaignState({
        mission61Ring: {
          slots: [
            { id: "s1", kind: "player", playerId: "captain", card: makeConstraintCard({ id: "A", active: true }) },
            { id: "s2", kind: "extra", label: "Captain's Left", card: makeConstraintCard({ id: "B", active: true }) },
            { id: "s3", kind: "player", playerId: "p2", card: makeConstraintCard({ id: "C", active: true }) },
          ],
          replacementPool: [makeConstraintCard({ id: "F", active: true })],
        },
      }),
    });

    const result = applyMission61ConstraintReplacement(state, "captain");

    expect(result.ok).toBe(true);
    expect(state.board.detonatorPosition).toBe(1);
    expect(state.campaign?.mission61Ring?.slots[0]?.card.id).toBe("F");
  });
});
