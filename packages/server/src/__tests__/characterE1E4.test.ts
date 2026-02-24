import { describe, expect, it } from "vitest";
import {
  makeEquipmentCard,
  makeGameState,
  makePlayer,
  makeTile,
} from "@bomb-busters/shared/testing";
import {
  executeCharacterAbility,
  executeUseEquipment,
  validateCharacterAbility,
  validateUseEquipment,
} from "../equipment";
import { resolveDetectorTileChoice } from "../gameLogic";

describe("Character E1-E4 abilities", () => {
  describe("E1 - General Radar", () => {
    it("validates successfully with valid payload", () => {
      const state = makeGameState({
        players: [
          makePlayer({
            id: "p1",
            character: "character_e1",
            characterUsed: false,
            hand: [makeTile({ id: "a1", gameValue: 5 })],
          }),
          makePlayer({
            id: "p2",
            name: "Bob",
            hand: [makeTile({ id: "t2", gameValue: 5 })],
          }),
        ],
        currentPlayerIndex: 0,
      });

      const error = validateCharacterAbility(state, "p1", {
        kind: "general_radar",
        value: 5,
      });

      expect(error).toBeNull();
    });

    it("rejects when characterUsed is true", () => {
      const state = makeGameState({
        players: [
          makePlayer({
            id: "p1",
            character: "character_e1",
            characterUsed: true,
            hand: [makeTile({ id: "a1", gameValue: 5 })],
          }),
          makePlayer({ id: "p2", name: "Bob" }),
        ],
      });

      const error = validateCharacterAbility(state, "p1", {
        kind: "general_radar",
        value: 5,
      });

      expect(error).not.toBeNull();
      expect(error?.code).toBe("CHARACTER_ABILITY_ALREADY_USED");
    });

    it("executes and sets characterUsed to true", () => {
      const state = makeGameState({
        players: [
          makePlayer({
            id: "p1",
            character: "character_e1",
            characterUsed: false,
            hand: [makeTile({ id: "a1", gameValue: 5 })],
          }),
          makePlayer({
            id: "p2",
            name: "Bob",
            hand: [makeTile({ id: "t2", gameValue: 5 })],
          }),
        ],
      });

      const action = executeCharacterAbility(state, "p1", {
        kind: "general_radar",
        value: 5,
      });

      expect(state.players[0].characterUsed).toBe(true);
      expect(action.type).toBe("equipmentUsed");
      if (action.type === "equipmentUsed") {
        expect(action.effect).toBe("general_radar");
      }
    });
  });

  describe("E2 - Talkies-Walkies", () => {
    it("validates swap between two players", () => {
      const state = makeGameState({
        players: [
          makePlayer({
            id: "p1",
            character: "character_e2",
            characterUsed: false,
            hand: [
              makeTile({ id: "a1", gameValue: 3 }),
              makeTile({ id: "a2", gameValue: 7 }),
            ],
          }),
          makePlayer({
            id: "p2",
            name: "Bob",
            hand: [
              makeTile({ id: "b1", gameValue: 5 }),
              makeTile({ id: "b2", gameValue: 9 }),
            ],
          }),
        ],
      });

      const error = validateCharacterAbility(state, "p1", {
        kind: "talkies_walkies",
        teammateId: "p2",
        myTileIndex: 0,
        teammateTileIndex: 0,
      });

      expect(error).toBeNull();
    });

    it("rejects swap with self", () => {
      const state = makeGameState({
        players: [
          makePlayer({
            id: "p1",
            character: "character_e2",
            characterUsed: false,
            hand: [makeTile({ id: "a1" }), makeTile({ id: "a2" })],
          }),
        ],
      });

      const error = validateCharacterAbility(state, "p1", {
        kind: "talkies_walkies",
        teammateId: "p1",
        myTileIndex: 0,
        teammateTileIndex: 1,
      });

      expect(error).not.toBeNull();
      expect(error?.code).toBe("CANNOT_TARGET_SELF");
    });

    it("executes swap and marks character as used", () => {
      const state = makeGameState({
        players: [
          makePlayer({
            id: "p1",
            character: "character_e2",
            characterUsed: false,
            hand: [makeTile({ id: "a1", gameValue: 3 })],
          }),
          makePlayer({
            id: "p2",
            name: "Bob",
            hand: [makeTile({ id: "b1", gameValue: 9 })],
          }),
        ],
      });

      executeCharacterAbility(state, "p1", {
        kind: "talkies_walkies",
        teammateId: "p2",
        myTileIndex: 0,
        teammateTileIndex: 0,
      });

      expect(state.players[0].characterUsed).toBe(true);
      expect(state.players[0].hand[0].id).toBe("b1");
      expect(state.players[1].hand[0].id).toBe("a1");
    });
  });

  describe("E3 - Triple Detector", () => {
    it("validates with 3 target tiles and matching guess value", () => {
      const state = makeGameState({
        players: [
          makePlayer({
            id: "p1",
            character: "character_e3",
            characterUsed: false,
            hand: [makeTile({ id: "a1", gameValue: 4 })],
          }),
          makePlayer({
            id: "p2",
            name: "Bob",
            hand: [
              makeTile({ id: "b1", gameValue: 4 }),
              makeTile({ id: "b2", gameValue: 5 }),
              makeTile({ id: "b3", gameValue: 6 }),
            ],
          }),
        ],
        currentPlayerIndex: 0,
      });

      const error = validateCharacterAbility(state, "p1", {
        kind: "triple_detector",
        targetPlayerId: "p2",
        targetTileIndices: [0, 1, 2],
        guessValue: 4,
      });

      expect(error).toBeNull();
    });

    it("executes a dual cut path and marks character as used", () => {
      const state = makeGameState({
        players: [
          makePlayer({
            id: "p1",
            character: "character_e3",
            characterUsed: false,
            hand: [makeTile({ id: "a1", gameValue: 4 })],
          }),
          makePlayer({
            id: "p2",
            name: "Bob",
            hand: [
              makeTile({ id: "b1", gameValue: 4 }),
              makeTile({ id: "b2", gameValue: 5 }),
              makeTile({ id: "b3", gameValue: 6 }),
            ],
          }),
        ],
        currentPlayerIndex: 0,
      });

      const action = executeCharacterAbility(state, "p1", {
        kind: "triple_detector",
        targetPlayerId: "p2",
        targetTileIndices: [0, 1, 2],
        guessValue: 4,
      });

      expect(state.players[0].characterUsed).toBe(true);
      // Now creates a pending forced action instead of resolving immediately
      expect(action.type).toBe("equipmentUsed");
      expect(state.pendingForcedAction).toBeDefined();
      expect(state.pendingForcedAction!.kind).toBe("detectorTileChoice");

      // Resolve: auto-selects the single match (tile 0)
      const resolveAction = resolveDetectorTileChoice(state);
      expect(resolveAction.type).toBe("dualCutResult");
      if (resolveAction.type === "dualCutResult") {
        expect(resolveAction.targetTileIndex).toBe(0);
        expect(resolveAction.success).toBe(true);
      }
    });
  });

  describe("E4 - X or Y Ray", () => {
    it("validates with two different guess values", () => {
      const state = makeGameState({
        players: [
          makePlayer({
            id: "p1",
            character: "character_e4",
            characterUsed: false,
            hand: [
              makeTile({ id: "a1", gameValue: 3 }),
              makeTile({ id: "a2", gameValue: 7 }),
            ],
          }),
          makePlayer({
            id: "p2",
            name: "Bob",
            hand: [makeTile({ id: "b1", gameValue: 3 })],
          }),
        ],
        currentPlayerIndex: 0,
      });

      const error = validateCharacterAbility(state, "p1", {
        kind: "x_or_y_ray",
        targetPlayerId: "p2",
        targetTileIndex: 0,
        guessValueA: 3,
        guessValueB: 7,
      });

      expect(error).toBeNull();
    });

    it("executes a dual cut path and marks character as used", () => {
      const state = makeGameState({
        players: [
          makePlayer({
            id: "p1",
            character: "character_e4",
            characterUsed: false,
            hand: [
              makeTile({ id: "a1", gameValue: 3 }),
              makeTile({ id: "a2", gameValue: 7 }),
            ],
          }),
          makePlayer({
            id: "p2",
            name: "Bob",
            hand: [makeTile({ id: "b1", gameValue: 3 })],
          }),
        ],
        currentPlayerIndex: 0,
      });

      const action = executeCharacterAbility(state, "p1", {
        kind: "x_or_y_ray",
        targetPlayerId: "p2",
        targetTileIndex: 0,
        guessValueA: 3,
        guessValueB: 7,
      });

      expect(state.players[0].characterUsed).toBe(true);
      expect(action.type).toBe("dualCutResult");
      if (action.type === "dualCutResult") {
        expect(action.success).toBe(true);
        expect(action.targetTileIndex).toBe(0);
      }
    });
  });

  describe("Emergency Batteries reset", () => {
    it("resets characterUsed flag for selected players", () => {
      const state = makeGameState({
        players: [
          makePlayer({ id: "p1", characterUsed: true }),
          makePlayer({ id: "p2", characterUsed: true }),
          makePlayer({ id: "p3", characterUsed: true }),
        ],
        board: {
          ...makeGameState().board,
          equipment: [
            makeEquipmentCard({
              id: "emergency_batteries",
              name: "Emergency Batteries",
              unlockValue: 7,
              unlocked: true,
              used: false,
            }),
          ],
        },
      });

      const validationError = validateUseEquipment(
        state,
        "p1",
        "emergency_batteries",
        {
          kind: "emergency_batteries",
          playerIds: ["p1", "p2"],
        },
      );
      expect(validationError).toBeNull();

      executeUseEquipment(state, "p1", "emergency_batteries", {
        kind: "emergency_batteries",
        playerIds: ["p1", "p2"],
      });

      expect(state.players[0].characterUsed).toBe(false);
      expect(state.players[1].characterUsed).toBe(false);
      expect(state.players[2].characterUsed).toBe(true);
      expect(state.board.equipment[0].used).toBe(true);
    });
  });

  describe("wrong character rejection", () => {
    it("rejects ability use with base character", () => {
      const state = makeGameState({
        players: [
          makePlayer({
            id: "p1",
            character: "double_detector",
            characterUsed: false,
          }),
        ],
      });

      const error = validateCharacterAbility(state, "p1", {
        kind: "general_radar",
        value: 5,
      });

      expect(error).not.toBeNull();
      expect(error?.code).toBe("CHARACTER_ABILITY_WRONG_CHARACTER");
    });

    it("rejects mismatched ability kind", () => {
      const state = makeGameState({
        players: [
          makePlayer({
            id: "p1",
            character: "character_e1",
            characterUsed: false,
            hand: [makeTile({ id: "a1", gameValue: 5 })],
          }),
        ],
      });

      const error = validateCharacterAbility(state, "p1", {
        kind: "talkies_walkies",
        teammateId: "p2",
        myTileIndex: 0,
        teammateTileIndex: 0,
      });

      expect(error).not.toBeNull();
      expect(error?.code).toBe("EQUIPMENT_INVALID_PAYLOAD");
    });
  });
});
