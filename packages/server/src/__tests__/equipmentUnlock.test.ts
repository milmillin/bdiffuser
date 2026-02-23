import { describe, expect, it } from "vitest";
import type { GameState } from "@bomb-busters/shared";
import {
  makeEquipmentCard,
  makeGameState,
  makePlayer,
  makeTile,
} from "@bomb-busters/shared/testing";
import { executeDualCut, executeSoloCut } from "../gameLogic";
import { validateUseEquipment } from "../equipment";

describe("equipment unlock lifecycle", () => {
  it("equipment stays locked at 1 cut (threshold=2)", () => {
    // Actor dual-cuts a value-5 tile on target's stand.
    // Only the target tile is cut (actor has no value-5 tile to auto-cut).
    // With only 1 cut of value 5, equipment should remain locked.
    const actor = makePlayer({
      id: "actor",
      name: "Actor",
      hand: [
        makeTile({ id: "a1", gameValue: 3 }),
        makeTile({ id: "a2", gameValue: 4 }),
      ],
    });
    const target = makePlayer({
      id: "target",
      name: "Target",
      hand: [
        makeTile({ id: "t1", gameValue: 5 }),
        makeTile({ id: "t2", gameValue: 6 }),
      ],
    });

    const state = makeGameState({
      players: [actor, target],
      currentPlayerIndex: 0,
      board: {
        ...makeGameState().board,
        equipment: [
          makeEquipmentCard({
            id: "rewinder",
            name: "Rewinder",
            unlockValue: 5,
            unlocked: false,
          }),
        ],
      },
    });

    executeDualCut(state, "actor", "target", 0, 5);

    // Target tile is cut, but actor has no value-5 tile → only 1 cut total
    expect(state.players[1].hand[0].cut).toBe(true);
    expect(state.board.equipment[0].unlocked).toBe(false);
  });

  it("equipment unlocks at 2nd cut via dual cut", () => {
    // Actor has a value-5 tile. When actor correctly dual-cuts a value-5
    // tile on target's stand, both the target tile AND the actor's matching
    // tile are cut. That gives 2 cuts of value 5 → equipment unlocks.
    const actor = makePlayer({
      id: "actor",
      name: "Actor",
      hand: [
        makeTile({ id: "a1", gameValue: 5 }),
        makeTile({ id: "a2", gameValue: 7 }),
      ],
    });
    const target = makePlayer({
      id: "target",
      name: "Target",
      hand: [
        makeTile({ id: "t1", gameValue: 5 }),
        makeTile({ id: "t2", gameValue: 8 }),
      ],
    });

    const state = makeGameState({
      players: [actor, target],
      currentPlayerIndex: 0,
      board: {
        ...makeGameState().board,
        equipment: [
          makeEquipmentCard({
            id: "rewinder",
            name: "Rewinder",
            unlockValue: 5,
            unlocked: false,
          }),
        ],
      },
    });

    executeDualCut(state, "actor", "target", 0, 5);

    // Both actor's value-5 tile and target's value-5 tile are now cut
    expect(state.players[0].hand[0].cut).toBe(true);
    expect(state.players[1].hand[0].cut).toBe(true);
    expect(state.board.equipment[0].unlocked).toBe(true);
  });

  it("equipment unlocks via solo cut (all copies cut)", () => {
    // Another player already has 2 cut tiles of value 5.
    // Actor has 2 uncut tiles of value 5. Solo cutting value 5 cuts both.
    // Now 4 total value-5 tiles are cut, well above threshold=2.
    const actor = makePlayer({
      id: "actor",
      name: "Actor",
      hand: [
        makeTile({ id: "a1", gameValue: 5 }),
        makeTile({ id: "a2", gameValue: 5 }),
      ],
    });
    const other = makePlayer({
      id: "other",
      name: "Other",
      hand: [
        makeTile({ id: "o1", gameValue: 5, cut: true }),
        makeTile({ id: "o2", gameValue: 5, cut: true }),
      ],
    });

    const state = makeGameState({
      players: [actor, other],
      currentPlayerIndex: 0,
      board: {
        ...makeGameState().board,
        equipment: [
          makeEquipmentCard({
            id: "rewinder",
            name: "Rewinder",
            unlockValue: 5,
            unlocked: false,
          }),
        ],
      },
    });

    executeSoloCut(state, "actor", 5);

    expect(state.players[0].hand[0].cut).toBe(true);
    expect(state.players[0].hand[1].cut).toBe(true);
    expect(state.board.equipment[0].unlocked).toBe(true);
  });

  it("multiple equipment with same unlockValue all unlock simultaneously", () => {
    // Two equipment cards both keyed to unlockValue: 5.
    // A single dual cut that produces 2 cuts of value 5 should unlock both.
    const actor = makePlayer({
      id: "actor",
      name: "Actor",
      hand: [
        makeTile({ id: "a1", gameValue: 5 }),
        makeTile({ id: "a2", gameValue: 9 }),
      ],
    });
    const target = makePlayer({
      id: "target",
      name: "Target",
      hand: [
        makeTile({ id: "t1", gameValue: 5 }),
        makeTile({ id: "t2", gameValue: 8 }),
      ],
    });

    const state = makeGameState({
      players: [actor, target],
      currentPlayerIndex: 0,
      board: {
        ...makeGameState().board,
        equipment: [
          makeEquipmentCard({
            id: "rewinder",
            name: "Rewinder",
            unlockValue: 5,
            unlocked: false,
          }),
          makeEquipmentCard({
            id: "stabilizer",
            name: "Stabilizer",
            unlockValue: 5,
            unlocked: false,
          }),
        ],
      },
    });

    executeDualCut(state, "actor", "target", 0, 5);

    expect(state.board.equipment[0].unlocked).toBe(true);
    expect(state.board.equipment[1].unlocked).toBe(true);
  });

  it("equipment stays locked when cuts are for a different value", () => {
    // Equipment unlockValue: 7, but we only cut tiles of value 5.
    // Equipment should remain locked.
    const actor = makePlayer({
      id: "actor",
      name: "Actor",
      hand: [
        makeTile({ id: "a1", gameValue: 5 }),
        makeTile({ id: "a2", gameValue: 6 }),
      ],
    });
    const target = makePlayer({
      id: "target",
      name: "Target",
      hand: [
        makeTile({ id: "t1", gameValue: 5 }),
        makeTile({ id: "t2", gameValue: 8 }),
      ],
    });

    const state = makeGameState({
      players: [actor, target],
      currentPlayerIndex: 0,
      board: {
        ...makeGameState().board,
        equipment: [
          makeEquipmentCard({
            id: "rewinder",
            name: "Rewinder",
            unlockValue: 7,
            unlocked: false,
          }),
        ],
      },
    });

    // Dual cut value 5 correctly (cuts 2 tiles of value 5)
    executeDualCut(state, "actor", "target", 0, 5);

    expect(state.players[0].hand[0].cut).toBe(true);
    expect(state.players[1].hand[0].cut).toBe(true);
    expect(state.board.equipment[0].unlocked).toBe(false);
  });

  it("solo cut of 4 copies unlocks equipment", () => {
    // Actor holds all 4 copies of value 5. Solo cut cuts them all.
    // 4 cuts >= threshold 2 → equipment unlocks.
    const actor = makePlayer({
      id: "actor",
      name: "Actor",
      hand: [
        makeTile({ id: "a1", gameValue: 5 }),
        makeTile({ id: "a2", gameValue: 5 }),
        makeTile({ id: "a3", gameValue: 5 }),
        makeTile({ id: "a4", gameValue: 5 }),
      ],
    });
    const other = makePlayer({
      id: "other",
      name: "Other",
      hand: [
        makeTile({ id: "o1", gameValue: 3 }),
      ],
    });

    const state = makeGameState({
      players: [actor, other],
      currentPlayerIndex: 0,
      board: {
        ...makeGameState().board,
        equipment: [
          makeEquipmentCard({
            id: "rewinder",
            name: "Rewinder",
            unlockValue: 5,
            unlocked: false,
          }),
        ],
      },
    });

    executeSoloCut(state, "actor", 5);

    expect(state.players[0].hand.every((t) => t.cut)).toBe(true);
    expect(state.board.equipment[0].unlocked).toBe(true);
  });

  it("dual cut incorrect guess does NOT unlock equipment", () => {
    // Actor guesses wrong. No tile is cut (blue/yellow wrong guess just
    // advances detonator). Equipment should remain locked.
    const actor = makePlayer({
      id: "actor",
      name: "Actor",
      hand: [
        makeTile({ id: "a1", gameValue: 5 }),
        makeTile({ id: "a2", gameValue: 7 }),
      ],
    });
    const target = makePlayer({
      id: "target",
      name: "Target",
      hand: [
        makeTile({ id: "t1", gameValue: 3 }),
        makeTile({ id: "t2", gameValue: 8 }),
      ],
    });

    const state = makeGameState({
      players: [actor, target],
      currentPlayerIndex: 0,
      board: {
        ...makeGameState().board,
        equipment: [
          makeEquipmentCard({
            id: "rewinder",
            name: "Rewinder",
            unlockValue: 5,
            unlocked: false,
          }),
        ],
      },
    });

    // Guess value 5 on target tile index 0 which is actually value 3
    const action = executeDualCut(state, "actor", "target", 0, 5);

    expect(action.type).toBe("dualCutResult");
    if (action.type === "dualCutResult") {
      expect(action.success).toBe(false);
    }
    // Target tile should NOT be cut (wrong guess on a blue tile)
    expect(state.players[1].hand[0].cut).toBe(false);
    expect(state.board.equipment[0].unlocked).toBe(false);
  });

  it("secondary lock blocks validation when cuts are insufficient", () => {
    // Equipment is primary-unlocked but has a secondary lock on value 3
    // requiring 2 cuts. No value-3 tiles are cut. Validation should reject.
    const actor = makePlayer({
      id: "actor",
      name: "Actor",
      hand: [
        makeTile({ id: "a1", gameValue: 5 }),
      ],
    });

    const state = makeGameState({
      players: [actor],
      currentPlayerIndex: 0,
      board: {
        ...makeGameState().board,
        equipment: [
          makeEquipmentCard({
            id: "rewinder",
            name: "Rewinder",
            unlockValue: 5,
            unlocked: true,
            secondaryLockValue: 3,
            secondaryLockCutsRequired: 2,
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

  it("secondary lock cleared after sufficient cuts", () => {
    // Equipment has secondaryLockValue: 5 and secondaryLockCutsRequired: 2.
    // After solo cutting 2 tiles of value 5, the secondary lock metadata
    // should be removed by clearSatisfiedSecondaryEquipmentLocks.
    const actor = makePlayer({
      id: "actor",
      name: "Actor",
      hand: [
        makeTile({ id: "a1", gameValue: 5 }),
        makeTile({ id: "a2", gameValue: 5 }),
      ],
    });
    const other = makePlayer({
      id: "other",
      name: "Other",
      hand: [
        makeTile({ id: "o1", gameValue: 3 }),
      ],
    });

    const state = makeGameState({
      players: [actor, other],
      currentPlayerIndex: 0,
      board: {
        ...makeGameState().board,
        equipment: [
          makeEquipmentCard({
            id: "rewinder",
            name: "Rewinder",
            unlockValue: 7,
            unlocked: true,
            secondaryLockValue: 5,
            secondaryLockCutsRequired: 2,
          }),
        ],
      },
    });

    // Before solo cut, secondary lock metadata is present
    expect(state.board.equipment[0].secondaryLockValue).toBe(5);
    expect(state.board.equipment[0].secondaryLockCutsRequired).toBe(2);

    executeSoloCut(state, "actor", 5);

    // After cutting 2 tiles of value 5, secondary lock metadata is cleared
    expect(state.board.equipment[0].secondaryLockValue).toBeUndefined();
    expect(state.board.equipment[0].secondaryLockCutsRequired).toBeUndefined();
  });

  it("primary-unlocked but secondary-locked rejects validation", () => {
    // Equipment is unlocked (primary) but secondary lock is still active.
    // validateUseEquipment should reject with EQUIPMENT_LOCKED.
    const actor = makePlayer({
      id: "actor",
      name: "Actor",
      hand: [
        makeTile({ id: "a1", gameValue: 5 }),
      ],
    });

    const state = makeGameState({
      players: [actor],
      currentPlayerIndex: 0,
      board: {
        ...makeGameState().board,
        equipment: [
          makeEquipmentCard({
            id: "rewinder",
            name: "Rewinder",
            unlockValue: 5,
            unlocked: true,
            secondaryLockValue: 8,
            secondaryLockCutsRequired: 2,
          }),
        ],
      },
    });

    const error = validateUseEquipment(state, "actor", "rewinder", {
      kind: "rewinder",
    });

    expect(error).not.toBeNull();
    expect(error?.code).toBe("EQUIPMENT_LOCKED");
    expect(error?.message).toContain("need 2 cuts of value 8");
  });

  it("secondary lock met but primary still locked rejects validation", () => {
    // Equipment is NOT primary-unlocked (unlocked: false).
    // Even though there are enough cuts to satisfy the secondary lock,
    // the primary lock is checked first and rejects.
    const actor = makePlayer({
      id: "actor",
      name: "Actor",
      hand: [
        makeTile({ id: "a1", gameValue: 5, cut: true }),
        makeTile({ id: "a2", gameValue: 5, cut: true }),
        makeTile({ id: "a3", gameValue: 3 }),
      ],
    });

    const state = makeGameState({
      players: [actor],
      currentPlayerIndex: 0,
      board: {
        ...makeGameState().board,
        equipment: [
          makeEquipmentCard({
            id: "rewinder",
            name: "Rewinder",
            unlockValue: 9,
            unlocked: false,
            secondaryLockValue: 5,
            secondaryLockCutsRequired: 2,
          }),
        ],
      },
    });

    const error = validateUseEquipment(state, "actor", "rewinder", {
      kind: "rewinder",
    });

    expect(error).not.toBeNull();
    expect(error?.code).toBe("EQUIPMENT_LOCKED");
    // Primary lock message should appear (not secondary lock message)
    expect(error?.message).toBe("Equipment card is still locked");
  });
});
