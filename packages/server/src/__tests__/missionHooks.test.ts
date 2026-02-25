import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { logText, renderLogDetail } from "@bomb-busters/shared";
import {
  makeGameState,
  makePlayer,
  makeTile,
  makeBoardState,
  makeEquipmentCard,
  makeNumberCard,
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
  emitMissionFailureTelemetry,
  UnknownHookError,
} from "../missionHooks";
import type {
  HookResult,
  HookTraceEntry,
  MissionFailureTelemetryEvent,
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

    it("returns hookRules for mission 15", () => {
      const rules = getHookRules(15);
      expect(rules.length).toBe(1);
      expect(rules[0].kind).toBe("number_deck_equipment_reveal");
    });

    it("returns hookRules for mission 23", () => {
      const rules = getHookRules(23);
      expect(rules.length).toBe(2);
      expect(rules[0].kind).toBe("hidden_equipment_pile");
      expect(rules[1].kind).toBe("simultaneous_four_cut");
    });
  });

  describe("handler registry", () => {
    it("has built-in handlers for missions 10/11/12 hook kinds", () => {
      expect(hasHandler("sequence_priority")).toBe(true);
      expect(hasHandler("timer")).toBe(true);
      expect(hasHandler("dynamic_turn_order")).toBe(true);
      expect(hasHandler("blue_value_treated_as_red")).toBe(true);
      expect(hasHandler("equipment_double_lock")).toBe(true);
      expect(hasHandler("number_deck_equipment_reveal")).toBe(true);
      expect(hasHandler("hidden_equipment_pile")).toBe(true);
      expect(hasHandler("simultaneous_four_cut")).toBe(true);
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
        (e) => e.action === "hookSetup" && renderLogDetail(e.detail).startsWith("timer:"),
      );
      expect(timerLog).toBeDefined();
      expect(renderLogDetail(timerLog!.detail)).toContain("900s");
      expect(renderLogDetail(timerLog!.detail)).toContain("audio:true");
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
        (e) => e.action === "hookSetup" && renderLogDetail(e.detail).startsWith("timer:"),
      );
      expect(renderLogDetail(timerLog!.detail)).toContain("720s");
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
        (e) => e.action === "hookSetup" && renderLogDetail(e.detail).includes("dynamic_turn_order"),
      );
      expect(turnOrderLog).toBeDefined();
      expect(renderLogDetail(turnOrderLog!.detail)).toContain("captain");
    });

    it("mission 11: records hidden red value in log", () => {
      const state = makeGameState({ mission: 11, log: [] });
      dispatchHooks(11, { point: "setup", state });

      const blueAsRedLog = state.log.find(
        (e) => e.action === "hookSetup" && renderLogDetail(e.detail).startsWith("blue_as_red:"),
      );
      expect(blueAsRedLog).toBeDefined();
      const value = parseInt(renderLogDetail(blueAsRedLog!.detail).split(":")[1], 10);
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
          (e) =>
            e.action === "hookSetup"
            && renderLogDetail(e.detail).startsWith("blue_as_red:equipment_replaced:"),
        );
        expect(replaceLog).toBeDefined();
      } finally {
        spy.mockRestore();
      }
    });

    it("mission 41: skips captain's turn on setup if they only have their tripwire and red wires", () => {
      const skipPlayer = makePlayer({
        id: "p1",
        isCaptain: true,
        hand: [
          makeTile({ id: "y1", color: "yellow", gameValue: "YELLOW" }),
          makeTile({ id: "r1", gameValue: 4, color: "red", sortValue: 4.5 }),
        ],
      });
      const activePlayer = makePlayer({
        id: "p2",
        hand: [makeTile({ id: "b2", gameValue: 7 })],
      });

      const state = makeGameState({
        mission: 41,
        players: [skipPlayer, activePlayer],
        currentPlayerIndex: 0,
        turnNumber: 3,
        log: [],
      });

      dispatchHooks(41, { point: "setup", state });

      expect(state.currentPlayerIndex).toBe(1);
      expect(state.turnNumber).toBe(4);
      const skipLog = state.log.find(
        (entry) =>
          entry.action === "hookEffect"
          && renderLogDetail(entry.detail) === "iberian_yellow_mode:auto_skip|player=p1",
      );
      expect(skipLog).toBeDefined();
    });

    it("mission 41: skips captain's turn on setup if they only have their tripwire", () => {
      const skipPlayer = makePlayer({
        id: "p1",
        isCaptain: true,
        hand: [makeTile({ id: "y1", color: "yellow", gameValue: "YELLOW" })],
      });
      const activePlayer = makePlayer({
        id: "p2",
        hand: [makeTile({ id: "b2", gameValue: 7 })],
      });

      const state = makeGameState({
        mission: 41,
        players: [skipPlayer, activePlayer],
        currentPlayerIndex: 0,
        turnNumber: 3,
        log: [],
      });

      dispatchHooks(41, { point: "setup", state });

      expect(state.currentPlayerIndex).toBe(1);
      expect(state.turnNumber).toBe(4);
      const skipLog = state.log.find(
        (entry) =>
          entry.action === "hookEffect"
          && renderLogDetail(entry.detail) === "iberian_yellow_mode:auto_skip|player=p1",
      );
      expect(skipLog).toBeDefined();
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

    it("mission 15: initializes face-down equipment and number deck", () => {
      const state = makeGameState({
        mission: 15,
        board: makeBoardState({
          equipment: [
            makeEquipmentCard({ id: "rewinder", unlockValue: 6, unlocked: true }),
            makeEquipmentCard({ id: "stabilizer", unlockValue: 9, unlocked: true }),
          ],
        }),
        log: [],
      });
      dispatchHooks(15, { point: "setup", state });

      expect(state.board.equipment).toHaveLength(2);
      for (const card of state.board.equipment) {
        expect(card.faceDown).toBe(true);
        expect(card.unlocked).toBe(false);
      }

      const numberCards = state.campaign?.numberCards;
      expect(numberCards).toBeDefined();
      expect(numberCards!.visible).toHaveLength(1);
      expect(numberCards!.visible[0].faceUp).toBe(true);
      expect(numberCards!.deck).toHaveLength(11);
      expect(numberCards!.discard).toHaveLength(0);
    });

    it("mission 47: initializes all Number cards faceup in the shared visible area", () => {
      const state = makeGameState({
        mission: 47,
        log: [],
      });

      dispatchHooks(47, { point: "setup", state });

      const numberCards = state.campaign?.numberCards;
      expect(numberCards).toBeDefined();
      expect(numberCards!.visible).toHaveLength(12);
      expect(numberCards!.visible.every((card) => card.faceUp)).toBe(true);
      expect(numberCards!.deck).toHaveLength(0);
      expect(numberCards!.discard).toHaveLength(0);

      const values = [...new Set(numberCards!.visible.map((card) => card.value))].sort(
        (a, b) => a - b,
      );
      expect(values).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    });

    it("mission 26: initializes all Number cards faceup and empty deck/discard", () => {
      const state = makeGameState({
        mission: 26,
        log: [],
      });

      dispatchHooks(26, { point: "setup", state });

      const numberCards = state.campaign?.numberCards;
      expect(numberCards).toBeDefined();
      expect(numberCards!.visible).toHaveLength(12);
      expect(numberCards!.visible.every((card) => card.faceUp)).toBe(true);
      expect(numberCards!.deck).toHaveLength(0);
      expect(numberCards!.discard).toHaveLength(0);

      const values = [...new Set(numberCards!.visible.map((card) => card.value))].sort(
        (a, b) => a - b,
      );
      expect(values).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

      const setupLog = state.log.find(
        (entry) =>
          entry.action === "hookSetup"
          && renderLogDetail(entry.detail) === "visible_number_card_gate:init",
      );
      expect(setupLog).toBeDefined();
    });

    it("mission 59: initializes all Number cards faceup and Nano starting state", () => {
      const state = makeGameState({
        mission: 59,
        players: [makePlayer({
          id: "player-1",
          hand: [makeTile({ id: "m59-t1", gameValue: 1 }), makeTile({ id: "m59-t12", gameValue: 12 })],
        })],
        log: [],
      });

      dispatchHooks(59, { point: "setup", state });

      const numberCards = state.campaign?.numberCards;
      expect(numberCards).toBeDefined();
      expect(numberCards!.visible).toHaveLength(12);
      expect(numberCards!.visible.every((card) => card.faceUp)).toBe(true);
      expect(numberCards!.deck).toHaveLength(0);
      expect(numberCards!.discard).toHaveLength(0);

      const visibleValues = [...new Set(numberCards!.visible.map((card) => card.value))].sort(
        (a, b) => a - b,
      );
      expect(visibleValues).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

      const mission59Nano = state.campaign?.mission59Nano;
      expect(mission59Nano).toBeDefined();
      const sevenIndex = numberCards!.visible.findIndex((card) => card.value === 7);
      expect(mission59Nano?.position).toBe(sevenIndex);
      if (mission59Nano) {
        const leftCount = Math.max(0, sevenIndex);
        const rightCount = Math.max(0, numberCards!.visible.length - sevenIndex - 1);
        expect(mission59Nano.facing).toBe(rightCount > leftCount ? 1 : -1);
      }
    });

    it("mission 35: marks one blue X wire at far right of each stand", () => {
      const captain = makePlayer({
        id: "captain",
        hand: [
          makeTile({ id: "c1", color: "blue", gameValue: 2, sortValue: 2 }),
          makeTile({ id: "c2", color: "red", gameValue: "RED", sortValue: 8.5 }),
          makeTile({ id: "c3", color: "yellow", gameValue: "YELLOW", sortValue: 4.1 }),
          makeTile({ id: "c4", color: "blue", gameValue: 7, sortValue: 7 }),
        ],
      });
      captain.standSizes = [2, 2];

      const teammate = makePlayer({
        id: "teammate",
        hand: [
          makeTile({ id: "t1", color: "red", gameValue: "RED", sortValue: 3.5 }),
          makeTile({ id: "t2", color: "blue", gameValue: 5, sortValue: 5 }),
          makeTile({ id: "t3", color: "yellow", gameValue: "YELLOW", sortValue: 9.1 }),
        ],
      });
      teammate.standSizes = [3];

      const state = makeGameState({
        mission: 35,
        players: [captain, teammate],
        log: [],
      });

      dispatchHooks(35, { point: "setup", state });

      for (const player of state.players) {
        const standSizes = player.standSizes ?? [player.hand.length];
        let offset = 0;
        let markerCount = 0;

        for (const standSize of standSizes) {
          const stand = player.hand.slice(offset, offset + standSize);
          offset += standSize;
          expect(stand.length).toBeGreaterThan(0);

          const standMarkers = stand.filter((tile) => tile.isXMarked === true);
          markerCount += standMarkers.length;
          expect(standMarkers).toHaveLength(1);
          expect(stand[stand.length - 1].isXMarked).toBe(true);
          expect(stand[stand.length - 1].color).toBe("blue");
        }

        expect(markerCount).toBe(standSizes.length);
      }
    });

    it("mission 35: chooses the X wire from random blue candidates (not always first blue)", () => {
      const captain = makePlayer({
        id: "captain",
        hand: [
          makeTile({ id: "c1", color: "blue", gameValue: 2, sortValue: 2 }),
          makeTile({ id: "c2", color: "blue", gameValue: 9, sortValue: 9 }),
          makeTile({ id: "c3", color: "red", gameValue: "RED", sortValue: 10.1 }),
        ],
      });
      captain.standSizes = [3];

      const state = makeGameState({
        mission: 35,
        players: [captain],
        log: [],
      });

      const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.999);
      try {
        dispatchHooks(35, { point: "setup", state });
      } finally {
        randomSpy.mockRestore();
      }

      const marked = captain.hand.filter((tile) => tile.isXMarked === true);
      expect(marked).toHaveLength(1);
      expect(marked[0].id).toBe("c2");
      expect(captain.hand[captain.hand.length - 1].id).toBe("c2");
      expect(captain.hand.find((tile) => tile.id === "c1")?.isXMarked).not.toBe(true);
    });

    it("mission 23: initializes hidden equipment pile with 7 face-down cards", () => {
      const state = makeGameState({
        mission: 23,
        board: makeBoardState({ equipment: [] }),
        log: [],
      });
      dispatchHooks(23, { point: "setup", state });

      expect(state.board.equipment).toHaveLength(7);
      expect(new Set(state.board.equipment.map((card) => card.id)).size).toBe(7);
      for (const card of state.board.equipment) {
        expect(card.faceDown).toBe(true);
        expect(card.unlocked).toBe(false);
        expect(card.used).toBe(false);
      }

      const setupLog = state.log.find(
        (entry) => entry.action === "hookSetup" && renderLogDetail(entry.detail).startsWith("hidden_equipment_pile:"),
      );
      expect(setupLog).toBeDefined();
      expect(renderLogDetail(setupLog!.detail)).toBe("hidden_equipment_pile:7");
    });

    it("mission 39: initializes visible Number card and 8-card deck", () => {
      const state = makeGameState({
        mission: 39,
        log: [],
      });

      dispatchHooks(39, { point: "setup", state });

      const numberCards = state.campaign?.numberCards;
      expect(numberCards).toBeDefined();
      expect(numberCards!.visible).toHaveLength(1);
      expect(numberCards!.visible[0].faceUp).toBe(true);
      expect(numberCards!.visible[0].value).toBeGreaterThanOrEqual(1);
      expect(numberCards!.visible[0].value).toBeLessThanOrEqual(12);
      expect(numberCards!.deck).toHaveLength(8);
      expect(numberCards!.deck.every((card) => card.faceUp === false)).toBe(true);
      expect(numberCards!.discard).toHaveLength(0);
      expect((state.campaign as Record<string, unknown>).randomSetupInfoTokens).toBe(true);

      const allValues = [
        numberCards!.visible[0].value,
        ...numberCards!.deck.map((card) => card.value),
      ];
      expect(new Set(allValues).size).toBe(allValues.length);
    });

    it("mission 43: marks random setup tokens as captain-only in 2-player games", () => {
      const captain = makePlayer({
        id: "captain",
        isCaptain: true,
      });
      const partner = makePlayer({ id: "partner" });
      const state = makeGameState({
        mission: 43,
        players: [captain, partner],
        log: [],
      });

      dispatchHooks(43, { point: "setup", state });

      const campaignState = state.campaign as Record<string, unknown>;
      expect(campaignState.randomSetupInfoTokens).toBe(true);
      expect(campaignState.randomSetupCaptainOnly).toBe(true);
    });

    it("mission 38: flips exactly one captain wire and none for teammates", () => {
      const captain = makePlayer({
        id: "captain",
        isCaptain: true,
        hand: [
          makeTile({ id: "c1", color: "blue", gameValue: 1, sortValue: 1 }),
          makeTile({ id: "c2", color: "blue", gameValue: 2, sortValue: 2 }),
        ],
      });
      const teammate = makePlayer({
        id: "teammate",
        hand: [
          makeTile({ id: "t1", color: "blue", gameValue: 3, sortValue: 3 }),
          makeTile({ id: "t2", color: "blue", gameValue: 4, sortValue: 4 }),
        ],
      });

      const state = makeGameState({
        mission: 38,
        players: [captain, teammate],
        log: [],
      });

      dispatchHooks(38, { point: "setup", state });

      const captainUpsideDownCount = captain.hand.filter(
        (tile) => (tile as unknown as { upsideDown?: boolean }).upsideDown === true,
      ).length;
      const teammateUpsideDownCount = teammate.hand.filter(
        (tile) => (tile as unknown as { upsideDown?: boolean }).upsideDown === true,
      ).length;

      expect(captainUpsideDownCount).toBe(1);
      expect(teammateUpsideDownCount).toBe(0);
    });

    it("mission 56: places each flipped wire at far right of the stand", () => {
      const p1 = makePlayer({
        id: "p1",
        hand: [
          makeTile({ id: "p1-1", color: "blue", gameValue: 1, sortValue: 1 }),
          makeTile({ id: "p1-2", color: "blue", gameValue: 2, sortValue: 2 }),
          makeTile({ id: "p1-3", color: "blue", gameValue: 3, sortValue: 3 }),
          makeTile({ id: "p1-4", color: "blue", gameValue: 4, sortValue: 4 }),
        ],
      });
      const p2 = makePlayer({
        id: "p2",
        hand: [
          makeTile({ id: "p2-1", color: "blue", gameValue: 5, sortValue: 5 }),
          makeTile({ id: "p2-2", color: "blue", gameValue: 6, sortValue: 6 }),
          makeTile({ id: "p2-3", color: "blue", gameValue: 7, sortValue: 7 }),
          makeTile({ id: "p2-4", color: "blue", gameValue: 8, sortValue: 8 }),
        ],
      });
      const state = makeGameState({
        mission: 56,
        players: [p1, p2],
        log: [],
      });

      dispatchHooks(56, { point: "setup", state });

      for (const player of state.players) {
        const upsideDownIndices = player.hand
          .map((tile, index) =>
            (tile as unknown as { upsideDown?: boolean }).upsideDown === true ? index : -1,
          )
          .filter((index) => index >= 0);

        expect(upsideDownIndices).toHaveLength(1);
        expect(upsideDownIndices[0]).toBe(player.hand.length - 1);
      }
    });

    it("mission 65: deals Number cards as equally as possible from captain clockwise", () => {
      const p1 = makePlayer({ id: "p1", isCaptain: false });
      const p2 = makePlayer({ id: "p2", isCaptain: false });
      const p3 = makePlayer({ id: "p3", isCaptain: true });
      const p4 = makePlayer({ id: "p4", isCaptain: false });
      const p5 = makePlayer({ id: "p5", isCaptain: false });
      const state = makeGameState({
        mission: 65,
        players: [p1, p2, p3, p4, p5],
        log: [],
      });

      dispatchHooks(65, { point: "setup", state });

      const numberCards = state.campaign?.numberCards;
      expect(numberCards).toBeDefined();
      expect(numberCards!.playerHands["p1"]).toHaveLength(2);
      expect(numberCards!.playerHands["p2"]).toHaveLength(2);
      expect(numberCards!.playerHands["p3"]).toHaveLength(3);
      expect(numberCards!.playerHands["p4"]).toHaveLength(3);
      expect(numberCards!.playerHands["p5"]).toHaveLength(2);
      expect(numberCards!.deck).toHaveLength(0);
      expect(
        Object.values(numberCards!.playerHands)
          .flat()
          .every((card) => card.faceUp),
      ).toBe(true);

      const dealtCardCount = Object.values(numberCards!.playerHands).reduce(
        (sum, hand) => sum + hand.length,
        0,
      );
      expect(dealtCardCount).toBe(12);
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

    it("mission 50: removes preexisting validation markers during setup", () => {
      const state = makeGameState({
        mission: 50,
        board: makeBoardState({
          markers: [
            { value: 3, color: "red" },
            { value: 5, color: "yellow", possible: true },
          ],
        }),
        log: [],
      });

      dispatchHooks(50, { point: "setup", state });

      expect(state.board.markers).toHaveLength(0);
      expect((state.campaign as Record<string, unknown>).noMarkersMemoryMode).toBe(true);
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
            detail: logText("blue_as_red:7"),
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
      expect(renderLogDetail(effectLog!.detail)).toContain("explosion");
    });

    it("mission 65: flips a completed value card face down", () => {
      const p1 = makePlayer({
        id: "p1",
        hand: [
          makeTile({ id: "p1-5a", gameValue: 5, cut: true }),
          makeTile({ id: "p1-5b", gameValue: 5, cut: false }),
        ],
      });
      const p2 = makePlayer({
        id: "p2",
        hand: [makeTile({ id: "p2-5", gameValue: 5, cut: true })],
      });
      const p3 = makePlayer({
        id: "p3",
        hand: [makeTile({ id: "p3-5", gameValue: 5, cut: true })],
      });

      const state = makeGameState({
        mission: 65,
        players: [p1, p2, p3],
        currentPlayerIndex: 0,
        turnNumber: 9,
        campaign: {
          numberCards: {
            visible: [],
            deck: [],
            discard: [],
            playerHands: {
              p1: [
                { id: "c-p1-5", value: 5, faceUp: true },
                { id: "c-p1-8", value: 8, faceUp: true },
              ],
              p2: [{ id: "c-p2-9", value: 9, faceUp: true }],
              p3: [{ id: "c-p3-2", value: 2, faceUp: true }],
            },
          },
        },
        log: [],
      });

      dispatchHooks(65, {
        point: "resolve",
        state,
        action: { type: "soloCut", actorId: "p1", value: 5, tilesCut: 2 },
        cutValue: 5,
        cutSuccess: true,
      });

      expect(state.campaign?.numberCards?.playerHands["p1"]?.[0]?.faceUp).toBe(false);
      expect(state.campaign?.numberCards?.playerHands["p1"]?.[1]?.faceUp).toBe(true);

      const completionLog = state.log.find(
        (entry) =>
          entry.action === "hookEffect"
          && renderLogDetail(entry.detail).startsWith("personal_number_cards:completed=5|flipped=1"),
      );
      expect(completionLog).toBeDefined();
    });

    it("mission 26: removes Number card after 4 matching wires are cut", () => {
      const actor = makePlayer({
        id: "actor",
        hand: [makeTile({ id: "a4", gameValue: 4, cut: false })],
      });
      const teammate = makePlayer({
        id: "teammate",
        hand: [
          makeTile({ id: "t4a", gameValue: 4, cut: true }),
          makeTile({ id: "t4b", gameValue: 4, cut: true }),
          makeTile({ id: "t4c", gameValue: 4, cut: true }),
        ],
      });

      const state = makeGameState({
        mission: 26,
        players: [actor, teammate],
        campaign: {
          numberCards: {
            visible: [{ id: "m26-visible-4", value: 4, faceUp: true }],
            deck: [],
            discard: [],
            playerHands: {},
          },
        },
      });

      dispatchHooks(26, {
        point: "resolve",
        state,
        action: {
          type: "dualCut",
          actorId: "actor",
          targetPlayerId: "teammate",
          targetTileIndex: 0,
          guessValue: 4,
        },
        cutValue: 4,
        cutSuccess: true,
      });

      expect(state.campaign?.numberCards?.visible).toHaveLength(0);
      expect(state.campaign?.numberCards?.discard).toHaveLength(0);

      const completedLog = state.log.find(
        (entry) =>
          entry.action === "hookEffect"
          && renderLogDetail(entry.detail) === "visible_number_card_gate:completed=4",
      );
      expect(completedLog).toBeDefined();
    });

    it("mission 26: flips selected Number card after a failed matching cut attempt", () => {
      const actor = makePlayer({
        id: "actor",
        hand: [makeTile({ id: "a1", gameValue: 1, cut: false })],
      });
      const teammate = makePlayer({
        id: "teammate",
        hand: [makeTile({ id: "t2", gameValue: 2, cut: false })],
      });

      const state = makeGameState({
        mission: 26,
        players: [actor, teammate],
        campaign: {
          numberCards: {
            visible: [
              { id: "m26-visible-1", value: 1, faceUp: true },
              { id: "m26-visible-2", value: 2, faceUp: true },
            ],
            deck: [],
            discard: [],
            playerHands: {},
          },
        },
      });

      dispatchHooks(26, {
        point: "resolve",
        state,
        action: {
          type: "dualCut",
          actorId: "actor",
          targetPlayerId: "teammate",
          targetTileIndex: 0,
          guessValue: 1,
        },
        cutValue: 1,
        cutSuccess: false,
      });

      const firstCard = state.campaign?.numberCards?.visible?.find((card) => card.id === "m26-visible-1");
      const secondCard = state.campaign?.numberCards?.visible?.find((card) => card.id === "m26-visible-2");
      expect(firstCard?.faceUp).toBe(false);
      expect(secondCard?.faceUp).toBe(true);
    });

    it("mission 59: moves Nano to cut card and flips matching Number card at 4 cuts", () => {
      const actor = makePlayer({
        id: "actor",
        hand: [
          makeTile({ id: "actor-5-a", gameValue: 5, cut: false }),
        ],
      });
      const teammate = makePlayer({
        id: "teammate",
        hand: [
          makeTile({ id: "team-5-a", gameValue: 5, cut: true }),
          makeTile({ id: "team-5-b", gameValue: 5, cut: true }),
        ],
      });
      const witness = makePlayer({
        id: "witness",
        hand: [
          makeTile({ id: "wit-5-a", gameValue: 5, cut: true }),
          makeTile({ id: "wit-6", gameValue: 6, cut: false }),
        ],
      });

      const state = makeGameState({
        mission: 59,
        players: [actor, teammate, witness],
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
              { id: "m59-visible-8", value: 8, faceUp: true },
              { id: "m59-visible-9", value: 9, faceUp: true },
              { id: "m59-visible-10", value: 10, faceUp: true },
              { id: "m59-visible-11", value: 11, faceUp: true },
              { id: "m59-visible-12", value: 12, faceUp: true },
            ],
            deck: [],
            discard: [],
            playerHands: {},
          },
          mission59Nano: {
            position: 6,
            facing: -1,
          },
        },
      });

      dispatchHooks(59, {
        point: "resolve",
        state,
        action: {
          type: "soloCut",
          actorId: "actor",
          value: 5,
          tilesCut: 1,
        },
        cutValue: 5,
        cutSuccess: true,
      });

      const numberCard = state.campaign?.numberCards?.visible.find((card) => card.value === 5);
      expect(numberCard?.faceUp).toBe(false);
      expect(state.campaign?.mission59Nano?.position).toBe(4);
    });

    it("mission 59: keeps Nano movement when rotate is requested after successful cut", () => {
      const actor = makePlayer({
        id: "actor",
        hand: [makeTile({ id: "actor-5", gameValue: 5, cut: false })],
      });
      const state = makeGameState({
        mission: 59,
        players: [actor],
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
            facing: -1,
          },
        },
      });

      dispatchHooks(59, {
        point: "resolve",
        state,
        action: {
          type: "soloCut",
          actorId: "actor",
          value: 5,
          mission59RotateNano: true,
        },
        cutValue: 5,
        cutSuccess: true,
      });

      expect(state.campaign?.mission59Nano?.position).toBe(4);
      expect(state.campaign?.mission59Nano?.facing).toBe(1);
    });

    it("mission 59: allows rotating Nano after a failed cut when requested", () => {
      const actor = makePlayer({
        id: "actor",
        hand: [makeTile({ id: "actor-5", gameValue: 5, cut: false })],
      });
      const teammate = makePlayer({
        id: "teammate",
        hand: [makeTile({ id: "team-5", gameValue: 5, cut: false })],
      });
      const state = makeGameState({
        mission: 59,
        players: [actor, teammate],
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
      });

      dispatchHooks(59, {
        point: "resolve",
        state,
        action: {
          type: "dualCut",
          actorId: "actor",
          targetPlayerId: "teammate",
          targetTileIndex: 0,
          guessValue: 5,
          mission59RotateNano: true,
        },
        cutValue: 5,
        cutSuccess: false,
      });

      expect(state.campaign?.mission59Nano?.facing).toBe(-1);
    });

    it("mission 59: does not rotate Nano after a failed cut unless requested", () => {
      const actor = makePlayer({
        id: "actor",
        hand: [makeTile({ id: "actor-5", gameValue: 5, cut: false })],
      });
      const teammate = makePlayer({
        id: "teammate",
        hand: [makeTile({ id: "team-5", gameValue: 5, cut: false })],
      });
      const state = makeGameState({
        mission: 59,
        players: [actor, teammate],
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
      });

      dispatchHooks(59, {
        point: "resolve",
        state,
        action: {
          type: "dualCut",
          actorId: "actor",
          targetPlayerId: "teammate",
          targetTileIndex: 0,
          guessValue: 5,
        },
        cutValue: 5,
        cutSuccess: false,
      });

      expect(state.campaign?.mission59Nano?.facing).toBe(1);
    });

    it("mission 47: discards two Number cards when a valid cut action resolves", () => {
      const actor = makePlayer({
        id: "actor",
        hand: [makeTile({ id: "a1", gameValue: 4, cut: false })],
      });
      const teammate = makePlayer({
        id: "teammate",
        hand: [makeTile({ id: "t1", gameValue: 5, cut: false })],
      });
      const state = makeGameState({
        mission: 47,
        players: [actor, teammate],
        campaign: {
          numberCards: {
            visible: [
              { id: "c3", value: 3, faceUp: true },
              { id: "c4", value: 4, faceUp: true },
              { id: "c9", value: 9, faceUp: true },
            ],
            deck: [],
            discard: [],
            playerHands: {},
          },
        },
      });

      dispatchHooks(47, {
        point: "resolve",
        state,
        action: {
          type: "dualCut",
          actorId: "actor",
          targetPlayerId: "teammate",
          targetTileIndex: 0,
          guessValue: 7,
        },
        cutValue: 7,
        cutSuccess: true,
      });

      expect(state.campaign?.numberCards?.visible).toHaveLength(1);
      expect(state.campaign?.numberCards?.discard).toHaveLength(2);
      expect(state.campaign?.numberCards?.visible?.some((card) => card.id === "c9")).toBe(true);
      expect(state.campaign?.numberCards?.discard.every((card) => card.faceUp)).toBe(true);
    });

    it("mission 47: reshuffles discarded Number cards when none remain visible", () => {
      const actor = makePlayer({
        id: "actor",
        hand: [makeTile({ id: "a1", gameValue: 4, cut: false })],
      });
      const teammate = makePlayer({
        id: "teammate",
        hand: [makeTile({ id: "t1", gameValue: 5, cut: false })],
      });
      const state = makeGameState({
        mission: 47,
        players: [actor, teammate],
        campaign: {
          numberCards: {
            visible: [
              { id: "c11", value: 11, faceUp: true },
              { id: "c1", value: 1, faceUp: true },
            ],
            deck: [],
            discard: [],
            playerHands: {},
          },
        },
      });

      dispatchHooks(47, {
        point: "resolve",
        state,
        action: {
          type: "dualCut",
          actorId: "actor",
          targetPlayerId: "teammate",
          targetTileIndex: 0,
          guessValue: 10,
        },
        cutValue: 10,
        cutSuccess: true,
      });

      expect(state.campaign?.numberCards?.visible).toHaveLength(2);
      expect(state.campaign?.numberCards?.discard).toHaveLength(0);
      expect(state.campaign?.numberCards?.visible.every((card) => card.faceUp)).toBe(true);
      expect(state.campaign?.numberCards?.visible.map((card) => card.id).sort()).toEqual(["c1", "c11"]);
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
            detail: logText("blue_as_red:7"),
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
            detail: logText("blue_as_red:7"),
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
        (e) => e.action === "hookEffect" && renderLogDetail(e.detail).startsWith("sequence_priority:advance:"),
      );
      expect(effectLog).toBeDefined();
    });

    it("mission 9: advances sequence pointer from 2 to 3 when last card is completed", () => {
      const actor = makePlayer({
        id: "actor",
        hand: [makeTile({ id: "a1", gameValue: 8, cut: false })],
      });
      const target = makePlayer({
        id: "target",
        hand: [makeTile({ id: "t1", gameValue: 8, cut: true })],
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
          specialMarkers: [{ kind: "sequence_pointer", value: 2 }],
        },
      });

      dispatchHooks(9, {
        point: "resolve",
        state,
        action: { type: "dualCut", actorId: "actor", targetPlayerId: "target", targetTileIndex: 0, guessValue: 8 },
        cutValue: 8,
        cutSuccess: true,
      });

      const marker = state.campaign?.specialMarkers?.find(
        (m) => m.kind === "sequence_pointer",
      );
      expect(marker?.value).toBe(3);
    });

    it("mission 15: disables default equipment unlock when visible number is not completed", () => {
      const actor = makePlayer({
        id: "actor",
        hand: [makeTile({ id: "a1", gameValue: 6, cut: false })],
      });
      const state = makeGameState({
        mission: 15,
        players: [actor],
        board: makeBoardState({
          equipment: [
            makeEquipmentCard({
              id: "rewinder",
              unlockValue: 6,
              faceDown: true,
              unlocked: false,
            }),
          ],
        }),
        campaign: {
          numberCards: {
            visible: [makeNumberCard({ id: "m15-current", value: 3, faceUp: true })],
            deck: [makeNumberCard({ id: "m15-next", value: 4, faceUp: false })],
            discard: [],
            playerHands: {},
          },
        },
      });

      const result = dispatchHooks(15, {
        point: "resolve",
        state,
        action: { type: "soloCut", actorId: "actor", value: 6 },
        cutValue: 6,
        cutSuccess: true,
      });

      expect(result.overrideEquipmentUnlock).toBe(true);
      expect(result.equipmentUnlockThreshold).toBe(Number.MAX_SAFE_INTEGER);
      expect(state.board.equipment[0].unlocked).toBe(false);
      expect(state.board.equipment[0].faceDown).toBe(true);
      expect(state.campaign?.numberCards?.visible[0]?.value).toBe(3);
    });

    it("mission 15: reveals one equipment when current number value reaches 4 and skips pre-completed next values", () => {
      const actor = makePlayer({
        id: "actor",
        hand: [
          makeTile({ id: "a3-uncut", gameValue: 3, cut: false }),
          makeTile({ id: "a9-cut", gameValue: 9, cut: true }),
          makeTile({ id: "a9-cut-2", gameValue: 9, cut: true }),
        ],
      });
      const partner = makePlayer({
        id: "partner",
        hand: [
          makeTile({ id: "p3-cut-1", gameValue: 3, cut: true }),
          makeTile({ id: "p3-cut-2", gameValue: 3, cut: true }),
          makeTile({ id: "p3-cut-3", gameValue: 3, cut: true }),
          makeTile({ id: "p9-cut-3", gameValue: 9, cut: true }),
          makeTile({ id: "p9-cut-4", gameValue: 9, cut: true }),
        ],
      });

      const state = makeGameState({
        mission: 15,
        players: [actor, partner],
        board: makeBoardState({
          equipment: [
            makeEquipmentCard({
              id: "rewinder",
              unlockValue: 6,
              faceDown: true,
              unlocked: false,
            }),
            makeEquipmentCard({
              id: "stabilizer",
              unlockValue: 9,
              faceDown: true,
              unlocked: false,
            }),
          ],
        }),
        campaign: {
          numberCards: {
            visible: [makeNumberCard({ id: "m15-current", value: 3, faceUp: true })],
            deck: [
              makeNumberCard({ id: "m15-skip", value: 9, faceUp: false }),
              makeNumberCard({ id: "m15-next", value: 4, faceUp: false }),
            ],
            discard: [],
            playerHands: {},
          },
        },
      });

      dispatchHooks(15, {
        point: "resolve",
        state,
        action: { type: "soloCut", actorId: "actor", value: 3 },
        cutValue: 3,
        cutSuccess: true,
      });

      expect(state.board.equipment[0].unlocked).toBe(true);
      expect(state.board.equipment[0].faceDown).toBe(false);
      expect(state.board.equipment[1].unlocked).toBe(false);
      expect(state.board.equipment[1].faceDown).toBe(true);

      const numberCards = state.campaign?.numberCards;
      expect(numberCards?.discard.map((card) => card.value)).toEqual([3, 9]);
      expect(numberCards?.visible).toHaveLength(1);
      expect(numberCards?.visible[0].value).toBe(4);
      expect(numberCards?.deck).toHaveLength(0);
    });

    it("mission 15: safely exhausts number deck when all next values are already completed", () => {
      const actor = makePlayer({
        id: "actor",
        hand: [
          makeTile({ id: "a3-uncut", gameValue: 3, cut: false }),
          makeTile({ id: "a9-cut-1", gameValue: 9, cut: true }),
          makeTile({ id: "a9-cut-2", gameValue: 9, cut: true }),
        ],
      });
      const partner = makePlayer({
        id: "partner",
        hand: [
          makeTile({ id: "p3-cut-1", gameValue: 3, cut: true }),
          makeTile({ id: "p3-cut-2", gameValue: 3, cut: true }),
          makeTile({ id: "p3-cut-3", gameValue: 3, cut: true }),
          makeTile({ id: "p9-cut-3", gameValue: 9, cut: true }),
          makeTile({ id: "p9-cut-4", gameValue: 9, cut: true }),
        ],
      });

      const state = makeGameState({
        mission: 15,
        players: [actor, partner],
        board: makeBoardState({
          equipment: [
            makeEquipmentCard({
              id: "rewinder",
              unlockValue: 6,
              faceDown: true,
              unlocked: false,
            }),
          ],
        }),
        campaign: {
          numberCards: {
            visible: [makeNumberCard({ id: "m15-current", value: 3, faceUp: true })],
            deck: [makeNumberCard({ id: "m15-skip", value: 9, faceUp: false })],
            discard: [],
            playerHands: {},
          },
        },
      });

      dispatchHooks(15, {
        point: "resolve",
        state,
        action: { type: "soloCut", actorId: "actor", value: 3 },
        cutValue: 3,
        cutSuccess: true,
      });

      const numberCards = state.campaign?.numberCards;
      expect(numberCards?.discard.map((card) => card.value)).toEqual([3, 9]);
      expect(numberCards?.visible).toEqual([]);
      expect(numberCards?.deck).toEqual([]);
    });

    it("mission 15: returns empty override result after all face-down equipment is revealed", () => {
      const state = makeGameState({
        mission: 15,
        board: makeBoardState({
          equipment: [
            makeEquipmentCard({
              id: "rewinder",
              unlockValue: 6,
              faceDown: false,
              unlocked: true,
            }),
          ],
        }),
      });

      const result = dispatchHooks(15, {
        point: "resolve",
        state,
        action: { type: "soloCut", actorId: "player-1", value: 6 },
        cutValue: 6,
        cutSuccess: true,
      });

      expect(result.overrideEquipmentUnlock).toBeUndefined();
      expect(result.equipmentUnlockThreshold).toBeUndefined();
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

    it("mission 39: discards top Number-deck card before captain turn until special action succeeds", () => {
      const p1 = makePlayer({ id: "p1", isCaptain: false });
      const captain = makePlayer({ id: "captain", isCaptain: true });
      const p3 = makePlayer({ id: "p3", isCaptain: false });
      const state = makeGameState({
        mission: 39,
        players: [p1, captain, p3],
        currentPlayerIndex: 1,
        turnNumber: 4,
        campaign: {
          numberCards: {
            visible: [{ id: "m39-visible-5", value: 5, faceUp: true }],
            deck: [
              { id: "m39-deck-0-7", value: 7, faceUp: false },
              { id: "m39-deck-1-8", value: 8, faceUp: false },
            ],
            discard: [],
            playerHands: {},
          },
        },
        log: [],
      });

      dispatchHooks(39, { point: "endTurn", state });

      expect(state.campaign?.numberCards?.deck).toHaveLength(1);
      expect(state.campaign?.numberCards?.deck[0]?.value).toBe(8);
      expect(state.campaign?.numberCards?.discard).toHaveLength(1);
      expect(state.campaign?.numberCards?.discard[0]?.value).toBe(7);
      expect(state.campaign?.numberCards?.discard[0]?.faceUp).toBe(true);
      const discardLog = state.log.find(
        (entry) =>
          entry.action === "hookEffect"
          && renderLogDetail(entry.detail) === "m39:number_deck_discard:7|remaining=1",
      );
      expect(discardLog).toBeDefined();
    });

    it("mission 39: does not discard Number-deck cards after special action completion", () => {
      const p1 = makePlayer({ id: "p1", isCaptain: false });
      const captain = makePlayer({ id: "captain", isCaptain: true });
      const p3 = makePlayer({ id: "p3", isCaptain: false });
      const state = makeGameState({
        mission: 39,
        players: [p1, captain, p3],
        currentPlayerIndex: 1,
        turnNumber: 4,
        campaign: {
          mission23SpecialActionDone: true,
          numberCards: {
            visible: [{ id: "m39-visible-5", value: 5, faceUp: true }],
            deck: [
              { id: "m39-deck-0-7", value: 7, faceUp: false },
              { id: "m39-deck-1-8", value: 8, faceUp: false },
            ],
            discard: [],
            playerHands: {},
          },
        },
        log: [],
      });

      dispatchHooks(39, { point: "endTurn", state });

      expect(state.campaign?.numberCards?.deck.map((card) => card.value)).toEqual([7, 8]);
      expect(state.campaign?.numberCards?.discard).toHaveLength(0);
    });

    it("mission 38: auto-skips non-captain when only successful cut target is captain flipped wire", () => {
      const captain = makePlayer({
        id: "captain",
        isCaptain: true,
        hand: [
          makeTile({ id: "captain-flipped", gameValue: 7, cut: false }),
          makeTile({ id: "captain-other", gameValue: 9, cut: true }),
        ],
      });
      (captain.hand[0] as unknown as { upsideDown?: boolean }).upsideDown = true;

      const stuck = makePlayer({
        id: "stuck",
        hand: [makeTile({ id: "stuck-7", gameValue: 7, cut: false })],
      });

      const next = makePlayer({
        id: "next",
        hand: [makeTile({ id: "next-2", gameValue: 2, cut: false })],
      });

      const state = makeGameState({
        mission: 38,
        players: [captain, stuck, next],
        currentPlayerIndex: 1,
        turnNumber: 4,
        board: makeBoardState({ detonatorPosition: 1, detonatorMax: 4 }),
        log: [],
      });

      dispatchHooks(38, { point: "endTurn", state });

      expect(state.currentPlayerIndex).toBe(2);
      expect(state.turnNumber).toBe(5);
      expect(state.board.detonatorPosition).toBe(2);
      const skipLog = state.log.find(
        (entry) =>
          entry.action === "hookEffect"
          && renderLogDetail(entry.detail).startsWith("upside_down_wire:auto_skip|player=stuck"),
      );
      expect(skipLog).toBeDefined();
    });

    it("mission 26: flips all Number cards faceup when none are visible and auto-skips if no match", () => {
      const skipPlayer = makePlayer({
        id: "skip",
        hand: [makeTile({ id: "r1", color: "red", gameValue: "RED", cut: false })],
      });
      const nextPlayer = makePlayer({
        id: "next",
        hand: [makeTile({ id: "n1", gameValue: 4, cut: false })],
      });

      const state = makeGameState({
        mission: 26,
        players: [skipPlayer, nextPlayer],
        currentPlayerIndex: 0,
        turnNumber: 8,
        campaign: {
          numberCards: {
            visible: [
              { id: "m26-visible-4", value: 4, faceUp: false },
              { id: "m26-visible-5", value: 5, faceUp: false },
            ],
            deck: [],
            discard: [],
            playerHands: {},
          },
        },
        log: [],
      });

      dispatchHooks(26, { point: "endTurn", state });

      const visible = state.campaign?.numberCards?.visible;
      expect(visible?.[0]?.faceUp).toBe(true);
      expect(visible?.[1]?.faceUp).toBe(true);

      expect(state.currentPlayerIndex).toBe(1);
      expect(state.turnNumber).toBe(9);

      const refreshLog = state.log.find(
        (entry) =>
          entry.action === "hookEffect"
          && renderLogDetail(entry.detail).startsWith("visible_number_card_gate:refresh|count=2"),
      );
      expect(refreshLog).toBeDefined();

      const skipLog = state.log.find(
        (entry) =>
          entry.action === "hookEffect"
          && renderLogDetail(entry.detail) === "visible_number_card_gate:auto_skip|player=skip",
      );
      expect(skipLog).toBeDefined();
    });

    it("mission 41: auto-skips a player with only their tripwire and red wires", () => {
      const skipPlayer = makePlayer({
        id: "p1",
        hand: [
          makeTile({ id: "y1", color: "yellow", gameValue: "YELLOW" }),
          makeTile({ id: "r1", color: "red", gameValue: "RED", sortValue: 2.5 }),
        ],
      });
      const activePlayer = makePlayer({
        id: "p2",
        hand: [makeTile({ id: "b2", gameValue: 5 })],
      });

      const state = makeGameState({
        mission: 41,
        players: [skipPlayer, activePlayer],
        currentPlayerIndex: 0,
        turnNumber: 6,
        log: [],
      });

      dispatchHooks(41, { point: "endTurn", state });

      expect(state.currentPlayerIndex).toBe(1);
      expect(state.turnNumber).toBe(7);
      const skipLog = state.log.find(
        (entry) =>
          entry.action === "hookEffect"
          && renderLogDetail(entry.detail) === "iberian_yellow_mode:auto_skip|player=p1",
      );
      expect(skipLog).toBeDefined();
    });

    it("mission 41: auto-skips a player with only their tripwire", () => {
      const skipPlayer = makePlayer({
        id: "p1",
        hand: [makeTile({ id: "y1", color: "yellow", gameValue: "YELLOW" })],
      });
      const activePlayer = makePlayer({
        id: "p2",
        hand: [makeTile({ id: "b2", gameValue: 5 })],
      });

      const state = makeGameState({
        mission: 41,
        players: [skipPlayer, activePlayer],
        currentPlayerIndex: 0,
        turnNumber: 6,
        log: [],
      });

      dispatchHooks(41, { point: "endTurn", state });

      expect(state.currentPlayerIndex).toBe(1);
      expect(state.turnNumber).toBe(7);
      const skipLog = state.log.find(
        (entry) =>
          entry.action === "hookEffect"
          && renderLogDetail(entry.detail) === "iberian_yellow_mode:auto_skip|player=p1",
      );
      expect(skipLog).toBeDefined();
    });

    it("mission 65: auto-skips a stuck player and advances detonator", () => {
      const p1 = makePlayer({
        id: "p1",
        hand: [makeTile({ id: "p1-1", gameValue: 4, cut: false })],
      });
      const p2 = makePlayer({
        id: "p2",
        hand: [
          makeTile({ id: "p2-1", gameValue: 2, cut: false }),
          makeTile({
            id: "p2-red",
            color: "red",
            gameValue: "RED",
            sortValue: 2.5,
            cut: false,
          }),
        ],
      });
      const p3 = makePlayer({
        id: "p3",
        hand: [makeTile({ id: "p3-1", gameValue: 6, cut: false })],
      });
      const state = makeGameState({
        mission: 65,
        players: [p1, p2, p3],
        currentPlayerIndex: 1,
        turnNumber: 7,
        board: makeBoardState({ detonatorPosition: 1, detonatorMax: 4 }),
        campaign: {
          numberCards: {
            visible: [],
            deck: [],
            discard: [],
            playerHands: {
              p1: [{ id: "c-p1-4", value: 4, faceUp: true }],
              p2: [{ id: "c-p2-9", value: 9, faceUp: true }],
              p3: [{ id: "c-p3-6", value: 6, faceUp: true }],
            },
          },
        },
        log: [],
      });

      dispatchHooks(65, { point: "endTurn", state });

      expect(state.currentPlayerIndex).toBe(2);
      expect(state.turnNumber).toBe(8);
      expect(state.board.detonatorPosition).toBe(2);
      const skipLog = state.log.find(
        (entry) =>
          entry.action === "hookEffect"
          && renderLogDetail(entry.detail).startsWith("personal_number_cards:auto_skip|player=p2"),
      );
      expect(skipLog).toBeDefined();
    });

    it("mission 59: auto-skips players with no playable uncut wires", () => {
      const p1 = makePlayer({
        id: "p1",
        hand: [makeTile({ id: "p1-10", gameValue: 10, cut: true })],
      });
      const p2 = makePlayer({
        id: "p2",
        hand: [makeTile({ id: "p2-1", gameValue: 1, cut: true })],
      });
      const state = makeGameState({
        mission: 59,
        players: [p1, p2],
        currentPlayerIndex: 0,
        turnNumber: 5,
        board: makeBoardState({ detonatorPosition: 1, detonatorMax: 4 }),
        campaign: {
          numberCards: {
            visible: [
              { id: "m59-v1", value: 1, faceUp: false },
              { id: "m59-v2", value: 2, faceUp: false },
              { id: "m59-v3", value: 3, faceUp: false },
              { id: "m59-v4", value: 4, faceUp: false },
              { id: "m59-v5", value: 5, faceUp: false },
              { id: "m59-v6", value: 6, faceUp: false },
              { id: "m59-v7", value: 7, faceUp: false },
              { id: "m59-v8", value: 8, faceUp: false },
              { id: "m59-v9", value: 9, faceUp: false },
              { id: "m59-v10", value: 10, faceUp: false },
              { id: "m59-v11", value: 11, faceUp: false },
              { id: "m59-v12", value: 12, faceUp: false },
            ],
            deck: [],
            discard: [],
            playerHands: {},
          },
          mission59Nano: {
            position: 6,
            facing: -1,
          },
        },
        log: [],
      });

      dispatchHooks(59, { point: "endTurn", state, previousPlayerId: "p2" });

      expect(state.currentPlayerIndex).toBe(0);
      expect(state.turnNumber).toBe(6);
      expect(state.board.detonatorPosition).toBe(2);
      expect(state.campaign?.mission59Nano?.facing).toBe(1);
      const skipLog = state.log.find(
        (entry) =>
          entry.action === "hookEffect"
          && renderLogDetail(entry.detail) === "mission_59:auto_skip|player=p1|detonator=2",
      );
      expect(skipLog).toBeDefined();
    });

    it("mission 59: does not auto-skip a player who can cut using only Nano's hidden current value", () => {
      const actor = makePlayer({
        id: "p1",
        hand: [makeTile({ id: "p1-10", gameValue: 10, cut: false })],
      });
      const state = makeGameState({
        mission: 59,
        players: [actor],
        currentPlayerIndex: 0,
        turnNumber: 5,
        board: makeBoardState({ detonatorPosition: 1, detonatorMax: 4 }),
        campaign: {
          numberCards: {
            visible: [
              { id: "m59-v1", value: 1, faceUp: false },
              { id: "m59-v2", value: 2, faceUp: false },
              { id: "m59-v3", value: 3, faceUp: false },
              { id: "m59-v4", value: 4, faceUp: false },
              { id: "m59-v5", value: 5, faceUp: false },
              { id: "m59-v6", value: 6, faceUp: false },
              { id: "m59-v7", value: 7, faceUp: false },
              { id: "m59-v8", value: 8, faceUp: false },
              { id: "m59-v9", value: 9, faceUp: false },
              { id: "m59-v10", value: 10, faceUp: false },
              { id: "m59-v11", value: 11, faceUp: false },
              { id: "m59-v12", value: 12, faceUp: false },
            ],
            deck: [],
            discard: [],
            playerHands: {},
          },
          mission59Nano: {
            position: 6,
            facing: -1,
          },
        },
        log: [],
      });

      dispatchHooks(59, { point: "endTurn", state, previousPlayerId: "p1" });

      expect(state.currentPlayerIndex).toBe(0);
      expect(state.turnNumber).toBe(5);
      expect(state.board.detonatorPosition).toBe(1);
      expect(state.campaign?.mission59Nano?.facing).toBe(-1);
      const skipLog = state.log.find(
        (entry) =>
          entry.action === "hookEffect"
          && renderLogDetail(entry.detail).startsWith("mission_59:auto_skip|player=p1"),
      );
      expect(skipLog).toBeUndefined();
    });

    it("mission 59: allows dual cuts on hidden Nano current value without actor hand match", () => {
      const actor = makePlayer({
        id: "p1",
        hand: [makeTile({ id: "p1-1", gameValue: 1, cut: false })],
      });
      const target = makePlayer({
        id: "p2",
        hand: [makeTile({ id: "p2-1", gameValue: 7, cut: false })],
      });
      const state = makeGameState({
        mission: 59,
        players: [actor, target],
        campaign: {
          numberCards: {
            visible: [
              { id: "m59-v1", value: 1, faceUp: false },
              { id: "m59-v2", value: 2, faceUp: false },
              { id: "m59-v3", value: 3, faceUp: false },
              { id: "m59-v4", value: 4, faceUp: false },
              { id: "m59-v5", value: 5, faceUp: false },
              { id: "m59-v6", value: 6, faceUp: false },
              { id: "m59-v7", value: 7, faceUp: false },
              { id: "m59-v8", value: 8, faceUp: false },
              { id: "m59-v9", value: 9, faceUp: false },
              { id: "m59-v10", value: 10, faceUp: false },
              { id: "m59-v11", value: 11, faceUp: false },
              { id: "m59-v12", value: 12, faceUp: false },
            ],
            deck: [],
            discard: [],
            playerHands: {},
          },
          mission59Nano: {
            position: 6,
            facing: -1,
          },
        },
      });

      const blocked = dispatchHooks(59, {
        point: "validate",
        state,
        action: {
          type: "dualCut",
          actorId: "p1",
          targetPlayerId: "p2",
          targetTileIndex: 0,
          guessValue: 5,
        },
      });
      expect(blocked.validationCode).toBe("MISSION_RULE_VIOLATION");
      expect(blocked.validationError).toContain("Nano's current line segment");

      const allowed = dispatchHooks(59, {
        point: "validate",
        state,
        action: {
          type: "dualCut",
          actorId: "p1",
          targetPlayerId: "p2",
          targetTileIndex: 0,
          guessValue: 7,
        },
      });
      expect(allowed.validationError).toBeUndefined();
    });

    it("mission 47: auto-skips a stuck player and advances detonator", () => {
      const p1 = makePlayer({
        id: "p1",
        hand: [makeTile({ id: "p1-1", gameValue: 2, cut: true })],
      });
      const p2 = makePlayer({
        id: "p2",
        hand: [makeTile({ id: "p2-1", gameValue: "RED", cut: false })],
      });
      const p3 = makePlayer({
        id: "p3",
        hand: [makeTile({ id: "p3-1", gameValue: 4, cut: false })],
      });
      const state = makeGameState({
        mission: 47,
        players: [p1, p2, p3],
        currentPlayerIndex: 0,
        turnNumber: 7,
        board: makeBoardState({ detonatorPosition: 1, detonatorMax: 4 }),
        campaign: {
          numberCards: {
            visible: [
              { id: "m47-visible-11", value: 11, faceUp: true },
              { id: "m47-visible-12", value: 12, faceUp: true },
            ],
            deck: [],
            discard: [],
            playerHands: {},
          },
        },
        log: [],
      });

      dispatchHooks(47, { point: "endTurn", state });

      expect(state.currentPlayerIndex).toBe(1);
      expect(state.turnNumber).toBe(8);
      expect(state.board.detonatorPosition).toBe(2);
      const skipLog = state.log.find(
        (entry) =>
          entry.action === "hookEffect"
          && renderLogDetail(entry.detail) === "add_subtract_number_cards:auto_skip|player=p1|detonator=2",
      );
      expect(skipLog).toBeDefined();
    });

    it("mission 47: does not auto-skip when legal Number pairs exist but no hand match", () => {
      const p1 = makePlayer({
        id: "p1",
        hand: [makeTile({ id: "p1-1", gameValue: 2, cut: false })],
      });
      const p2 = makePlayer({
        id: "p2",
        hand: [makeTile({ id: "p2-1", gameValue: 9, cut: false })],
      });
      const state = makeGameState({
        mission: 47,
        players: [p1, p2],
        currentPlayerIndex: 0,
        turnNumber: 7,
        board: makeBoardState({ detonatorPosition: 1, detonatorMax: 4 }),
        campaign: {
          numberCards: {
            visible: [
              { id: "m47-visible-11", value: 11, faceUp: true },
              { id: "m47-visible-12", value: 12, faceUp: true },
            ],
            deck: [],
            discard: [],
            playerHands: {},
          },
        },
        log: [],
      });

      dispatchHooks(47, { point: "endTurn", state });

      expect(state.currentPlayerIndex).toBe(0);
      expect(state.turnNumber).toBe(7);
      expect(state.board.detonatorPosition).toBe(1);
      const skipLog = state.log.find(
        (entry) =>
          entry.action === "hookEffect"
          && renderLogDetail(entry.detail) === "add_subtract_number_cards:auto_skip|player=p1|detonator=2",
      );
      expect(skipLog).toBeUndefined();
    });

    it("mission 47: auto-skips when legal Number pairs exist but no valid solo target and no dual-cut target", () => {
      const p1 = makePlayer({
        id: "p1",
        hand: [makeTile({ id: "p1-1", gameValue: 2, cut: false })],
      });
      const p2 = makePlayer({
        id: "p2",
        hand: [makeTile({ id: "p2-1", gameValue: 9, cut: true })],
      });
      const state = makeGameState({
        mission: 47,
        players: [p1, p2],
        currentPlayerIndex: 0,
        turnNumber: 7,
        board: makeBoardState({ detonatorPosition: 1, detonatorMax: 4 }),
        campaign: {
          numberCards: {
            visible: [
              { id: "m47-visible-11", value: 11, faceUp: true },
              { id: "m47-visible-12", value: 12, faceUp: true },
            ],
            deck: [],
            discard: [],
            playerHands: {},
          },
        },
        log: [],
      });

      dispatchHooks(47, { point: "endTurn", state });

      expect(state.currentPlayerIndex).toBe(0);
      expect(state.turnNumber).toBeGreaterThan(7);
      expect(state.board.detonatorPosition).toBeGreaterThan(1);
      const skipLog = state.log.find(
        (entry) =>
          entry.action === "hookEffect"
          && renderLogDetail(entry.detail) === "add_subtract_number_cards:auto_skip|player=p1|detonator=2",
      );
      expect(skipLog).toBeDefined();
    });

    it("mission 47: does not auto-skip when only red wires remain", () => {
      const p1 = makePlayer({
        id: "p1",
        hand: [makeTile({ id: "p1-1", gameValue: "RED", cut: false })],
      });
      const p2 = makePlayer({
        id: "p2",
        hand: [makeTile({ id: "p2-1", gameValue: 4, cut: true })],
      });
      const state = makeGameState({
        mission: 47,
        players: [p1, p2],
        currentPlayerIndex: 0,
        turnNumber: 7,
        board: makeBoardState({ detonatorPosition: 1, detonatorMax: 4 }),
        campaign: {
          numberCards: {
            visible: [
              { id: "m47-visible-11", value: 11, faceUp: true },
              { id: "m47-visible-12", value: 12, faceUp: true },
            ],
            deck: [],
            discard: [],
            playerHands: {},
          },
        },
        log: [],
      });

      dispatchHooks(47, { point: "endTurn", state });

      expect(state.currentPlayerIndex).toBe(0);
      expect(state.turnNumber).toBe(7);
      expect(state.board.detonatorPosition).toBe(1);
      const skipLog = state.log.find(
        (entry) =>
          entry.action === "hookEffect"
          && renderLogDetail(entry.detail) === "add_subtract_number_cards:auto_skip|player=p1|detonator=2",
      );
      expect(skipLog).toBeUndefined();
    });

    it("mission 47: mandatory skip can trigger detonator loss", () => {
      const stuck = makePlayer({
        id: "stuck",
        hand: [makeTile({ id: "s-1", gameValue: 2, cut: false })],
      });
      const stillStuck = makePlayer({
        id: "still-stuck",
        hand: [makeTile({ id: "d-1", gameValue: 3, cut: false })],
      });
      const state = makeGameState({
        mission: 47,
        players: [stuck, stillStuck],
        currentPlayerIndex: 0,
        turnNumber: 11,
        board: makeBoardState({ detonatorPosition: 2, detonatorMax: 3 }),
        campaign: {
          numberCards: {
            visible: [],
            deck: [],
            discard: [],
            playerHands: {},
          },
        },
      });

      dispatchHooks(47, { point: "endTurn", state });

      expect(state.phase).toBe("finished");
      expect(state.result).toBe("loss_detonator");
      expect(state.board.detonatorPosition).toBe(3);
      expect(state.currentPlayerIndex).toBe(0);
      expect(state.turnNumber).toBe(11);
    });

    it("mission 65: mandatory skip can trigger detonator loss", () => {
      const stuck = makePlayer({
        id: "stuck",
        hand: [makeTile({ id: "s-1", gameValue: 2, cut: false })],
      });
      const done = makePlayer({
        id: "done",
        hand: [makeTile({ id: "d-1", gameValue: 3, cut: true })],
      });
      const state = makeGameState({
        mission: 65,
        players: [stuck, done],
        currentPlayerIndex: 0,
        turnNumber: 11,
        board: makeBoardState({ detonatorPosition: 2, detonatorMax: 3 }),
        campaign: {
          numberCards: {
            visible: [],
            deck: [],
            discard: [],
            playerHands: {
              stuck: [{ id: "c-stuck-9", value: 9, faceUp: true }],
              done: [{ id: "c-done-3", value: 3, faceUp: true }],
            },
          },
        },
      });

      dispatchHooks(65, { point: "endTurn", state });

      expect(state.phase).toBe("finished");
      expect(state.result).toBe("loss_detonator");
      expect(state.board.detonatorPosition).toBe(3);
      expect(state.currentPlayerIndex).toBe(0);
      expect(state.turnNumber).toBe(11);
    });

    it("mission 9: explodes when current player has only blocked wires and no dualCut targets", () => {
      // Cards [2, 5, 8], pointer=0 → blocked: 5, 8
      // Current player (index 0) only has value-5 wires (blocked)
      // Other player has no uncut wires → no dualCut target
      const stuck = makePlayer({
        id: "stuck",
        hand: [
          makeTile({ id: "s1", gameValue: 5, cut: false }),
          makeTile({ id: "s2", gameValue: 5, cut: false }),
        ],
      });
      const done = makePlayer({
        id: "done",
        hand: [makeTile({ id: "d1", gameValue: 3, cut: true })],
      });
      const state = makeGameState({
        mission: 9,
        players: [stuck, done],
        currentPlayerIndex: 0,
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

      dispatchHooks(9, { point: "endTurn", state });

      expect(state.result).toBe("loss_detonator");
      expect(state.phase).toBe("finished");
      const effectLog = state.log.find(
        (e) => e.action === "hookEffect" && renderLogDetail(e.detail).includes("stuck"),
      );
      expect(effectLog).toBeDefined();
    });

    it("mission 9: does not explode when current player has a non-blocked wire", () => {
      // Cards [2, 5, 8], pointer=0 → blocked: 5, 8
      // Player has value 3 (not blocked)
      const player = makePlayer({
        id: "p1",
        hand: [
          makeTile({ id: "a1", gameValue: 5, cut: false }),
          makeTile({ id: "a2", gameValue: 3, cut: false }),
        ],
      });
      const state = makeGameState({
        mission: 9,
        players: [player],
        currentPlayerIndex: 0,
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

      dispatchHooks(9, { point: "endTurn", state });

      expect(state.result).toBeNull();
      expect(state.phase).toBe("playing");
    });

    it("mission 9: explodes when player has only blocked wires even if another player has uncut wires", () => {
      // Stuck player only has value 8 (blocked — right card, pointer 0).
      // Even though the target player has uncut wires, a dualCut requires
      // announcing a value the actor owns, and 8 is blocked.
      const stuck = makePlayer({
        id: "stuck",
        hand: [makeTile({ id: "s1", gameValue: 8, cut: false })],
      });
      const target = makePlayer({
        id: "target",
        hand: [makeTile({ id: "t1", gameValue: 2, cut: false })],
      });
      const state = makeGameState({
        mission: 9,
        players: [stuck, target],
        currentPlayerIndex: 0,
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

      dispatchHooks(9, { point: "endTurn", state });

      expect(state.result).toBe("loss_detonator");
      expect(state.phase).toBe("finished");
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

    it("mission 26: blocks actions that do not match visible Number cards", () => {
      const actor = makePlayer({
        id: "p1",
        hand: [
          makeTile({ id: "a1", gameValue: 2, cut: false }),
          makeTile({ id: "a2", gameValue: 3, cut: false }),
        ],
      });
      const state = makeGameState({
        mission: 26,
        players: [actor],
        campaign: {
          numberCards: {
            visible: [
              { id: "m26-visible-1", value: 1, faceUp: true },
              { id: "m26-visible-2", value: 2, faceUp: false },
              { id: "m26-visible-3", value: 3, faceUp: true },
            ],
            deck: [],
            discard: [],
            playerHands: {},
          },
        },
      });

      const blocked = dispatchHooks(26, {
        point: "validate",
        state,
        action: {
          type: "soloCut",
          actorId: "p1",
          value: 2,
          tileId: "a1",
        },
      });

      expect(blocked.validationCode).toBe("MISSION_RULE_VIOLATION");
      expect(blocked.validationError).toContain("visible Number card values");

      const allowed = dispatchHooks(26, {
        point: "validate",
        state,
        action: {
          type: "soloCut",
          actorId: "p1",
          value: 3,
          tileId: "a2",
        },
      });
      expect(allowed.validationError).toBeUndefined();
    });

    it("mission 26: blocks turns when player has no matching visible values", () => {
      const actor = makePlayer({
        id: "p1",
        hand: [makeTile({ id: "r1", color: "red", gameValue: "RED", cut: false })],
      });
      const state = makeGameState({
        mission: 26,
        players: [actor],
        campaign: {
          numberCards: {
            visible: [{ id: "m26-visible-1", value: 1, faceUp: true }],
            deck: [],
            discard: [],
            playerHands: {},
          },
        },
      });

      const blocked = dispatchHooks(26, {
        point: "validate",
        state,
        action: {
          type: "soloCut",
          actorId: "p1",
          value: 1,
          tileId: "r1",
        },
      });

      expect(blocked.validationCode).toBe("MISSION_RULE_VIOLATION");
      expect(blocked.validationError).toContain("must skip");
    });

    it("mission 59: allows cuts only when cut value is on Nano-facing line segment", () => {
      const actor = makePlayer({
        id: "p1",
        hand: [makeTile({ id: "a10", gameValue: 10, cut: false }), makeTile({ id: "a1", gameValue: 1, cut: false })],
      });

      const state = makeGameState({
        mission: 59,
        players: [actor],
        campaign: {
          numberCards: {
            visible: [
              { id: "m59-v1", value: 1, faceUp: true },
              { id: "m59-v2", value: 2, faceUp: true },
              { id: "m59-v3", value: 3, faceUp: true },
              { id: "m59-v4", value: 4, faceUp: true },
              { id: "m59-v5", value: 5, faceUp: true },
              { id: "m59-v6", value: 6, faceUp: true },
              { id: "m59-v7", value: 7, faceUp: true },
              { id: "m59-v8", value: 8, faceUp: true },
              { id: "m59-v9", value: 9, faceUp: true },
              { id: "m59-v10", value: 10, faceUp: true },
              { id: "m59-v11", value: 11, faceUp: true },
              { id: "m59-v12", value: 12, faceUp: true },
            ],
            deck: [],
            discard: [],
            playerHands: {},
          },
          mission59Nano: {
            position: 6,
            facing: -1,
          },
        },
      });

      const blocked = dispatchHooks(59, {
        point: "validate",
        state,
        action: {
          type: "soloCut",
          actorId: "p1",
          value: 10,
        },
      });
      expect(blocked.validationCode).toBe("MISSION_RULE_VIOLATION");
      expect(blocked.validationError).toContain("Nano");

      const allowed = dispatchHooks(59, {
        point: "validate",
        state,
        action: {
          type: "soloCut",
          actorId: "p1",
          value: 1,
        },
      });
      expect(allowed.validationError).toBeUndefined();
    });

    it("mission 59: allows dual cuts on Nano current value without hand match, but requires hand match for movement values", () => {
      const actor = makePlayer({
        id: "p1",
        hand: [makeTile({ id: "p1-1", gameValue: 1, cut: false })],
      });
      const target = makePlayer({
        id: "p2",
        hand: [makeTile({ id: "p2-1", gameValue: 5, cut: false })],
      });
      const state = makeGameState({
        mission: 59,
        players: [actor, target],
        campaign: {
          numberCards: {
            visible: [
              { id: "m59-v1", value: 1, faceUp: true },
              { id: "m59-v2", value: 2, faceUp: true },
              { id: "m59-v3", value: 3, faceUp: true },
              { id: "m59-v4", value: 4, faceUp: true },
              { id: "m59-v5", value: 5, faceUp: true },
              { id: "m59-v6", value: 6, faceUp: true },
              { id: "m59-v7", value: 7, faceUp: true },
              { id: "m59-v8", value: 8, faceUp: true },
              { id: "m59-v9", value: 9, faceUp: true },
              { id: "m59-v10", value: 10, faceUp: true },
              { id: "m59-v11", value: 11, faceUp: true },
              { id: "m59-v12", value: 12, faceUp: true },
            ],
            deck: [],
            discard: [],
            playerHands: {},
          },
          mission59Nano: {
            position: 6,
            facing: -1,
          },
        },
      });

      const blocked = dispatchHooks(59, {
        point: "validate",
        state,
        action: {
          type: "dualCut",
          actorId: "p1",
          targetPlayerId: "p2",
          targetTileIndex: 0,
          guessValue: 5,
        },
      });
      expect(blocked.validationCode).toBe("MISSION_RULE_VIOLATION");
      expect(blocked.validationError).toContain("non-current Nano value");

      const allowed = dispatchHooks(59, {
        point: "validate",
        state,
        action: {
          type: "dualCut",
          actorId: "p1",
          targetPlayerId: "p2",
          targetTileIndex: 0,
          guessValue: 7,
        },
      });
      expect(allowed.validationError).toBeUndefined();
    });

    it("mission 26: blocks revealReds even when a matching visible number exists", () => {
      const actor = makePlayer({
        id: "p1",
        hand: [makeTile({ id: "r1", color: "blue", gameValue: 1, cut: false })],
      });
      const state = makeGameState({
        mission: 26,
        players: [actor],
        campaign: {
          numberCards: {
            visible: [{ id: "m26-visible-1", value: 1, faceUp: true }],
            deck: [],
            discard: [],
            playerHands: {},
          },
        },
      });

      const blocked = dispatchHooks(26, {
        point: "validate",
        state,
        action: {
          type: "revealReds",
          actorId: "p1",
        },
      });

      expect(blocked.validationCode).toBe("MISSION_RULE_VIOLATION");
      expect(blocked.validationError).toContain("must cut a wire");
    });

    it("mission 59: blocks revealReds when a cut action is required", () => {
      const actor = makePlayer({
        id: "p1",
        hand: [makeTile({ id: "r1", color: "red", gameValue: "RED", cut: false })],
      });
      const state = makeGameState({
        mission: 59,
        players: [actor],
        campaign: {
          numberCards: {
            visible: [
              { id: "m59-v1", value: 1, faceUp: true },
              { id: "m59-v2", value: 2, faceUp: true },
              { id: "m59-v3", value: 3, faceUp: true },
              { id: "m59-v4", value: 4, faceUp: true },
              { id: "m59-v5", value: 5, faceUp: true },
              { id: "m59-v6", value: 6, faceUp: true },
              { id: "m59-v7", value: 7, faceUp: true },
              { id: "m59-v8", value: 8, faceUp: true },
              { id: "m59-v9", value: 9, faceUp: true },
              { id: "m59-v10", value: 10, faceUp: true },
              { id: "m59-v11", value: 11, faceUp: true },
              { id: "m59-v12", value: 12, faceUp: true },
            ],
            deck: [],
            discard: [],
            playerHands: {},
          },
          mission59Nano: {
            position: 6,
            facing: -1,
          },
        },
      });

      const blocked = dispatchHooks(59, {
        point: "validate",
        state,
        action: {
          type: "revealReds",
          actorId: "p1",
        },
      });

      expect(blocked.validationCode).toBe("MISSION_RULE_VIOLATION");
      expect(blocked.validationError).toContain("must cut using a Number card");
    });

    it("mission 47: blocks cut actions that cannot be formed by adding or subtracting two cards", () => {
      const actor = makePlayer({ id: "p1", hand: [makeTile({ id: "a1", gameValue: 4, cut: false })] });
      const state = makeGameState({
        mission: 47,
        players: [actor],
        campaign: {
          numberCards: {
            visible: [
              { id: "m47-visible-3", value: 3, faceUp: true },
              { id: "m47-visible-9", value: 9, faceUp: true },
              { id: "m47-visible-10", value: 10, faceUp: true },
            ],
            deck: [],
            discard: [],
            playerHands: {},
          },
        },
      });

      const blocked = dispatchHooks(47, {
        point: "validate",
        state,
        action: {
          type: "soloCut",
          actorId: "p1",
          value: 8,
        },
      });

      expect(blocked.validationCode).toBe("MISSION_RULE_VIOLATION");
      expect(blocked.validationError).toContain("Mission 47");

      const allowed = dispatchHooks(47, {
        point: "validate",
        state,
        action: {
          type: "soloCut",
          actorId: "p1",
          value: 12,
        },
      });
      expect(allowed.validationError).toBeUndefined();
    });

    it("mission 41: blocks actions for players with only their tripwire", () => {
      const skipPlayer = makePlayer({
        id: "p1",
        hand: [makeTile({ id: "y1", color: "yellow", gameValue: "YELLOW" })],
      });
      const targetPlayer = makePlayer({
        id: "p2",
        hand: [makeTile({ id: "b2", gameValue: 5 })],
      });
      const state = makeGameState({
        mission: 41,
        players: [skipPlayer, targetPlayer],
        currentPlayerIndex: 0,
        log: [],
      });

      const result = dispatchHooks(41, {
        point: "validate",
        state,
        action: {
          type: "dualCut",
          actorId: "p1",
          targetPlayerId: "p2",
          targetTileIndex: 0,
        },
      });

      expect(result.validationCode).toBe("MISSION_RULE_VIOLATION");
      expect(result.validationError).toContain("player must skip");
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
            detail: logText("ordering_marker"),
            timestamp: 1,
          });
        },
      });
      registerHookHandler("dynamic_turn_order", {
        setup(_rule, ctx) {
          // Should see the log entry added by timer (index 0)
          const markerExists = ctx.state.log.some(
            (e) => renderLogDetail(e.detail) === "ordering_marker",
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
            detail: logText("timer:trace_test"),
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
            detail: logText("dto:trace_test"),
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
            detail: logText("blue_as_red:5"),
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
      setTelemetrySink((event) => {
        if (event.type === "unknown_hook_kind") telemetryEvents.push(event);
      });
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

  describe("mission failure telemetry", () => {
    let telemetryEvents: MissionFailureTelemetryEvent[];

    beforeEach(() => {
      telemetryEvents = [];
      setTelemetrySink((event) => {
        if (event.type === "mission_failure") telemetryEvents.push(event);
      });
    });

    afterEach(() => {
      clearTelemetrySink();
    });

    it("emits structured mission failure payload", () => {
      const state = makeGameState({
        mission: 65,
        turnNumber: 7,
        board: {
          ...makeBoardState(),
          detonatorPosition: 3,
          detonatorMax: 6,
        },
        players: [
          makePlayer({ id: "p1", hand: [] }),
          makePlayer({ id: "p2", hand: [] }),
          makePlayer({ id: "p3", hand: [] }),
        ],
      });

      emitMissionFailureTelemetry(state, "loss_detonator", "p1", "p2");

      expect(telemetryEvents).toHaveLength(1);
      expect(telemetryEvents[0]).toMatchObject({
        type: "mission_failure",
        missionId: 65,
        failureReason: "loss_detonator",
        turnNumber: 7,
        playerCount: 3,
        detonatorPosition: 3,
        detonatorMax: 6,
        actorId: "p1",
        targetPlayerId: "p2",
      });
      expect(typeof telemetryEvents[0].timestamp).toBe("number");
    });

    it("defaults targetPlayerId to null when omitted", () => {
      const state = makeGameState({ mission: 10, log: [] });
      emitMissionFailureTelemetry(state, "loss_timer", "system");

      expect(telemetryEvents).toHaveLength(1);
      expect(telemetryEvents[0].targetPlayerId).toBeNull();
    });
  });
});
