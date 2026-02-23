import { describe, expect, it } from "vitest";
import {
  makeEquipmentCard,
  makeGameState,
  makePlayer,
  makeTile,
  makeYellowTile,
} from "@bomb-busters/shared/testing";
import { executeDualCut } from "../gameLogic";
import { executeUseEquipment, validateUseEquipment } from "../equipment";

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

    const error = validateUseEquipment(state, "actor", "rewinder", { kind: "rewinder" });
    expect(error).not.toBeNull();
    expect(error?.code).toBe("EQUIPMENT_LOCKED");
  });
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

    const action = executeUseEquipment(state, "actor", "rewinder", { kind: "rewinder" });
    expect(action.type).toBe("equipmentUsed");
    expect(state.board.detonatorPosition).toBe(1);
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
  });

  it("coffee thermos passes turn to selected player", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 5 })],
    });
    const p2 = makePlayer({
      id: "p2",
      hand: [makeTile({ id: "p2-1", gameValue: 4 })],
    });
    const p3 = makePlayer({
      id: "p3",
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
            id: "coffee_thermos",
            name: "Coffee Thermos",
            unlockValue: 11,
            unlocked: true,
            used: false,
          }),
        ],
      },
    });

    const action = executeUseEquipment(state, "actor", "coffee_thermos", {
      kind: "coffee_thermos",
      targetPlayerId: "p3",
    });
    expect(action.type).toBe("equipmentUsed");
    expect(state.currentPlayerIndex).toBe(2);
    expect(state.turnNumber).toBe(2);
  });
});
