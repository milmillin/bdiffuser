import { describe, expect, it, vi } from "vitest";
import {
  makeBoardState,
  makeEquipmentCard,
  makeGameState,
  makePlayer,
  makeTile,
} from "@bomb-busters/shared/testing";
import { executeUseEquipment, validateUseEquipment } from "../equipment";

function unlockedCard(id: string, unlockValue = 1) {
  return makeEquipmentCard({
    id,
    name: id,
    unlockValue,
    unlocked: true,
    used: false,
  });
}

describe("campaign equipment", () => {
  describe("false_bottom", () => {
    it("validates when reserve has cards", () => {
      const state = makeGameState({
        players: [makePlayer()],
        board: makeBoardState({ equipment: [unlockedCard("false_bottom")] }),
        campaign: {
          equipmentReserve: [
            makeEquipmentCard({ id: "extra1" }),
            makeEquipmentCard({ id: "extra2" }),
          ],
        },
      });

      const error = validateUseEquipment(state, "player-1", "false_bottom", {
        kind: "false_bottom",
      });

      expect(error).toBeNull();
    });

    it("rejects when reserve is empty", () => {
      const state = makeGameState({
        players: [makePlayer()],
        board: makeBoardState({ equipment: [unlockedCard("false_bottom")] }),
        campaign: { equipmentReserve: [] },
      });

      const error = validateUseEquipment(state, "player-1", "false_bottom", {
        kind: "false_bottom",
      });

      expect(error).not.toBeNull();
      expect(error?.code).toBe("EQUIPMENT_RULE_VIOLATION");
    });

    it("executes and adds cards from reserve to board", () => {
      const state = makeGameState({
        players: [makePlayer()],
        board: makeBoardState({ equipment: [unlockedCard("false_bottom")] }),
        campaign: {
          equipmentReserve: [
            makeEquipmentCard({ id: "extra1", name: "Extra 1" }),
            makeEquipmentCard({ id: "extra2", name: "Extra 2" }),
          ],
        },
      });

      const action = executeUseEquipment(state, "player-1", "false_bottom", {
        kind: "false_bottom",
      });

      expect(action.type).toBe("equipmentUsed");
      expect(state.board.equipment.map((eq) => eq.id)).toEqual([
        "false_bottom",
        "extra1",
        "extra2",
      ]);
      expect(state.campaign?.equipmentReserve).toHaveLength(0);
    });
  });

  describe("single_wire_label", () => {
    it("validates when tile value appears exactly once", () => {
      const state = makeGameState({
        players: [
          makePlayer({
            hand: [
              makeTile({ gameValue: 7 }),
              makeTile({ id: "t2", gameValue: 3 }),
            ],
          }),
        ],
        board: makeBoardState({ equipment: [unlockedCard("single_wire_label")] }),
      });

      const error = validateUseEquipment(state, "player-1", "single_wire_label", {
        kind: "single_wire_label",
        tileIndex: 0,
      });

      expect(error).toBeNull();
    });

    it("rejects when value appears more than once", () => {
      const state = makeGameState({
        players: [
          makePlayer({
            hand: [
              makeTile({ gameValue: 3 }),
              makeTile({ id: "t2", gameValue: 3 }),
            ],
          }),
        ],
        board: makeBoardState({ equipment: [unlockedCard("single_wire_label")] }),
      });

      const error = validateUseEquipment(state, "player-1", "single_wire_label", {
        kind: "single_wire_label",
        tileIndex: 0,
      });

      expect(error).not.toBeNull();
      expect(error?.code).toBe("EQUIPMENT_RULE_VIOLATION");
    });

    it("executes and places a single-wire info token", () => {
      const state = makeGameState({
        players: [
          makePlayer({
            hand: [
              makeTile({ id: "t1", gameValue: 7 }),
              makeTile({ id: "t2", gameValue: 3 }),
            ],
            infoTokens: [],
          }),
        ],
        board: makeBoardState({ equipment: [unlockedCard("single_wire_label")] }),
      });

      const action = executeUseEquipment(
        state,
        "player-1",
        "single_wire_label",
        {
          kind: "single_wire_label",
          tileIndex: 0,
        },
      );

      expect(action.type).toBe("equipmentUsed");
      if (action.type !== "equipmentUsed") return;
      expect(action.effect).toBe("single_wire_label");
      expect(state.players[0].infoTokens).toEqual([
        { value: 7, position: 0, isYellow: false, singleWire: true },
      ]);
    });
  });

  describe("emergency_drop", () => {
    it("validates when other equipment cards are used", () => {
      const state = makeGameState({
        players: [makePlayer()],
        board: makeBoardState({
          equipment: [
            unlockedCard("emergency_drop"),
            makeEquipmentCard({ id: "other", used: true, unlocked: true }),
          ],
        }),
      });

      const error = validateUseEquipment(state, "player-1", "emergency_drop", {
        kind: "emergency_drop",
      });

      expect(error).toBeNull();
    });

    it("rejects when no other cards are used", () => {
      const state = makeGameState({
        players: [makePlayer()],
        board: makeBoardState({ equipment: [unlockedCard("emergency_drop")] }),
      });

      const error = validateUseEquipment(state, "player-1", "emergency_drop", {
        kind: "emergency_drop",
      });

      expect(error).not.toBeNull();
      expect(error?.code).toBe("EQUIPMENT_RULE_VIOLATION");
    });

    it("executes and restores used equipment", () => {
      const state = makeGameState({
        players: [makePlayer()],
        board: makeBoardState({
          equipment: [
            unlockedCard("emergency_drop"),
            makeEquipmentCard({
              id: "other",
              name: "Other",
              used: true,
              unlocked: true,
            }),
          ],
        }),
      });

      const action = executeUseEquipment(state, "player-1", "emergency_drop", {
        kind: "emergency_drop",
      });

      expect(action.type).toBe("equipmentUsed");
      if (action.type !== "equipmentUsed") return;
      expect(action.effect).toBe("emergency_drop");

      const emergencyDrop = state.board.equipment.find(
        (eq) => eq.id === "emergency_drop",
      );
      const other = state.board.equipment.find((eq) => eq.id === "other");
      expect(emergencyDrop?.used).toBe(true);
      expect(other?.used).toBe(false);
    });
  });

  describe("fast_pass", () => {
    it("validates with 2+ matching uncut wires", () => {
      const state = makeGameState({
        players: [
          makePlayer({
            hand: [
              makeTile({ gameValue: 5 }),
              makeTile({ id: "t2", gameValue: 5 }),
              makeTile({ id: "t3", gameValue: 3 }),
            ],
          }),
        ],
        board: makeBoardState({ equipment: [unlockedCard("fast_pass")] }),
      });

      const error = validateUseEquipment(state, "player-1", "fast_pass", {
        kind: "fast_pass",
        value: 5,
      });

      expect(error).toBeNull();
    });

    it("rejects with fewer than 2 matching wires", () => {
      const state = makeGameState({
        players: [makePlayer({ hand: [makeTile({ gameValue: 5 })] })],
        board: makeBoardState({ equipment: [unlockedCard("fast_pass")] }),
      });

      const error = validateUseEquipment(state, "player-1", "fast_pass", {
        kind: "fast_pass",
        value: 5,
      });

      expect(error).not.toBeNull();
      expect(error?.code).toBe("EQUIPMENT_RULE_VIOLATION");
    });

    it("executes and cuts exactly two matching wires", () => {
      const state = makeGameState({
        players: [
          makePlayer({
            id: "player-1",
            hand: [
              makeTile({ id: "a1", gameValue: 5, cut: false }),
              makeTile({ id: "a2", gameValue: 5, cut: false }),
              makeTile({ id: "a3", gameValue: 3, cut: false }),
            ],
          }),
          makePlayer({
            id: "p2",
            name: "Bob",
            hand: [makeTile({ id: "b1", gameValue: 9, cut: false })],
          }),
        ],
        board: makeBoardState({ equipment: [unlockedCard("fast_pass")] }),
        currentPlayerIndex: 0,
        turnNumber: 1,
      });

      const action = executeUseEquipment(state, "player-1", "fast_pass", {
        kind: "fast_pass",
        value: 5,
      });

      expect(action.type).toBe("equipmentUsed");
      if (action.type !== "equipmentUsed") return;
      expect(action.effect).toBe("fast_pass");
      expect(state.players[0].hand.map((tile) => tile.cut)).toEqual([
        true,
        true,
        false,
      ]);
      expect(state.board.validationTrack[5]).toBe(2);
      expect(state.turnNumber).toBe(2);
    });
  });

  describe("disintegrator", () => {
    it("validates (always valid when card is unlocked)", () => {
      const state = makeGameState({
        players: [makePlayer()],
        board: makeBoardState({ equipment: [unlockedCard("disintegrator")] }),
      });

      const error = validateUseEquipment(state, "player-1", "disintegrator", {
        kind: "disintegrator",
      });

      expect(error).toBeNull();
    });

    it("executes and cuts all uncut blue wires of the drawn value", () => {
      const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.4); // drawn value = 5
      try {
        const state = makeGameState({
          players: [
            makePlayer({
              id: "player-1",
              hand: [
                makeTile({ id: "a1", gameValue: 5, cut: false }),
                makeTile({ id: "a2", gameValue: 3, cut: false }),
              ],
            }),
            makePlayer({
              id: "p2",
              name: "Bob",
              hand: [
                makeTile({ id: "b1", gameValue: 5, cut: false }),
                makeTile({ id: "b2", gameValue: 5, cut: true }),
              ],
            }),
          ],
          board: makeBoardState({ equipment: [unlockedCard("disintegrator")] }),
        });

        const action = executeUseEquipment(state, "player-1", "disintegrator", {
          kind: "disintegrator",
        });

        expect(action.type).toBe("equipmentUsed");
        if (action.type !== "equipmentUsed") return;
        expect(action.effect).toBe("disintegrator");
        expect(action.detail).toContain("Drew 5");
        expect(state.players[0].hand[0].cut).toBe(true);
        expect(state.players[1].hand[0].cut).toBe(true);
        expect(state.board.validationTrack[5]).toBe(3);
      } finally {
        randomSpy.mockRestore();
      }
    });
  });

  describe("grappling_hook", () => {
    it("validates taking uncut wire from opponent", () => {
      const state = makeGameState({
        players: [
          makePlayer({ hand: [makeTile({ gameValue: 3 })] }),
          makePlayer({
            id: "p2",
            name: "Bob",
            hand: [makeTile({ id: "t2", gameValue: 7 })],
          }),
        ],
        board: makeBoardState({ equipment: [unlockedCard("grappling_hook")] }),
      });

      const error = validateUseEquipment(state, "player-1", "grappling_hook", {
        kind: "grappling_hook",
        targetPlayerId: "p2",
        targetTileIndex: 0,
      });

      expect(error).toBeNull();
    });

    it("rejects taking from self", () => {
      const state = makeGameState({
        players: [makePlayer({ hand: [makeTile()] })],
        board: makeBoardState({ equipment: [unlockedCard("grappling_hook")] }),
      });

      const error = validateUseEquipment(state, "player-1", "grappling_hook", {
        kind: "grappling_hook",
        targetPlayerId: "player-1",
        targetTileIndex: 0,
      });

      expect(error).not.toBeNull();
      expect(error?.code).toBe("CANNOT_TARGET_SELF");
    });

    it("rejects taking cut wire", () => {
      const state = makeGameState({
        players: [
          makePlayer(),
          makePlayer({
            id: "p2",
            name: "Bob",
            hand: [makeTile({ id: "t2", cut: true })],
          }),
        ],
        board: makeBoardState({ equipment: [unlockedCard("grappling_hook")] }),
      });

      const error = validateUseEquipment(state, "player-1", "grappling_hook", {
        kind: "grappling_hook",
        targetPlayerId: "p2",
        targetTileIndex: 0,
      });

      expect(error).not.toBeNull();
      expect(error?.code).toBe("TILE_ALREADY_CUT");
    });

    it("executes and moves wire to actor hand in sorted order", () => {
      const state = makeGameState({
        players: [
          makePlayer({
            hand: [
              makeTile({ sortValue: 3, gameValue: 3 }),
              makeTile({ id: "t2", sortValue: 8, gameValue: 8 }),
            ],
          }),
          makePlayer({
            id: "p2",
            name: "Bob",
            hand: [makeTile({ id: "t3", sortValue: 5, gameValue: 5 })],
          }),
        ],
        board: makeBoardState({ equipment: [unlockedCard("grappling_hook")] }),
      });

      const action = executeUseEquipment(state, "player-1", "grappling_hook", {
        kind: "grappling_hook",
        targetPlayerId: "p2",
        targetTileIndex: 0,
      });

      expect(action.type).toBe("equipmentUsed");
      if (action.type !== "equipmentUsed") return;
      expect(action.effect).toBe("grappling_hook");
      expect(state.players[0].hand.length).toBe(3);
      expect(state.players[1].hand.length).toBe(0);
      expect(state.players[0].hand[1].id).toBe("t3");
    });
  });
});
