import { describe, expect, it } from "vitest";
import {
  makeCampaignState,
  makeConstraintCard,
  makeGameState,
  makePlayer,
  makeTile,
} from "@bomb-busters/shared/testing";
import { applyMission32ConstraintDecision, dispatchHooks } from "../missionHooks";

function makeMission32State(options?: {
  currentPlayerIndex?: number;
  captainHandValues?: Array<number | "RED" | "YELLOW">;
  actorHandValues?: Array<number | "RED" | "YELLOW">;
  nextHandValues?: Array<number | "RED" | "YELLOW">;
  activeConstraintId?: string;
  deckConstraintIds?: string[];
}) {
  const captain = makePlayer({
    id: "captain",
    name: "Captain",
    isCaptain: true,
    hand: (options?.captainHandValues ?? [2]).map((value, index) =>
      makeTile({ id: `captain-${index}`, gameValue: value }),
    ),
  });
  const actor = makePlayer({
    id: "actor",
    name: "Actor",
    hand: (options?.actorHandValues ?? [5]).map((value, index) =>
      makeTile({ id: `actor-${index}`, gameValue: value }),
    ),
  });
  const next = makePlayer({
    id: "next",
    name: "Next",
    hand: (options?.nextHandValues ?? [6]).map((value, index) =>
      makeTile({ id: `next-${index}`, gameValue: value }),
    ),
  });

  const activeConstraint = makeConstraintCard({
    id: options?.activeConstraintId ?? "A",
    name: "Constraint",
    active: true,
  });
  const deck = (options?.deckConstraintIds ?? ["B"]).map((id) =>
    makeConstraintCard({
      id,
      name: `Constraint ${id}`,
      active: false,
    }),
  );

  return makeGameState({
    mission: 32,
    players: [captain, actor, next],
    currentPlayerIndex: options?.currentPlayerIndex ?? 1,
    turnNumber: 4,
    campaign: makeCampaignState({
      constraints: {
        global: [activeConstraint],
        perPlayer: {},
        deck,
      },
    }),
  });
}

describe("mission 32 constraint flow", () => {
  it("allows revealReds without applying the visible constraint", () => {
    const state = makeMission32State({
      actorHandValues: ["RED", "RED"],
      deckConstraintIds: [],
    });

    const result = dispatchHooks(32, {
      point: "validate",
      state,
      action: {
        type: "revealReds",
        actorId: "actor",
      },
    });

    expect(result.validationError).toBeUndefined();
  });

  it("does not auto-flip the active constraint when the actor is blocked", () => {
    const state = makeMission32State({
      actorHandValues: [5],
      deckConstraintIds: [],
    });

    const result = dispatchHooks(32, {
      point: "validate",
      state,
      action: {
        type: "soloCut",
        actorId: "actor",
        value: 5,
      },
    });

    expect(result.validationError).toBe("Constraint A: You must cut only even wires");
    expect(state.campaign?.constraints?.global[0]?.active).toBe(true);
  });

  it("queues a captain decision at the start of each turn while a constraint is active", () => {
    const state = makeMission32State();

    dispatchHooks(32, {
      point: "endTurn",
      state,
      previousPlayerId: "captain",
    });

    expect(state.pendingForcedAction).toEqual({
      kind: "mission32ConstraintDecision",
      captainId: "captain",
      actorId: "actor",
      decision: "keep",
    });
  });

  it("keeps the current constraint when the captain chooses keep", () => {
    const state = makeMission32State({
      actorHandValues: [6],
      deckConstraintIds: ["B"],
    });
    state.pendingForcedAction = {
      kind: "mission32ConstraintDecision",
      captainId: "captain",
      actorId: "actor",
      decision: "keep",
    };

    const result = applyMission32ConstraintDecision(state, "captain", "keep");

    expect(result).toEqual({ ok: true });
    expect(state.campaign?.constraints?.global[0]?.id).toBe("A");
    expect(state.pendingForcedAction).toBeUndefined();
    expect(state.currentPlayerIndex).toBe(1);
  });

  it("replaces the current constraint from the deck", () => {
    const state = makeMission32State({
      actorHandValues: [5],
      deckConstraintIds: ["B"],
    });
    state.pendingForcedAction = {
      kind: "mission32ConstraintDecision",
      captainId: "captain",
      actorId: "actor",
      decision: "keep",
    };

    const result = applyMission32ConstraintDecision(state, "captain", "replace");

    expect(result).toEqual({ ok: true });
    expect(state.campaign?.constraints?.global[0]?.id).toBe("B");
    expect(state.pendingForcedAction).toBeUndefined();
    expect(state.currentPlayerIndex).toBe(1);
  });

  it("clears the active constraint when replacing with an empty deck", () => {
    const state = makeMission32State({
      deckConstraintIds: [],
    });
    state.pendingForcedAction = {
      kind: "mission32ConstraintDecision",
      captainId: "captain",
      actorId: "actor",
      decision: "keep",
    };

    const result = applyMission32ConstraintDecision(state, "captain", "replace");

    expect(result).toEqual({ ok: true });
    expect(state.campaign?.constraints?.global).toEqual([]);
    expect(state.pendingForcedAction).toBeUndefined();
  });

  it("auto-skips a blocked actor without advancing the detonator and re-prompts the captain", () => {
    const state = makeMission32State({
      captainHandValues: [3],
      actorHandValues: [5],
      nextHandValues: [7],
      deckConstraintIds: ["B"],
    });
    state.pendingForcedAction = {
      kind: "mission32ConstraintDecision",
      captainId: "captain",
      actorId: "actor",
      decision: "keep",
    };

    const result = applyMission32ConstraintDecision(state, "captain", "keep");

    expect(result).toEqual({ ok: true });
    expect(state.board.detonatorPosition).toBe(0);
    expect(state.turnNumber).toBe(5);
    expect(state.currentPlayerIndex).toBe(2);
    expect(state.campaign?.constraints?.global[0]?.id).toBe("A");
    expect(state.pendingForcedAction).toEqual({
      kind: "mission32ConstraintDecision",
      captainId: "captain",
      actorId: "next",
      decision: "keep",
    });
  });

  it("does not auto-skip a player who can reveal reds", () => {
    const state = makeMission32State({
      actorHandValues: ["RED", "RED"],
      deckConstraintIds: [],
    });
    state.pendingForcedAction = {
      kind: "mission32ConstraintDecision",
      captainId: "captain",
      actorId: "actor",
      decision: "keep",
    };

    const result = applyMission32ConstraintDecision(state, "captain", "keep");

    expect(result).toEqual({ ok: true });
    expect(state.currentPlayerIndex).toBe(1);
    expect(state.turnNumber).toBe(4);
    expect(state.pendingForcedAction).toBeUndefined();
  });
});
