import { describe, it, expect } from "vitest";
import { getMission66BunkerTrackPoint, renderLogDetail } from "@bomb-busters/shared";
import {
  makeBoardState,
  makeGameState,
  makeConstraintCard,
  makeTile,
  makeYellowTile,
  makePlayer,
} from "@bomb-busters/shared/testing";
import { dispatchHooks } from "../missionHooks";
import {
  executeDualCut,
  executeDualCutDoubleDetector,
  executeSoloCut,
  resolveDetectorTileChoice,
} from "../gameLogic";

// Side-effect import registers built-in handlers.
import "../missionHooks";

function parseChallengeValue(id: string): number | null {
  const match = /challenge-value-(\d+)/.exec(id);
  if (!match) return null;
  const value = Number.parseInt(match[1] ?? "", 10);
  return Number.isFinite(value) ? value : null;
}

function valuePassesTestConstraint(value: number, constraintId: string): boolean {
  const normalized = Math.floor(value);
  switch (constraintId) {
    case "A":
      return normalized % 2 === 0;
    case "B":
      return normalized % 2 === 1;
    case "C":
      return normalized >= 1 && normalized <= 6;
    case "D":
      return normalized >= 7 && normalized <= 12;
    case "E":
      return normalized >= 4 && normalized <= 9;
    case "F":
      return normalized < 4 || normalized > 9;
    default:
      return true;
  }
}

function pickValueForTestConstraints(constraintIds: readonly string[]): number {
  for (let value = 1; value <= 12; value++) {
    if (constraintIds.every((id) => valuePassesTestConstraint(value, id))) {
      return value;
    }
  }
  throw new Error(`No valid cut value for constraints: ${constraintIds.join(",")}`);
}

describe("mission progression hooks", () => {
  it("mission 43 setup initializes nano tracker", () => {
    const state = makeGameState({
      mission: 43,
      log: [],
    });

    dispatchHooks(43, { point: "setup", state });

    expect(state.campaign?.nanoTracker).toEqual({ position: 0, max: 6 });
    expect(
      state.log.some(
        (entry) => entry.action === "hookSetup" && renderLogDetail(entry.detail).startsWith("nano_progression:"),
      ),
    ).toBe(true);
  });

  it("mission 43 endTurn advances nano and fails when max is reached", () => {
    const state = makeGameState({
      mission: 43,
      log: [],
      players: [makePlayer({ id: "p1" })],
      board: makeBoardState({ detonatorMax: 3 }),
    });
    dispatchHooks(43, { point: "setup", state });

    expect(state.campaign?.nanoTracker).toBeDefined();
    state.campaign!.nanoTracker!.position = 5;

    dispatchHooks(43, {
      point: "endTurn",
      state,
      previousPlayerId: "p1",
    });

    expect(state.campaign?.nanoTracker?.position).toBe(6);
    expect(state.result).toBe("loss_detonator");
    expect(state.phase).toBe("finished");
  });

  it("mission 44 validate blocks cuts when oxygen is insufficient for wire depth", () => {
    const state = makeGameState({
      mission: 44,
      log: [],
      players: [makePlayer({ id: "p1" }), makePlayer({ id: "p2" })],
    });
    dispatchHooks(44, { point: "setup", state });

    state.campaign!.oxygen!.pool = 1;

    const result = dispatchHooks(44, {
      point: "validate",
      state,
      action: { type: "soloCut", actorId: "p1", value: 11 },
    });

    expect(result.validationCode).toBe("MISSION_RULE_VIOLATION");
    expect(result.validationError).toContain("insufficient oxygen");
  });

  it("mission 44 resolve consumes oxygen on cut based on wire depth", () => {
    const state = makeGameState({
      mission: 44,
      log: [],
      players: [makePlayer({ id: "p1" }), makePlayer({ id: "p2" })],
    });
    dispatchHooks(44, { point: "setup", state });

    dispatchHooks(44, {
      point: "resolve",
      state,
      action: { type: "soloCut", actorId: "p1", value: 4 },
      cutValue: 4,
      cutSuccess: true,
    });
    expect(state.campaign?.oxygen?.pool).toBe(3);

    dispatchHooks(44, {
      point: "resolve",
      state,
      action: { type: "soloCut", actorId: "p1", value: 8 },
      cutValue: 8,
      cutSuccess: true,
    });
    expect(state.campaign?.oxygen?.pool).toBe(1);

    dispatchHooks(44, {
      point: "resolve",
      state,
      action: { type: "soloCut", actorId: "p1", value: 11 },
      cutValue: 11,
      cutSuccess: true,
    });
    expect(state.campaign?.oxygen?.pool).toBe(0);
    expect(state.board.detonatorPosition).toBe(1);
    expect(state.result).toBeNull();
    expect(state.phase).toBe("playing");
  });

  it("mission 44 endTurn does not consume oxygen", () => {
    const state = makeGameState({
      mission: 44,
      log: [],
      players: [makePlayer({ id: "p1" }), makePlayer({ id: "p2" })],
      board: makeBoardState({ detonatorPosition: 1, detonatorMax: 3 }),
    });
    dispatchHooks(44, { point: "setup", state });

    dispatchHooks(44, {
      point: "endTurn",
      state,
      previousPlayerId: "p1",
    });

    expect(state.campaign?.oxygen?.pool).toBe(4);
    expect(state.board.detonatorPosition).toBe(1);
  });

  it("mission 44 endTurn auto-skips players with insufficient oxygen", () => {
    const actor = makePlayer({
      id: "p1",
      hand: [makeTile({ id: "p1-1", gameValue: 11, cut: false })],
    });
    const next = makePlayer({
      id: "p2",
      hand: [makeTile({ id: "p2-1", gameValue: 4, cut: false })],
    });
    const state = makeGameState({
      mission: 44,
      log: [],
      players: [actor, next],
      currentPlayerIndex: 0,
      turnNumber: 1,
      board: makeBoardState({ detonatorPosition: 1, detonatorMax: 5 }),
    });
    dispatchHooks(44, { point: "setup", state });

    if (!state.campaign?.oxygen) {
      throw new Error("mission 44 should initialize oxygen");
    }
    state.campaign.oxygen.playerOxygen.p1 = 0;
    state.campaign.oxygen.playerOxygen.p2 = 1;
    state.campaign.oxygen.pool = 0;

    dispatchHooks(44, {
      point: "endTurn",
      state,
      previousPlayerId: "p2",
    });

    expect(state.currentPlayerIndex).toBe(1);
    expect(state.turnNumber).toBe(2);
    expect(state.board.detonatorPosition).toBe(2);
    const autoSkipLog = state.log.find(
      (entry) =>
        entry.action === "hookEffect"
        && renderLogDetail(entry.detail) === "oxygen_progression:auto_skip|player=p1|detonator=2",
    );
    expect(autoSkipLog).toBeDefined();
  });

  it("mission 44 endTurn returns all oxygen to reserve on captain turn", () => {
    const captain = makePlayer({
      id: "captain",
      isCaptain: true,
      hand: [makeTile({ id: "captain-2", gameValue: 2, cut: false })],
    });
    const teammate = makePlayer({
      id: "teammate",
      hand: [makeTile({ id: "teammate-8", gameValue: 8, cut: false })],
    });
    const state = makeGameState({
      mission: 44,
      log: [],
      players: [teammate, captain],
      currentPlayerIndex: 1,
      board: makeBoardState({ detonatorPosition: 1, detonatorMax: 4 }),
    });
    dispatchHooks(44, { point: "setup", state });

    if (!state.campaign?.oxygen) {
      throw new Error("mission 44 should initialize oxygen");
    }
    state.campaign.oxygen.pool = 2;
    state.campaign.oxygen.playerOxygen.teammate = 3;
    state.campaign.oxygen.playerOxygen.captain = 4;

    dispatchHooks(44, {
      point: "endTurn",
      state,
      previousPlayerId: "teammate",
    });

    expect(state.currentPlayerIndex).toBe(1);
    expect(state.turnNumber).toBe(1);
    expect(state.campaign.oxygen.playerOxygen.teammate).toBe(0);
    expect(state.campaign.oxygen.playerOxygen.captain).toBe(0);
    expect(state.campaign.oxygen.pool).toBe(9);
    const resetLog = state.log.find(
      (entry) =>
        entry.action === "hookEffect"
        && renderLogDetail(entry.detail) === "oxygen_progression:mission44_captain_reset|returned=7",
    );
    expect(resetLog).toBeDefined();
  });

  it("mission 44 setup scales oxygen reserve by player count", () => {
    const cases: Array<{ playerCount: 2 | 3 | 4 | 5; expectedPool: number }> = [
      { playerCount: 2, expectedPool: 4 },
      { playerCount: 3, expectedPool: 6 },
      { playerCount: 4, expectedPool: 8 },
      { playerCount: 5, expectedPool: 10 },
    ];

    for (const { playerCount, expectedPool } of cases) {
      const players = Array.from({ length: playerCount }, (_, idx) =>
        makePlayer({ id: `p${idx + 1}` }),
      );
      const state = makeGameState({
        mission: 44,
        log: [],
        players,
      });

      dispatchHooks(44, { point: "setup", state });

      expect(state.campaign?.oxygen?.pool).toBe(expectedPool);
    }
  });

  it("mission 49 setup distributes oxygen per player count", () => {
    const cases: Array<{ playerCount: 2 | 3 | 4 | 5; expectedPerPlayer: number }> = [
      { playerCount: 2, expectedPerPlayer: 7 },
      { playerCount: 3, expectedPerPlayer: 6 },
      { playerCount: 4, expectedPerPlayer: 5 },
      { playerCount: 5, expectedPerPlayer: 4 },
    ];

    for (const { playerCount, expectedPerPlayer } of cases) {
      const players = Array.from({ length: playerCount }, (_, idx) =>
        makePlayer({ id: `p${idx + 1}` }),
      );
      const state = makeGameState({
        mission: 49,
        log: [],
        players,
      });

      dispatchHooks(49, { point: "setup", state });

      expect(state.campaign?.oxygen?.pool).toBe(0);
      for (const player of players) {
        expect(state.campaign?.oxygen?.playerOxygen[player.id]).toBe(expectedPerPlayer);
      }
    }
  });

  it("mission 49 validate blocks cuts when oxygen is insufficient for wire value", () => {
    const state = makeGameState({
      mission: 49,
      log: [],
      players: [makePlayer({ id: "p1" }), makePlayer({ id: "p2" })],
    });
    dispatchHooks(49, { point: "setup", state });

    state.campaign!.oxygen!.playerOxygen.p1 = 2;

    const result = dispatchHooks(49, {
      point: "validate",
      state,
      action: { type: "soloCut", actorId: "p1", value: 4 },
    });

    expect(result.validationCode).toBe("MISSION_RULE_VIOLATION");
    expect(result.validationError).toContain("insufficient oxygen");
  });

  it("mission 49 resolve consumes oxygen on cut based on wire value", () => {
    const state = makeGameState({
      mission: 49,
      log: [],
      players: [makePlayer({ id: "p1" }), makePlayer({ id: "p2" })],
    });
    dispatchHooks(49, { point: "setup", state });

    dispatchHooks(49, {
      point: "resolve",
      state,
      action: { type: "soloCut", actorId: "p1", value: 4 },
      cutValue: 4,
      cutSuccess: true,
    });

    expect(state.campaign?.oxygen?.playerOxygen.p1).toBe(3);
  });

  it("mission 49 validate rejects soloCut with invalid teammate target", () => {
    const state = makeGameState({
      mission: 49,
      log: [],
      players: [makePlayer({ id: "p1" }), makePlayer({ id: "p2" })],
    });
    dispatchHooks(49, {
      point: "setup",
      state,
    });

    if (!state.campaign?.oxygen) {
      throw new Error("mission 49 should initialize oxygen");
    }
    state.campaign.oxygen.playerOxygen.p1 = 4;

    const result = dispatchHooks(49, {
      point: "validate",
      state,
      action: { type: "soloCut", actorId: "p1", value: 4, targetPlayerId: "p1" },
    });

    expect(result.validationCode).toBe("MISSION_RULE_VIOLATION");
    expect(result.validationError).toContain("recipient must be a teammate");
  });

  it("mission 49 validate uses actor-only oxygen when validating cut costs", () => {
    const state = makeGameState({
      mission: 49,
      log: [],
      players: [makePlayer({ id: "p1" }), makePlayer({ id: "p2" })],
    });
    dispatchHooks(49, {
      point: "setup",
      state,
    });

    if (!state.campaign?.oxygen) {
      throw new Error("mission 49 should initialize oxygen");
    }
    state.campaign.oxygen.playerOxygen.p1 = 2;
    state.campaign.oxygen.pool = 5;

    const result = dispatchHooks(49, {
      point: "validate",
      state,
      action: { type: "soloCut", actorId: "p1", value: 4 },
    });

    expect(result.validationCode).toBe("MISSION_RULE_VIOLATION");
    expect(result.validationError).toContain("insufficient oxygen");
  });

  it("mission 49 transfer cut cost to the selected teammate", () => {
    const state = makeGameState({
      mission: 49,
      log: [],
      players: [
        makePlayer({ id: "p1" }),
        makePlayer({ id: "p2" }),
        makePlayer({ id: "p3" }),
      ],
    });
    dispatchHooks(49, { point: "setup", state });
    if (!state.campaign?.oxygen) {
      throw new Error("mission 49 should initialize oxygen");
    }
    state.campaign.oxygen.playerOxygen.p1 = 7;
    state.campaign.oxygen.playerOxygen.p2 = 4;
    state.campaign.oxygen.playerOxygen.p3 = 1;

    dispatchHooks(49, {
      point: "resolve",
      state,
      action: { type: "soloCut", actorId: "p1", value: 4, targetPlayerId: "p3" },
      cutValue: 4,
      cutSuccess: true,
    });

    expect(state.campaign?.oxygen?.playerOxygen.p1).toBe(3);
    expect(state.campaign?.oxygen?.playerOxygen.p2).toBe(4);
    expect(state.campaign?.oxygen?.playerOxygen.p3).toBe(5);
  });

  it("mission 49 dual-cut transfer cost to the selected teammate", () => {
    const state = makeGameState({
      mission: 49,
      log: [],
      players: [
        makePlayer({
          id: "p1",
          hand: [makeTile({ id: "p1-4", gameValue: 4 })],
        }),
        makePlayer({
          id: "p2",
          hand: [makeTile({ id: "p2-1", gameValue: 4 })],
        }),
        makePlayer({
          id: "p3",
          hand: [makeTile({ id: "p3-1", gameValue: 4 })],
        }),
      ],
    });
    dispatchHooks(49, { point: "setup", state });
    if (!state.campaign?.oxygen) {
      throw new Error("mission 49 should initialize oxygen");
    }
    state.campaign.oxygen.playerOxygen.p1 = 7;
    state.campaign.oxygen.playerOxygen.p2 = 4;
    state.campaign.oxygen.playerOxygen.p3 = 1;

    dispatchHooks(49, {
      point: "resolve",
      state,
      action: {
        type: "dualCut",
        actorId: "p1",
        targetPlayerId: "p2",
        targetTileIndex: 0,
        guessValue: 4,
        oxygenRecipientPlayerId: "p3",
      },
      cutValue: 4,
      cutSuccess: true,
    });

    expect(state.campaign?.oxygen?.playerOxygen.p1).toBe(3);
    expect(state.campaign?.oxygen?.playerOxygen.p2).toBe(4);
    expect(state.campaign?.oxygen?.playerOxygen.p3).toBe(5);
  });

  it("mission 49 dual-detector transfer cost to the selected teammate", () => {
    const state = makeGameState({
      mission: 49,
      log: [],
      players: [
        makePlayer({
          id: "p1",
          hand: [makeTile({ id: "p1-4", gameValue: 4 })],
        }),
        makePlayer({
          id: "p2",
          hand: [makeTile({ id: "p2-1", gameValue: 4 })],
        }),
        makePlayer({
          id: "p3",
          hand: [makeTile({ id: "p3-1", gameValue: 4 })],
        }),
      ],
    });
    dispatchHooks(49, { point: "setup", state });
    if (!state.campaign?.oxygen) {
      throw new Error("mission 49 should initialize oxygen");
    }
    state.campaign.oxygen.playerOxygen.p1 = 7;
    state.campaign.oxygen.playerOxygen.p2 = 4;
    state.campaign.oxygen.playerOxygen.p3 = 1;

    dispatchHooks(49, {
      point: "resolve",
      state,
      action: {
        type: "dualCutDoubleDetector",
        actorId: "p1",
        targetPlayerId: "p2",
        tileIndex1: 0,
        tileIndex2: 1,
        guessValue: 4,
        oxygenRecipientPlayerId: "p3",
      } as unknown as {
        type: "dualCut" | "soloCut" | "revealReds";
        actorId: string;
        [key: string]: unknown;
      },
      cutValue: 4,
      cutSuccess: true,
    });

    expect(state.campaign?.oxygen?.playerOxygen.p1).toBe(3);
    expect(state.campaign?.oxygen?.playerOxygen.p2).toBe(4);
    expect(state.campaign?.oxygen?.playerOxygen.p3).toBe(5);
  });

  it("mission 49 double-detector defaults oxygen transfer to the next player when no recipient is specified", () => {
    const state = makeGameState({
      mission: 49,
      log: [],
      players: [
        makePlayer({
          id: "p1",
          character: "double_detector",
          hand: [makeTile({ id: "p1-4", gameValue: 4 })],
        }),
        makePlayer({
          id: "p2",
          hand: [
            makeTile({ id: "p2-4", gameValue: 4 }),
            makeTile({ id: "p2-5", gameValue: 5 }),
          ],
        }),
        makePlayer({
          id: "p3",
          hand: [makeTile({ id: "p3-1", gameValue: 1 })],
        }),
      ],
    });

    dispatchHooks(49, { point: "setup", state });
    if (!state.campaign?.oxygen) {
      throw new Error("mission 49 should initialize oxygen");
    }
    state.campaign.oxygen.playerOxygen.p1 = 7;
    state.campaign.oxygen.playerOxygen.p2 = 4;
    state.campaign.oxygen.playerOxygen.p3 = 1;

    executeDualCutDoubleDetector(
      state,
      "p1",
      "p2",
      0,
      1,
      4,
    );
    const resolveAction = resolveDetectorTileChoice(state, 0);
    expect(resolveAction.type).toBe("dualCutDoubleDetectorResult");
    expect(state.campaign?.oxygen?.playerOxygen.p1).toBe(3);
    expect(state.campaign?.oxygen?.playerOxygen.p2).toBe(8);
    expect(state.campaign?.oxygen?.playerOxygen.p3).toBe(1);
  });

  it("mission 49 dual-cut defaults oxygen transfer to the next player when no recipient is specified", () => {
    const state = makeGameState({
      mission: 49,
      log: [],
      players: [
        makePlayer({
          id: "p1",
          hand: [makeTile({ id: "p1-4", gameValue: 4 })],
        }),
        makePlayer({
          id: "p2",
          hand: [makeTile({ id: "p2-1", gameValue: 4 })],
        }),
        makePlayer({
          id: "p3",
          hand: [makeTile({ id: "p3-1", gameValue: 4 })],
        }),
      ],
    });
    dispatchHooks(49, { point: "setup", state });
    if (!state.campaign?.oxygen) {
      throw new Error("mission 49 should initialize oxygen");
    }
    state.campaign.oxygen.playerOxygen.p1 = 7;
    state.campaign.oxygen.playerOxygen.p2 = 4;
    state.campaign.oxygen.playerOxygen.p3 = 1;

    dispatchHooks(49, {
      point: "resolve",
      state,
      action: {
        type: "dualCut",
        actorId: "p1",
        targetPlayerId: "p2",
        targetTileIndex: 0,
        guessValue: 4,
      },
      cutValue: 4,
      cutSuccess: true,
    });

    expect(state.campaign?.oxygen?.playerOxygen.p1).toBe(3);
    expect(state.campaign?.oxygen?.playerOxygen.p2).toBe(8);
    expect(state.campaign?.oxygen?.playerOxygen.p3).toBe(1);
  });

  it("mission 49 defaults solo-cut oxygen transfer to the next player when no recipient is specified", () => {
    const state = makeGameState({
      mission: 49,
      log: [],
      players: [
        makePlayer({ id: "p1" }),
        makePlayer({ id: "p2" }),
        makePlayer({ id: "p3" }),
      ],
    });
    dispatchHooks(49, { point: "setup", state });
    if (!state.campaign?.oxygen) {
      throw new Error("mission 49 should initialize oxygen");
    }
    state.campaign.oxygen.playerOxygen.p1 = 7;
    state.campaign.oxygen.playerOxygen.p2 = 4;
    state.campaign.oxygen.playerOxygen.p3 = 1;

    dispatchHooks(49, {
      point: "resolve",
      state,
      action: { type: "soloCut", actorId: "p1", value: 4 },
      cutValue: 4,
      cutSuccess: true,
    });

    expect(state.campaign?.oxygen?.playerOxygen.p1).toBe(3);
    expect(state.campaign?.oxygen?.playerOxygen.p2).toBe(8);
    expect(state.campaign?.oxygen?.playerOxygen.p3).toBe(1);
  });

  it("mission 49 endTurn does not consume oxygen", () => {
    const state = makeGameState({
      mission: 49,
      log: [],
      players: [makePlayer({ id: "p1" }), makePlayer({ id: "p2" })],
      board: makeBoardState({ detonatorPosition: 1, detonatorMax: 3 }),
    });
    dispatchHooks(49, { point: "setup", state });

    dispatchHooks(49, {
      point: "endTurn",
      state,
      previousPlayerId: "p1",
    });

    expect(state.campaign?.oxygen?.playerOxygen.p1).toBe(7);
    expect(state.board.detonatorPosition).toBe(1);
  });

  it("mission 49 endTurn does not auto-skip when actor can make a legal yellow dual-cut", () => {
    const actor = makePlayer({
      id: "p1",
      hand: [makeYellowTile({ id: "p1-1" })],
    });
    const teammate = makePlayer({
      id: "p2",
      hand: [makeYellowTile({ id: "p2-1" })],
    });
    const state = makeGameState({
      mission: 49,
      log: [],
      players: [actor, teammate],
      currentPlayerIndex: 0,
      turnNumber: 1,
      board: makeBoardState({ detonatorPosition: 1, detonatorMax: 5 }),
    });
    dispatchHooks(49, { point: "setup", state });

    if (!state.campaign?.oxygen) {
      throw new Error("mission 49 should initialize oxygen");
    }
    state.campaign.oxygen.playerOxygen.p1 = 0;
    state.campaign.oxygen.playerOxygen.p2 = 0;
    state.campaign.oxygen.pool = 0;

    dispatchHooks(49, {
      point: "endTurn",
      state,
      previousPlayerId: "p2",
    });

    expect(state.currentPlayerIndex).toBe(0);
    expect(state.turnNumber).toBe(1);
    expect(state.board.detonatorPosition).toBe(1);
    const autoSkipLog = state.log.find(
      (entry) =>
        entry.action === "hookEffect"
        && renderLogDetail(entry.detail) === "oxygen_progression:auto_skip|player=p1|detonator=2",
    );
    expect(autoSkipLog).toBeUndefined();
  });

  it("mission 54 setup distributes oxygen per player count", () => {
    const cases: Array<{ playerCount: 2 | 3 | 4 | 5; expectedPerPlayer: number }> = [
      { playerCount: 2, expectedPerPlayer: 9 },
      { playerCount: 3, expectedPerPlayer: 6 },
      { playerCount: 4, expectedPerPlayer: 3 },
      { playerCount: 5, expectedPerPlayer: 2 },
    ];

    for (const { playerCount, expectedPerPlayer } of cases) {
      const players = Array.from({ length: playerCount }, (_, idx) =>
        makePlayer({ id: `p${idx + 1}` }),
      );
      const state = makeGameState({
        mission: 54,
        log: [],
        players,
      });

      dispatchHooks(54, { point: "setup", state });

      expect(state.campaign?.oxygen?.pool).toBe(7);
      for (const player of players) {
        expect(state.campaign?.oxygen?.playerOxygen[player.id]).toBe(expectedPerPlayer);
      }
    }
  });

  it("mission 54 validate blocks cuts when oxygen is insufficient for wire depth", () => {
    const state = makeGameState({
      mission: 54,
      log: [],
      players: [makePlayer({ id: "p1" }), makePlayer({ id: "p2" })],
    });
    dispatchHooks(54, { point: "setup", state });

    state.campaign!.oxygen!.playerOxygen.p1 = 0;
    state.campaign!.oxygen!.pool = 0;

    const result = dispatchHooks(54, {
      point: "validate",
      state,
      action: { type: "soloCut", actorId: "p1", value: 4 },
    });

    expect(result.validationCode).toBe("MISSION_RULE_VIOLATION");
    expect(result.validationError).toContain("insufficient oxygen");
  });

  it("mission 54 validate does not use reserve oxygen to pay cut cost", () => {
    const state = makeGameState({
      mission: 54,
      log: [],
      players: [makePlayer({ id: "p1" }), makePlayer({ id: "p2" })],
    });
    dispatchHooks(54, { point: "setup", state });

    if (!state.campaign?.oxygen) {
      throw new Error("mission 54 should initialize oxygen");
    }
    state.campaign.oxygen.playerOxygen.p1 = 0;
    state.campaign.oxygen.pool = 2;

    const result = dispatchHooks(54, {
      point: "validate",
      state,
      action: { type: "soloCut", actorId: "p1", value: 4 },
    });

    expect(result.validationCode).toBe("MISSION_RULE_VIOLATION");
    expect(result.validationError).toContain("insufficient oxygen");
  });

  it("mission 54 resolve consumes oxygen on cut based on wire depth", () => {
    const state = makeGameState({
      mission: 54,
      log: [],
      players: [makePlayer({ id: "p1" }), makePlayer({ id: "p2" })],
    });
    dispatchHooks(54, { point: "setup", state });

    dispatchHooks(54, {
      point: "resolve",
      state,
      action: { type: "soloCut", actorId: "p1", value: 8 },
      cutValue: 8,
      cutSuccess: true,
    });

    expect(state.campaign?.oxygen?.playerOxygen.p1).toBe(7);
  });

  it("mission 54 resolve does not spend reserve oxygen when actor is empty", () => {
    const state = makeGameState({
      mission: 54,
      log: [],
      players: [makePlayer({ id: "p1" }), makePlayer({ id: "p2" })],
      board: makeBoardState({ detonatorMax: 3 }),
    });
    dispatchHooks(54, { point: "setup", state });

    if (!state.campaign?.oxygen) {
      throw new Error("mission 54 should initialize oxygen");
    }
    state.campaign.oxygen.playerOxygen.p1 = 0;
    state.campaign.oxygen.playerOxygen.p2 = 0;
    state.campaign.oxygen.pool = 2;

    dispatchHooks(54, {
      point: "resolve",
      state,
      action: { type: "soloCut", actorId: "p1", value: 4 },
      cutValue: 4,
      cutSuccess: true,
    });

    expect(state.campaign.oxygen.playerOxygen.p1).toBe(0);
    expect(state.campaign.oxygen.pool).toBe(2);
    expect(state.board.detonatorPosition).toBe(1);
    expect(state.result).toBeNull();
    expect(state.phase).toBe("playing");
  });

  it("mission 54 endTurn does not consume oxygen", () => {
    const state = makeGameState({
      mission: 54,
      log: [],
      players: [makePlayer({ id: "p1" }), makePlayer({ id: "p2" })],
      board: makeBoardState({ detonatorPosition: 1, detonatorMax: 3 }),
    });
    dispatchHooks(54, { point: "setup", state });

    dispatchHooks(54, {
      point: "endTurn",
      state,
      previousPlayerId: "p1",
    });

    expect(state.campaign?.oxygen?.playerOxygen.p1).toBe(9);
    expect(state.board.detonatorPosition).toBe(1);
  });

  it("mission 54 endTurn does not auto-skip if a low-cost dual-cut guess is possible", () => {
    const actor = makePlayer({
      id: "p1",
      hand: [makeTile({ id: "p1-1", gameValue: 11, cut: false })],
    });
    const teammate = makePlayer({
      id: "p2",
      hand: [makeTile({ id: "p2-1", gameValue: 4, cut: false })],
    });
    const state = makeGameState({
      mission: 54,
      log: [],
      players: [actor, teammate],
      currentPlayerIndex: 0,
      turnNumber: 1,
      board: makeBoardState({ detonatorPosition: 1, detonatorMax: 5 }),
    });
    dispatchHooks(54, { point: "setup", state });

    if (!state.campaign?.oxygen) {
      throw new Error("mission 54 should initialize oxygen");
    }
    state.campaign.oxygen.playerOxygen.p1 = 1;
    state.campaign.oxygen.playerOxygen.p2 = 0;
    state.campaign.oxygen.pool = 0;

    dispatchHooks(54, {
      point: "endTurn",
      state,
      previousPlayerId: "p2",
    });

    expect(state.currentPlayerIndex).toBe(0);
    expect(state.turnNumber).toBe(1);
    expect(state.board.detonatorPosition).toBe(1);
    const autoSkipLog = state.log.find(
      (entry) =>
        entry.action === "hookEffect"
        && renderLogDetail(entry.detail) === "oxygen_progression:auto_skip|player=p1|detonator=2",
    );
    expect(autoSkipLog).toBeUndefined();
  });

  it("mission 54 endTurn auto-skips if constraint blocks all affordable dual-cut guesses", () => {
    const actor = makePlayer({
      id: "p1",
      hand: [makeTile({ id: "p1-1", gameValue: 11, cut: false })],
    });
    const teammate = makePlayer({
      id: "p2",
      hand: [makeTile({ id: "p2-1", gameValue: 4, cut: false })],
    });
    const state = makeGameState({
      mission: 54,
      log: [],
      players: [actor, teammate],
      currentPlayerIndex: 0,
      turnNumber: 1,
      board: makeBoardState({ detonatorPosition: 1, detonatorMax: 5 }),
      campaign: {
        constraints: {
          global: [
            makeConstraintCard({
              id: "D",
              name: "D",
              description: "7-12",
              active: true,
            }),
          ],
          perPlayer: {},
          deck: [],
        },
      },
    });
    dispatchHooks(54, { point: "setup", state });

    if (!state.campaign?.oxygen) {
      throw new Error("mission 54 should initialize oxygen");
    }
    state.campaign.oxygen.playerOxygen.p1 = 1;
    state.campaign.oxygen.playerOxygen.p2 = 0;
    state.campaign.oxygen.pool = 0;

    dispatchHooks(54, {
      point: "endTurn",
      state,
      previousPlayerId: "p2",
    });

    expect(state.board.detonatorPosition).toBe(5);
    expect(state.result).toBe("loss_detonator");
    const autoSkipLog = state.log.find(
      (entry) =>
        entry.action === "hookEffect"
        && renderLogDetail(entry.detail) === "oxygen_progression:auto_skip|player=p1|detonator=2",
    );
    expect(autoSkipLog).toBeDefined();
  });

  it("mission 63 endTurn does not auto-skip if a non-owned low-cost dual-cut guess is possible", () => {
    const actor = makePlayer({
      id: "p1",
      hand: [makeTile({ id: "p1-1", gameValue: 11 })],
    });
    const captain = makePlayer({
      id: "captain",
      isCaptain: true,
      hand: [makeTile({ id: "c-1", gameValue: 2 })],
    });
    const teammate = makePlayer({
      id: "p3",
      hand: [makeTile({ id: "p3-1", gameValue: 1 })],
    });
    const state = makeGameState({
      mission: 63,
      log: [],
      players: [captain, actor, teammate],
      currentPlayerIndex: 1,
      turnNumber: 1,
      board: makeBoardState({ detonatorPosition: 0, detonatorMax: 5 }),
    });
    dispatchHooks(63, { point: "setup", state });
    if (!state.campaign?.oxygen) {
      throw new Error("mission 63 should initialize oxygen");
    }
    state.campaign.oxygen.playerOxygen = {
      captain: 0,
      p1: 1,
      p3: 0,
    };

    dispatchHooks(63, {
      point: "endTurn",
      state,
      previousPlayerId: "captain",
    });

    expect(state.board.detonatorPosition).toBe(0);
    expect(state.currentPlayerIndex).toBe(1);
    expect(state.turnNumber).toBe(1);
    const autoSkipLog = state.log.find(
      (entry) =>
        entry.action === "hookEffect"
        && renderLogDetail(entry.detail) === "oxygen_progression:auto_skip|player=p1|detonator=1",
    );
    expect(autoSkipLog).toBeUndefined();
  });

  it("mission 63 captain collects reserve when becoming active in an auto-skip chain", () => {
    const p1 = makePlayer({
      id: "p1",
      hand: [makeTile({ id: "p1-1", gameValue: 11, cut: false })],
    });
    const captain = makePlayer({
      id: "captain",
      isCaptain: true,
      hand: [makeTile({ id: "c-1", gameValue: 4, cut: false })],
    });
    const p3 = makePlayer({
      id: "p3",
      hand: [makeTile({ id: "p3-1", gameValue: 12, cut: false })],
    });
    const state = makeGameState({
      mission: 63,
      log: [],
      players: [captain, p1, p3],
      currentPlayerIndex: 1,
      turnNumber: 1,
      board: makeBoardState({ detonatorPosition: 0, detonatorMax: 5 }),
    });
    dispatchHooks(63, { point: "setup", state });
    if (!state.campaign?.oxygen) {
      throw new Error("mission 63 should initialize oxygen");
    }

    state.campaign.oxygen.playerOxygen = {
      captain: 0,
      p1: 0,
      p3: 0,
    };
    state.campaign.oxygen.pool = 1;

    dispatchHooks(63, {
      point: "endTurn",
      state,
      previousPlayerId: "captain",
    });

    expect(state.campaign?.oxygen?.playerOxygen.captain).toBe(1);
    expect(state.campaign?.oxygen?.playerOxygen.p1).toBe(0);
    expect(state.campaign?.oxygen?.playerOxygen.p3).toBe(0);
    expect(state.campaign?.oxygen?.pool).toBe(0);
    expect(state.board.detonatorPosition).toBe(2);
    expect(state.currentPlayerIndex).toBe(0);
    expect(state.turnNumber).toBe(3);
    const captainAutoSkipLog = state.log.find(
      (entry) =>
        entry.action === "hookEffect"
        && renderLogDetail(entry.detail) === "oxygen_progression:auto_skip|player=captain|detonator=3",
    );
    expect(captainAutoSkipLog).toBeUndefined();
  });

  it("mission 63 setup gives captain oxygen and starts reserve at zero", () => {
    const players = [
      makePlayer({ id: "p1" }),
      makePlayer({ id: "captain", isCaptain: true }),
      makePlayer({ id: "p3" }),
    ];
    const state = makeGameState({
      mission: 63,
      log: [],
      players,
    });
    dispatchHooks(63, { point: "setup", state });

    expect(state.campaign?.oxygen?.pool).toBe(0);
    expect(state.campaign?.oxygen?.playerOxygen.p1).toBe(0);
    expect(state.campaign?.oxygen?.playerOxygen.p3).toBe(0);
    expect(state.campaign?.oxygen?.playerOxygen.captain).toBe(18);
  });

  it("mission 63 validate blocks cuts when player oxygen is insufficient even if reserve has oxygen", () => {
    const state = makeGameState({
      mission: 63,
      log: [],
      players: [makePlayer({ id: "captain", isCaptain: true }), makePlayer({ id: "p2" })],
    });
    dispatchHooks(63, { point: "setup", state });
    if (!state.campaign?.oxygen) {
      throw new Error("mission 63 should initialize oxygen");
    }
    state.campaign.oxygen.playerOxygen.captain = 2;
    state.campaign.oxygen.pool = 5;

    const result = dispatchHooks(63, {
      point: "validate",
      state,
      action: { type: "soloCut", actorId: "p2", value: 3 },
    });

    expect(result.validationCode).toBe("MISSION_RULE_VIOLATION");
    expect(result.validationError).toContain("insufficient oxygen");
  });

  it("mission 63 resolve spends cut oxygen to reserve", () => {
    const state = makeGameState({
      mission: 63,
      log: [],
      players: [makePlayer({ id: "captain", isCaptain: true }), makePlayer({ id: "p2" })],
    });
    dispatchHooks(63, { point: "setup", state });
    if (!state.campaign?.oxygen) {
      throw new Error("mission 63 should initialize oxygen");
    }
    state.campaign.oxygen.playerOxygen.p2 = 5;
    state.campaign.oxygen.pool = 0;

    dispatchHooks(63, {
      point: "resolve",
      state,
      action: { type: "soloCut", actorId: "p2", value: 4 },
      cutValue: 4,
      cutSuccess: true,
    });

    expect(state.campaign?.oxygen?.playerOxygen.p2).toBe(1);
    expect(state.campaign?.oxygen?.pool).toBe(4);
  });

  it("mission 63 endTurn passes remaining oxygen to the left player and captain collects reserve", () => {
    const state = makeGameState({
      mission: 63,
      log: [],
      players: [
        makePlayer({ id: "p1" }),
        makePlayer({ id: "captain", isCaptain: true }),
        makePlayer({ id: "p3" }),
      ],
      currentPlayerIndex: 1,
      turnNumber: 1,
      board: makeBoardState({ detonatorPosition: 0, detonatorMax: 5 }),
    });
    dispatchHooks(63, { point: "setup", state });
    if (!state.campaign?.oxygen) {
      throw new Error("mission 63 should initialize oxygen");
    }
    state.campaign.oxygen.playerOxygen.p1 = 4;
    state.campaign.oxygen.playerOxygen.captain = 6;
    state.campaign.oxygen.pool = 7;

    dispatchHooks(63, {
      point: "endTurn",
      state,
      previousPlayerId: "p1",
    });

    expect(state.campaign?.oxygen?.playerOxygen.p1).toBe(0);
    expect(state.campaign?.oxygen?.playerOxygen.captain).toBe(17);
    expect(state.campaign?.oxygen?.pool).toBe(0);
  });

  it("mission 63 endTurn auto-skips players who cannot play due insufficient oxygen", () => {
    const state = makeGameState({
      mission: 63,
      log: [],
      players: [
        makePlayer({ id: "p1", hand: [makeTile({ id: "p1-1", gameValue: 1 })] }),
        makePlayer({
          id: "captain",
          isCaptain: true,
          hand: [makeTile({ id: "c-1", gameValue: 2 })],
        }),
        makePlayer({ id: "p3", hand: [makeTile({ id: "p3-1", gameValue: 1 })] }),
      ],
      currentPlayerIndex: 1,
      turnNumber: 1,
      board: makeBoardState({ detonatorPosition: 0, detonatorMax: 5 }),
    });
    dispatchHooks(63, { point: "setup", state });
    if (!state.campaign?.oxygen) {
      throw new Error("mission 63 should initialize oxygen");
    }
    state.campaign.oxygen.playerOxygen = {
      p1: 0,
      captain: 0,
      p3: 1,
    };

    dispatchHooks(63, {
      point: "endTurn",
      state,
      previousPlayerId: "p1",
    });

    expect(state.board.detonatorPosition).toBe(1);
    expect(state.currentPlayerIndex).toBe(2);
    expect(state.turnNumber).toBe(2);
  });

  it("mission 63 auto-skipped players also pass remaining oxygen to the left", () => {
    const state = makeGameState({
      mission: 63,
      log: [],
      players: [
        makePlayer({
          id: "p1",
          hand: [makeTile({ id: "p1-1", gameValue: 5 })],
        }),
        makePlayer({
          id: "captain",
          isCaptain: true,
          hand: [makeYellowTile({ id: "c-1" })],
        }),
        makePlayer({ id: "p3", hand: [makeTile({ id: "p3-1", gameValue: 1 })] }),
      ],
      currentPlayerIndex: 1,
      turnNumber: 1,
      board: makeBoardState({ detonatorPosition: 0, detonatorMax: 5 }),
    });
    dispatchHooks(63, { point: "setup", state });
    if (!state.campaign?.oxygen) {
      throw new Error("mission 63 should initialize oxygen");
    }
    expect(state.currentPlayerIndex).toBe(1);

    state.campaign.oxygen.playerOxygen = {
      captain: 3,
      p1: 0,
      p3: 1,
    };

    dispatchHooks(63, {
      point: "endTurn",
      state,
      previousPlayerId: "p1",
    });

    expect(state.board.detonatorPosition).toBe(1);
    expect(state.currentPlayerIndex).toBe(2);
    expect(state.turnNumber).toBe(2);

    expect(state.campaign?.oxygen?.playerOxygen).toEqual({
      captain: 0,
      p1: 0,
      p3: 4,
    });
  });

  it("mission 37 rotates constraint when a value reaches 4 successful cuts", () => {
    const state = makeGameState({
      mission: 37,
      log: [],
      board: makeBoardState({ detonatorMax: 4 }),
      players: [
        makePlayer({
          id: "p1",
          hand: [
            makeTile({ id: "p1-4a", gameValue: 4, sortValue: 4 }),
            makeTile({ id: "p1-6", gameValue: 6, sortValue: 6 }),
          ],
        }),
        makePlayer({
          id: "p2",
          hand: [
            makeTile({ id: "p2-4a", gameValue: 4, cut: true, sortValue: 4 }),
            makeTile({ id: "p2-4b", gameValue: 4, cut: true, sortValue: 4 }),
            makeTile({ id: "p2-4c", gameValue: 4, sortValue: 4 }),
          ],
        }),
        makePlayer({ id: "p3", hand: [makeTile({ id: "p3-6", gameValue: 6 })] }),
      ],
      campaign: {
        constraints: {
          global: [makeConstraintCard({ id: "A", name: "A", description: "A" })],
          perPlayer: {},
          deck: [makeConstraintCard({ id: "B", name: "B", description: "B" })],
        },
      },
    });
    state.campaign!.constraints!.global[0]!.active = true;
    state.board.validationTrack[4] = 3;

    executeDualCut(state, "p1", "p2", 2, 4);

    expect(state.campaign?.constraints?.global[0]?.id).toBe("B");
    expect(state.log.some(
      (entry) =>
        entry.action === "hookEffect"
        && renderLogDetail(entry.detail) === "mission37:constraint_rotated|value=4",
    )).toBe(true);
  });

  it("mission 37 rotates constraint when a solo cut brings a value to 4", () => {
    const state = makeGameState({
      mission: 37,
      log: [],
      currentPlayerIndex: 0,
      players: [
        makePlayer({
          id: "p1",
          hand: [
            makeTile({ id: "p1-4a", gameValue: 4, sortValue: 4 }),
            makeTile({ id: "p1-4b", gameValue: 4, sortValue: 4, cut: true }),
            makeTile({ id: "p1-6", gameValue: 6, sortValue: 6 }),
          ],
        }),
        makePlayer({
          id: "p2",
          hand: [
            makeTile({ id: "p2-4a", gameValue: 4, sortValue: 4, cut: true }),
            makeTile({ id: "p2-4b", gameValue: 4, sortValue: 4, cut: true }),
            makeTile({ id: "p2-1", gameValue: 1, sortValue: 1 }),
          ],
        }),
      ],
      campaign: {
        constraints: {
          global: [makeConstraintCard({ id: "A", name: "A", description: "A", active: true })],
          perPlayer: {},
          deck: [makeConstraintCard({ id: "B", name: "B", description: "B" })],
        },
      },
    });
    state.board.validationTrack[4] = 3;

    executeSoloCut(state, "p1", 4);

    expect(state.board.validationTrack[4]).toBe(4);
    expect(state.campaign?.constraints?.global[0]?.id).toBe("B");
    expect(state.log.some(
      (entry) =>
        entry.action === "hookEffect"
        && renderLogDetail(entry.detail) === "mission37:constraint_rotated|value=4",
    )).toBe(true);
  });

  it("mission 37 auto-skips an entire locked round and replaces the constraint", () => {
    const state = makeGameState({
      mission: 37,
      log: [],
      currentPlayerIndex: 0,
      turnNumber: 10,
      board: makeBoardState({ detonatorPosition: 1, detonatorMax: 4 }),
      players: [
        makePlayer({ id: "p1", hand: [makeTile({ id: "p1-1", gameValue: 2 })] }),
        makePlayer({ id: "p2", hand: [makeTile({ id: "p2-1", gameValue: 4 })] }),
        makePlayer({ id: "p3", hand: [makeTile({ id: "p3-1", gameValue: 6 })] }),
      ],
      campaign: {
        constraints: {
          global: [
            makeConstraintCard({ id: "I", name: "I", description: "I", active: true }),
            makeConstraintCard({ id: "J", name: "J", description: "J", active: true }),
            makeConstraintCard({ id: "K", name: "K", description: "K", active: true }),
          ],
          perPlayer: {},
          deck: [makeConstraintCard({ id: "A", name: "A", description: "A", active: false })],
        },
      },
    });

    dispatchHooks(37, {
      point: "endTurn",
      state,
      previousPlayerId: "p3",
    });

    expect(state.board.detonatorPosition).toBe(2);
    expect(state.turnNumber).toBe(13);
    expect(state.currentPlayerIndex).toBe(0);
    expect(state.campaign?.constraints?.global[0]?.id).toBe("A");
    expect(
      state.log.filter(
        (entry) =>
          entry.action === "hookEffect"
          && renderLogDetail(entry.detail).startsWith("mission37:auto_skip|player="),
      ).length,
    ).toBe(3);
    expect(
      state.log.some(
        (entry) =>
          entry.action === "hookEffect"
          && renderLogDetail(entry.detail) === "mission37:round_stalled|detonator=2",
      ),
    ).toBe(true);
  });

  it("mission 37 does not auto-skip a player who can only reveal all-red wires", () => {
    const state = makeGameState({
      mission: 37,
      log: [],
      currentPlayerIndex: 0,
      turnNumber: 4,
      board: makeBoardState({ detonatorPosition: 1, detonatorMax: 5 }),
      players: [
        makePlayer({
          id: "p1",
          hand: [makeTile({ id: "p1-1", gameValue: "RED", color: "red" })],
        }),
        makePlayer({
          id: "p2",
          hand: [makeTile({ id: "p2-1", gameValue: "RED", color: "red" })],
        }),
      ],
      campaign: {
        constraints: {
          global: [
            makeConstraintCard({ id: "K", name: "K", description: "K", active: true }),
          ],
          perPlayer: {},
          deck: [makeConstraintCard({ id: "A", name: "A", description: "A" })],
        },
      },
    });

    dispatchHooks(37, {
      point: "endTurn",
      state,
      previousPlayerId: "p2",
    });

    expect(state.turnNumber).toBe(4);
    expect(state.board.detonatorPosition).toBe(1);
    expect(state.currentPlayerIndex).toBe(0);
    expect(
      state.log.some(
        (entry) =>
          entry.action === "hookEffect"
          && renderLogDetail(entry.detail).startsWith("mission37:auto_skip|player="),
      ),
    ).toBe(false);
  });

  it("mission 57 auto-skips all blocked players and explodes immediately", () => {
    const state = makeGameState({
      mission: 57,
      log: [],
      currentPlayerIndex: 0,
      turnNumber: 1,
      board: makeBoardState({ detonatorPosition: 0, detonatorMax: 5 }),
      players: [
        makePlayer({ id: "p1", hand: [makeTile({ id: "p1-1", gameValue: 1 })] }),
        makePlayer({
          id: "p2",
          hand: [
            makeTile({ id: "p2-1", gameValue: 2, cut: true }),
            makeTile({ id: "p2-2", gameValue: 4, cut: true }),
          ],
        }),
      ],
      campaign: {
        constraints: {
          global: [makeConstraintCard({ id: "A", name: "A", description: "A", active: true })],
          perPlayer: {},
          deck: [
            makeConstraintCard({ id: "B", name: "B", description: "B", active: false }),
          ],
        },
      },
    });

    dispatchHooks(57, {
      point: "endTurn",
      state,
      previousPlayerId: "p3",
    });

    expect(state.turnNumber).toBe(2);
    expect(state.board.detonatorPosition).toBe(0);
    expect(state.currentPlayerIndex).toBe(0);
    expect(state.result).toBe("loss_detonator");
    expect(state.phase).toBe("finished");
    expect(
      state.log.filter(
        (entry) =>
          entry.action === "hookEffect"
          && renderLogDetail(entry.detail).startsWith("mission57:auto_skip|player="),
      ).length,
    ).toBe(1);
    expect(
      state.log.some(
        (entry) =>
          entry.action === "hookEffect"
          && renderLogDetail(entry.detail) === "mission57:round_stalled|detonator=0",
      ),
    ).toBe(true);
  });

  it("mission 57 stops auto-skipping when a player can play under the active constraint", () => {
    const state = makeGameState({
      mission: 57,
      log: [],
      currentPlayerIndex: 0,
      turnNumber: 1,
      board: makeBoardState({ detonatorPosition: 0, detonatorMax: 3 }),
      players: [
        makePlayer({ id: "p1", hand: [makeTile({ id: "p1-1", gameValue: 1 })] }),
        makePlayer({ id: "p2", hand: [makeTile({ id: "p2-1", gameValue: 2 })] }),
      ],
      campaign: {
        constraints: {
          global: [makeConstraintCard({ id: "A", name: "A", description: "A", active: true })],
          perPlayer: {},
          deck: [
            makeConstraintCard({ id: "B", name: "B", description: "B", active: false }),
          ],
        },
      },
    });

    dispatchHooks(57, {
      point: "endTurn",
      state,
      previousPlayerId: "p2",
    });

    expect(state.turnNumber).toBe(1);
    expect(state.board.detonatorPosition).toBe(0);
    expect(state.currentPlayerIndex).toBe(0);
    expect(state.result).toBeNull();
    expect(
      state.log.filter(
        (entry) =>
          entry.action === "hookEffect"
          && renderLogDetail(entry.detail).startsWith("mission57:auto_skip|player="),
      ).length,
    ).toBe(0);
    expect(
      state.log.some(
        (entry) =>
          entry.action === "hookEffect"
          && renderLogDetail(entry.detail) === "mission57:round_stalled|detonator=0",
      ),
    ).toBe(false);
  });

  it("mission 57 does not auto-skip a player who can only Reveal Your Red Wires", () => {
    const state = makeGameState({
      mission: 57,
      log: [],
      currentPlayerIndex: 0,
      turnNumber: 7,
      board: makeBoardState({ detonatorPosition: 0, detonatorMax: 5 }),
      players: [
        makePlayer({
          id: "p1",
          hand: [
            makeTile({ id: "p1-1", gameValue: "RED", color: "red" }),
            makeTile({ id: "p1-2", gameValue: "RED", color: "red" }),
          ],
        }),
        makePlayer({ id: "p2", hand: [makeTile({ id: "p2-1", gameValue: 3 })] }),
      ],
      campaign: {
        constraints: {
          global: [makeConstraintCard({ id: "A", name: "A", description: "A", active: true })],
          perPlayer: {},
          deck: [
            makeConstraintCard({ id: "B", name: "B", description: "B", active: false }),
          ],
        },
      },
    });

    dispatchHooks(57, {
      point: "endTurn",
      state,
      previousPlayerId: "p2",
    });

    expect(state.turnNumber).toBe(7);
    expect(state.board.detonatorPosition).toBe(0);
    expect(state.currentPlayerIndex).toBe(0);
    expect(state.result).toBeNull();
    expect(state.phase).toBe("playing");
    expect(
      state.log.filter(
        (entry) =>
          entry.action === "hookEffect"
          && renderLogDetail(entry.detail).startsWith("mission57:auto_skip|player="),
      ).length,
    ).toBe(0);
    expect(
      state.log.some(
        (entry) =>
          entry.action === "hookEffect"
          && renderLogDetail(entry.detail) === "mission57:round_stalled|detonator=0",
      ),
    ).toBe(false);
  });

  it("mission 61 auto-skips all blocked players and explodes immediately", () => {
    const state = makeGameState({
      mission: 61,
      log: [],
      currentPlayerIndex: 0,
      turnNumber: 1,
      board: makeBoardState({ detonatorPosition: 0, detonatorMax: 5 }),
      players: [
        makePlayer({ id: "p1", hand: [makeTile({ id: "p1-1", gameValue: 1 })] }),
        makePlayer({
          id: "p2",
          hand: [
            makeTile({ id: "p2-1", gameValue: 2, cut: true }),
          ],
        }),
      ],
      campaign: {
        constraints: {
          global: [makeConstraintCard({ id: "K", name: "K", description: "K", active: true })],
          perPlayer: {},
          deck: [
            makeConstraintCard({ id: "A", name: "A", description: "A", active: false }),
          ],
        },
      },
    });

    dispatchHooks(61, {
      point: "endTurn",
      state,
      previousPlayerId: "p2",
    });

    expect(state.turnNumber).toBe(2);
    expect(state.board.detonatorPosition).toBe(0);
    expect(state.currentPlayerIndex).toBe(0);
    expect(state.result).toBe("loss_detonator");
    expect(state.phase).toBe("finished");
    expect(
      state.log.filter(
        (entry) =>
          entry.action === "hookEffect"
          && renderLogDetail(entry.detail).startsWith("mission61:auto_skip|player="),
      ).length,
    ).toBe(1);
    expect(
      state.log.some(
        (entry) =>
          entry.action === "hookEffect"
          && renderLogDetail(entry.detail) === "mission61:round_stalled|detonator=0",
      ),
    ).toBe(true);
  });

  it("mission 55 challenge completion reduces detonator and refills active challenge", () => {
    const state = makeGameState({
      mission: 55,
      log: [],
      players: [makePlayer({ id: "p1" }), makePlayer({ id: "p2" }), makePlayer({ id: "p3" })],
      board: makeBoardState({ detonatorPosition: 2, detonatorMax: 4 }),
    });
    dispatchHooks(55, { point: "setup", state });

    const active = state.campaign?.challenges?.active ?? [];
    expect(active.length).toBe(3);
    const target = parseChallengeValue(active[0]?.id ?? "");
    expect(target).not.toBeNull();

    dispatchHooks(55, {
      point: "resolve",
      state,
      action: { type: "soloCut", actorId: "p1", value: target! },
      cutValue: target!,
      cutSuccess: true,
    });

    expect(state.campaign?.challenges?.completed.length).toBe(1);
    expect(state.campaign?.challenges?.active.length).toBe(3);
    expect(state.board.detonatorPosition).toBe(1);
  });

  it("mission 60 setup creates one active challenge per player", () => {
    const state = makeGameState({
      mission: 60,
      log: [],
      players: [
        makePlayer({ id: "p1" }),
        makePlayer({ id: "p2" }),
        makePlayer({ id: "p3" }),
        makePlayer({ id: "p4" }),
      ],
    });

    dispatchHooks(60, { point: "setup", state });

    expect(state.campaign?.challenges?.active.length).toBe(4);
  });

  it("mission 62 setup reveals one Number card per player", () => {
    const state = makeGameState({
      mission: 62,
      log: [],
      players: [
        makePlayer({ id: "p1" }),
        makePlayer({ id: "p2" }),
        makePlayer({ id: "p3" }),
        makePlayer({ id: "p4" }),
      ],
    });

    dispatchHooks(62, { point: "setup", state });

    const numberCards = state.campaign?.numberCards;
    expect(numberCards?.visible.length).toBe(4);
    expect(numberCards?.visible.every((card) => card.faceUp)).toBe(true);
    expect(numberCards?.deck.length).toBe(8);
  });

  it("mission 62 completion removes only the matched face-up card without refilling", () => {
    const state = makeGameState({
      mission: 62,
      log: [],
      players: [
        makePlayer({ id: "p1" }),
        makePlayer({ id: "p2" }),
      ],
      board: makeBoardState({ detonatorPosition: 2, detonatorMax: 6 }),
    });

    dispatchHooks(62, { point: "setup", state });

    const target = state.campaign?.numberCards?.visible[0]?.value;
    expect(typeof target).toBe("number");

    state.players[0]!.hand = [
      makeTile({ id: "p1-target", gameValue: target as number, sortValue: target as number }),
      makeTile({
        id: "p1-cut",
        gameValue: target as number,
        sortValue: target as number,
        cut: true,
      }),
    ];
    state.players[1]!.hand = [
      makeTile({
        id: "p2-cut-a",
        gameValue: target as number,
        sortValue: target as number,
        cut: true,
      }),
      makeTile({
        id: "p2-cut-b",
        gameValue: target as number,
        sortValue: target as number,
        cut: true,
      }),
    ];

    const beforeVisibleLength = state.campaign?.numberCards?.visible.length ?? 0;
    const beforeDeckLength = state.campaign?.numberCards?.deck.length ?? 0;

    dispatchHooks(62, {
      point: "resolve",
      state,
      action: { type: "soloCut", actorId: "p1", value: target as number },
      cutValue: target as number,
      cutSuccess: true,
    });

    expect(state.board.detonatorPosition).toBe(1);
    expect(state.campaign?.numberCards?.visible.length).toBe(beforeVisibleLength - 1);
    expect(state.campaign?.numberCards?.deck.length).toBe(beforeDeckLength);
    expect(state.campaign?.numberCards?.visible.some((card) => card.value === target)).toBe(false);
    expect(state.campaign?.numberCards?.discard.some((card) => card.value === target)).toBe(true);
  });

  it("mission 66 bunker flow setup + resolve advances bunker tracker and action pointer", () => {
    const state = makeGameState({
      mission: 66,
      log: [],
      players: [makePlayer({ id: "p1" })],
    });
    dispatchHooks(66, { point: "setup", state });

    expect(state.campaign?.bunkerTracker).toEqual({ position: 0, max: 10 });
    expect(
      state.campaign?.specialMarkers?.find((marker) => marker.kind === "action_pointer")?.value,
    ).toBe(0);

    const directionalConstraintId = state.campaign?.constraints?.global[0]?.id;
    if (!directionalConstraintId) throw new Error("mission 66 should initialize directional constraints");
    const cutValue = pickValueForTestConstraints([directionalConstraintId]);

    dispatchHooks(66, {
      point: "resolve",
      state,
      action: { type: "soloCut", actorId: "p1", value: cutValue },
      cutValue,
      cutSuccess: true,
    });

    expect(state.campaign?.bunkerTracker?.position).toBe(1);
    expect(
      state.campaign?.specialMarkers?.find((marker) => marker.kind === "action_pointer")?.value,
    ).toBe(1);
  });

  it("mission 66: solo cut of 4 wires advances bunker flow as two cuts", () => {
    const state = makeGameState({
      mission: 66,
      log: [],
      players: [
        makePlayer({
          id: "p1",
          hand: [
            makeTile({ id: "p1-5a", gameValue: 5, sortValue: 5 }),
            makeTile({ id: "p1-5b", gameValue: 5, sortValue: 5 }),
            makeTile({ id: "p1-5c", gameValue: 5, sortValue: 5 }),
            makeTile({ id: "p1-5d", gameValue: 5, sortValue: 5 }),
          ],
        }),
        makePlayer({
          id: "p2",
          hand: [makeTile({ id: "p2-2a", gameValue: 2, sortValue: 2 })],
        }),
      ],
      currentPlayerIndex: 0,
    });

    dispatchHooks(66, { point: "setup", state });
    const directionalConstraintId = state.campaign?.constraints?.global[0]?.id;
    if (!directionalConstraintId) throw new Error("mission 66 should initialize directional constraints");
    const cutValue = pickValueForTestConstraints([directionalConstraintId]);
    state.players[0]!.hand = [
      makeTile({ id: "p1-m66-a", gameValue: cutValue, sortValue: cutValue }),
      makeTile({ id: "p1-m66-b", gameValue: cutValue, sortValue: cutValue }),
      makeTile({ id: "p1-m66-c", gameValue: cutValue, sortValue: cutValue }),
      makeTile({ id: "p1-m66-d", gameValue: cutValue, sortValue: cutValue }),
    ];
    executeSoloCut(state, "p1", cutValue);

    expect(state.campaign?.bunkerTracker?.position).toBe(2);
    expect(
      state.campaign?.specialMarkers?.find((marker) => marker.kind === "action_pointer")?.value,
    ).toBe(2);
  });

  it("mission 66 dual cut failure advances bunker tracker and action pointer", () => {
    const state = makeGameState({
      mission: 66,
      log: [],
      players: [
        makePlayer({
          id: "p1",
          hand: [makeTile({ id: "p1-4a", gameValue: 4, sortValue: 4 })],
        }),
        makePlayer({
          id: "p2",
          hand: [makeTile({ id: "p2-2", gameValue: 2, sortValue: 2 })],
        }),
      ],
      currentPlayerIndex: 0,
    });

    dispatchHooks(66, { point: "setup", state });
    const directionalConstraintId = state.campaign?.constraints?.global[0]?.id;
    if (!directionalConstraintId) throw new Error("mission 66 should initialize directional constraints");
    const guessValue = pickValueForTestConstraints([directionalConstraintId]);
    const mismatchValue = guessValue === 12 ? 11 : 12;
    state.players[0]!.hand = [makeTile({ id: "p1-m66-dual", gameValue: guessValue, sortValue: guessValue })];
    state.players[1]!.hand = [makeTile({ id: "p2-m66-dual", gameValue: mismatchValue, sortValue: mismatchValue })];

    executeDualCut(state, "p1", "p2", 0, guessValue);

    expect(state.campaign?.bunkerTracker?.position).toBe(1);
    expect(
      state.campaign?.specialMarkers?.find((marker) => marker.kind === "action_pointer")?.value,
    ).toBe(1);
  });

  it("mission 66 blocks bunker movement when directional constraint is not satisfied", () => {
    const state = makeGameState({
      mission: 66,
      log: [],
      players: [makePlayer({ id: "p1" })],
    });
    dispatchHooks(66, { point: "setup", state });

    const directionalConstraintId = state.campaign?.constraints?.global[0]?.id;
    if (!directionalConstraintId) throw new Error("mission 66 should initialize directional constraints");
    const invalidValue = (() => {
      for (let value = 1; value <= 12; value++) {
        if (!valuePassesTestConstraint(value, directionalConstraintId)) return value;
      }
      return null;
    })();
    if (invalidValue == null) throw new Error("expected a value that violates directional constraint");

    dispatchHooks(66, {
      point: "resolve",
      state,
      action: { type: "soloCut", actorId: "p1", value: invalidValue },
      cutValue: invalidValue,
      cutSuccess: true,
    });

    expect(state.campaign?.bunkerTracker?.position).toBe(0);
    expect(
      state.log.some((entry) => renderLogDetail(entry.detail).startsWith("bunker_flow:blocked:direction")),
    ).toBe(true);
  });

  it("mission 66 blocks bunker action-cell movement when ACTION constraint is not satisfied", () => {
    const state = makeGameState({
      mission: 66,
      log: [],
      players: [makePlayer({ id: "p1" })],
    });
    dispatchHooks(66, { point: "setup", state });
    if (!state.campaign?.bunkerTracker) throw new Error("mission 66 should initialize bunker tracker");
    if (!state.campaign?.constraints) throw new Error("mission 66 should initialize constraints");

    // Move to the front ACTION cell on the canonical path.
    state.campaign.bunkerTracker.position = 3;
    const pointer = state.campaign.bunkerTracker.position % 4;
    state.campaign.specialMarkers = [{ kind: "action_pointer", value: pointer }];

    const directionalConstraintId = state.campaign.constraints.global[pointer]?.id;
    const actionConstraintId = state.campaign.constraints.deck?.[0]?.id;
    if (!directionalConstraintId || !actionConstraintId) {
      throw new Error("mission 66 should initialize directional + action constraints");
    }

    const invalidActionValue = (() => {
      for (let value = 1; value <= 12; value++) {
        if (
          valuePassesTestConstraint(value, directionalConstraintId)
          && !valuePassesTestConstraint(value, actionConstraintId)
        ) {
          return value;
        }
      }
      return null;
    })();
    if (invalidActionValue == null) {
      throw new Error("expected a value that passes directional and fails action constraint");
    }

    dispatchHooks(66, {
      point: "resolve",
      state,
      action: { type: "soloCut", actorId: "p1", value: invalidActionValue },
      cutValue: invalidActionValue,
      cutSuccess: true,
    });

    expect(state.campaign.bunkerTracker.position).toBe(3);
    expect(
      state.log.some((entry) => renderLogDetail(entry.detail).startsWith("bunker_flow:blocked:action")),
    ).toBe(true);
  });

  it("mission 66 end-to-end simulation follows full bunker path and rotating constraints", () => {
    const state = makeGameState({
      mission: 66,
      log: [],
      players: [
        makePlayer({ id: "p1", hand: [] }),
        makePlayer({
          id: "p2",
          hand: [makeTile({ id: "p2-hold", gameValue: 12, sortValue: 12 })],
        }),
      ],
      currentPlayerIndex: 0,
    });

    dispatchHooks(66, { point: "setup", state });

    const constraints = state.campaign?.constraints;
    expect(constraints).toBeDefined();
    expect(constraints?.global).toHaveLength(4);
    expect(constraints?.deck).toHaveLength(1);
    const globalConstraintIds = constraints?.global.map((constraint) => constraint.id) ?? [];
    const actionConstraintId = constraints?.deck?.[0]?.id;
    const bunkerConstraintIds = [
      ...globalConstraintIds,
      actionConstraintId,
    ]
      .filter((id): id is string => typeof id === "string")
      .sort();
    expect(bunkerConstraintIds).toEqual(["A", "B", "C", "D", "E"]);

    expect(state.campaign?.bunkerTracker).toEqual({ position: 0, max: 10 });
    expect(
      state.campaign?.specialMarkers?.find((marker) => marker.kind === "action_pointer")?.value,
    ).toBe(0);
    expect(getMission66BunkerTrackPoint(0, 10)).toMatchObject({
      index: 0,
      floor: "front",
      row: 0,
      col: 0,
    });

    for (let step = 1; step <= 10; step++) {
      const tracker = state.campaign?.bunkerTracker;
      const constraintsState = state.campaign?.constraints;
      if (!tracker || !constraintsState) {
        throw new Error("mission 66 should keep bunker tracker/constraints initialized");
      }
      const pointer =
        state.campaign?.specialMarkers?.find((marker) => marker.kind === "action_pointer")?.value
          ?? (tracker.position % 4);
      const directionalConstraintId = constraintsState.global[pointer]?.id;
      if (!directionalConstraintId) throw new Error("expected active directional constraint");
      const currentPoint = getMission66BunkerTrackPoint(tracker.position, tracker.max);
      const requiredConstraintIds: string[] = [];
      if (currentPoint.floor === "front" && currentPoint.row === 2 && currentPoint.col === 1) {
        const actionConstraintId = constraintsState.deck?.[0]?.id;
        if (actionConstraintId) requiredConstraintIds.push(actionConstraintId);
      } else if (currentPoint.floor === "back" && currentPoint.row === 2 && currentPoint.col === 3) {
        const actionConstraintId = constraintsState.deck?.[0]?.id;
        if (actionConstraintId) requiredConstraintIds.push(actionConstraintId);
      } else {
        requiredConstraintIds.push(directionalConstraintId);
      }
      const cutValue = pickValueForTestConstraints(requiredConstraintIds);
      state.players[0]!.hand.push(
        makeTile({
          id: `p1-m66-step-${step}`,
          gameValue: cutValue,
          sortValue: cutValue,
        }),
      );

      const result = executeSoloCut(state, "p1", cutValue);
      expect(result.type).toBe("soloCutResult");
      expect(state.campaign?.bunkerTracker?.position).toBe(step);
      expect(
        state.campaign?.specialMarkers?.find((marker) => marker.kind === "action_pointer")?.value,
      ).toBe(step % 4);

      const trackerAfterCut = state.campaign?.bunkerTracker;
      if (!trackerAfterCut) {
        throw new Error("mission 66 should keep bunker tracker initialized");
      }
      const point = getMission66BunkerTrackPoint(trackerAfterCut.position, trackerAfterCut.max);
      expect(point.index).toBe(step);
      if (step === 7) {
        expect(point).toMatchObject({ floor: "back", row: 0, col: 3 });
      }
      if (step === 8) {
        expect(point).toMatchObject({ floor: "back", row: 1, col: 3 });
      }
    }

    const finalTracker = state.campaign?.bunkerTracker;
    if (!finalTracker) {
      throw new Error("mission 66 should keep bunker tracker initialized");
    }
    expect(getMission66BunkerTrackPoint(finalTracker.position, finalTracker.max)).toMatchObject({
      index: 10,
      floor: "back",
      row: 2,
      col: 2,
    });
    expect(state.phase).toBe("playing");
    expect(state.result).toBeNull();

    const bunkerProgressLogs = state.log.filter(
      (entry) =>
        entry.action === "hookEffect"
        && renderLogDetail(entry.detail).startsWith("bunker_flow:"),
    );
    expect(bunkerProgressLogs).toHaveLength(10);
  });

  it("mission 59: rotates Nano after a solo cut when requested", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "actor-5", gameValue: 5, cut: false })],
    });
    const state = makeGameState({
      mission: 59,
      players: [actor],
      log: [],
      campaign: {
        numberCards: {
          visible: [
            { id: "m59-visible-1", value: 1, faceUp: true },
            { id: "m59-visible-2", value: 2, faceUp: true },
            { id: "m59-visible-3", value: 3, faceUp: true },
            { id: "m59-visible-4", value: 4, faceUp: true },
            { id: "m59-visible-5", value: 5, faceUp: true },
            { id: "m59-visible-6", value: 6, faceUp: true },
            { id: "m59-visible-7", value: 7, faceUp: true },
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
    });

    executeSoloCut(state, "actor", 5, undefined, true);

    expect(state.campaign?.mission59Nano?.facing).toBe(-1);
  });

  it("mission 59: does not rotate Nano after a solo cut unless requested", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "actor-5", gameValue: 5, cut: false })],
    });
    const state = makeGameState({
      mission: 59,
      players: [actor],
      log: [],
      campaign: {
        numberCards: {
          visible: [
            { id: "m59-visible-1", value: 1, faceUp: true },
            { id: "m59-visible-2", value: 2, faceUp: true },
            { id: "m59-visible-3", value: 3, faceUp: true },
            { id: "m59-visible-4", value: 4, faceUp: true },
            { id: "m59-visible-5", value: 5, faceUp: true },
            { id: "m59-visible-6", value: 6, faceUp: true },
            { id: "m59-visible-7", value: 7, faceUp: true },
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
    });

    executeSoloCut(state, "actor", 5);

    expect(state.campaign?.mission59Nano?.facing).toBe(1);
  });

  it("mission 59: rotates Nano after a double detector confirmed match when requested", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "actor-5-a", gameValue: 5 }),
        makeTile({ id: "actor-4-a", gameValue: 4 }),
      ],
    });
    const target = makePlayer({
      id: "target",
      hand: [
        makeTile({ id: "target-5", gameValue: 5 }),
        makeTile({ id: "target-6", gameValue: 6 }),
      ],
    });
    const state = makeGameState({
      mission: 59,
      players: [actor, target],
      log: [],
      campaign: {
        numberCards: {
          visible: [
            { id: "m59-visible-1", value: 1, faceUp: true },
            { id: "m59-visible-2", value: 2, faceUp: true },
            { id: "m59-visible-3", value: 3, faceUp: true },
            { id: "m59-visible-4", value: 4, faceUp: true },
            { id: "m59-visible-5", value: 5, faceUp: true },
            { id: "m59-visible-6", value: 6, faceUp: true },
            { id: "m59-visible-7", value: 7, faceUp: true },
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
    });

    executeDualCutDoubleDetector(
      state,
      "actor",
      "target",
      0,
      1,
      5,
      undefined,
      undefined,
      true,
    );
    expect(state.pendingForcedAction).toMatchObject({ mission59RotateNano: true });
    const resolveAction = resolveDetectorTileChoice(state, 0);
    expect(resolveAction.type).toBe("dualCutDoubleDetectorResult");
    expect(state.campaign?.mission59Nano?.position).toBe(4);
    expect(state.campaign?.mission59Nano?.facing).toBe(-1);
  });

  it("mission 59: rotates Nano after a double detector no-match when requested", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "actor-4-a", gameValue: 4 })],
    });
    const target = makePlayer({
      id: "target",
      hand: [
        makeTile({ id: "target-6-a", gameValue: 6 }),
        makeTile({ id: "target-7", gameValue: 7 }),
      ],
    });
    const state = makeGameState({
      mission: 59,
      players: [actor, target],
      log: [],
      campaign: {
        numberCards: {
          visible: [
            { id: "m59-visible-1", value: 1, faceUp: true },
            { id: "m59-visible-2", value: 2, faceUp: true },
            { id: "m59-visible-3", value: 3, faceUp: true },
            { id: "m59-visible-4", value: 4, faceUp: true },
            { id: "m59-visible-5", value: 5, faceUp: true },
            { id: "m59-visible-6", value: 6, faceUp: true },
            { id: "m59-visible-7", value: 7, faceUp: true },
          ],
          deck: [],
          discard: [],
          playerHands: {},
        },
        mission59Nano: {
          position: 6,
          facing: 1,
        },
      },
      board: makeBoardState({ detonatorMax: 12 }),
    });

    executeDualCutDoubleDetector(
      state,
      "actor",
      "target",
      0,
      1,
      5,
      undefined,
      undefined,
      true,
    );
    expect(state.pendingForcedAction).toMatchObject({ mission59RotateNano: true });
    const resolveAction = resolveDetectorTileChoice(state);
    expect(resolveAction.type).toBe("dualCutDoubleDetectorResult");
    if (resolveAction.type === "dualCutDoubleDetectorResult") {
      expect(resolveAction.outcome).toBe("no_match");
    }
    expect(state.board.detonatorPosition).toBe(1);
    expect(state.campaign?.mission59Nano?.facing).toBe(-1);
  });
});
