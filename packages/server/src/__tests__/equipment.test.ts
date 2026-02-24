import { describe, expect, it } from "vitest";
import {
  EQUIPMENT_DEFS,
  logText,
  renderLogDetail,
  type ActionLegalityCode,
  type BaseEquipmentId,
  type GameState,
  type UseEquipmentPayload,
} from "@bomb-busters/shared";
import {
  makeEquipmentCard,
  makeGameState,
  makePlayer,
  makeRedTile,
  makeTile,
  makeYellowTile,
} from "@bomb-busters/shared/testing";
import { executeDualCut, executeSoloCut, resolveDetectorTileChoice } from "../gameLogic";
import {
  executeUseEquipment,
  resolveTalkiesWalkiesTileChoice,
  validateUseEquipment,
} from "../equipment";

const BASE_EQUIPMENT_IDS = [
  "label_neq",
  "talkies_walkies",
  "triple_detector",
  "post_it",
  "super_detector",
  "rewinder",
  "emergency_batteries",
  "general_radar",
  "stabilizer",
  "x_or_y_ray",
  "coffee_mug",
  "label_eq",
] as const satisfies readonly BaseEquipmentId[];

function getBaseEquipmentDef(equipmentId: BaseEquipmentId) {
  const def = EQUIPMENT_DEFS.find(
    (equipment) => equipment.id === equipmentId && equipment.pool === "base",
  );
  if (!def) {
    throw new Error(`Missing base equipment definition for ${equipmentId}`);
  }
  return def;
}

function unlockedEquipmentCard(
  id: string,
  name: string,
  unlockValue: number,
) {
  return makeEquipmentCard({
    id,
    name,
    unlockValue,
    unlocked: true,
    used: false,
  });
}

function stateWithEquipment(
  players: ReturnType<typeof makePlayer>[],
  equipment: ReturnType<typeof makeEquipmentCard>,
) {
  return makeGameState({
    players,
    currentPlayerIndex: 0,
    board: {
      ...makeGameState().board,
      equipment: [equipment],
    },
  });
}

function withStandSizes<T extends ReturnType<typeof makePlayer>>(
  player: T,
  standSizes: number[],
): T {
  (player as T & { standSizes?: number[] }).standSizes = [...standSizes];
  return player;
}

function buildValidPayload(equipmentId: BaseEquipmentId): UseEquipmentPayload {
  switch (equipmentId) {
    case "label_neq":
      return { kind: "label_neq", tileIndexA: 0, tileIndexB: 1 };
    case "talkies_walkies":
      return {
        kind: "talkies_walkies",
        teammateId: "teammate",
        myTileIndex: 1,
        teammateTileIndex: 0,
      };
    case "triple_detector":
      return {
        kind: "triple_detector",
        targetPlayerId: "teammate",
        targetTileIndices: [0, 1, 2],
        guessValue: 4,
      };
    case "post_it":
      return { kind: "post_it", tileIndex: 0 };
    case "super_detector":
      return { kind: "super_detector", targetPlayerId: "teammate", guessValue: 4 };
    case "rewinder":
      return { kind: "rewinder" };
    case "emergency_batteries":
      return { kind: "emergency_batteries", playerIds: ["teammate"] };
    case "general_radar":
      return { kind: "general_radar", value: 4 };
    case "stabilizer":
      return { kind: "stabilizer" };
    case "x_or_y_ray":
      return {
        kind: "x_or_y_ray",
        targetPlayerId: "teammate",
        targetTileIndex: 1,
        guessValueA: 4,
        guessValueB: 7,
      };
    case "coffee_mug":
      return { kind: "coffee_mug", targetPlayerId: "observer" };
    case "label_eq":
      return { kind: "label_eq", tileIndexA: 2, tileIndexB: 3 };
  }
}

function buildPayloadWithWrongKind(
  equipmentId: BaseEquipmentId,
): UseEquipmentPayload {
  if (equipmentId === "rewinder") {
    return { kind: "label_eq", tileIndexA: 2, tileIndexB: 3 };
  }
  return { kind: "rewinder" };
}

function buildStateForEquipmentMatrix(equipmentId: BaseEquipmentId): GameState {
  const actor = makePlayer({
    id: "actor",
    hand: [
      makeTile({ id: "a1", gameValue: 4 }),
      makeTile({ id: "a2", gameValue: 5 }),
      makeTile({ id: "a3", gameValue: 7 }),
      makeTile({ id: "a4", gameValue: 7 }),
      makeTile({ id: "a5", gameValue: 8 }),
    ],
  });
  const teammate = makePlayer({
    id: "teammate",
    characterUsed: true,
    hand: [
      makeTile({ id: "t1", gameValue: 1 }),
      makeTile({ id: "t2", gameValue: 7 }),
      makeTile({ id: "t3", gameValue: 9 }),
    ],
  });
  const observer = makePlayer({
    id: "observer",
    hand: [makeTile({ id: "o1", gameValue: 2 })],
  });
  const equipmentDef = getBaseEquipmentDef(equipmentId);

  return makeGameState({
    phase: "playing",
    players: [actor, teammate, observer],
    currentPlayerIndex: 0,
    board: {
      ...makeGameState().board,
      equipment: [
        makeEquipmentCard({
          id: equipmentDef.id,
          name: equipmentDef.name,
          unlockValue: equipmentDef.unlockValue,
          unlocked: true,
          used: false,
        }),
      ],
    },
  });
}

function expectLegalityCode(
  state: GameState,
  actorId: string,
  equipmentId: BaseEquipmentId,
  expectedCode: ActionLegalityCode | null,
) {
  const error = validateUseEquipment(
    state,
    actorId,
    equipmentId,
    buildValidPayload(equipmentId),
  );

  if (expectedCode === null) {
    expect(error).toBeNull();
    return;
  }

  expect(error).not.toBeNull();
  expect(error?.code).toBe(expectedCode);
}

const TIMED_EQUIPMENT_IDS = new Set<BaseEquipmentId>(
  BASE_EQUIPMENT_IDS.filter(
    (equipmentId) => getBaseEquipmentDef(equipmentId).useTiming !== "anytime",
  ),
);

describe("equipment validation", () => {
  it("rejects locked equipment", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 5 })],
    });
    const state = makeGameState({
      players: [actor],
      board: {
        ...makeGameState().board,
        equipment: [
          makeEquipmentCard({
            id: "rewinder",
            name: "Rewinder",
            unlockValue: 6,
            unlocked: false,
          }),
        ],
      },
    });

    const error = validateUseEquipment(state, "actor", "rewinder", {
      kind: "rewinder",
    });
    expect(error).not.toBeNull();
    expect(error?.code).toBe("EQUIPMENT_LOCKED");
  });

  it("derives value from tile correctly during execution", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 7 })],
      infoTokens: [],
    });
    const state = stateWithEquipment(
      [actor],
      unlockedEquipmentCard("post_it", "Post-it", 4),
    );

    executeUseEquipment(state, "actor", "post_it", {
      kind: "post_it",
      tileIndex: 0,
    });

    expect(state.players[0].infoTokens).toEqual([
      { value: 7, position: 0, isYellow: false },
    ]);
  });

  it("rejects post-it on a wire that already has an info token", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 5 })],
      infoTokens: [{ value: 5, position: 0, isYellow: false }],
    });
    const state = stateWithEquipment(
      [actor],
      unlockedEquipmentCard("post_it", "Post-it", 4),
    );

    const error = validateUseEquipment(state, "actor", "post_it", {
      kind: "post_it",
      tileIndex: 0,
    });

    expect(error).not.toBeNull();
    expect(error?.code).toBe("EQUIPMENT_RULE_VIOLATION");
  });

  it("rejects label = when selected wires are not adjacent", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a1", gameValue: 3 }),
        makeTile({ id: "a2", gameValue: 4 }),
        makeTile({ id: "a3", gameValue: 5 }),
      ],
    });
    const state = stateWithEquipment(
      [actor],
      unlockedEquipmentCard("label_eq", "Label =", 12),
    );

    const error = validateUseEquipment(state, "actor", "label_eq", {
      kind: "label_eq",
      tileIndexA: 0,
      tileIndexB: 2,
    });

    expect(error).not.toBeNull();
    expect(error?.code).toBe("EQUIPMENT_RULE_VIOLATION");
  });

  it("rejects label != when adjacent wires are equal", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a1", gameValue: 3 }),
        makeTile({ id: "a2", gameValue: 3 }),
      ],
    });
    const state = stateWithEquipment(
      [actor],
      unlockedEquipmentCard("label_neq", "Label !=", 1),
    );

    const error = validateUseEquipment(state, "actor", "label_neq", {
      kind: "label_neq",
      tileIndexA: 0,
      tileIndexB: 1,
    });

    expect(error).not.toBeNull();
    expect(error?.code).toBe("EQUIPMENT_RULE_VIOLATION");
  });

  it("rejects Talkies-Walkies when either selected wire is cut", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 1, cut: true })],
    });
    const teammate = makePlayer({
      id: "teammate",
      hand: [makeTile({ id: "t1", gameValue: 2 })],
    });
    const state = stateWithEquipment(
      [actor, teammate],
      unlockedEquipmentCard("talkies_walkies", "Talkies-Walkies", 2),
    );

    const error = validateUseEquipment(state, "actor", "talkies_walkies", {
      kind: "talkies_walkies",
      teammateId: "teammate",
      myTileIndex: 0,
      teammateTileIndex: 0,
    });

    expect(error).not.toBeNull();
    expect(error?.code).toBe("EQUIPMENT_RULE_VIOLATION");
  });

  it("rejects Emergency Batteries when target has not used character ability", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 1 })],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeTile({ id: "t1", gameValue: 2 })],
      characterUsed: false,
    });
    const state = stateWithEquipment(
      [actor, target],
      unlockedEquipmentCard("emergency_batteries", "Emergency Batteries", 7),
    );

    const error = validateUseEquipment(state, "actor", "emergency_batteries", {
      kind: "emergency_batteries",
      playerIds: ["target"],
    });

    expect(error).not.toBeNull();
    expect(error?.code).toBe("EQUIPMENT_RULE_VIOLATION");
  });

  it("rejects General Radar for values outside 1-12", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 1 })],
    });
    const state = stateWithEquipment(
      [actor],
      unlockedEquipmentCard("general_radar", "General Radar", 8),
    );

    const error = validateUseEquipment(state, "actor", "general_radar", {
      kind: "general_radar",
      value: 13,
    });

    expect(error).not.toBeNull();
    expect(error?.code).toBe("EQUIPMENT_INVALID_PAYLOAD");
  });

  it("rejects Stabilizer when already active for the actor this turn", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 1 })],
    });
    const state = stateWithEquipment(
      [actor],
      unlockedEquipmentCard("stabilizer", "Stabilizer", 9),
    );
    state.turnNumber = 4;
    state.turnEffects = {
      stabilizer: {
        playerId: "actor",
        turnNumber: 4,
      },
    };

    const error = validateUseEquipment(state, "actor", "stabilizer", {
      kind: "stabilizer",
    });

    expect(error).not.toBeNull();
    expect(error?.code).toBe("EQUIPMENT_RULE_VIOLATION");
  });

  it("rejects Coffee Mug self-targeting", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 1 })],
    });
    const teammate = makePlayer({
      id: "teammate",
      hand: [makeTile({ id: "t1", gameValue: 2 })],
    });
    const state = stateWithEquipment(
      [actor, teammate],
      unlockedEquipmentCard("coffee_mug", "Coffee Mug", 11),
    );

    const error = validateUseEquipment(state, "actor", "coffee_mug", {
      kind: "coffee_mug",
      targetPlayerId: "actor",
    });

    expect(error).not.toBeNull();
    expect(error?.code).toBe("EQUIPMENT_RULE_VIOLATION");
  });

  it("rejects Triple Detector with duplicate target indices", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 5 })],
    });
    const target = makePlayer({
      id: "target",
      hand: [
        makeTile({ id: "t1", gameValue: 1 }),
        makeTile({ id: "t2", gameValue: 5 }),
        makeTile({ id: "t3", gameValue: 6 }),
      ],
    });
    const state = stateWithEquipment(
      [actor, target],
      unlockedEquipmentCard("triple_detector", "Triple Detector 3000", 3),
    );

    const error = validateUseEquipment(state, "actor", "triple_detector", {
      kind: "triple_detector",
      targetPlayerId: "target",
      targetTileIndices: [0, 0, 1],
      guessValue: 5,
    });

    expect(error).not.toBeNull();
    expect(error?.code).toBe("EQUIPMENT_INVALID_PAYLOAD");
  });

  it("rejects Super Detector when actor does not hold the guessed value", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 2 })],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeTile({ id: "t1", gameValue: 5 })],
    });
    const state = stateWithEquipment(
      [actor, target],
      unlockedEquipmentCard("super_detector", "Super Detector", 5),
    );

    const error = validateUseEquipment(state, "actor", "super_detector", {
      kind: "super_detector",
      targetPlayerId: "target",
      guessValue: 5,
    });

    expect(error).not.toBeNull();
    expect(error?.code).toBe("GUESS_VALUE_NOT_IN_HAND");
  });

  it("rejects X or Y Ray when announced values are identical", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 5 })],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeTile({ id: "t1", gameValue: 5 })],
    });
    const state = stateWithEquipment(
      [actor, target],
      unlockedEquipmentCard("x_or_y_ray", "X or Y Ray", 10),
    );

    const error = validateUseEquipment(state, "actor", "x_or_y_ray", {
      kind: "x_or_y_ray",
      targetPlayerId: "target",
      targetTileIndex: 0,
      guessValueA: 5,
      guessValueB: 5,
    });

    expect(error).not.toBeNull();
    expect(error?.code).toBe("EQUIPMENT_INVALID_PAYLOAD");
  });

  it("mission 12: clears secondary lock metadata after requirement is met", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a1", gameValue: 5 }),
        makeTile({ id: "a2", gameValue: 5 }),
      ],
    });
    const teammate = makePlayer({
      id: "teammate",
      hand: [makeTile({ id: "t1", gameValue: 7 })],
    });
    const state = makeGameState({
      mission: 12,
      players: [actor, teammate],
      currentPlayerIndex: 0,
      board: {
        ...makeGameState().board,
        equipment: [
          makeEquipmentCard({
            id: "rewinder",
            name: "Rewinder",
            unlockValue: 6,
            unlocked: true,
            secondaryLockValue: 5,
            secondaryLockCutsRequired: 2,
          }),
        ],
      },
    });

    const blockedBefore = validateUseEquipment(state, "actor", "rewinder", {
      kind: "rewinder",
    });
    expect(blockedBefore?.code).toBe("EQUIPMENT_LOCKED");

    executeSoloCut(state, "actor", 5);

    expect(state.board.equipment[0].secondaryLockValue).toBeUndefined();
    expect(state.board.equipment[0].secondaryLockCutsRequired).toBeUndefined();

    const allowedAfter = validateUseEquipment(state, "actor", "rewinder", {
      kind: "rewinder",
    });
    expect(allowedAfter).toBeNull();
  });
});

describe("equipment validation matrix across shared game states", () => {
  it.each(BASE_EQUIPMENT_IDS)(
    "accepts valid payload in baseline state for %s",
    (equipmentId) => {
      const state = buildStateForEquipmentMatrix(equipmentId);
      expectLegalityCode(state, "actor", equipmentId, null);
    },
  );

  it.each(BASE_EQUIPMENT_IDS)(
    "rejects %s when a forced action is pending",
    (equipmentId) => {
      const state = buildStateForEquipmentMatrix(equipmentId);
      state.pendingForcedAction = {
        kind: "chooseNextPlayer",
        captainId: "actor",
      };
      expectLegalityCode(state, "actor", equipmentId, "FORCED_ACTION_PENDING");
    },
  );

  it.each(BASE_EQUIPMENT_IDS)(
    "rejects %s when actor must reveal reds",
    (equipmentId) => {
      const state = buildStateForEquipmentMatrix(equipmentId);
      state.mission = 3;
      state.players[0].hand = [makeTile({ id: "r1", color: "red", gameValue: "RED" })];
      expectLegalityCode(state, "actor", equipmentId, "FORCED_REVEAL_REDS_REQUIRED");
    },
  );

  it("rejects equipment use when Constraint G is active for the actor", () => {
    const state = buildStateForEquipmentMatrix("rewinder");
    state.mission = 32;
    state.campaign = {
      constraints: {
        global: [{ id: "G", name: "Constraint G", description: "", active: true }],
        perPlayer: {},
        deck: [],
      },
    };

    expectLegalityCode(state, "actor", "rewinder", "MISSION_RULE_VIOLATION");
  });

  it("rejects equipment in mission 11 when actor has only hidden red-like wires", () => {
    const state = buildStateForEquipmentMatrix("rewinder");
    state.mission = 11;
    state.players[0].hand = [
      makeTile({ id: "b1", color: "blue", gameValue: 7 }),
      makeTile({ id: "b2", color: "blue", gameValue: 7 }),
    ];
    state.log = [
      {
        turn: 0,
        playerId: "system",
        action: "hookSetup",
        detail: logText("blue_as_red:7"),
        timestamp: 1000,
      },
    ];

    expectLegalityCode(state, "actor", "rewinder", "FORCED_REVEAL_REDS_REQUIRED");
  });

  it("mission 17: captain cannot activate equipment cards", () => {
    const state = buildStateForEquipmentMatrix("rewinder");
    state.mission = 17;
    state.players[0].isCaptain = true;

    expectLegalityCode(state, "actor", "rewinder", "MISSION_RULE_VIOLATION");
  });

  it("mission 17: non-captain can use talkies-walkies targeting the captain", () => {
    const state = buildStateForEquipmentMatrix("talkies_walkies");
    state.mission = 17;
    state.players[0].isCaptain = true; // Sergio/captain
    state.currentPlayerIndex = 1; // teammate's turn

    const error = validateUseEquipment(state, "teammate", "talkies_walkies", {
      kind: "talkies_walkies",
      teammateId: "actor",
      myTileIndex: 0,
      teammateTileIndex: 0,
    });
    expect(error).toBeNull();
  });

  it("mission 28: captain cannot activate equipment cards", () => {
    const state = buildStateForEquipmentMatrix("rewinder");
    state.mission = 28;
    state.players[0].isCaptain = true;

    expectLegalityCode(state, "actor", "rewinder", "MISSION_RULE_VIOLATION");
  });

  it("mission 28: non-captain can use talkies-walkies targeting the captain", () => {
    const state = buildStateForEquipmentMatrix("talkies_walkies");
    state.mission = 28;
    state.players[0].isCaptain = true; // captain
    state.currentPlayerIndex = 1; // teammate's turn

    const error = validateUseEquipment(state, "teammate", "talkies_walkies", {
      kind: "talkies_walkies",
      teammateId: "actor",
      myTileIndex: 0,
      teammateTileIndex: 0,
    });
    expect(error).toBeNull();
  });

  it("mission 58: rejects Post-it because info tokens are disabled", () => {
    const state = buildStateForEquipmentMatrix("post_it");
    state.mission = 58;

    expectLegalityCode(state, "actor", "post_it", "MISSION_RULE_VIOLATION");
  });

  it("mission 58: rejects Label cards because info tokens are disabled", () => {
    const state = buildStateForEquipmentMatrix("label_eq");
    state.mission = 58;

    expectLegalityCode(state, "actor", "label_eq", "MISSION_RULE_VIOLATION");
  });

  it("mission 40: captain-seat Post-it may target cut blue wires", () => {
    const state = buildStateForEquipmentMatrix("post_it");
    state.mission = 40;
    state.players[0].isCaptain = true;
    state.players[0].hand[0].cut = true;

    const error = validateUseEquipment(state, "actor", "post_it", {
      kind: "post_it",
      tileIndex: 0,
    });
    expect(error).toBeNull();
  });

  it("mission 24: Post-it may target cut blue wires", () => {
    const state = buildStateForEquipmentMatrix("post_it");
    state.mission = 24;
    state.players[1].hand[0].cut = true;

    const error = validateUseEquipment(state, "teammate", "post_it", {
      kind: "post_it",
      tileIndex: 0,
    });
    expect(error).toBeNull();
  });

  it("mission 40: non-captain Post-it may target cut blue wires", () => {
    const state = buildStateForEquipmentMatrix("post_it");
    state.mission = 40;
    state.players[0].isCaptain = true;
    state.players[1].hand[0].cut = true;

    const error = validateUseEquipment(state, "teammate", "post_it", {
      kind: "post_it",
      tileIndex: 0,
    });
    expect(error).toBeNull();
  });

  it("mission 20: rejects Post-it targeting an X-marked wire", () => {
    const state = buildStateForEquipmentMatrix("post_it");
    state.mission = 20;
    state.players[0].hand[0].isXMarked = true;

    expectLegalityCode(state, "actor", "post_it", "MISSION_RULE_VIOLATION");
  });

  it("mission 35: rejects Post-it targeting an X-marked wire", () => {
    const state = buildStateForEquipmentMatrix("post_it");
    state.mission = 35;
    state.players[0].hand[0].isXMarked = true;

    expectLegalityCode(state, "actor", "post_it", "MISSION_RULE_VIOLATION");
  });

  it("mission 20: rejects Talkies-Walkies when either selected wire is X-marked", () => {
    const state = buildStateForEquipmentMatrix("talkies_walkies");
    state.mission = 20;
    state.players[1].hand[0].isXMarked = true;

    const error = validateUseEquipment(state, "actor", "talkies_walkies", {
      kind: "talkies_walkies",
      teammateId: "teammate",
      myTileIndex: 1,
      teammateTileIndex: 0,
    });
    expect(error).not.toBeNull();
    expect(error?.code).toBe("MISSION_RULE_VIOLATION");
  });

  it("mission 20: rejects X or Y Ray targeting an X-marked wire", () => {
    const state = buildStateForEquipmentMatrix("x_or_y_ray");
    state.mission = 20;
    state.players[1].hand[1].isXMarked = true;

    const error = validateUseEquipment(state, "actor", "x_or_y_ray", {
      kind: "x_or_y_ray",
      targetPlayerId: "teammate",
      targetTileIndex: 1,
      guessValueA: 4,
      guessValueB: 7,
    });
    expect(error).not.toBeNull();
    expect(error?.code).toBe("MISSION_RULE_VIOLATION");
  });

  it("mission 13: rejects Triple Detector targeting non-blue wires", () => {
    const state = buildStateForEquipmentMatrix("triple_detector");
    state.mission = 13;
    state.players[1].hand[1] = makeRedTile({ id: "t2-red" });

    const error = validateUseEquipment(state, "actor", "triple_detector", {
      kind: "triple_detector",
      targetPlayerId: "teammate",
      targetTileIndices: [0, 1, 2],
      guessValue: 4,
    });
    expect(error).not.toBeNull();
    expect(error?.code).toBe("MISSION_RULE_VIOLATION");
  });

  it("mission 13: rejects Super Detector when target stand has no blue wires", () => {
    const state = buildStateForEquipmentMatrix("super_detector");
    state.mission = 13;
    state.players[1].hand = [
      makeRedTile({ id: "t1-red" }),
      makeYellowTile({ id: "t2-yellow" }),
      makeRedTile({ id: "t3-red" }),
    ];

    const error = validateUseEquipment(state, "actor", "super_detector", {
      kind: "super_detector",
      targetPlayerId: "teammate",
      guessValue: 4,
    });
    expect(error).not.toBeNull();
    expect(error?.code).toBe("MISSION_RULE_VIOLATION");
  });

  it("mission 13: rejects X or Y Ray targeting non-blue wires", () => {
    const state = buildStateForEquipmentMatrix("x_or_y_ray");
    state.mission = 13;
    state.players[1].hand[1] = makeYellowTile({ id: "t2-yellow" });

    const error = validateUseEquipment(state, "actor", "x_or_y_ray", {
      kind: "x_or_y_ray",
      targetPlayerId: "teammate",
      targetTileIndex: 1,
      guessValueA: 4,
      guessValueB: 7,
    });
    expect(error).not.toBeNull();
    expect(error?.code).toBe("MISSION_RULE_VIOLATION");
  });

  it.each(BASE_EQUIPMENT_IDS)(
    "rejects %s when actor is missing from state",
    (equipmentId) => {
      const state = buildStateForEquipmentMatrix(equipmentId);
      expectLegalityCode(state, "ghost", equipmentId, "ACTOR_NOT_FOUND");
    },
  );

  it.each(BASE_EQUIPMENT_IDS)(
    "rejects %s when card is not present on board",
    (equipmentId) => {
      const state = buildStateForEquipmentMatrix(equipmentId);
      state.board.equipment = [];
      expectLegalityCode(state, "actor", equipmentId, "EQUIPMENT_NOT_FOUND");
    },
  );

  it.each(BASE_EQUIPMENT_IDS)("rejects locked %s cards", (equipmentId) => {
    const state = buildStateForEquipmentMatrix(equipmentId);
    state.board.equipment[0].unlocked = false;
    expectLegalityCode(state, "actor", equipmentId, "EQUIPMENT_LOCKED");
  });

  it.each(BASE_EQUIPMENT_IDS)(
    "rejects %s when secondary lock requirement is not met",
    (equipmentId) => {
      const state = buildStateForEquipmentMatrix(equipmentId);
      state.board.equipment[0].secondaryLockValue = 12;
      state.board.equipment[0].secondaryLockCutsRequired = 2;
      expectLegalityCode(state, "actor", equipmentId, "EQUIPMENT_LOCKED");
    },
  );

  it.each(BASE_EQUIPMENT_IDS)("rejects already-used %s cards", (equipmentId) => {
    const state = buildStateForEquipmentMatrix(equipmentId);
    state.board.equipment[0].used = true;
    expectLegalityCode(state, "actor", equipmentId, "EQUIPMENT_ALREADY_USED");
  });

  it.each(BASE_EQUIPMENT_IDS)(
    "rejects %s when payload kind does not match card id",
    (equipmentId) => {
      const state = buildStateForEquipmentMatrix(equipmentId);
      const error = validateUseEquipment(
        state,
        "actor",
        equipmentId,
        buildPayloadWithWrongKind(equipmentId),
      );
      expect(error).not.toBeNull();
      expect(error?.code).toBe("EQUIPMENT_INVALID_PAYLOAD");
    },
  );

  it.each(BASE_EQUIPMENT_IDS)(
    "enforces turn timing for %s while playing",
    (equipmentId) => {
      const state = buildStateForEquipmentMatrix(equipmentId);
      state.currentPlayerIndex = 1;
      const expectedCode = TIMED_EQUIPMENT_IDS.has(equipmentId)
        ? "EQUIPMENT_TIMING_VIOLATION"
        : null;
      expectLegalityCode(state, "actor", equipmentId, expectedCode);
    },
  );

  for (const phase of ["lobby", "setup_info_tokens", "finished"] as const) {
    it.each(BASE_EQUIPMENT_IDS)(
      `phase ${phase}: applies timing rules for %s`,
      (equipmentId) => {
        const state = buildStateForEquipmentMatrix(equipmentId);
        state.phase = phase;
        const expectedCode = TIMED_EQUIPMENT_IDS.has(equipmentId)
          ? "EQUIPMENT_TIMING_VIOLATION"
          : null;
        expectLegalityCode(state, "actor", equipmentId, expectedCode);
      },
    );
  }
});

describe("equipment execution", () => {
  it("rewinder moves detonator back by one", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 5 })],
    });
    const state = makeGameState({
      players: [actor],
      board: {
        ...makeGameState().board,
        detonatorPosition: 2,
        equipment: [
          makeEquipmentCard({
            id: "rewinder",
            name: "Rewinder",
            unlockValue: 6,
            unlocked: true,
            used: false,
          }),
        ],
      },
    });

    const action = executeUseEquipment(state, "actor", "rewinder", {
      kind: "rewinder",
    });
    expect(action.type).toBe("equipmentUsed");
    if (action.type !== "equipmentUsed") return;
    expect(action.effect).toBe("rewinder");
    expect(state.board.detonatorPosition).toBe(1);
    expect(state.board.equipment[0].used).toBe(true);
  });

  it("post-it places an info token on actor stand", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 4 })],
      infoTokens: [],
    });
    const state = stateWithEquipment(
      [actor],
      unlockedEquipmentCard("post_it", "Post-it", 4),
    );

    const action = executeUseEquipment(state, "actor", "post_it", {
      kind: "post_it",
      tileIndex: 0,
    });

    expect(action.type).toBe("equipmentUsed");
    if (action.type !== "equipmentUsed") return;
    expect(action.effect).toBe("post_it");
    expect(state.players[0].infoTokens).toEqual([
      { value: 4, position: 0, isYellow: false },
    ]);
    expect(state.board.equipment[0].used).toBe(true);
  });

  it("mission 21: post-it places an even/odd token instead of numeric token", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 4 })],
      infoTokens: [],
    });
    const state = makeGameState({
      mission: 21,
      players: [actor],
      currentPlayerIndex: 0,
      board: {
        ...makeGameState().board,
        equipment: [unlockedEquipmentCard("post_it", "Post-it", 4)],
      },
    });

    const action = executeUseEquipment(state, "actor", "post_it", {
      kind: "post_it",
      tileIndex: 0,
    });

    expect(action.type).toBe("equipmentUsed");
    if (action.type !== "equipmentUsed") return;
    expect(action.effect).toBe("post_it");
    expect(state.players[0].infoTokens).toEqual([
      { value: 0, parity: "even", position: 0, isYellow: false },
    ]);
  });

  it("mission 24: post-it may target a cut wire and places x1/x2/x3 token based on stand count", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a1", gameValue: 4, sortValue: 4 }),
        makeTile({ id: "a2", gameValue: 4, sortValue: 4 }),
        makeTile({ id: "a3", gameValue: 4, sortValue: 4, cut: true }),
      ],
      infoTokens: [],
    });
    const state = makeGameState({
      mission: 24,
      players: [actor],
      currentPlayerIndex: 0,
      board: {
        ...makeGameState().board,
        equipment: [unlockedEquipmentCard("post_it", "Post-it", 4)],
      },
    });

    const action = executeUseEquipment(state, "actor", "post_it", {
      kind: "post_it",
      tileIndex: 2,
    });

    expect(action.type).toBe("equipmentUsed");
    if (action.type !== "equipmentUsed") return;
    expect(action.effect).toBe("post_it");
    expect(state.players[0].infoTokens).toEqual([
      { value: 0, countHint: 3, position: 2, isYellow: false },
    ]);
  });

  it("mission 40: captain-seat Post-it on a cut wire places x1/x2/x3 token", () => {
    const captain = makePlayer({
      id: "captain",
      isCaptain: true,
      hand: [
        makeTile({ id: "c1", gameValue: 4, sortValue: 4, cut: true }),
        makeTile({ id: "c2", gameValue: 4, sortValue: 4 }),
      ],
      infoTokens: [],
    });
    const partner = makePlayer({
      id: "partner",
      hand: [makeTile({ id: "p1", gameValue: 7, sortValue: 7 })],
    });
    const state = makeGameState({
      mission: 40,
      players: [captain, partner],
      currentPlayerIndex: 0,
      board: {
        ...makeGameState().board,
        equipment: [unlockedEquipmentCard("post_it", "Post-it", 4)],
      },
    });

    const action = executeUseEquipment(state, "captain", "post_it", {
      kind: "post_it",
      tileIndex: 0,
    });

    expect(action.type).toBe("equipmentUsed");
    if (action.type !== "equipmentUsed") return;
    expect(action.effect).toBe("post_it");
    expect(state.players[0].infoTokens).toEqual([
      { value: 0, countHint: 2, position: 0, isYellow: false },
    ]);
  });

  it("mission 40: non-captain Post-it may target cut wire and places x1/x2/x3 token", () => {
    const captain = makePlayer({
      id: "captain",
      isCaptain: true,
      hand: [makeTile({ id: "c1", gameValue: 3, sortValue: 3 })],
    });
    const partner = makePlayer({
      id: "partner",
      hand: [makeTile({ id: "p1", gameValue: 8, sortValue: 8, cut: true })],
      infoTokens: [],
    });
    const state = makeGameState({
      mission: 40,
      players: [captain, partner],
      currentPlayerIndex: 1,
      board: {
        ...makeGameState().board,
        equipment: [unlockedEquipmentCard("post_it", "Post-it", 4)],
      },
    });

    const action = executeUseEquipment(state, "partner", "post_it", {
      kind: "post_it",
      tileIndex: 0,
    });

    expect(action.type).toBe("equipmentUsed");
    if (action.type !== "equipmentUsed") return;
    expect(action.effect).toBe("post_it");
    expect(state.players[1].infoTokens).toEqual([
      { value: 0, countHint: 1, position: 0, isYellow: false },
    ]);
  });

  it("label = places relation token with eq marker", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a1", gameValue: 4 }),
        makeTile({ id: "a2", gameValue: 4 }),
      ],
      infoTokens: [],
    });
    const state = stateWithEquipment(
      [actor],
      unlockedEquipmentCard("label_eq", "Label =", 12),
    );

    const action = executeUseEquipment(state, "actor", "label_eq", {
      kind: "label_eq",
      tileIndexA: 0,
      tileIndexB: 1,
    });

    expect(action.type).toBe("equipmentUsed");
    if (action.type !== "equipmentUsed") return;
    expect(action.effect).toBe("label_eq");
    expect(state.players[0].infoTokens).toEqual([
      {
        value: 0,
        position: 0,
        positionB: 1,
        isYellow: false,
        relation: "eq",
      },
    ]);
    expect(state.board.equipment[0].used).toBe(true);
  });

  it("label != places relation token with neq marker", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a1", gameValue: 4 }),
        makeTile({ id: "a2", gameValue: 5 }),
      ],
      infoTokens: [],
    });
    const state = stateWithEquipment(
      [actor],
      unlockedEquipmentCard("label_neq", "Label !=", 1),
    );

    const action = executeUseEquipment(state, "actor", "label_neq", {
      kind: "label_neq",
      tileIndexA: 0,
      tileIndexB: 1,
    });

    expect(action.type).toBe("equipmentUsed");
    if (action.type !== "equipmentUsed") return;
    expect(action.effect).toBe("label_neq");
    expect(state.players[0].infoTokens).toEqual([
      {
        value: 0,
        position: 0,
        positionB: 1,
        isYellow: false,
        relation: "neq",
      },
    ]);
    expect(state.board.equipment[0].used).toBe(true);
  });

  it("talkies-walkies swaps wires and re-sorts both hands by sortValue", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a1", sortValue: 1, gameValue: 1 }),
        makeTile({ id: "a6", sortValue: 6, gameValue: 6 }),
        makeTile({ id: "a9", sortValue: 9, gameValue: 9 }),
      ],
    });
    const teammate = makePlayer({
      id: "teammate",
      name: "Teammate",
      hand: [
        makeTile({ id: "t2", sortValue: 2, gameValue: 2 }),
        makeTile({ id: "t3", sortValue: 3, gameValue: 3 }),
        makeTile({ id: "t7", sortValue: 7, gameValue: 7 }),
      ],
    });
    const state = stateWithEquipment(
      [actor, teammate],
      unlockedEquipmentCard("talkies_walkies", "Talkies-Walkies", 2),
    );

    const action = executeUseEquipment(state, "actor", "talkies_walkies", {
      kind: "talkies_walkies",
      teammateId: "teammate",
      myTileIndex: 1,
      teammateTileIndex: 0,
    });

    expect(action.type).toBe("equipmentUsed");
    if (action.type !== "equipmentUsed") return;
    expect(action.effect).toBe("talkies_walkies");
    // Actor: [a1(1), t2(2), a9(9)] — already sorted
    expect(state.players[0].hand.map((tile) => tile.id)).toEqual(["a1", "t2", "a9"]);
    // Teammate: [a6(6), t3(3), t7(7)] → re-sorted → [t3(3), a6(6), t7(7)]
    expect(state.players[1].hand.map((tile) => tile.id)).toEqual(["t3", "a6", "t7"]);
    expect(state.players[1].hand.map((tile) => tile.sortValue)).toEqual([3, 6, 7]);
    expect(state.board.equipment[0].used).toBe(true);
  });

  it("talkies-walkies keeps standSizes unchanged after swap", () => {
    const actor = withStandSizes(makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a1", sortValue: 1, gameValue: 1 }),
        makeTile({ id: "a2", sortValue: 2, gameValue: 2 }),
        makeTile({ id: "a8", sortValue: 8, gameValue: 8 }),
        makeTile({ id: "a9", sortValue: 9, gameValue: 9 }),
      ],
    }), [2, 2]);
    const teammate = withStandSizes(makePlayer({
      id: "teammate",
      hand: [
        makeTile({ id: "t3", sortValue: 3, gameValue: 3 }),
        makeTile({ id: "t4", sortValue: 4, gameValue: 4 }),
        makeTile({ id: "t6", sortValue: 6, gameValue: 6 }),
        makeTile({ id: "t7", sortValue: 7, gameValue: 7 }),
      ],
    }), [2, 2]);
    const state = stateWithEquipment(
      [actor, teammate],
      unlockedEquipmentCard("talkies_walkies", "Talkies-Walkies", 2),
    );

    executeUseEquipment(state, "actor", "talkies_walkies", {
      kind: "talkies_walkies",
      teammateId: "teammate",
      myTileIndex: 1,
      teammateTileIndex: 2,
    });

    expect((state.players[0] as typeof actor & { standSizes?: number[] }).standSizes).toEqual([2, 2]);
    expect((state.players[1] as typeof teammate & { standSizes?: number[] }).standSizes).toEqual([2, 2]);
  });

  it("talkies-walkies can start with actor wire only and wait for target choice", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a1", sortValue: 1, gameValue: 1 }),
        makeTile({ id: "a6", sortValue: 6, gameValue: 6 }),
      ],
    });
    const teammate = makePlayer({
      id: "teammate",
      name: "Teammate",
      hand: [
        makeTile({ id: "t2", sortValue: 2, gameValue: 2 }),
        makeTile({ id: "t7", sortValue: 7, gameValue: 7 }),
      ],
    });
    const state = stateWithEquipment(
      [actor, teammate],
      unlockedEquipmentCard("talkies_walkies", "Talkies-Walkies", 2),
    );

    const action = executeUseEquipment(state, "actor", "talkies_walkies", {
      kind: "talkies_walkies",
      teammateId: "teammate",
      myTileIndex: 1,
    });

    expect(action.type).toBe("equipmentUsed");
    if (action.type !== "equipmentUsed") return;
    expect(action.effect).toBe("talkies_walkies_pending");
    expect(state.pendingForcedAction).toEqual({
      kind: "talkiesWalkiesTileChoice",
      actorId: "actor",
      targetPlayerId: "teammate",
      actorTileIndex: 1,
      source: "equipment",
    });
    expect(state.players[0].hand.map((tile) => tile.id)).toEqual(["a1", "a6"]);
    expect(state.players[1].hand.map((tile) => tile.id)).toEqual(["t2", "t7"]);
  });

  it("talkies-walkies resolves pending target choice and swaps wires", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a1", sortValue: 1, gameValue: 1 }),
        makeTile({ id: "a6", sortValue: 6, gameValue: 6 }),
      ],
    });
    const teammate = makePlayer({
      id: "teammate",
      name: "Teammate",
      hand: [
        makeTile({ id: "t2", sortValue: 2, gameValue: 2 }),
        makeTile({ id: "t7", sortValue: 7, gameValue: 7 }),
      ],
    });
    const state = stateWithEquipment(
      [actor, teammate],
      unlockedEquipmentCard("talkies_walkies", "Talkies-Walkies", 2),
    );
    state.pendingForcedAction = {
      kind: "talkiesWalkiesTileChoice",
      actorId: "actor",
      targetPlayerId: "teammate",
      actorTileIndex: 1,
      source: "equipment",
    };

    const action = resolveTalkiesWalkiesTileChoice(state, 0);

    expect(action.type).toBe("equipmentUsed");
    if (action.type !== "equipmentUsed") return;
    expect(action.effect).toBe("talkies_walkies");
    expect(state.pendingForcedAction).toBeUndefined();
    expect(state.players[0].hand.map((tile) => tile.id)).toEqual(["a1", "t2"]);
    expect(state.players[1].hand.map((tile) => tile.id)).toEqual(["a6", "t7"]);
  });

  it("mission 24: talkies-walkies discards x1/x2/x3 count tokens on swapped wires", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a1", gameValue: 3, sortValue: 3 }),
        makeTile({ id: "a2", gameValue: 5, sortValue: 5 }),
      ],
      infoTokens: [
        { value: 0, countHint: 2, position: 0, isYellow: false },
        { value: 0, countHint: 1, position: 1, isYellow: false },
      ],
    });
    const teammate = makePlayer({
      id: "teammate",
      hand: [
        makeTile({ id: "t1", gameValue: 7, sortValue: 7 }),
        makeTile({ id: "t2", gameValue: 9, sortValue: 9 }),
      ],
      infoTokens: [
        { value: 0, countHint: 3, position: 0, isYellow: false },
      ],
    });
    const state = stateWithEquipment(
      [actor, teammate],
      unlockedEquipmentCard("talkies_walkies", "Talkies-Walkies", 2),
    );
    state.mission = 24;

    const action = executeUseEquipment(state, "actor", "talkies_walkies", {
      kind: "talkies_walkies",
      teammateId: "teammate",
      myTileIndex: 0,
      teammateTileIndex: 0,
    });

    expect(action.type).toBe("equipmentUsed");
    if (action.type !== "equipmentUsed") return;
    expect(action.effect).toBe("talkies_walkies");
    // Count token on actor position 0 should be discarded; position 1 kept
    // After re-sort: a2(sv5) moves to index 0, so token position remaps 1→0
    expect(state.players[0].infoTokens).toEqual([
      { value: 0, countHint: 1, position: 0, isYellow: false },
    ]);
    // Count token on teammate position 0 should be discarded
    expect(state.players[1].infoTokens).toEqual([]);
  });

  it("talkies-walkies moves single-wire info tokens with the swapped wire", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a1", gameValue: 3, sortValue: 3 }),
        makeTile({ id: "a2", gameValue: 5, sortValue: 5 }),
      ],
      infoTokens: [
        { value: 3, position: 0, isYellow: false },
      ],
    });
    const teammate = makePlayer({
      id: "teammate",
      hand: [
        makeTile({ id: "t1", gameValue: 7, sortValue: 7 }),
      ],
      infoTokens: [
        { value: 7, position: 0, isYellow: false },
      ],
    });
    const state = stateWithEquipment(
      [actor, teammate],
      unlockedEquipmentCard("talkies_walkies", "Talkies-Walkies", 2),
    );

    const action = executeUseEquipment(state, "actor", "talkies_walkies", {
      kind: "talkies_walkies",
      teammateId: "teammate",
      myTileIndex: 0,
      teammateTileIndex: 0,
    });

    expect(action.type).toBe("equipmentUsed");
    // Base FAQ: token follows the swapped wire to the recipient stand.
    // The teammate's token moves with t1 into actor's hand and remaps on sort.
    expect(state.players[0].infoTokens).toEqual([
      { value: 7, position: 1, isYellow: false },
    ]);
    expect(state.players[1].infoTokens).toEqual([
      { value: 3, position: 0, isYellow: false },
    ]);
  });

  it("mission 40: talkies-walkies moves x1/x2/x3 tokens with swapped wires", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a1", gameValue: 3, sortValue: 3 }),
        makeTile({ id: "a2", gameValue: 8, sortValue: 8 }),
      ],
      infoTokens: [
        { value: 0, countHint: 2, position: 0, isYellow: false },
      ],
    });
    const teammate = makePlayer({
      id: "teammate",
      hand: [makeTile({ id: "t1", gameValue: 5, sortValue: 5 })],
      infoTokens: [
        { value: 0, countHint: 1, position: 0, isYellow: false },
      ],
    });
    const state = stateWithEquipment(
      [actor, teammate],
      unlockedEquipmentCard("talkies_walkies", "Talkies-Walkies", 2),
    );
    state.mission = 40;

    const action = executeUseEquipment(state, "actor", "talkies_walkies", {
      kind: "talkies_walkies",
      teammateId: "teammate",
      myTileIndex: 0,
      teammateTileIndex: 0,
    });

    expect(action.type).toBe("equipmentUsed");
    if (action.type !== "equipmentUsed") return;
    expect(action.effect).toBe("talkies_walkies");
    expect(state.players[0].infoTokens).toEqual([
      { value: 0, countHint: 1, position: 0, isYellow: false },
    ]);
    expect(state.players[1].infoTokens).toEqual([
      { value: 0, countHint: 2, position: 0, isYellow: false },
    ]);
  });

  it("emergency batteries resets used character abilities for selected players", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 1 })],
    });
    const p2 = makePlayer({
      id: "p2",
      hand: [makeTile({ id: "p2-1", gameValue: 2 })],
      characterUsed: true,
    });
    const p3 = makePlayer({
      id: "p3",
      hand: [makeTile({ id: "p3-1", gameValue: 3 })],
      characterUsed: true,
    });
    const state = stateWithEquipment(
      [actor, p2, p3],
      unlockedEquipmentCard("emergency_batteries", "Emergency Batteries", 7),
    );

    const action = executeUseEquipment(state, "actor", "emergency_batteries", {
      kind: "emergency_batteries",
      playerIds: ["p2", "p3"],
    });

    expect(action.type).toBe("equipmentUsed");
    if (action.type !== "equipmentUsed") return;
    expect(action.effect).toBe("emergency_batteries");
    expect(state.players[1].characterUsed).toBe(false);
    expect(state.players[2].characterUsed).toBe(false);
    expect(state.board.equipment[0].used).toBe(true);
  });

  it("general radar returns per-player yes/no detail", () => {
    const actor = makePlayer({
      id: "actor",
      name: "Actor",
      hand: [makeTile({ id: "a1", gameValue: 4 })],
    });
    const p2 = makePlayer({
      id: "p2",
      name: "Bob",
      hand: [makeTile({ id: "b1", gameValue: 9 })],
    });
    const p3 = makePlayer({
      id: "p3",
      name: "Cara",
      hand: [makeTile({ id: "c1", gameValue: 4 })],
    });
    const state = stateWithEquipment(
      [actor, p2, p3],
      unlockedEquipmentCard("general_radar", "General Radar", 8),
    );

    const action = executeUseEquipment(state, "actor", "general_radar", {
      kind: "general_radar",
      value: 4,
    });

    expect(action.type).toBe("equipmentUsed");
    if (action.type !== "equipmentUsed") return;
    expect(action.effect).toBe("general_radar");
    expect(action.detail).toContain("Actor:yes");
    expect(action.detail).toContain("Bob:no");
    expect(action.detail).toContain("Cara:yes");
    expect(state.board.equipment[0].used).toBe(true);
  });

  it("mission 20: General Radar ignores X-marked wires", () => {
    const actor = makePlayer({
      id: "actor",
      name: "Actor",
      hand: [makeTile({ id: "a1", gameValue: 4 })],
    });
    const p2 = makePlayer({
      id: "p2",
      name: "Bob",
      hand: [makeTile({ id: "b1", gameValue: 9 })],
    });
    const p3 = makePlayer({
      id: "p3",
      name: "Cara",
      hand: [makeTile({ id: "c1", gameValue: 4, isXMarked: true })],
    });
    const state = stateWithEquipment(
      [actor, p2, p3],
      unlockedEquipmentCard("general_radar", "General Radar", 8),
    );
    state.mission = 20;

    const action = executeUseEquipment(state, "actor", "general_radar", {
      kind: "general_radar",
      value: 4,
    });

    expect(action.type).toBe("equipmentUsed");
    if (action.type !== "equipmentUsed") return;
    expect(action.effect).toBe("general_radar");
    expect(action.detail).toContain("Actor:yes");
    expect(action.detail).toContain("Bob:no");
    expect(action.detail).toContain("Cara:no");
  });

  it("general radar reports per-stand detail for players with two stands", () => {
    const actor = makePlayer({
      id: "actor",
      name: "Actor",
      hand: [makeTile({ id: "a1", gameValue: 4 })],
    });
    const bob = withStandSizes(makePlayer({
      id: "p2",
      name: "Bob",
      hand: [
        makeTile({ id: "b1", gameValue: 4 }),
        makeTile({ id: "b2", gameValue: 8 }),
      ],
    }), [1, 1]);
    const cara = withStandSizes(makePlayer({
      id: "p3",
      name: "Cara",
      hand: [
        makeTile({ id: "c1", gameValue: 9 }),
        makeTile({ id: "c2", gameValue: 4 }),
      ],
    }), [1, 1]);
    const state = stateWithEquipment(
      [actor, bob, cara],
      unlockedEquipmentCard("general_radar", "General Radar", 8),
    );

    const action = executeUseEquipment(state, "actor", "general_radar", {
      kind: "general_radar",
      value: 4,
    });

    expect(action.type).toBe("equipmentUsed");
    if (action.type !== "equipmentUsed") return;
    expect(action.detail).toContain("Actor:yes");
    expect(action.detail).toContain("Bob:S1:yes|S2:no");
    expect(action.detail).toContain("Cara:S1:no|S2:yes");
  });

  it("stabilizer marks turn effect for actor and turn number", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 5 })],
    });
    const state = stateWithEquipment(
      [actor],
      unlockedEquipmentCard("stabilizer", "Stabilizer", 9),
    );
    state.turnNumber = 3;

    const action = executeUseEquipment(state, "actor", "stabilizer", {
      kind: "stabilizer",
    });

    expect(action.type).toBe("equipmentUsed");
    if (action.type !== "equipmentUsed") return;
    expect(action.effect).toBe("stabilizer");
    expect(state.turnEffects).toEqual({
      stabilizer: {
        playerId: "actor",
        turnNumber: 3,
      },
    });
    expect(state.board.equipment[0].used).toBe(true);
  });

  it("stabilizer prevents detonator advance on failed dual cut", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 5 })],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeTile({ id: "t1", gameValue: 3 })],
    });

    const state = makeGameState({
      players: [actor, target],
      currentPlayerIndex: 0,
      turnNumber: 1,
      board: {
        ...makeGameState().board,
        equipment: [
          makeEquipmentCard({
            id: "stabilizer",
            name: "Stabilizer",
            unlockValue: 9,
            unlocked: true,
            used: false,
          }),
        ],
      },
    });

    executeUseEquipment(state, "actor", "stabilizer", { kind: "stabilizer" });

    const action = executeDualCut(state, "actor", "target", 0, 5);
    expect(action.type).toBe("dualCutResult");
    if (action.type === "dualCutResult") {
      expect(action.success).toBe(false);
      expect(action.detonatorAdvanced).toBe(false);
    }
    expect(state.board.detonatorPosition).toBe(0);
  });

  it("stabilizer still cuts a red wire on failed dual cut", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 5 })],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeTile({ id: "t1", color: "red", gameValue: "RED", sortValue: 5.5 })],
    });

    const state = makeGameState({
      players: [actor, target],
      currentPlayerIndex: 0,
      turnNumber: 1,
      board: {
        ...makeGameState().board,
        equipment: [
          makeEquipmentCard({
            id: "stabilizer",
            name: "Stabilizer",
            unlockValue: 9,
            unlocked: true,
            used: false,
          }),
        ],
      },
    });

    executeUseEquipment(state, "actor", "stabilizer", { kind: "stabilizer" });

    const action = executeDualCut(state, "actor", "target", 0, 5);
    expect(action.type).toBe("dualCutResult");
    if (action.type === "dualCutResult") {
      expect(action.success).toBe(false);
      expect(action.explosion).toBe(false);
      expect(action.detonatorAdvanced).toBe(false);
    }
    expect(state.phase).toBe("playing");
    expect(state.result).toBeNull();
    expect(state.board.detonatorPosition).toBe(0);
    expect(target.hand[0].cut).toBe(true);
    expect(target.infoTokens).toEqual([]);
  });

  it("triple detector resolves by running a dual cut against one of chosen indices", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 5 })],
    });
    const target = makePlayer({
      id: "target",
      hand: [
        makeTile({ id: "t1", gameValue: 3 }),
        makeTile({ id: "t2", gameValue: 5 }),
        makeTile({ id: "t3", gameValue: 8 }),
      ],
    });
    const state = stateWithEquipment(
      [actor, target],
      unlockedEquipmentCard("triple_detector", "Triple Detector 3000", 3),
    );

    const action = executeUseEquipment(state, "actor", "triple_detector", {
      kind: "triple_detector",
      targetPlayerId: "target",
      targetTileIndices: [0, 1, 2],
      guessValue: 5,
    });

    // Now creates a pending forced action
    expect(action.type).toBe("equipmentUsed");
    expect(state.pendingForcedAction).toBeDefined();
    expect(state.pendingForcedAction!.kind).toBe("detectorTileChoice");
    expect(state.board.equipment[0].used).toBe(true);

    // Resolve: auto-selects the single match (tile 1)
    const resolveAction = resolveDetectorTileChoice(state);
    expect(resolveAction.type).toBe("dualCutResult");
    if (resolveAction.type === "dualCutResult") {
      expect(resolveAction.targetTileIndex).toBe(1);
      expect(resolveAction.success).toBe(true);
    }
  });

  it("super detector resolves by selecting an uncut tile from target stand", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 6 })],
    });
    const target = makePlayer({
      id: "target",
      hand: [
        makeTile({ id: "t1", gameValue: 6 }),
        makeTile({ id: "t2", gameValue: 2 }),
      ],
    });
    const state = stateWithEquipment(
      [actor, target],
      unlockedEquipmentCard("super_detector", "Super Detector", 5),
    );

    const action = executeUseEquipment(state, "actor", "super_detector", {
      kind: "super_detector",
      targetPlayerId: "target",
      guessValue: 6,
    });

    // Now creates a pending forced action
    expect(action.type).toBe("equipmentUsed");
    expect(state.pendingForcedAction).toBeDefined();
    expect(state.pendingForcedAction!.kind).toBe("detectorTileChoice");
    expect(state.board.equipment[0].used).toBe(true);

    // Resolve: auto-selects the single match (tile 0)
    const resolveAction = resolveDetectorTileChoice(state);
    expect(resolveAction.type).toBe("dualCutResult");
    if (resolveAction.type === "dualCutResult") {
      expect(resolveAction.targetTileIndex).toBe(0);
      expect(resolveAction.success).toBe(true);
    }
  });

  it("super detector executes against the targeted stand only", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 6 })],
    });
    const target = withStandSizes(makePlayer({
      id: "target",
      hand: [
        makeTile({ id: "t1", gameValue: 6 }),
        makeTile({ id: "t2", gameValue: 2 }),
        makeTile({ id: "t3", gameValue: 6 }),
        makeTile({ id: "t4", gameValue: 8 }),
      ],
    }), [2, 2]);
    const state = stateWithEquipment(
      [actor, target],
      unlockedEquipmentCard("super_detector", "Super Detector", 5),
    );

    const action = executeUseEquipment(
      state,
      "actor",
      "super_detector",
      {
        kind: "super_detector",
        targetPlayerId: "target",
        guessValue: 6,
        targetStandIndex: 1,
      } as unknown as UseEquipmentPayload,
    );

    expect(action.type).toBe("equipmentUsed");
    const forced = state.pendingForcedAction;
    expect(forced).toBeDefined();
    expect(forced?.kind).toBe("detectorTileChoice");
    if (!forced || forced.kind !== "detectorTileChoice") return;
    expect(forced.matchingTileIndices).toEqual([2]);
    expect(forced.originalTargetTileIndices).toEqual([2, 3]);

    const resolveAction = resolveDetectorTileChoice(state);
    expect(resolveAction.type).toBe("dualCutResult");
    if (resolveAction.type === "dualCutResult") {
      expect(resolveAction.targetTileIndex).toBe(2);
      expect(resolveAction.success).toBe(true);
    }
  });

  it("x or y ray resolves with either announced value", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a1", gameValue: 5 }),
        makeYellowTile({ id: "a2" }),
      ],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeYellowTile({ id: "t1" })],
    });

    const state = makeGameState({
      players: [actor, target],
      currentPlayerIndex: 0,
      board: {
        ...makeGameState().board,
        equipment: [
          makeEquipmentCard({
            id: "x_or_y_ray",
            name: "X or Y Ray",
            unlockValue: 10,
            unlocked: true,
            used: false,
          }),
        ],
      },
    });

    const action = executeUseEquipment(state, "actor", "x_or_y_ray", {
      kind: "x_or_y_ray",
      targetPlayerId: "target",
      targetTileIndex: 0,
      guessValueA: 5,
      guessValueB: "YELLOW",
    });

    expect(action.type).toBe("dualCutResult");
    if (action.type === "dualCutResult") {
      expect(action.success).toBe(true);
      expect(action.guessValue).toBe("YELLOW");
    }
    expect(state.board.equipment[0].used).toBe(true);
  });

  it("coffee thermos passes turn to selected player", () => {
    const actor = makePlayer({
      id: "actor",
      name: "Actor",
      hand: [makeTile({ id: "a1", gameValue: 5 })],
    });
    const p2 = makePlayer({
      id: "p2",
      name: "Bob",
      hand: [makeTile({ id: "p2-1", gameValue: 4 })],
    });
    const p3 = makePlayer({
      id: "p3",
      name: "Cara",
      hand: [makeTile({ id: "p3-1", gameValue: 6 })],
    });

    const state = makeGameState({
      players: [actor, p2, p3],
      currentPlayerIndex: 0,
      turnNumber: 1,
      board: {
        ...makeGameState().board,
        equipment: [
          makeEquipmentCard({
            id: "coffee_mug",
            name: "Coffee Mug",
            unlockValue: 11,
            unlocked: true,
            used: false,
          }),
        ],
      },
    });

    const action = executeUseEquipment(state, "actor", "coffee_mug", {
      kind: "coffee_mug",
      targetPlayerId: "p3",
    });
    expect(action.type).toBe("equipmentUsed");
    if (action.type !== "equipmentUsed") return;
    expect(action.effect).toBe("coffee_mug");
    expect(state.currentPlayerIndex).toBe(2);
    expect(state.turnNumber).toBe(2);
    expect(state.board.equipment[0].used).toBe(true);

    const lastLog = state.log[state.log.length - 1];
    expect(lastLog?.detail).toEqual({
      type: "template",
      template: "equipment.coffee_mug.pass_turn",
      params: { targetPlayerId: "p3" },
    });
    expect(
      renderLogDetail(
        lastLog!.detail,
        (playerId) => state.players.find((player) => player.id === playerId)?.name ?? playerId,
      ),
    ).toBe("used Coffee Mug and passed turn to Cara");
  });

  it("grappling hook updates stand sizes and token remapping with flat indices", () => {
    const actor = withStandSizes(makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a1", gameValue: 1, sortValue: 1 }),
        makeTile({ id: "a4", gameValue: 4, sortValue: 4 }),
        makeTile({ id: "a7", gameValue: 7, sortValue: 7 }),
        makeTile({ id: "a9", gameValue: 9, sortValue: 9 }),
      ],
      infoTokens: [
        { value: 0, position: 2, positionB: 3, relation: "eq", isYellow: false },
      ],
    }), [2, 2]);
    const target = withStandSizes(makePlayer({
      id: "target",
      hand: [
        makeTile({ id: "t2", gameValue: 2, sortValue: 2 }),
        makeTile({ id: "t3", gameValue: 3, sortValue: 3 }),
        makeTile({ id: "t5", gameValue: 5, sortValue: 5 }),
        makeTile({ id: "t8", gameValue: 8, sortValue: 8 }),
      ],
      infoTokens: [
        { value: 3, position: 1, isYellow: false },
        { value: 5, position: 2, isYellow: false },
      ],
    }), [2, 2]);
    const state = makeGameState({
      players: [actor, target],
      currentPlayerIndex: 0,
      board: {
        ...makeGameState().board,
        equipment: [
          makeEquipmentCard({
            id: "grappling_hook",
            name: "Grappling Hook",
            unlockValue: 6,
            unlocked: true,
            used: false,
          }),
        ],
      },
    });

    const action = executeUseEquipment(state, "actor", "grappling_hook", {
      kind: "grappling_hook",
      targetPlayerId: "target",
      targetTileIndex: 1,
    });

    expect(action.type).toBe("equipmentUsed");
    if (action.type !== "equipmentUsed") return;
    expect(state.players[0].hand.map((tile) => tile.id)).toEqual(["a1", "t3", "a4", "a7", "a9"]);
    expect(state.players[1].hand.map((tile) => tile.id)).toEqual(["t2", "t5", "t8"]);
    expect((state.players[0] as typeof actor & { standSizes?: number[] }).standSizes).toEqual([3, 2]);
    expect((state.players[1] as typeof target & { standSizes?: number[] }).standSizes).toEqual([1, 2]);
    expect(state.players[0].infoTokens).toEqual([
      { value: 0, position: 3, positionB: 4, relation: "eq", isYellow: false },
    ]);
    expect(state.players[1].infoTokens).toEqual([
      { value: 5, position: 1, isYellow: false },
    ]);
  });
});

describe("equipment validation edge cases", () => {
  // Post-it edge cases
  it("rejects post-it on a cut tile", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 5, cut: true })],
      infoTokens: [],
    });
    const state = stateWithEquipment(
      [actor],
      unlockedEquipmentCard("post_it", "Post-it", 4),
    );

    const error = validateUseEquipment(state, "actor", "post_it", {
      kind: "post_it",
      tileIndex: 0,
    });

    expect(error).not.toBeNull();
    expect(error?.code).toBe("TILE_ALREADY_CUT");
  });

  it("rejects post-it on a red tile", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeRedTile({ id: "r1" }), makeTile({ id: "b1", gameValue: 3 })],
      infoTokens: [],
    });
    const state = stateWithEquipment(
      [actor],
      unlockedEquipmentCard("post_it", "Post-it", 4),
    );

    const error = validateUseEquipment(state, "actor", "post_it", {
      kind: "post_it",
      tileIndex: 0,
    });

    expect(error).not.toBeNull();
    expect(error?.code).toBe("EQUIPMENT_RULE_VIOLATION");
  });

  it("rejects post-it on a yellow tile", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeYellowTile({ id: "y1" })],
      infoTokens: [],
    });
    const state = stateWithEquipment(
      [actor],
      unlockedEquipmentCard("post_it", "Post-it", 4),
    );

    const error = validateUseEquipment(state, "actor", "post_it", {
      kind: "post_it",
      tileIndex: 0,
    });

    expect(error).not.toBeNull();
    expect(error?.code).toBe("EQUIPMENT_RULE_VIOLATION");
  });

  // Label eq/neq edge cases
  it("accepts label_eq on adjacent red tiles", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeRedTile({ id: "r1" }),
        makeRedTile({ id: "r2" }),
        makeTile({ id: "b1", gameValue: 3 }),
      ],
      infoTokens: [],
    });
    const state = stateWithEquipment(
      [actor],
      unlockedEquipmentCard("label_eq", "Label =", 12),
    );

    const error = validateUseEquipment(state, "actor", "label_eq", {
      kind: "label_eq",
      tileIndexA: 0,
      tileIndexB: 1,
    });

    expect(error).toBeNull();
  });

  it("rejects label_eq on flat-adjacent wires across stand boundaries", () => {
    const actor = withStandSizes(makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a1", gameValue: 3 }),
        makeTile({ id: "a2", gameValue: 4 }),
        makeTile({ id: "a3", gameValue: 4 }),
        makeTile({ id: "a4", gameValue: 5 }),
      ],
      infoTokens: [],
    }), [2, 2]);
    const state = stateWithEquipment(
      [actor],
      unlockedEquipmentCard("label_eq", "Label =", 12),
    );

    const error = validateUseEquipment(state, "actor", "label_eq", {
      kind: "label_eq",
      tileIndexA: 1,
      tileIndexB: 2,
    });

    expect(error).not.toBeNull();
    expect(error?.code).toBe("EQUIPMENT_RULE_VIOLATION");
    expect(error?.message).toBe("Label cards require two adjacent wires");
  });

  it("accepts label_eq on adjacent yellow tiles", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeYellowTile({ id: "y1" }),
        makeYellowTile({ id: "y2" }),
      ],
      infoTokens: [],
    });
    const state = stateWithEquipment(
      [actor],
      unlockedEquipmentCard("label_eq", "Label =", 12),
    );

    const error = validateUseEquipment(state, "actor", "label_eq", {
      kind: "label_eq",
      tileIndexA: 0,
      tileIndexB: 1,
    });

    expect(error).toBeNull();
  });

  it("rejects label_eq on adjacent red + blue tiles", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeRedTile({ id: "r1" }),
        makeTile({ id: "b1", gameValue: 5 }),
      ],
      infoTokens: [],
    });
    const state = stateWithEquipment(
      [actor],
      unlockedEquipmentCard("label_eq", "Label =", 12),
    );

    const error = validateUseEquipment(state, "actor", "label_eq", {
      kind: "label_eq",
      tileIndexA: 0,
      tileIndexB: 1,
    });

    expect(error).not.toBeNull();
    expect(error?.code).toBe("EQUIPMENT_RULE_VIOLATION");
  });

  it("accepts label_neq on adjacent red + blue tiles", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeRedTile({ id: "r1" }),
        makeTile({ id: "b1", gameValue: 5 }),
      ],
      infoTokens: [],
    });
    const state = stateWithEquipment(
      [actor],
      unlockedEquipmentCard("label_neq", "Label !=", 1),
    );

    const error = validateUseEquipment(state, "actor", "label_neq", {
      kind: "label_neq",
      tileIndexA: 0,
      tileIndexB: 1,
    });

    expect(error).toBeNull();
  });

  it("accepts label_neq when one selected tile is already cut", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeRedTile({ id: "r1", cut: true }),
        makeTile({ id: "b1", gameValue: 5 }),
      ],
      infoTokens: [],
    });
    const state = stateWithEquipment(
      [actor],
      unlockedEquipmentCard("label_neq", "Label !=", 1),
    );

    const error = validateUseEquipment(state, "actor", "label_neq", {
      kind: "label_neq",
      tileIndexA: 0,
      tileIndexB: 1,
    });

    expect(error).toBeNull();
  });

  it("rejects label_neq when both selected tiles are already cut", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeRedTile({ id: "r1", cut: true }),
        makeTile({ id: "b1", gameValue: 5, cut: true }),
      ],
      infoTokens: [],
    });
    const state = stateWithEquipment(
      [actor],
      unlockedEquipmentCard("label_neq", "Label !=", 1),
    );

    const error = validateUseEquipment(state, "actor", "label_neq", {
      kind: "label_neq",
      tileIndexA: 0,
      tileIndexB: 1,
    });

    expect(error).not.toBeNull();
    expect(error?.code).toBe("EQUIPMENT_RULE_VIOLATION");
    expect(error?.message).toBe("Label != cannot target two cut wires");
  });

  it("rejects label_neq on adjacent red + red tiles", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeRedTile({ id: "r1" }),
        makeRedTile({ id: "r2" }),
        makeTile({ id: "b1", gameValue: 3 }),
      ],
      infoTokens: [],
    });
    const state = stateWithEquipment(
      [actor],
      unlockedEquipmentCard("label_neq", "Label !=", 1),
    );

    const error = validateUseEquipment(state, "actor", "label_neq", {
      kind: "label_neq",
      tileIndexA: 0,
      tileIndexB: 1,
    });

    expect(error).not.toBeNull();
    expect(error?.code).toBe("EQUIPMENT_RULE_VIOLATION");
  });

  // Talkies-walkies edge cases
  it("rejects talkies-walkies when teammate's tile is cut", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 3 })],
    });
    const teammate = makePlayer({
      id: "teammate",
      hand: [makeTile({ id: "t1", gameValue: 4, cut: true })],
    });
    const state = stateWithEquipment(
      [actor, teammate],
      unlockedEquipmentCard("talkies_walkies", "Talkies-Walkies", 2),
    );

    const error = validateUseEquipment(state, "actor", "talkies_walkies", {
      kind: "talkies_walkies",
      teammateId: "teammate",
      myTileIndex: 0,
      teammateTileIndex: 0,
    });

    expect(error).not.toBeNull();
    expect(error?.code).toBe("EQUIPMENT_RULE_VIOLATION");
  });

  it("allows talkies-walkies initiation without teammate tile index when teammate has uncut tile", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 3 })],
    });
    const teammate = makePlayer({
      id: "teammate",
      hand: [makeTile({ id: "t1", gameValue: 4 })],
    });
    const state = stateWithEquipment(
      [actor, teammate],
      unlockedEquipmentCard("talkies_walkies", "Talkies-Walkies", 2),
    );

    const error = validateUseEquipment(state, "actor", "talkies_walkies", {
      kind: "talkies_walkies",
      teammateId: "teammate",
      myTileIndex: 0,
    });

    expect(error).toBeNull();
  });

  it("rejects talkies-walkies initiation without teammate tile when teammate has no swappable tile", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 3 })],
    });
    const teammate = makePlayer({
      id: "teammate",
      hand: [makeTile({ id: "t1", gameValue: 4, cut: true })],
    });
    const state = stateWithEquipment(
      [actor, teammate],
      unlockedEquipmentCard("talkies_walkies", "Talkies-Walkies", 2),
    );

    const error = validateUseEquipment(state, "actor", "talkies_walkies", {
      kind: "talkies_walkies",
      teammateId: "teammate",
      myTileIndex: 0,
    });

    expect(error).not.toBeNull();
    expect(error?.code).toBe("EQUIPMENT_RULE_VIOLATION");
  });

  it("rejects talkies-walkies targeting self", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a1", gameValue: 3 }),
        makeTile({ id: "a2", gameValue: 4 }),
      ],
    });
    const state = stateWithEquipment(
      [actor],
      unlockedEquipmentCard("talkies_walkies", "Talkies-Walkies", 2),
    );

    const error = validateUseEquipment(state, "actor", "talkies_walkies", {
      kind: "talkies_walkies",
      teammateId: "actor",
      myTileIndex: 0,
      teammateTileIndex: 1,
    });

    expect(error).not.toBeNull();
    expect(error?.code).toBe("CANNOT_TARGET_SELF");
  });

  // Emergency batteries edge cases
  it("rejects emergency batteries with 0 selected players", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 1 })],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeTile({ id: "t1", gameValue: 2 })],
      characterUsed: true,
    });
    const state = stateWithEquipment(
      [actor, target],
      unlockedEquipmentCard("emergency_batteries", "Emergency Batteries", 7),
    );

    const error = validateUseEquipment(state, "actor", "emergency_batteries", {
      kind: "emergency_batteries",
      playerIds: [],
    });

    expect(error).not.toBeNull();
    expect(error?.code).toBe("EQUIPMENT_INVALID_PAYLOAD");
  });

  it("rejects emergency batteries with 3 selected players", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 1 })],
    });
    const p2 = makePlayer({
      id: "p2",
      hand: [makeTile({ id: "p2-1", gameValue: 2 })],
      characterUsed: true,
    });
    const p3 = makePlayer({
      id: "p3",
      hand: [makeTile({ id: "p3-1", gameValue: 3 })],
      characterUsed: true,
    });
    const p4 = makePlayer({
      id: "p4",
      hand: [makeTile({ id: "p4-1", gameValue: 4 })],
      characterUsed: true,
    });
    const state = stateWithEquipment(
      [actor, p2, p3, p4],
      unlockedEquipmentCard("emergency_batteries", "Emergency Batteries", 7),
    );

    const error = validateUseEquipment(state, "actor", "emergency_batteries", {
      kind: "emergency_batteries",
      playerIds: ["p2", "p3", "p4"],
    });

    expect(error).not.toBeNull();
    expect(error?.code).toBe("EQUIPMENT_INVALID_PAYLOAD");
  });

  // Triple detector edge cases
  it("rejects triple detector targeting self", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a1", gameValue: 5 }),
        makeTile({ id: "a2", gameValue: 6 }),
        makeTile({ id: "a3", gameValue: 7 }),
        makeTile({ id: "a4", gameValue: 8 }),
      ],
    });
    const state = stateWithEquipment(
      [actor],
      unlockedEquipmentCard("triple_detector", "Triple Detector 3000", 3),
    );

    const error = validateUseEquipment(state, "actor", "triple_detector", {
      kind: "triple_detector",
      targetPlayerId: "actor",
      targetTileIndices: [0, 1, 2],
      guessValue: 5,
    });

    expect(error).not.toBeNull();
    expect(error?.code).toBe("CANNOT_TARGET_SELF");
  });

  it("rejects triple detector when target tile is cut", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 5 })],
    });
    const target = makePlayer({
      id: "target",
      hand: [
        makeTile({ id: "t1", gameValue: 3 }),
        makeTile({ id: "t2", gameValue: 5, cut: true }),
        makeTile({ id: "t3", gameValue: 8 }),
      ],
    });
    const state = stateWithEquipment(
      [actor, target],
      unlockedEquipmentCard("triple_detector", "Triple Detector 3000", 3),
    );

    const error = validateUseEquipment(state, "actor", "triple_detector", {
      kind: "triple_detector",
      targetPlayerId: "target",
      targetTileIndices: [0, 1, 2],
      guessValue: 5,
    });

    expect(error).not.toBeNull();
    expect(error?.code).toBe("TILE_ALREADY_CUT");
  });

  it("rejects triple detector when selected wires span multiple stands", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 5 })],
    });
    const target = withStandSizes(makePlayer({
      id: "target",
      hand: [
        makeTile({ id: "t1", gameValue: 3 }),
        makeTile({ id: "t2", gameValue: 5 }),
        makeTile({ id: "t3", gameValue: 8 }),
        makeTile({ id: "t4", gameValue: 9 }),
      ],
    }), [2, 2]);
    const state = stateWithEquipment(
      [actor, target],
      unlockedEquipmentCard("triple_detector", "Triple Detector 3000", 3),
    );

    const error = validateUseEquipment(state, "actor", "triple_detector", {
      kind: "triple_detector",
      targetPlayerId: "target",
      targetTileIndices: [1, 2, 3],
      guessValue: 5,
    });

    expect(error).not.toBeNull();
    expect(error?.code).toBe("EQUIPMENT_RULE_VIOLATION");
    expect(error?.message).toBe("Triple Detector targets must all be on the same stand");
  });

  // Super detector edge cases
  it("rejects super detector when target has no uncut tiles", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 5 })],
    });
    const target = makePlayer({
      id: "target",
      hand: [
        makeTile({ id: "t1", gameValue: 3, cut: true }),
        makeTile({ id: "t2", gameValue: 5, cut: true }),
      ],
    });
    const state = stateWithEquipment(
      [actor, target],
      unlockedEquipmentCard("super_detector", "Super Detector", 5),
    );

    const error = validateUseEquipment(state, "actor", "super_detector", {
      kind: "super_detector",
      targetPlayerId: "target",
      guessValue: 5,
    });

    expect(error).not.toBeNull();
    expect(error?.code).toBe("EQUIPMENT_RULE_VIOLATION");
  });

  it("requires targetStandIndex for super detector when target has multiple stands", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 5 })],
    });
    const target = withStandSizes(makePlayer({
      id: "target",
      hand: [
        makeTile({ id: "t1", gameValue: 3 }),
        makeTile({ id: "t2", gameValue: 5 }),
        makeTile({ id: "t3", gameValue: 7 }),
        makeTile({ id: "t4", gameValue: 9 }),
      ],
    }), [2, 2]);
    const state = stateWithEquipment(
      [actor, target],
      unlockedEquipmentCard("super_detector", "Super Detector", 5),
    );

    const error = validateUseEquipment(state, "actor", "super_detector", {
      kind: "super_detector",
      targetPlayerId: "target",
      guessValue: 5,
    });

    expect(error).not.toBeNull();
    expect(error?.code).toBe("EQUIPMENT_INVALID_PAYLOAD");
    expect(error?.message).toBe(
      "Super Detector requires targetStandIndex for players with multiple stands",
    );
  });

  // X or Y Ray edge cases
  it("rejects x_or_y_ray when actor lacks one of the announced values", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a1", gameValue: 5 }),
        makeTile({ id: "a2", gameValue: 6 }),
      ],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeTile({ id: "t1", gameValue: 9 })],
    });
    const state = stateWithEquipment(
      [actor, target],
      unlockedEquipmentCard("x_or_y_ray", "X or Y Ray", 10),
    );

    const error = validateUseEquipment(state, "actor", "x_or_y_ray", {
      kind: "x_or_y_ray",
      targetPlayerId: "target",
      targetTileIndex: 0,
      guessValueA: 5,
      guessValueB: 9,
    });

    expect(error).not.toBeNull();
    expect(error?.code).toBe("GUESS_VALUE_NOT_IN_HAND");
  });

  it("accepts x_or_y_ray with YELLOW as guess value", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a1", gameValue: 5 }),
        makeYellowTile({ id: "a2" }),
      ],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeTile({ id: "t1", gameValue: 3 })],
    });
    const state = stateWithEquipment(
      [actor, target],
      unlockedEquipmentCard("x_or_y_ray", "X or Y Ray", 10),
    );

    const error = validateUseEquipment(state, "actor", "x_or_y_ray", {
      kind: "x_or_y_ray",
      targetPlayerId: "target",
      targetTileIndex: 0,
      guessValueA: 5,
      guessValueB: "YELLOW",
    });

    expect(error).toBeNull();
  });
});
