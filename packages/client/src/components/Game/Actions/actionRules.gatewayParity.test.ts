import { describe, expect, it } from "vitest";
import type { AnyEquipmentId, ClientGameState, GameState } from "@bomb-busters/shared";
import { EQUIPMENT_DEFS } from "@bomb-busters/shared";
import {
  makeConstraintCard,
  makeEquipmentCard,
  makeGameState,
  makePlayer,
  makeRedTile,
  makeTile,
  makeYellowTile,
} from "@bomb-busters/shared/testing";
import {
  canStageEquipmentCardFromCardStrip,
  canStagePersonalSkillFromCardStrip,
  getAutoActivateEquipmentPayload,
} from "./actionRules.js";

function toClientGameState(state: GameState, playerId = "me"): ClientGameState {
  return {
    ...state,
    playerId,
    players: state.players.map((player) => ({
      ...player,
      remainingTiles: player.hand.filter((tile) => !tile.cut).length,
    })),
  } as unknown as ClientGameState;
}

function makeBaseState(overrides: Partial<GameState> = {}): ClientGameState {
  const state = makeGameState({
    phase: "playing",
    mission: 10,
    players: [
      makePlayer({
        id: "me",
        name: "Me",
        hand: [makeTile({ id: "m1", gameValue: 4 })],
      }),
      makePlayer({
        id: "p2",
        name: "P2",
        hand: [makeTile({ id: "p2-1", gameValue: 7 })],
      }),
    ],
    board: {
      detonatorPosition: 0,
      detonatorMax: 3,
      validationTrack: {},
      markers: [],
      equipment: [
        makeEquipmentCard({
          id: "talkies_walkies",
          unlocked: true,
          used: false,
          faceDown: false,
        }),
        makeEquipmentCard({
          id: "general_radar",
          unlocked: true,
          used: false,
          faceDown: false,
        }),
      ],
    },
    currentPlayerIndex: 0,
    ...overrides,
  });
  return toClientGameState(state);
}

describe("actionRules card-strip gateway parity", () => {
  describe("getAutoActivateEquipmentPayload", () => {
    it("returns payloads for every equipment with immediate timing", () => {
      const immediateIds: AnyEquipmentId[] = EQUIPMENT_DEFS
        .filter((def) => def.useTiming === "immediate")
        .map((def) => def.id as AnyEquipmentId);

      for (const equipmentId of immediateIds) {
        expect(getAutoActivateEquipmentPayload(equipmentId)).toEqual({
          kind: equipmentId,
        });
      }
    });

    it("returns the expected payload for current campaign immediate cards", () => {
      expect(getAutoActivateEquipmentPayload("false_bottom")).toEqual({
        kind: "false_bottom",
      });
      expect(getAutoActivateEquipmentPayload("emergency_drop")).toEqual({
        kind: "emergency_drop",
      });
      expect(getAutoActivateEquipmentPayload("disintegrator")).toEqual({
        kind: "disintegrator",
      });
    });

    it("returns null for non-immediate equipment", () => {
      expect(getAutoActivateEquipmentPayload("rewinder")).toBeNull();
      expect(getAutoActivateEquipmentPayload("post_it")).toBeNull();
      expect(getAutoActivateEquipmentPayload("talkies_walkies")).toBeNull();
    });
  });

  describe("canStageEquipmentCardFromCardStrip", () => {
    it("accepts legal equipment staging", () => {
      const state = makeBaseState();
      expect(
        canStageEquipmentCardFromCardStrip(state, "me", "talkies_walkies", {
          revealRedsForcedForActor: false,
        }),
      ).toBe(true);
    });

    it("blocks when constraint G is active", () => {
      const state = makeBaseState({
        campaign: {
          constraints: {
            global: [makeConstraintCard({ id: "G", active: true })],
            perPlayer: {},
          },
        },
      });
      expect(
        canStageEquipmentCardFromCardStrip(state, "me", "talkies_walkies", {
          revealRedsForcedForActor: false,
        }),
      ).toBe(false);
    });

    it("blocks mission 41 skip-turn actors", () => {
      const state = makeBaseState({
        mission: 41,
        players: [
          makePlayer({
            id: "me",
            hand: [makeYellowTile({ id: "y1" }), makeRedTile({ id: "r1" })],
          }),
          makePlayer({
            id: "p2",
            hand: [makeTile({ id: "p2-1", gameValue: 7 })],
          }),
        ],
      });
      expect(
        canStageEquipmentCardFromCardStrip(state, "me", "talkies_walkies", {
          revealRedsForcedForActor: false,
        }),
      ).toBe(false);
    });

    it("blocks captain equipment in mission 17/28", () => {
      const mission17 = makeBaseState({
        mission: 17,
        players: [
          makePlayer({
            id: "me",
            isCaptain: true,
            hand: [makeTile({ id: "m1", gameValue: 4 })],
          }),
          makePlayer({
            id: "p2",
            hand: [makeTile({ id: "p2-1", gameValue: 7 })],
          }),
        ],
      });
      expect(
        canStageEquipmentCardFromCardStrip(mission17, "me", "talkies_walkies", {
          revealRedsForcedForActor: false,
        }),
      ).toBe(false);

      const mission28 = makeBaseState({
        mission: 28,
        players: [
          makePlayer({
            id: "me",
            isCaptain: true,
            hand: [makeTile({ id: "m1", gameValue: 4 })],
          }),
          makePlayer({
            id: "p2",
            hand: [makeTile({ id: "p2-1", gameValue: 7 })],
          }),
        ],
      });
      expect(
        canStageEquipmentCardFromCardStrip(mission28, "me", "talkies_walkies", {
          revealRedsForcedForActor: false,
        }),
      ).toBe(false);
    });

    it("blocks mission 18 radar/manual sub-turn restrictions", () => {
      const mission18Radar = makeBaseState({ mission: 18 });
      expect(
        canStageEquipmentCardFromCardStrip(mission18Radar, "me", "general_radar", {
          revealRedsForcedForActor: false,
        }),
      ).toBe(false);

      const mission18DesignatorSubTurn = makeBaseState({
        mission: 18,
        campaign: { mission18DesignatorIndex: 0 },
      });
      expect(
        canStageEquipmentCardFromCardStrip(mission18DesignatorSubTurn, "me", "talkies_walkies", {
          revealRedsForcedForActor: false,
        }),
      ).toBe(false);
    });

    it("blocks when equipment is face-down, secondary-locked, or used", () => {
      const faceDown = makeBaseState({
        board: {
          detonatorPosition: 0,
          detonatorMax: 3,
          validationTrack: {},
          markers: [],
          equipment: [
            makeEquipmentCard({
              id: "talkies_walkies",
              faceDown: true,
              unlocked: true,
              used: false,
            }),
          ],
        },
      });
      expect(
        canStageEquipmentCardFromCardStrip(faceDown, "me", "talkies_walkies", {
          revealRedsForcedForActor: false,
        }),
      ).toBe(false);

      const secondaryLocked = makeBaseState({
        board: {
          detonatorPosition: 0,
          detonatorMax: 3,
          validationTrack: {},
          markers: [],
          equipment: [
            makeEquipmentCard({
              id: "talkies_walkies",
              faceDown: false,
              unlocked: true,
              used: false,
              secondaryLockValue: 9,
              secondaryLockCutsRequired: 2,
            }),
          ],
        },
      });
      expect(
        canStageEquipmentCardFromCardStrip(secondaryLocked, "me", "talkies_walkies", {
          revealRedsForcedForActor: false,
        }),
      ).toBe(false);

      const used = makeBaseState({
        board: {
          detonatorPosition: 0,
          detonatorMax: 3,
          validationTrack: {},
          markers: [],
          equipment: [
            makeEquipmentCard({
              id: "talkies_walkies",
              faceDown: false,
              unlocked: true,
              used: true,
            }),
          ],
        },
      });
      expect(
        canStageEquipmentCardFromCardStrip(used, "me", "talkies_walkies", {
          revealRedsForcedForActor: false,
        }),
      ).toBe(false);
    });

    it("blocks when forced reveal reds is active for actor", () => {
      const state = makeBaseState();
      expect(
        canStageEquipmentCardFromCardStrip(state, "me", "talkies_walkies", {
          revealRedsForcedForActor: true,
        }),
      ).toBe(false);
    });
  });

  describe("canStagePersonalSkillFromCardStrip", () => {
    it("accepts legal character-skill staging", () => {
      const state = makeBaseState({
        players: [
          makePlayer({
            id: "me",
            character: "character_e2",
            hand: [makeTile({ id: "m1", gameValue: 4 })],
          }),
          makePlayer({
            id: "p2",
            hand: [makeTile({ id: "p2-1", gameValue: 7 })],
          }),
        ],
      });
      expect(
        canStagePersonalSkillFromCardStrip(state, "me", {
          revealRedsForcedForActor: false,
        }),
      ).toBe(true);
    });

    it("blocks when character is already used unless mission 58", () => {
      const mission10 = makeBaseState({
        mission: 10,
        players: [
          makePlayer({
            id: "me",
            character: "character_e2",
            characterUsed: true,
            hand: [makeTile({ id: "m1", gameValue: 4 })],
          }),
          makePlayer({
            id: "p2",
            hand: [makeTile({ id: "p2-1", gameValue: 7 })],
          }),
        ],
      });
      expect(
        canStagePersonalSkillFromCardStrip(mission10, "me", {
          revealRedsForcedForActor: false,
        }),
      ).toBe(false);

      const mission58 = makeBaseState({
        mission: 58,
        players: [
          makePlayer({
            id: "me",
            character: "character_e2",
            characterUsed: true,
            hand: [makeTile({ id: "m1", gameValue: 4 })],
          }),
          makePlayer({
            id: "p2",
            hand: [makeTile({ id: "p2-1", gameValue: 7 })],
          }),
        ],
      });
      expect(
        canStagePersonalSkillFromCardStrip(mission58, "me", {
          revealRedsForcedForActor: false,
        }),
      ).toBe(true);
    });

    it("blocks with mission41 skip-turn / constraint G / captain bans", () => {
      const mission41 = makeBaseState({
        mission: 41,
        players: [
          makePlayer({
            id: "me",
            character: "character_e2",
            hand: [makeYellowTile({ id: "y1" }), makeRedTile({ id: "r1" })],
          }),
          makePlayer({
            id: "p2",
            hand: [makeTile({ id: "p2-1", gameValue: 7 })],
          }),
        ],
      });
      expect(
        canStagePersonalSkillFromCardStrip(mission41, "me", {
          revealRedsForcedForActor: false,
        }),
      ).toBe(false);

      const constraintG = makeBaseState({
        players: [
          makePlayer({
            id: "me",
            character: "character_e2",
            hand: [makeTile({ id: "m1", gameValue: 4 })],
          }),
          makePlayer({
            id: "p2",
            hand: [makeTile({ id: "p2-1", gameValue: 7 })],
          }),
        ],
        campaign: {
          constraints: {
            global: [makeConstraintCard({ id: "G", active: true })],
            perPlayer: {},
          },
        },
      });
      expect(
        canStagePersonalSkillFromCardStrip(constraintG, "me", {
          revealRedsForcedForActor: false,
        }),
      ).toBe(false);

      const captainMission17 = makeBaseState({
        mission: 17,
        players: [
          makePlayer({
            id: "me",
            isCaptain: true,
            character: "character_e2",
            hand: [makeTile({ id: "m1", gameValue: 4 })],
          }),
          makePlayer({
            id: "p2",
            hand: [makeTile({ id: "p2-1", gameValue: 7 })],
          }),
        ],
      });
      expect(
        canStagePersonalSkillFromCardStrip(captainMission17, "me", {
          revealRedsForcedForActor: false,
        }),
      ).toBe(false);
    });
  });
});
