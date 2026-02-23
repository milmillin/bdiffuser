import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  makeGameState,
  makePlayer,
  makeTile,
  makeBoardState,
  makeEquipmentCard,
} from "@bomb-busters/shared/testing";
import {
  dispatchHooks,
  registerHookHandler,
  clearHandlers,
  hasHandler,
  getHookRules,
  setTraceSink,
  clearTraceSink,
  setStrictUnknownHooks,
  getStrictUnknownHooks,
  setTelemetrySink,
  clearTelemetrySink,
  UnknownHookError,
} from "../missionHooks";
import type {
  HookResult,
  HookTraceEntry,
  UnknownHookTelemetryEvent,
  SetupHookContext,
  ValidateHookContext,
  ResolveHookContext,
  EndTurnHookContext,
} from "../missionHooks";

// Re-import built-in handlers by importing the module (side-effect registers them)
import "../missionHooks";

describe("missionHooks dispatcher", () => {
  describe("getHookRules", () => {
    it("returns empty array for missions without hookRules", () => {
      expect(getHookRules(1)).toEqual([]);
    });

    it("returns hookRules for mission 10", () => {
      const rules = getHookRules(10);
      expect(rules.length).toBe(2);
      expect(rules[0].kind).toBe("timer");
      expect(rules[1].kind).toBe("dynamic_turn_order");
    });

    it("returns hookRules for mission 9", () => {
      const rules = getHookRules(9);
      expect(rules.length).toBe(1);
      expect(rules[0].kind).toBe("sequence_priority");
    });

    it("returns hookRules for mission 11", () => {
      const rules = getHookRules(11);
      expect(rules.length).toBe(1);
      expect(rules[0].kind).toBe("blue_value_treated_as_red");
    });

    it("returns hookRules for mission 12", () => {
      const rules = getHookRules(12);
      expect(rules.length).toBe(1);
      expect(rules[0].kind).toBe("equipment_double_lock");
    });
  });

  describe("handler registry", () => {
    it("has built-in handlers for missions 10/11/12 hook kinds", () => {
      expect(hasHandler("sequence_priority")).toBe(true);
      expect(hasHandler("timer")).toBe(true);
      expect(hasHandler("dynamic_turn_order")).toBe(true);
      expect(hasHandler("blue_value_treated_as_red")).toBe(true);
      expect(hasHandler("equipment_double_lock")).toBe(true);
    });
  });

  describe("dispatchHooks for missions without hookRules", () => {
    it("returns empty result for mission 1", () => {
      const state = makeGameState({ mission: 1 });
      const result = dispatchHooks(1, { point: "setup", state });
      expect(result).toEqual({});
    });
  });

  describe("setup hooks", () => {
    it("mission 10: records timer config in log", () => {
      const state = makeGameState({ mission: 10, log: [] });
      dispatchHooks(10, { point: "setup", state });

      const timerLog = state.log.find(
        (e) => e.action === "hookSetup" && e.detail.startsWith("timer:"),
      );
      expect(timerLog).toBeDefined();
      expect(timerLog!.detail).toContain("900s");
      expect(timerLog!.detail).toContain("audio:true");
    });

    it("mission 10: sets timerDeadline on game state (900s from now)", () => {
      const state = makeGameState({ mission: 10, log: [] });
      const before = Date.now();
      dispatchHooks(10, { point: "setup", state });
      const after = Date.now();

      expect(state.timerDeadline).toBeDefined();
      // Deadline should be ~900 seconds from now
      expect(state.timerDeadline!).toBeGreaterThanOrEqual(before + 900_000);
      expect(state.timerDeadline!).toBeLessThanOrEqual(after + 900_000);
    });

    it("mission 10 (2-player): applies 12-minute timer override", () => {
      const state = makeGameState({
        mission: 10,
        players: [
          makePlayer({ id: "p1", isCaptain: true }),
          makePlayer({ id: "p2" }),
        ],
        log: [],
      });
      const before = Date.now();
      dispatchHooks(10, { point: "setup", state });
      const after = Date.now();

      expect(state.timerDeadline).toBeDefined();
      expect(state.timerDeadline!).toBeGreaterThanOrEqual(before + 720_000);
      expect(state.timerDeadline!).toBeLessThanOrEqual(after + 720_000);

      const timerLog = state.log.find(
        (e) => e.action === "hookSetup" && e.detail.startsWith("timer:"),
      );
      expect(timerLog?.detail).toContain("720s");
    });

    it("mission 10: timerDeadline is not set for non-timer missions", () => {
      const state = makeGameState({ mission: 1, log: [] });
      dispatchHooks(1, { point: "setup", state });
      expect(state.timerDeadline).toBeUndefined();
    });

    it("mission 10: records dynamic turn order in log", () => {
      const state = makeGameState({ mission: 10, log: [] });
      dispatchHooks(10, { point: "setup", state });

      const turnOrderLog = state.log.find(
        (e) => e.action === "hookSetup" && e.detail.includes("dynamic_turn_order"),
      );
      expect(turnOrderLog).toBeDefined();
      expect(turnOrderLog!.detail).toContain("captain");
    });

    it("mission 11: records hidden red value in log", () => {
      const state = makeGameState({ mission: 11, log: [] });
      dispatchHooks(11, { point: "setup", state });

      const blueAsRedLog = state.log.find(
        (e) => e.action === "hookSetup" && e.detail.startsWith("blue_as_red:"),
      );
      expect(blueAsRedLog).toBeDefined();
      const value = parseInt(blueAsRedLog!.detail.split(":")[1], 10);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(12);
    });

    it("mission 11: replaces equipment cards matching hidden red-like value", () => {
      const spy = vi.spyOn(Math, "random").mockReturnValue(0.55); // hidden value => 7
      try {
        const state = makeGameState({
          mission: 11,
          board: makeBoardState({
            equipment: [
              makeEquipmentCard({
                id: "emergency_batteries",
                unlockValue: 7,
                unlocked: false,
                used: false,
              }),
              makeEquipmentCard({
                id: "rewinder",
                unlockValue: 6,
                unlocked: false,
                used: false,
              }),
            ],
          }),
          log: [],
        });

        dispatchHooks(11, { point: "setup", state });

        expect(state.board.equipment.some((eq) => eq.unlockValue === 7)).toBe(false);
        const replaceLog = state.log.find(
          (e) => e.action === "hookSetup" && e.detail.startsWith("blue_as_red:equipment_replaced:"),
        );
        expect(replaceLog).toBeDefined();
      } finally {
        spy.mockRestore();
      }
    });

    it("mission 12: assigns per-equipment secondary lock values from number cards", () => {
      const state = makeGameState({
        mission: 12,
        board: makeBoardState({
          equipment: [
            makeEquipmentCard({ id: "rewinder", unlockValue: 6 }),
            makeEquipmentCard({ id: "stabilizer", unlockValue: 9 }),
          ],
        }),
        log: [],
      });
      dispatchHooks(12, { point: "setup", state });

      expect(state.board.equipment).toHaveLength(2);
      for (const card of state.board.equipment) {
        expect(card.secondaryLockValue).toBeGreaterThanOrEqual(1);
        expect(card.secondaryLockValue).toBeLessThanOrEqual(12);
        expect(card.secondaryLockCutsRequired).toBe(2);
      }

      const visibleLocks = state.campaign?.numberCards?.visible ?? [];
      expect(visibleLocks).toHaveLength(2);
      expect(visibleLocks.every((c) => c.faceUp)).toBe(true);
    });

    it("mission 9: initializes sequence cards and pointer", () => {
      const state = makeGameState({ mission: 9, log: [] });
      dispatchHooks(9, { point: "setup", state });

      const visible = state.campaign?.numberCards?.visible ?? [];
      expect(visible).toHaveLength(3);
      expect(new Set(visible.map((c) => c.value)).size).toBe(3);
      expect(visible.every((c) => c.value >= 1 && c.value <= 12)).toBe(true);

      const sequencePointer = state.campaign?.specialMarkers?.find(
        (m) => m.kind === "sequence_pointer",
      );
      expect(sequencePointer).toEqual({ kind: "sequence_pointer", value: 0 });
    });
  });

  describe("resolve hooks", () => {
    it("mission 11: triggers immediate loss when cutting hidden red-like value", () => {
      const state = makeGameState({
        mission: 11,
        board: makeBoardState({ detonatorPosition: 0, detonatorMax: 5 }),
        log: [
          {
            turn: 0,
            playerId: "system",
            action: "hookSetup",
            detail: "blue_as_red:7",
            timestamp: 1000,
          },
        ],
      });

      dispatchHooks(11, {
        point: "resolve",
        state,
        action: { type: "dualCut", actorId: "player-1", targetPlayerId: "player-2", targetTileIndex: 0, guessValue: 7 },
        cutValue: 7,
        cutSuccess: true,
      });

      // Mission should be lost immediately like a red-wire explosion.
      expect(state.result).toBe("loss_red_wire");
      expect(state.phase).toBe("finished");
      // Hook effect should be logged
      const effectLog = state.log.find((e) => e.action === "hookEffect");
      expect(effectLog).toBeDefined();
      expect(effectLog!.detail).toContain("explosion");
    });

    it("mission 11: does not trigger loss for non-matching blue value", () => {
      const state = makeGameState({
        mission: 11,
        board: makeBoardState({ detonatorPosition: 0, detonatorMax: 5 }),
        log: [
          {
            turn: 0,
            playerId: "system",
            action: "hookSetup",
            detail: "blue_as_red:7",
            timestamp: 1000,
          },
        ],
      });

      dispatchHooks(11, {
        point: "resolve",
        state,
        action: { type: "dualCut", actorId: "player-1", targetPlayerId: "player-2", targetTileIndex: 0, guessValue: 5 },
        cutValue: 5,
        cutSuccess: true,
      });

      expect(state.result).toBeNull();
      expect(state.phase).toBe("playing");
    });

    it("mission 11: does not trigger loss on failed cut", () => {
      const state = makeGameState({
        mission: 11,
        board: makeBoardState({ detonatorPosition: 0, detonatorMax: 5 }),
        log: [
          {
            turn: 0,
            playerId: "system",
            action: "hookSetup",
            detail: "blue_as_red:7",
            timestamp: 1000,
          },
        ],
      });

      dispatchHooks(11, {
        point: "resolve",
        state,
        action: { type: "dualCut", actorId: "player-1", targetPlayerId: "player-2", targetTileIndex: 0, guessValue: 7 },
        cutValue: 7,
        cutSuccess: false,
      });

      expect(state.result).toBeNull();
      expect(state.phase).toBe("playing");
    });

    it("mission 9: advances sequence pointer after required cuts of current value", () => {
      const actor = makePlayer({
        id: "actor",
        hand: [makeTile({ id: "a1", gameValue: 2, cut: false })],
      });
      const target = makePlayer({
        id: "target",
        hand: [makeTile({ id: "t1", gameValue: 2, cut: true })],
      });
      const state = makeGameState({
        mission: 9,
        players: [actor, target],
        campaign: {
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
          specialMarkers: [{ kind: "sequence_pointer", value: 0 }],
        },
      });

      dispatchHooks(9, {
        point: "resolve",
        state,
        action: { type: "dualCut", actorId: "actor", targetPlayerId: "target", targetTileIndex: 0, guessValue: 2 },
        cutValue: 2,
        cutSuccess: true,
      });

      const marker = state.campaign?.specialMarkers?.find(
        (m) => m.kind === "sequence_pointer",
      );
      expect(marker?.value).toBe(1);
      const effectLog = state.log.find(
        (e) => e.action === "hookEffect" && e.detail.startsWith("sequence_priority:advance:"),
      );
      expect(effectLog).toBeDefined();
    });

    it("mission 12: returns equipment unlock threshold override", () => {
      const state = makeGameState({ mission: 12 });

      const result = dispatchHooks(12, {
        point: "resolve",
        state,
        action: { type: "dualCut", actorId: "player-1", targetPlayerId: "player-2", targetTileIndex: 0, guessValue: 5 },
        cutValue: 5,
        cutSuccess: true,
      });

      expect(result.overrideEquipmentUnlock).toBe(true);
      expect(result.equipmentUnlockThreshold).toBe(2);
    });
  });

  describe("endTurn hooks", () => {
    it("returns empty result for mission without endTurn hooks", () => {
      const state = makeGameState({ mission: 1 });
      const result = dispatchHooks(1, { point: "endTurn", state });
      expect(result.nextPlayerIndex).toBeUndefined();
    });

    it("mission 10: sets pendingForcedAction and returns captain index on endTurn", () => {
      const captain = makePlayer({ id: "captain", isCaptain: true });
      const player2 = makePlayer({ id: "p2", isCaptain: false });
      const state = makeGameState({
        mission: 10,
        players: [captain, player2],
        currentPlayerIndex: 1,
      });

      const result = dispatchHooks(10, { point: "endTurn", state });

      expect(state.pendingForcedAction).toEqual({
        kind: "chooseNextPlayer",
        captainId: "captain",
      });
      expect(result.nextPlayerIndex).toBe(0);
    });

    it("mission 10: does not set forced action if no captain found", () => {
      const player1 = makePlayer({ id: "p1", isCaptain: false });
      const player2 = makePlayer({ id: "p2", isCaptain: false });
      const state = makeGameState({
        mission: 10,
        players: [player1, player2],
        currentPlayerIndex: 0,
      });

      const result = dispatchHooks(10, { point: "endTurn", state });

      expect(state.pendingForcedAction).toBeUndefined();
      expect(result.nextPlayerIndex).toBeUndefined();
    });
  });

  describe("validate hooks", () => {
    it("returns empty result (no validation error) for standard missions", () => {
      const state = makeGameState({ mission: 1 });
      const result = dispatchHooks(1, {
        point: "validate",
        state,
        action: { type: "dualCut", actorId: "player-1" },
      });
      expect(result.validationError).toBeUndefined();
    });

    it("mission 9: blocks middle/right values while pointer is on first card", () => {
      const state = makeGameState({
        mission: 9,
        campaign: {
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
          specialMarkers: [{ kind: "sequence_pointer", value: 0 }],
        },
      });

      const blocked = dispatchHooks(9, {
        point: "validate",
        state,
        action: {
          type: "dualCut",
          actorId: "player-1",
          guessValue: 5,
        },
      });
      expect(blocked.validationCode).toBe("MISSION_RULE_VIOLATION");
      expect(blocked.validationError).toContain("locked");

      const allowed = dispatchHooks(9, {
        point: "validate",
        state,
        action: {
          type: "dualCut",
          actorId: "player-1",
          guessValue: 2,
        },
      });
      expect(allowed.validationError).toBeUndefined();
    });
  });

  describe("hook result merging", () => {
    it("merges results from multiple hooks on same mission (mission 10 resolve)", () => {
      // Mission 10 has timer + dynamic_turn_order, neither has resolve handlers
      // so result should be empty
      const state = makeGameState({ mission: 10 });
      const result = dispatchHooks(10, {
        point: "resolve",
        state,
        action: { type: "dualCut", actorId: "player-1", targetPlayerId: "player-2", targetTileIndex: 0, guessValue: 5 },
        cutValue: 5,
        cutSuccess: true,
      });
      expect(result).toEqual({});
    });
  });

  describe("unknown hook kinds", () => {
    it("skips hooks with no registered handler when strict mode is off", () => {
      const prev = getStrictUnknownHooks();
      setStrictUnknownHooks(false);
      try {
        // Mission 13 has hooks that are not yet registered
        const state = makeGameState({ mission: 13 });
        // Should not throw, just returns empty result
        const result = dispatchHooks(13, { point: "setup", state });
        expect(result).toEqual({});
      } finally {
        setStrictUnknownHooks(prev);
      }
    });
  });

  describe("deterministic execution ordering", () => {
    // Mission 10 has two hookRules: [timer (index 0), dynamic_turn_order (index 1)].
    // These tests replace the built-in handlers with order-tracking versions
    // to prove the dispatcher honours schema array order.

    /** Tracks the order in which hook handlers fire. */
    let executionLog: string[];

    beforeEach(() => {
      executionLog = [];
      clearHandlers();
    });

    afterEach(() => {
      // Restore built-in handlers by re-registering them.
      // clearHandlers already ran in beforeEach of the outer suite if needed,
      // but we must ensure built-in handlers exist for other tests that may
      // rely on them. Re-import triggers side-effect registration.
      clearHandlers();
      // Dynamically re-register built-ins (the module-level side-effects
      // already ran at import time; we just need to re-register).
      // We do this by calling the register functions directly.
    });

    it("executes rules in hookRules array index order (setup)", () => {
      registerHookHandler("timer", {
        setup(_rule, _ctx) {
          executionLog.push("timer:setup");
        },
      });
      registerHookHandler("dynamic_turn_order", {
        setup(_rule, _ctx) {
          executionLog.push("dynamic_turn_order:setup");
        },
      });

      const state = makeGameState({ mission: 10, log: [] });
      dispatchHooks(10, { point: "setup", state });

      // timer is hookRules[0], dynamic_turn_order is hookRules[1]
      expect(executionLog).toEqual(["timer:setup", "dynamic_turn_order:setup"]);
    });

    it("executes rules in hookRules array index order (resolve)", () => {
      registerHookHandler("timer", {
        resolve(_rule, _ctx) {
          executionLog.push("timer:resolve");
          return {};
        },
      });
      registerHookHandler("dynamic_turn_order", {
        resolve(_rule, _ctx) {
          executionLog.push("dynamic_turn_order:resolve");
          return {};
        },
      });

      const state = makeGameState({ mission: 10 });
      dispatchHooks(10, {
        point: "resolve",
        state,
        action: { type: "dualCut", actorId: "p1" },
        cutValue: 1,
        cutSuccess: true,
      });

      expect(executionLog).toEqual(["timer:resolve", "dynamic_turn_order:resolve"]);
    });

    it("side effects from rule N are visible to rule N+1", () => {
      // timer (index 0) mutates state, dynamic_turn_order (index 1) reads it
      registerHookHandler("timer", {
        setup(_rule, ctx) {
          ctx.state.log.push({
            turn: 0,
            playerId: "system",
            action: "hookSetup",
            detail: "ordering_marker",
            timestamp: 1,
          });
        },
      });
      registerHookHandler("dynamic_turn_order", {
        setup(_rule, ctx) {
          // Should see the log entry added by timer (index 0)
          const markerExists = ctx.state.log.some(
            (e) => e.detail === "ordering_marker",
          );
          executionLog.push(`marker_visible:${markerExists}`);
        },
      });

      const state = makeGameState({ mission: 10, log: [] });
      dispatchHooks(10, { point: "setup", state });

      expect(executionLog).toEqual(["marker_visible:true"]);
      expect(state.log).toHaveLength(1);
    });

    it("result merge: later rules override earlier for non-validationError fields", () => {
      registerHookHandler("timer", {
        resolve(_rule, _ctx) {
          return { equipmentUnlockThreshold: 5, overrideEquipmentUnlock: true };
        },
      });
      registerHookHandler("dynamic_turn_order", {
        resolve(_rule, _ctx) {
          return { equipmentUnlockThreshold: 10 };
        },
      });

      const state = makeGameState({ mission: 10 });
      const result = dispatchHooks(10, {
        point: "resolve",
        state,
        action: { type: "dualCut", actorId: "p1" },
        cutValue: 1,
        cutSuccess: true,
      });

      // dynamic_turn_order (index 1) overrides timer (index 0) threshold
      expect(result.equipmentUnlockThreshold).toBe(10);
      // overrideEquipmentUnlock from timer persists (not overridden)
      expect(result.overrideEquipmentUnlock).toBe(true);
    });

    it("result merge: validationError keeps first non-undefined value (fail-fast)", () => {
      registerHookHandler("timer", {
        validate(_rule, _ctx) {
          return { validationError: "first error" };
        },
      });
      registerHookHandler("dynamic_turn_order", {
        validate(_rule, _ctx) {
          return { validationError: "second error" };
        },
      });

      const state = makeGameState({ mission: 10 });
      const result = dispatchHooks(10, {
        point: "validate",
        state,
        action: { type: "dualCut", actorId: "p1" },
      });

      // First validation error wins
      expect(result.validationError).toBe("first error");
    });

    it("result merge: validationCode follows the first validationError", () => {
      registerHookHandler("timer", {
        validate(_rule, _ctx) {
          return {
            validationError: "first error",
            validationCode: "MISSION_RULE_VIOLATION",
          };
        },
      });
      registerHookHandler("dynamic_turn_order", {
        validate(_rule, _ctx) {
          return {
            validationError: "second error",
            validationCode: "NOT_YOUR_TURN",
          };
        },
      });

      const state = makeGameState({ mission: 10 });
      const result = dispatchHooks(10, {
        point: "validate",
        state,
        action: { type: "dualCut", actorId: "p1" },
      });

      expect(result.validationError).toBe("first error");
      expect(result.validationCode).toBe("MISSION_RULE_VIOLATION");
    });

    it("skips rules whose handler lacks the requested hook point", () => {
      registerHookHandler("timer", {
        setup(_rule, _ctx) {
          executionLog.push("timer:setup");
        },
        // no resolve method
      });
      registerHookHandler("dynamic_turn_order", {
        resolve(_rule, _ctx) {
          executionLog.push("dynamic_turn_order:resolve");
          return {};
        },
        // no setup method
      });

      const state = makeGameState({ mission: 10, log: [] });

      // Setup: only timer fires
      dispatchHooks(10, { point: "setup", state });
      expect(executionLog).toEqual(["timer:setup"]);

      executionLog.length = 0;

      // Resolve: only dynamic_turn_order fires
      dispatchHooks(10, {
        point: "resolve",
        state,
        action: { type: "dualCut", actorId: "p1" },
        cutValue: 1,
        cutSuccess: true,
      });
      expect(executionLog).toEqual(["dynamic_turn_order:resolve"]);
    });

    it("ordering is stable across repeated dispatches", () => {
      registerHookHandler("timer", {
        setup(_rule, _ctx) {
          executionLog.push("timer");
        },
      });
      registerHookHandler("dynamic_turn_order", {
        setup(_rule, _ctx) {
          executionLog.push("dynamic_turn_order");
        },
      });

      const state = makeGameState({ mission: 10, log: [] });

      // Run dispatch 10 times; order must be identical every time
      for (let i = 0; i < 10; i++) {
        executionLog.length = 0;
        dispatchHooks(10, { point: "setup", state });
        expect(executionLog).toEqual(["timer", "dynamic_turn_order"]);
      }
    });
  });

  describe("hook trace logging", () => {
    let trace: HookTraceEntry[];

    beforeEach(() => {
      trace = [];
      clearHandlers();
      setTraceSink((entry) => trace.push(entry));
    });

    afterEach(() => {
      clearTraceSink();
      clearHandlers();
    });

    it("emits dispatch_start and dispatch_end for mission with no rules", () => {
      const state = makeGameState({ mission: 1 });
      dispatchHooks(1, { point: "setup", state });

      expect(trace).toHaveLength(2);
      expect(trace[0]).toEqual({
        event: "dispatch_start",
        missionId: 1,
        hookPoint: "setup",
        ruleCount: 0,
      });
      expect(trace[1]).toEqual({
        event: "dispatch_end",
        missionId: 1,
        hookPoint: "setup",
        mergedResult: {},
      });
    });

    it("emits rule_invoke entries for each fired handler", () => {
      // Register handlers that cover setup for mission 10's two hookRules
      registerHookHandler("timer", {
        setup(_rule, ctx) {
          ctx.state.log.push({
            turn: 0,
            playerId: "system",
            action: "hookSetup",
            detail: "timer:trace_test",
            timestamp: 1,
          });
        },
      });
      registerHookHandler("dynamic_turn_order", {
        setup(_rule, ctx) {
          ctx.state.log.push({
            turn: 0,
            playerId: "system",
            action: "hookSetup",
            detail: "dto:trace_test",
            timestamp: 1,
          });
        },
      });

      const state = makeGameState({ mission: 10, log: [] });
      dispatchHooks(10, { point: "setup", state });

      const starts = trace.filter((e) => e.event === "dispatch_start");
      const invokes = trace.filter((e) => e.event === "rule_invoke");
      const ends = trace.filter((e) => e.event === "dispatch_end");

      expect(starts).toHaveLength(1);
      expect(starts[0].ruleCount).toBe(2);
      expect(starts[0].hookPoint).toBe("setup");

      expect(invokes).toHaveLength(2);
      expect(invokes[0]).toMatchObject({
        ruleIndex: 0,
        ruleKind: "timer",
        hookPoint: "setup",
      });
      expect(invokes[1]).toMatchObject({
        ruleIndex: 1,
        ruleKind: "dynamic_turn_order",
        hookPoint: "setup",
      });

      expect(ends).toHaveLength(1);
    });

    it("emits rule_skip_no_method when handler lacks hook point method", () => {
      // Register handler for timer with only setup (no resolve)
      registerHookHandler("timer", {
        setup(_rule, _ctx) { /* setup only */ },
      });
      registerHookHandler("dynamic_turn_order", {
        setup(_rule, _ctx) { /* setup only */ },
      });

      const state = makeGameState({ mission: 10 });
      dispatchHooks(10, {
        point: "resolve",
        state,
        action: { type: "dualCut", actorId: "p1" },
        cutValue: 1,
        cutSuccess: true,
      });

      const skips = trace.filter((e) => e.event === "rule_skip_no_method");
      expect(skips).toHaveLength(2);
      expect(skips[0]).toMatchObject({
        hookPoint: "resolve",
        ruleKind: "timer",
        ruleIndex: 0,
      });
      expect(skips[1]).toMatchObject({
        hookPoint: "resolve",
        ruleKind: "dynamic_turn_order",
        ruleIndex: 1,
      });
    });

    it("emits rule_skip_no_handler for unregistered hook kinds (non-strict)", () => {
      const prev = getStrictUnknownHooks();
      setStrictUnknownHooks(false);
      try {
        // No handlers registered (clearHandlers in beforeEach).
        // Mission 10 has 2 hookRules (timer, dynamic_turn_order) — both unregistered.
        const state = makeGameState({ mission: 10, log: [] });
        dispatchHooks(10, { point: "setup", state });

        const skips = trace.filter((e) => e.event === "rule_skip_no_handler");
        expect(skips).toHaveLength(2);
        expect(skips[0]).toMatchObject({
          ruleIndex: 0,
          ruleKind: "timer",
          missionId: 10,
        });
        expect(skips[1]).toMatchObject({
          ruleIndex: 1,
          ruleKind: "dynamic_turn_order",
          missionId: 10,
        });
      } finally {
        setStrictUnknownHooks(prev);
      }
    });

    it("dispatch_end includes merged result with outcome fields", () => {
      // Register equipment_double_lock handler for mission 12
      registerHookHandler("equipment_double_lock", {
        resolve(_rule, _ctx) {
          return {
            overrideEquipmentUnlock: true,
            equipmentUnlockThreshold: 2,
          };
        },
      });

      const state = makeGameState({ mission: 12 });
      dispatchHooks(12, {
        point: "resolve",
        state,
        action: { type: "dualCut", actorId: "p1" },
        cutValue: 5,
        cutSuccess: true,
      });

      const end = trace.find((e) => e.event === "dispatch_end");
      expect(end).toBeDefined();
      expect(end!.mergedResult).toMatchObject({
        overrideEquipmentUnlock: true,
        equipmentUnlockThreshold: 2,
      });
    });

    it("rule_invoke hasResult distinguishes void from object returns", () => {
      // Handler that returns void for setup
      registerHookHandler("timer", {
        setup(_rule, _ctx) { /* void */ },
      });
      // Handler that returns an object for setup
      registerHookHandler("dynamic_turn_order", {
        setup(_rule, _ctx) {
          return { nextPlayerIndex: 0 };
        },
      });

      const state = makeGameState({ mission: 10, log: [] });
      dispatchHooks(10, { point: "setup", state });

      const invokes = trace.filter((e) => e.event === "rule_invoke");
      expect(invokes).toHaveLength(2);
      expect(invokes[0].hasResult).toBe(false); // timer returns void
      expect(invokes[1].hasResult).toBe(true);  // dynamic_turn_order returns object
    });

    it("no trace entries emitted when no sink is set", () => {
      clearTraceSink();
      const state = makeGameState({ mission: 1 });
      dispatchHooks(1, { point: "setup", state });
      // trace array was populated via the sink set in beforeEach,
      // but clearTraceSink removed it — no new entries after that
      const countBefore = trace.length;
      dispatchHooks(1, { point: "setup", state });
      expect(trace.length).toBe(countBefore);
    });

    it("trace entries include missionId and hookPoint for deterministic replay", () => {
      registerHookHandler("blue_value_treated_as_red", {
        setup(_rule, ctx) {
          ctx.state.log.push({
            turn: 0,
            playerId: "system",
            action: "hookSetup",
            detail: "blue_as_red:5",
            timestamp: 1,
          });
        },
      });

      const state = makeGameState({ mission: 11, log: [] });
      dispatchHooks(11, { point: "setup", state });

      for (const entry of trace) {
        expect(entry.missionId).toBe(11);
        expect(entry.hookPoint).toBe("setup");
      }
    });
  });

  describe("strict unknown hooks (dev/test vs production)", () => {
    let savedStrict: boolean;

    beforeEach(() => {
      savedStrict = getStrictUnknownHooks();
      clearHandlers();
    });

    afterEach(() => {
      setStrictUnknownHooks(savedStrict);
      clearHandlers();
    });

    it("defaults to strict mode in test environment (NODE_ENV=test)", () => {
      // Vitest sets NODE_ENV=test, so strict should be true by default
      expect(savedStrict).toBe(true);
    });

    it("throws UnknownHookError in strict mode for unregistered hook kind", () => {
      setStrictUnknownHooks(true);
      // Mission 10 has timer + dynamic_turn_order, neither registered after clearHandlers
      const state = makeGameState({ mission: 10, log: [] });

      expect(() => dispatchHooks(10, { point: "setup", state })).toThrow(UnknownHookError);
    });

    it("UnknownHookError contains diagnostic fields", () => {
      setStrictUnknownHooks(true);
      const state = makeGameState({ mission: 10, log: [] });

      try {
        dispatchHooks(10, { point: "setup", state });
        expect.unreachable("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(UnknownHookError);
        const err = e as UnknownHookError;
        expect(err.hookKind).toBe("timer"); // first unregistered kind
        expect(err.missionId).toBe(10);
        expect(err.hookPoint).toBe("setup");
        expect(err.ruleIndex).toBe(0);
        expect(err.message).toContain("timer");
        expect(err.message).toContain("mission 10");
      }
    });

    it("throws on first unregistered kind even when later kinds are registered", () => {
      setStrictUnknownHooks(true);
      // Register dynamic_turn_order but NOT timer — timer is hookRules[0]
      registerHookHandler("dynamic_turn_order", {
        setup(_rule, _ctx) { /* noop */ },
      });

      const state = makeGameState({ mission: 10, log: [] });

      expect(() => dispatchHooks(10, { point: "setup", state })).toThrow(UnknownHookError);
      try {
        dispatchHooks(10, { point: "setup", state });
      } catch (e) {
        expect((e as UnknownHookError).hookKind).toBe("timer");
      }
    });

    it("does not throw when all hook kinds are registered (strict mode)", () => {
      setStrictUnknownHooks(true);
      registerHookHandler("timer", {
        setup(_rule, _ctx) { /* noop */ },
      });
      registerHookHandler("dynamic_turn_order", {
        setup(_rule, _ctx) { /* noop */ },
      });

      const state = makeGameState({ mission: 10, log: [] });
      expect(() => dispatchHooks(10, { point: "setup", state })).not.toThrow();
    });

    it("silently skips in non-strict mode (production behavior)", () => {
      setStrictUnknownHooks(false);
      // No handlers registered
      const state = makeGameState({ mission: 10, log: [] });

      // Should not throw
      const result = dispatchHooks(10, { point: "setup", state });
      expect(result).toEqual({});
    });

    it("emits trace event before throwing in strict mode", () => {
      setStrictUnknownHooks(true);
      const trace: HookTraceEntry[] = [];
      setTraceSink((entry) => trace.push(entry));

      const state = makeGameState({ mission: 10, log: [] });

      try {
        dispatchHooks(10, { point: "setup", state });
      } catch {
        // expected
      }

      // Trace should have dispatch_start and rule_skip_no_handler before the throw
      expect(trace.some((e) => e.event === "dispatch_start")).toBe(true);
      expect(trace.some((e) => e.event === "rule_skip_no_handler")).toBe(true);

      clearTraceSink();
    });

    it("setStrictUnknownHooks toggles behavior dynamically", () => {
      const state = makeGameState({ mission: 10, log: [] });

      // Start strict — should throw
      setStrictUnknownHooks(true);
      expect(() => dispatchHooks(10, { point: "setup", state })).toThrow(UnknownHookError);

      // Switch to non-strict — should not throw
      setStrictUnknownHooks(false);
      expect(() => dispatchHooks(10, { point: "setup", state })).not.toThrow();

      // Switch back — should throw again
      setStrictUnknownHooks(true);
      expect(() => dispatchHooks(10, { point: "setup", state })).toThrow(UnknownHookError);
    });
  });

  describe("production fallback + telemetry for unknown hooks", () => {
    let savedStrict: boolean;
    let telemetryEvents: UnknownHookTelemetryEvent[];

    beforeEach(() => {
      savedStrict = getStrictUnknownHooks();
      telemetryEvents = [];
      clearHandlers();
      setStrictUnknownHooks(false);
      setTelemetrySink((event) => telemetryEvents.push(event));
    });

    afterEach(() => {
      setStrictUnknownHooks(savedStrict);
      clearTelemetrySink();
      clearHandlers();
    });

    it("emits telemetry event with correct fields for unknown hook kind", () => {
      // Mission 10 has timer (index 0) + dynamic_turn_order (index 1), neither registered
      const state = makeGameState({ mission: 10, log: [] });
      dispatchHooks(10, { point: "setup", state });

      expect(telemetryEvents).toHaveLength(2);

      expect(telemetryEvents[0]).toMatchObject({
        type: "unknown_hook_kind",
        missionId: 10,
        hookPoint: "setup",
        ruleIndex: 0,
        ruleKind: "timer",
      });
      expect(typeof telemetryEvents[0].timestamp).toBe("number");

      expect(telemetryEvents[1]).toMatchObject({
        type: "unknown_hook_kind",
        missionId: 10,
        hookPoint: "setup",
        ruleIndex: 1,
        ruleKind: "dynamic_turn_order",
      });
    });

    it("does not throw in production mode (non-fatal fallback)", () => {
      const state = makeGameState({ mission: 10, log: [] });
      expect(() => dispatchHooks(10, { point: "setup", state })).not.toThrow();
      // Result should still be empty (unknown hooks are skipped)
      const result = dispatchHooks(10, { point: "setup", state });
      expect(result).toEqual({});
    });

    it("emits telemetry per hook point", () => {
      const state = makeGameState({ mission: 10, log: [] });

      dispatchHooks(10, { point: "validate", state, action: { type: "dualCut", actorId: "p1" } } as any);

      expect(telemetryEvents).toHaveLength(2);
      expect(telemetryEvents[0].hookPoint).toBe("validate");
      expect(telemetryEvents[1].hookPoint).toBe("validate");
    });

    it("does not emit telemetry when handler is registered", () => {
      registerHookHandler("timer", { setup(_rule, _ctx) { /* noop */ } });
      registerHookHandler("dynamic_turn_order", { setup(_rule, _ctx) { /* noop */ } });

      const state = makeGameState({ mission: 10, log: [] });
      dispatchHooks(10, { point: "setup", state });

      expect(telemetryEvents).toHaveLength(0);
    });

    it("emits telemetry only for unregistered kinds (partial registration)", () => {
      // Register timer but not dynamic_turn_order
      registerHookHandler("timer", { setup(_rule, _ctx) { /* noop */ } });

      const state = makeGameState({ mission: 10, log: [] });
      dispatchHooks(10, { point: "setup", state });

      expect(telemetryEvents).toHaveLength(1);
      expect(telemetryEvents[0].ruleKind).toBe("dynamic_turn_order");
      expect(telemetryEvents[0].ruleIndex).toBe(1);
    });

    it("does not emit telemetry in strict mode (throws instead)", () => {
      setStrictUnknownHooks(true);
      const state = makeGameState({ mission: 10, log: [] });

      expect(() => dispatchHooks(10, { point: "setup", state })).toThrow(UnknownHookError);
      // Telemetry sink should NOT have been called — strict mode throws before it
      expect(telemetryEvents).toHaveLength(0);
    });

    it("no telemetry emitted when sink is not set", () => {
      clearTelemetrySink();
      const state = makeGameState({ mission: 10, log: [] });
      // Should not throw even without a sink
      expect(() => dispatchHooks(10, { point: "setup", state })).not.toThrow();
    });
  });
});
