import { describe, expect, it } from "vitest";
import { renderLogDetail } from "@bomb-busters/shared";
import {
  makeCampaignState,
  makeConstraintCard,
  makeGameState,
  makePlayer,
  makeTile,
} from "@bomb-busters/shared/testing";
import { dispatchHooks } from "../missionHooks";
import {
  executeDualCut,
  executeDualCutDoubleDetector,
  executeSoloCut,
  resolveDetectorTileChoice,
} from "../gameLogic";

const GLOBAL_CONSTRAINT_MISSION_ID = 32;
const PER_PLAYER_CONSTRAINT_MISSION_ID = 31;

type Scope = "global" | "perPlayer";

interface StateWithConstraintOptions {
  scope?: Scope;
  actorHandValues?: number[];
  targetHandValues?: number[];
}

// Mission 32 has the full A-L constraint_enforcement hook rule (global scope).
// Mission 31 also has constraint_enforcement (per-player scope).
function stateWithConstraint(
  constraintId: string,
  opts?: StateWithConstraintOptions,
) {
  const scope = opts?.scope ?? "global";
  const actorHandValues = opts?.actorHandValues ?? [5, 6];
  const targetHandValues = opts?.targetHandValues ?? [3, 8];

  const player1 = makePlayer({
    id: "player-1",
    hand: actorHandValues.map((value, i) =>
      makeTile({ id: `p1-${i}`, gameValue: value }),
    ),
  });
  const player2 = makePlayer({
    id: "player-2",
    name: "Bob",
    hand: targetHandValues.map((value, i) =>
      makeTile({ id: `p2-${i}`, gameValue: value }),
    ),
  });

  const constraint = makeConstraintCard({
    id: constraintId,
    name: `Constraint ${constraintId}`,
    active: true,
  });

  return makeGameState({
    mission:
      scope === "global"
        ? GLOBAL_CONSTRAINT_MISSION_ID
        : PER_PLAYER_CONSTRAINT_MISSION_ID,
    players: [player1, player2],
    currentPlayerIndex: 0,
    campaign: makeCampaignState({
      constraints:
        scope === "global"
          ? { global: [constraint], perPlayer: {} }
          : { global: [], perPlayer: { "player-1": [constraint] } },
    }),
  });
}

function validateDualCut(
  state: ReturnType<typeof stateWithConstraint>,
  guessValue: number,
  targetTileIndex = 0,
) {
  return dispatchHooks(state.mission, {
    point: "validate",
    state,
    action: {
      type: "dualCut",
      actorId: "player-1",
      targetPlayerId: "player-2",
      targetTileIndex,
      guessValue,
    },
  });
}

function validateSoloCut(
  state: ReturnType<typeof stateWithConstraint>,
  value: number,
) {
  return dispatchHooks(state.mission, {
    point: "validate",
    state,
    action: {
      type: "soloCut",
      actorId: "player-1",
      value,
    },
  });
}

interface Mission57StateOptions {
  actorHandValues?: number[];
  targetHandValues?: number[];
}

function stateWithMission57(constraintOptions?: Mission57StateOptions) {
  const actorHandValues = constraintOptions?.actorHandValues ?? [4, 4, 4, 4, 2];
  const targetHandValues = constraintOptions?.targetHandValues ?? [1, 3];

  const state = makeGameState({
    mission: 57,
    players: [
      makePlayer({
        id: "player-1",
        hand: actorHandValues.map((value, index) =>
          makeTile({ id: `p1-${index}`, gameValue: value }),
        ),
      }),
      makePlayer({
        id: "player-2",
        name: "Bob",
        hand: targetHandValues.map((value, index) =>
          makeTile({ id: `p2-${index}`, gameValue: value }),
        ),
      }),
    ],
    currentPlayerIndex: 0,
  });

  dispatchHooks(state.mission, {
    point: "setup",
    state,
  });

  return state;
}

function mission57ConstraintPairForValue(
  state: ReturnType<typeof stateWithMission57>,
  value: number,
): string | undefined {
  const valueIndex = (state.campaign?.numberCards?.visible ?? []).findIndex(
    (card) => card.value === value,
  );
  if (valueIndex < 0) return undefined;
  return state.campaign?.constraints?.global?.[valueIndex]?.id;
}

function mission57BlockedAndAllowedValues(constraintId: string): [number, number] {
  if (constraintId === "A") return [1, 2];
  if (constraintId === "B") return [2, 1];
  if (constraintId === "C") return [10, 4];
  if (constraintId === "D") return [2, 8];
  if (constraintId === "E") return [3, 5];
  return [1, 1];
}

function mission57ConstraintError(constraintId: string): string {
  return {
    A: "Constraint A: You must cut only even wires",
    B: "Constraint B: You must cut only odd wires",
    C: "Constraint C: You must cut only wires 1 to 6",
    D: "Constraint D: You must cut only wires 7 to 12",
    E: "Constraint E: You must cut only wires 4 to 9",
  }[constraintId] ?? "";
}

describe("constraint enforcement validation", () => {
  it.each([
    {
      id: "A",
      actorHandValues: [5, 6],
      blockedValue: 5,
      allowedValue: 6,
      expectedError: "Constraint A: You must cut only even wires",
    },
    {
      id: "B",
      actorHandValues: [5, 6],
      blockedValue: 6,
      allowedValue: 5,
      expectedError: "Constraint B: You must cut only odd wires",
    },
    {
      id: "C",
      actorHandValues: [3, 8],
      blockedValue: 8,
      allowedValue: 3,
      expectedError: "Constraint C: You must cut only wires 1 to 6",
    },
    {
      id: "D",
      actorHandValues: [3, 8],
      blockedValue: 3,
      allowedValue: 8,
      expectedError: "Constraint D: You must cut only wires 7 to 12",
    },
    {
      id: "E",
      actorHandValues: [2, 5],
      blockedValue: 2,
      allowedValue: 5,
      expectedError: "Constraint E: You must cut only wires 4 to 9",
    },
    {
      id: "F",
      actorHandValues: [2, 5],
      blockedValue: 5,
      allowedValue: 2,
      expectedError: "Constraint F: You cannot cut wires 4 to 9",
    },
  ])(
    "Constraint $id rejects blocked values and allows legal values",
    ({ id, actorHandValues, blockedValue, allowedValue, expectedError }) => {
      const blockedState = stateWithConstraint(id, { actorHandValues });
      const blocked = validateDualCut(blockedState, blockedValue);
      expect(blocked.validationCode).toBe("MISSION_RULE_VIOLATION");
      expect(blocked.validationError).toBe(expectedError);

      const allowedState = stateWithConstraint(id, { actorHandValues });
      const allowed = validateDualCut(allowedState, allowedValue);
      expect(allowed.validationError).toBeUndefined();
    },
  );

  it("Constraint G does not reject at validate hook (enforced in equipment validation)", () => {
    const state = stateWithConstraint("G");
    const result = validateDualCut(state, 5);
    expect(result.validationError).toBeUndefined();
  });

  it("Constraint H rejects cutting a wire indicated by an Info token", () => {
    const state = stateWithConstraint("H");
    state.players[1].infoTokens.push({
      value: 3,
      position: 0,
      isYellow: false,
    });

    const result = validateDualCut(state, 5, 0);
    expect(result.validationCode).toBe("MISSION_RULE_VIOLATION");
    expect(result.validationError).toBe(
      "Constraint H: You cannot cut a wire indicated by an Info token",
    );
  });

  it("Constraint H allows cuts that do not target an Info-token-marked wire", () => {
    const state = stateWithConstraint("H");
    state.players[1].infoTokens.push({
      value: 8,
      position: 1,
      isYellow: false,
    });

    const result = validateDualCut(state, 5, 0);
    expect(result.validationError).toBeUndefined();
  });

  it("Constraint H rejects solo cuts when a matching actor wire has an Info token", () => {
    const state = stateWithConstraint("H", {
      actorHandValues: [5, 5],
      targetHandValues: [2, 7],
    });
    state.players[0].infoTokens.push({
      value: 5,
      position: 0,
      isYellow: false,
    });

    const result = validateSoloCut(state, 5);
    expect(result.validationCode).toBe("MISSION_RULE_VIOLATION");
    expect(result.validationError).toBe(
      "Constraint H: You cannot cut a wire indicated by an Info token",
    );
  });

  it("Constraint H suppresses info token placement when the actor's dual cut fails", () => {
    const state = stateWithConstraint("H", {
      scope: "perPlayer",
      actorHandValues: [5, 6],
      targetHandValues: [3, 8],
    });

    const action = executeDualCut(state, "player-1", "player-2", 0, 9);
    expect(action.type).toBe("dualCutResult");
    if (action.type !== "dualCutResult") return;
    expect(action.success).toBe(false);
    expect(state.players[1].infoTokens).toHaveLength(0);
  });

  it("Constraint H suppresses info token placement when a double-detector cut fails in the constrained target hand", () => {
    const state = stateWithConstraint("A", {
      scope: "perPlayer",
      actorHandValues: [5, 6],
      targetHandValues: [3, 8],
    });
    const targetConstraintH = makeConstraintCard({
      id: "H",
      name: "Constraint H",
      active: true,
    });
    state.campaign!.constraints = {
      global: [],
      perPlayer: {
        "player-2": [targetConstraintH],
      },
    };

    const pending = executeDualCutDoubleDetector(
      state,
      "player-1",
      "player-2",
      0,
      1,
      11,
    );
    expect(pending.type).toBe("dualCutDoubleDetectorResult");
    if (pending.type !== "dualCutDoubleDetectorResult") return;
    expect(pending.outcome).toBe("pending");

    const resolved = resolveDetectorTileChoice(state);
    expect(resolved.type).toBe("dualCutDoubleDetectorResult");
    if (resolved.type !== "dualCutDoubleDetectorResult") return;
    expect(resolved.outcome).toBe("no_match");
    expect(state.players[1].infoTokens).toHaveLength(0);
    expect("infoTokenPlacedIndex" in resolved).toBe(false);
  });

  it("Constraint I rejects cutting the far-right uncut target tile", () => {
    const state = stateWithConstraint("I", { targetHandValues: [3, 8, 11] });

    const blocked = validateDualCut(state, 8, 2);
    expect(blocked.validationCode).toBe("MISSION_RULE_VIOLATION");
    expect(blocked.validationError).toBe(
      "Constraint I: You cannot cut the far-right wire",
    );

    const allowed = validateDualCut(state, 8, 1);
    expect(allowed.validationError).toBeUndefined();
  });

  it("Constraint J rejects cutting the far-left uncut target tile", () => {
    const state = stateWithConstraint("J", { targetHandValues: [3, 8, 11] });

    const blocked = validateDualCut(state, 3, 0);
    expect(blocked.validationCode).toBe("MISSION_RULE_VIOLATION");
    expect(blocked.validationError).toBe(
      "Constraint J: You cannot cut the far-left wire",
    );

    const allowed = validateDualCut(state, 8, 1);
    expect(allowed.validationError).toBeUndefined();
  });

  it("Constraint K rejects solo cuts", () => {
    const state = stateWithConstraint("K", {
      actorHandValues: [6, 7],
      targetHandValues: [2, 6],
    });

    const blocked = validateSoloCut(state, 6);
    expect(blocked.validationCode).toBe("MISSION_RULE_VIOLATION");
    expect(blocked.validationError).toBe(
      "Constraint K: You cannot do a Solo Cut action",
    );

    const allowed = validateDualCut(state, 6, 1);
    expect(allowed.validationError).toBeUndefined();
  });

  it("Constraint L does not reject at validate hook and adds an extra detonator step on failed dual cut", () => {
    const state = stateWithConstraint("L");
    const validateResult = validateDualCut(state, 5);
    expect(validateResult.validationError).toBeUndefined();

    const before = state.board.detonatorPosition;
    dispatchHooks(state.mission, {
      point: "resolve",
      state,
      action: {
        type: "dualCut",
        actorId: "player-1",
        targetPlayerId: "player-2",
        targetTileIndex: 0,
        guessValue: 5,
      },
      cutValue: 5,
      cutSuccess: false,
    });

    expect(state.board.detonatorPosition).toBe(before + 1);
    expect(
      state.log.some(
        (entry) => renderLogDetail(entry.detail) === "constraint_L:double_detonator:+1_extra",
      ),
    ).toBe(true);
  });

  it("Constraint L advances detonator by 2 on failed dual-cut execution", () => {
    const state = stateWithConstraint("L");

    const action = executeDualCut(state, "player-1", "player-2", 0, 5);
    expect(action.type).toBe("dualCutResult");
    if (action.type !== "dualCutResult") return;
    expect(action.success).toBe(false);
    expect(state.board.detonatorPosition).toBe(2);
    expect(
      state.log.some(
        (entry) => renderLogDetail(entry.detail) === "constraint_L:double_detonator:+1_extra",
      ),
    ).toBe(true);
  });

  it("auto-flips constraint when all remaining actor tiles violate it", () => {
    const state = stateWithConstraint("A", {
      scope: "perPlayer",
      actorHandValues: [5, 7],
    });

    const result = validateDualCut(state, 5);
    expect(result.validationError).toBeUndefined();
    expect(state.campaign?.constraints?.perPlayer["player-1"]?.[0]?.active).toBe(
      false,
    );
    expect(
      state.log.some((entry) => renderLogDetail(entry.detail) === "constraint_auto_flip:A:stuck"),
    ).toBe(true);
  });

  it("does not auto-flip Constraint K when actor can dual-cut with a wrong-number guess", () => {
    const state = stateWithConstraint("K", {
      actorHandValues: [11],
      targetHandValues: [2],
    });

    const result = validateDualCut(state, 2);
    expect(result.validationError).toBeUndefined();
    expect(state.campaign?.constraints?.global?.[0]?.active).toBe(true);
    expect(
      state.log.some((entry) => renderLogDetail(entry.detail) === "constraint_auto_flip:K:stuck"),
    ).toBe(false);
  });

  it("Mission 57 initializes number cards and pairs them with constraint cards", () => {
    const state = stateWithMission57();

    expect(state.campaign?.numberCards?.visible).toHaveLength(12);
    expect(state.campaign?.constraints?.global).toHaveLength(12);
    expect(
      state.campaign?.numberCards?.visible.every((card) => card.faceUp),
    ).toBe(true);
    expect(
      state.campaign?.constraints?.global.every((constraint) => !constraint.active),
    ).toBe(true);
  });

  it("Mission 57 activates the matching constraint when a value is validated", () => {
    const state = stateWithMission57({
      actorHandValues: [4, 4, 4, 4, 2],
      targetHandValues: [1, 3],
    });

    const result = executeSoloCut(state, "player-1", 4);
    expect(result.type).toBe("soloCutResult");

    const activeConstraint = state.campaign?.constraints?.global.find(
      (constraint) => constraint.active,
    );
    expect(activeConstraint).toBeDefined();
    expect(activeConstraint?.id).toBe(mission57ConstraintPairForValue(state, 4));
  });

  it("Mission 57 enforces the currently active constraint on subsequent validation", () => {
    const state = stateWithMission57({
      actorHandValues: [4, 4, 4, 4, 2],
      targetHandValues: [1, 3],
    });

    const setupCut = executeSoloCut(state, "player-1", 4);
    expect(setupCut.type).toBe("soloCutResult");

    const activeConstraint = state.campaign?.constraints?.global.find(
      (constraint) => constraint.active,
    );
    const activeConstraintId = activeConstraint?.id;
    if (!activeConstraintId) return;

    const [blockedValue, allowedValue] = mission57BlockedAndAllowedValues(
      activeConstraintId,
    );

    const blocked = validateDualCut(state, blockedValue, 0);
    expect(blocked.validationCode).toBe("MISSION_RULE_VIOLATION");
    expect(blocked.validationError).toBe(mission57ConstraintError(activeConstraintId));

    const allowed = validateDualCut(state, allowedValue, 0);
    expect(allowed.validationError).toBeUndefined();
  });
});
