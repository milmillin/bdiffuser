import { describe, expect, it } from "vitest";
import type { GameState } from "@bomb-busters/shared";
import {
  makeEquipmentCard,
  makeGameState,
  makePlayer,
  makeTile,
  makeRedTile,
  makeYellowTile,
} from "@bomb-busters/shared/testing";
import { executeDualCut } from "../gameLogic";
import { executeUseEquipment, validateUseEquipment } from "../equipment";

function unlockedEquipment(id: string, name: string, unlockValue: number) {
  return makeEquipmentCard({ id, name, unlockValue, unlocked: true, used: false });
}

function stateWith(
  players: ReturnType<typeof makePlayer>[],
  equipment: ReturnType<typeof makeEquipmentCard>,
  boardOverrides: Partial<GameState["board"]> = {},
) {
  return makeGameState({
    players,
    currentPlayerIndex: 0,
    board: {
      ...makeGameState().board,
      equipment: [equipment],
      detonatorMax: 10,
      ...boardOverrides,
    },
  });
}

describe("equipment post-usage effects", () => {
  // ── 1. Rewinder at position 0 stays 0 ──────────────────────
  it("Rewinder at position 0 stays 0", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 5 })],
    });
    const state = makeGameState({
      players: [actor],
      board: {
        ...makeGameState().board,
        detonatorPosition: 0,
        detonatorMax: 10,
        equipment: [unlockedEquipment("rewinder", "Rewinder", 6)],
      },
    });

    executeUseEquipment(state, "actor", "rewinder", { kind: "rewinder" });

    expect(state.board.detonatorPosition).toBe(0);
  });

  // ── 2. Rewinder at position 3 goes to 2 ────────────────────
  it("Rewinder at position 3 goes to 2", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 5 })],
    });
    const state = makeGameState({
      players: [actor],
      board: {
        ...makeGameState().board,
        detonatorPosition: 3,
        detonatorMax: 10,
        equipment: [unlockedEquipment("rewinder", "Rewinder", 6)],
      },
    });

    executeUseEquipment(state, "actor", "rewinder", { kind: "rewinder" });

    expect(state.board.detonatorPosition).toBe(2);
  });

  // ── 3. Stabilizer prevents explosion on red wire dual cut ──
  it("Stabilizer prevents explosion on red wire dual cut", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 5 })],
    });
    const target = makePlayer({
      id: "target",
      name: "Target",
      hand: [makeRedTile({ id: "t1" })],
    });
    const state = makeGameState({
      players: [actor, target],
      currentPlayerIndex: 0,
      turnNumber: 1,
      board: {
        ...makeGameState().board,
        detonatorMax: 10,
        equipment: [unlockedEquipment("stabilizer", "Stabilizer", 9)],
      },
    });

    // Use stabilizer first
    executeUseEquipment(state, "actor", "stabilizer", { kind: "stabilizer" });

    // Then dual cut a red wire
    const action = executeDualCut(state, "actor", "target", 0, 5);

    expect(action.type).toBe("dualCutResult");
    if (action.type === "dualCutResult") {
      expect(action.success).toBe(false);
      expect(action.detonatorAdvanced).toBe(false);
      expect(action.explosion).toBe(false);
    }
    // Game should NOT be over
    expect(state.phase).toBe("playing");
    expect(state.result).toBeNull();
  });

  // ── 4. Stabilizer effect expires after turn change ─────────
  it("Stabilizer effect expires after turn change", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a1", gameValue: 5 }),
        makeTile({ id: "a2", gameValue: 6 }),
      ],
    });
    const p2 = makePlayer({
      id: "p2",
      name: "Bob",
      hand: [
        makeTile({ id: "p2-1", gameValue: 3 }),
        makeTile({ id: "p2-2", gameValue: 7 }),
      ],
    });
    const state = makeGameState({
      players: [actor, p2],
      currentPlayerIndex: 0,
      turnNumber: 1,
      board: {
        ...makeGameState().board,
        detonatorPosition: 0,
        detonatorMax: 10,
        equipment: [unlockedEquipment("stabilizer", "Stabilizer", 9)],
      },
    });

    // Use stabilizer on turn 1
    executeUseEquipment(state, "actor", "stabilizer", { kind: "stabilizer" });
    expect(state.turnEffects?.stabilizer?.turnNumber).toBe(1);

    // Advance to turn 2 by doing a successful dual cut
    // actor guesses p2's tile correctly (value 3)
    executeDualCut(state, "actor", "p2", 0, 3);
    // After successful dual cut, turn advances. Now it's p2's turn (turn 2)
    expect(state.turnNumber).toBeGreaterThan(1);
    // turnEffects should be cleared by advanceTurn
    expect(state.turnEffects).toBeUndefined();

    // Now p2 does a wrong dual cut on actor (guess 9, actual is 6)
    const beforeDetonator = state.board.detonatorPosition;
    executeDualCut(state, "p2", "actor", 1, 9);

    // Detonator should advance (stabilizer no longer active)
    expect(state.board.detonatorPosition).toBe(beforeDetonator + 1);
  });

  // ── 5. Coffee thermos: turn passes to target, turnNumber increments ──
  it("Coffee thermos: turn passes to target, turnNumber increments", () => {
    const actor = makePlayer({
      id: "p1",
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
        detonatorMax: 10,
        equipment: [unlockedEquipment("coffee_mug", "Coffee Mug", 11)],
      },
    });

    const action = executeUseEquipment(state, "p1", "coffee_mug", {
      kind: "coffee_mug",
      targetPlayerId: "p3",
    });

    expect(action.type).toBe("equipmentUsed");
    // currentPlayerIndex should be p3's index (2)
    expect(state.currentPlayerIndex).toBe(2);
    // turnNumber should have incremented
    expect(state.turnNumber).toBe(2);
  });

  // ── 6. Coffee thermos: validates target has uncut tiles ────
  it("Coffee thermos: validates target has uncut tiles", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 5 })],
    });
    const target = makePlayer({
      id: "target",
      hand: [makeTile({ id: "t1", gameValue: 3, cut: true })],
    });
    const state = makeGameState({
      players: [actor, target],
      currentPlayerIndex: 0,
      board: {
        ...makeGameState().board,
        detonatorMax: 10,
        equipment: [unlockedEquipment("coffee_mug", "Coffee Mug", 11)],
      },
    });

    const error = validateUseEquipment(state, "actor", "coffee_mug", {
      kind: "coffee_mug",
      targetPlayerId: "target",
    });

    expect(error).not.toBeNull();
    expect(error?.code).toBe("EQUIPMENT_RULE_VIOLATION");
  });

  // ── 7. Talkies-walkies: tiles swap correctly ───────────────
  it("Talkies-walkies: tiles swap correctly", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a0", gameValue: 1 }),
        makeTile({ id: "a1", gameValue: 8 }),
      ],
    });
    const teammate = makePlayer({
      id: "teammate",
      name: "Teammate",
      hand: [
        makeTile({ id: "t0", gameValue: 4 }),
        makeTile({ id: "t1", gameValue: 9 }),
      ],
    });
    const state = stateWith(
      [actor, teammate],
      unlockedEquipment("talkies_walkies", "Talkies-Walkies", 2),
    );

    executeUseEquipment(state, "actor", "talkies_walkies", {
      kind: "talkies_walkies",
      teammateId: "teammate",
      myTileIndex: 1,
      teammateTileIndex: 0,
    });

    // actor's hand[1] should now be teammate's old tile at index 0
    expect(state.players[0].hand[1].id).toBe("t0");
    expect(state.players[0].hand[1].gameValue).toBe(4);
    // actor's hand[0] should remain unchanged
    expect(state.players[0].hand[0].id).toBe("a0");
    // teammate's hand[0] should now be actor's old tile at index 1
    expect(state.players[1].hand[0].id).toBe("a1");
    expect(state.players[1].hand[0].gameValue).toBe(8);
    // teammate's hand[1] should remain unchanged
    expect(state.players[1].hand[1].id).toBe("t1");
  });

  // ── 8. Emergency batteries: only selected players reset ────
  it("Emergency batteries: only selected players reset", () => {
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
    const state = stateWith(
      [actor, p2, p3],
      unlockedEquipment("emergency_batteries", "Emergency Batteries", 7),
    );

    executeUseEquipment(state, "actor", "emergency_batteries", {
      kind: "emergency_batteries",
      playerIds: ["p2"],
    });

    expect(state.players[1].characterUsed).toBe(false);
    expect(state.players[2].characterUsed).toBe(true);
  });

  // ── 9. General radar: includes actor in yes/no detail ──────
  it("General radar: includes actor in yes/no detail", () => {
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
    const state = stateWith(
      [actor, p2, p3],
      unlockedEquipment("general_radar", "General Radar", 8),
    );

    const action = executeUseEquipment(state, "actor", "general_radar", {
      kind: "general_radar",
      value: 4,
    });

    expect(action.type).toBe("equipmentUsed");
    if (action.type === "equipmentUsed") {
      expect(action.detail).toContain("Actor:yes");
      expect(action.detail).toContain("Bob:no");
      expect(action.detail).toContain("Cara:yes");
    }
  });

  // ── 10. General radar: cut tiles excluded from result ──────
  it("General radar: cut tiles excluded from result", () => {
    const actor = makePlayer({
      id: "actor",
      name: "Actor",
      hand: [makeTile({ id: "a1", gameValue: 4, cut: true })],
    });
    const p2 = makePlayer({
      id: "p2",
      name: "Bob",
      hand: [makeTile({ id: "b1", gameValue: 4 })],
    });
    const state = stateWith(
      [actor, p2],
      unlockedEquipment("general_radar", "General Radar", 8),
    );

    const action = executeUseEquipment(state, "actor", "general_radar", {
      kind: "general_radar",
      value: 4,
    });

    expect(action.type).toBe("equipmentUsed");
    if (action.type === "equipmentUsed") {
      // Actor has a cut tile with value 4, so it should show "no"
      expect(action.detail).toContain("Actor:no");
      // Bob has an uncut tile with value 4, so it should show "yes"
      expect(action.detail).toContain("Bob:yes");
    }
  });

  // ── 11. Triple detector: chooses matching tile when value exists ──
  it("Triple detector: chooses matching tile when value exists", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a1", gameValue: 5 }),
        makeTile({ id: "a2", gameValue: 6 }),
      ],
    });
    const target = makePlayer({
      id: "target",
      name: "Target",
      hand: [
        makeTile({ id: "t0", gameValue: 3 }),
        makeTile({ id: "t1", gameValue: 5 }),
        makeTile({ id: "t2", gameValue: 8 }),
      ],
    });
    const state = stateWith(
      [actor, target],
      unlockedEquipment("triple_detector", "Triple Detector 3000", 3),
    );

    const action = executeUseEquipment(state, "actor", "triple_detector", {
      kind: "triple_detector",
      targetPlayerId: "target",
      targetTileIndices: [0, 1, 2],
      guessValue: 5,
    });

    expect(action.type).toBe("dualCutResult");
    if (action.type === "dualCutResult") {
      // Should pick index 1 (the match)
      expect(action.targetTileIndex).toBe(1);
      expect(action.success).toBe(true);
    }
  });

  // ── 12. Triple detector: safe-fail picks non-red when no match ──
  it("Triple detector: safe-fail picks non-red when no match", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a1", gameValue: 5 }),
        makeTile({ id: "a2", gameValue: 6 }),
      ],
    });
    const target = makePlayer({
      id: "target",
      name: "Target",
      hand: [
        makeTile({ id: "t0", gameValue: 3 }),
        makeRedTile({ id: "t1" }),
        makeTile({ id: "t2", gameValue: 8 }),
      ],
    });
    const state = stateWith(
      [actor, target],
      unlockedEquipment("triple_detector", "Triple Detector 3000", 3),
    );

    const action = executeUseEquipment(state, "actor", "triple_detector", {
      kind: "triple_detector",
      targetPlayerId: "target",
      targetTileIndices: [0, 1, 2],
      guessValue: 5,
    });

    expect(action.type).toBe("dualCutResult");
    if (action.type === "dualCutResult") {
      // Should pick a non-red index (0 or 2), not index 1 (red)
      expect([0, 2]).toContain(action.targetTileIndex);
      // It will be a wrong guess (no tile has value 5), so success is false
      expect(action.success).toBe(false);
    }
  });

  // ── 13. Triple detector: fallback to first index when all red ──
  it("Triple detector: fallback to first index when all red", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a1", gameValue: 5 }),
        makeTile({ id: "a2", gameValue: 6 }),
      ],
    });
    const target = makePlayer({
      id: "target",
      name: "Target",
      hand: [
        makeRedTile({ id: "t0" }),
        makeRedTile({ id: "t1" }),
        makeRedTile({ id: "t2" }),
      ],
    });
    const state = stateWith(
      [actor, target],
      unlockedEquipment("triple_detector", "Triple Detector 3000", 3),
    );

    const action = executeUseEquipment(state, "actor", "triple_detector", {
      kind: "triple_detector",
      targetPlayerId: "target",
      targetTileIndices: [0, 1, 2],
      guessValue: 5,
    });

    expect(action.type).toBe("dualCutResult");
    if (action.type === "dualCutResult") {
      // Falls back to first index (0) since all are red
      expect(action.targetTileIndex).toBe(0);
      // This will cause an explosion since it's red
      expect(action.explosion).toBe(true);
    }
  });

  // ── 14. Super detector: scans entire stand, picks matching tile ──
  it("Super detector: scans entire stand, picks matching tile", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a1", gameValue: 6 }),
        makeTile({ id: "a2", gameValue: 7 }),
      ],
    });
    const target = makePlayer({
      id: "target",
      name: "Target",
      hand: [
        makeTile({ id: "t0", gameValue: 6 }),
        makeTile({ id: "t1", gameValue: 2 }),
        makeTile({ id: "t2", gameValue: 8 }),
      ],
    });
    const state = stateWith(
      [actor, target],
      unlockedEquipment("super_detector", "Super Detector", 5),
    );

    const action = executeUseEquipment(state, "actor", "super_detector", {
      kind: "super_detector",
      targetPlayerId: "target",
      guessValue: 6,
    });

    expect(action.type).toBe("dualCutResult");
    if (action.type === "dualCutResult") {
      expect(action.targetTileIndex).toBe(0);
      expect(action.success).toBe(true);
    }
  });

  // ── 15. Super detector: safe-fail picks non-red ────────────
  it("Super detector: safe-fail picks non-red", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a1", gameValue: 5 }),
        makeTile({ id: "a2", gameValue: 6 }),
      ],
    });
    const target = makePlayer({
      id: "target",
      name: "Target",
      hand: [
        makeRedTile({ id: "t0" }),
        makeTile({ id: "t1", gameValue: 2 }),
        makeTile({ id: "t2", gameValue: 8 }),
      ],
    });
    const state = stateWith(
      [actor, target],
      unlockedEquipment("super_detector", "Super Detector", 5),
    );

    const action = executeUseEquipment(state, "actor", "super_detector", {
      kind: "super_detector",
      targetPlayerId: "target",
      guessValue: 5,
    });

    expect(action.type).toBe("dualCutResult");
    if (action.type === "dualCutResult") {
      // Should pick a non-red index (1 or 2), not index 0 (red)
      expect([1, 2]).toContain(action.targetTileIndex);
    }
  });

  // ── 16. X or Y Ray: resolves to first value on match ───────
  it("X or Y Ray: resolves to first value on match", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a1", gameValue: 5 }),
        makeTile({ id: "a2", gameValue: 7 }),
      ],
    });
    const target = makePlayer({
      id: "target",
      name: "Target",
      hand: [makeTile({ id: "t0", gameValue: 5 })],
    });
    const state = stateWith(
      [actor, target],
      unlockedEquipment("x_or_y_ray", "X or Y Ray", 10),
    );

    const action = executeUseEquipment(state, "actor", "x_or_y_ray", {
      kind: "x_or_y_ray",
      targetPlayerId: "target",
      targetTileIndex: 0,
      guessValueA: 5,
      guessValueB: 7,
    });

    expect(action.type).toBe("dualCutResult");
    if (action.type === "dualCutResult") {
      expect(action.guessValue).toBe(5);
      expect(action.success).toBe(true);
    }
  });

  // ── 17. X or Y Ray: resolves to second value on match ──────
  it("X or Y Ray: resolves to second value on match", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a1", gameValue: 5 }),
        makeYellowTile({ id: "a2" }),
      ],
    });
    const target = makePlayer({
      id: "target",
      name: "Target",
      hand: [makeYellowTile({ id: "t0" })],
    });
    const state = stateWith(
      [actor, target],
      unlockedEquipment("x_or_y_ray", "X or Y Ray", 10),
    );

    const action = executeUseEquipment(state, "actor", "x_or_y_ray", {
      kind: "x_or_y_ray",
      targetPlayerId: "target",
      targetTileIndex: 0,
      guessValueA: 5,
      guessValueB: "YELLOW",
    });

    expect(action.type).toBe("dualCutResult");
    if (action.type === "dualCutResult") {
      expect(action.guessValue).toBe("YELLOW");
      expect(action.success).toBe(true);
    }
  });

  // ── 18. X or Y Ray: defaults to first value when neither matches ──
  it("X or Y Ray: defaults to first value when neither matches", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a1", gameValue: 5 }),
        makeTile({ id: "a2", gameValue: 7 }),
      ],
    });
    const target = makePlayer({
      id: "target",
      name: "Target",
      hand: [makeTile({ id: "t0", gameValue: 3 })],
    });
    const state = stateWith(
      [actor, target],
      unlockedEquipment("x_or_y_ray", "X or Y Ray", 10),
    );

    const action = executeUseEquipment(state, "actor", "x_or_y_ray", {
      kind: "x_or_y_ray",
      targetPlayerId: "target",
      targetTileIndex: 0,
      guessValueA: 5,
      guessValueB: 7,
    });

    expect(action.type).toBe("dualCutResult");
    if (action.type === "dualCutResult") {
      // Defaults to guessValueA when neither matches
      expect(action.guessValue).toBe(5);
      expect(action.success).toBe(false);
    }
  });

  // ── 19. Equipment used flag prevents second use ────────────
  it("Equipment used flag prevents second use", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [makeTile({ id: "a1", gameValue: 5 })],
    });
    const state = makeGameState({
      players: [actor],
      board: {
        ...makeGameState().board,
        detonatorPosition: 3,
        detonatorMax: 10,
        equipment: [unlockedEquipment("rewinder", "Rewinder", 6)],
      },
    });

    // Use it once
    executeUseEquipment(state, "actor", "rewinder", { kind: "rewinder" });
    expect(state.board.equipment[0].used).toBe(true);

    // Try to validate second use
    const error = validateUseEquipment(state, "actor", "rewinder", {
      kind: "rewinder",
    });
    expect(error).not.toBeNull();
    expect(error?.code).toBe("EQUIPMENT_ALREADY_USED");
  });

  // ── 20. Post-it places info token at correct position ──────
  it("Post-it places info token at correct position", () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a0", gameValue: 3 }),
        makeTile({ id: "a1", gameValue: 7 }),
        makeTile({ id: "a2", gameValue: 9 }),
      ],
      infoTokens: [],
    });
    const state = stateWith(
      [actor],
      unlockedEquipment("post_it", "Post-it", 4),
    );

    executeUseEquipment(state, "actor", "post_it", {
      kind: "post_it",
      tileIndex: 2,
    });

    expect(state.players[0].infoTokens).toHaveLength(1);
    expect(state.players[0].infoTokens[0]).toEqual({
      value: 9,
      position: 2,
      isYellow: false,
    });
  });

  // ── 21. Label eq places "=" info token between tiles ───────
  it('Label eq places "=" info token between tiles', () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a0", gameValue: 4 }),
        makeTile({ id: "a1", gameValue: 4 }),
      ],
      infoTokens: [],
    });
    const state = stateWith(
      [actor],
      unlockedEquipment("label_eq", "Label =", 12),
    );

    executeUseEquipment(state, "actor", "label_eq", {
      kind: "label_eq",
      tileIndexA: 0,
      tileIndexB: 1,
    });

    expect(state.players[0].infoTokens).toHaveLength(1);
    expect(state.players[0].infoTokens[0]).toEqual({
      value: 0,
      position: 0,
      positionB: 1,
      isYellow: false,
      relation: "eq",
    });
  });

  // ── 22. Label neq places "≠" info token between tiles ─────
  it('Label neq places "≠" info token between tiles', () => {
    const actor = makePlayer({
      id: "actor",
      hand: [
        makeTile({ id: "a0", gameValue: 4 }),
        makeTile({ id: "a1", gameValue: 7 }),
      ],
      infoTokens: [],
    });
    const state = stateWith(
      [actor],
      unlockedEquipment("label_neq", "Label !=", 1),
    );

    executeUseEquipment(state, "actor", "label_neq", {
      kind: "label_neq",
      tileIndexA: 0,
      tileIndexB: 1,
    });

    expect(state.players[0].infoTokens).toHaveLength(1);
    expect(state.players[0].infoTokens[0]).toEqual({
      value: 0,
      position: 0,
      positionB: 1,
      isYellow: false,
      relation: "neq",
    });
  });
});
