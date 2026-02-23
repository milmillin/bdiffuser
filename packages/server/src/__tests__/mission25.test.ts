import { describe, expect, it } from "vitest";
import { makeGameState } from "@bomb-busters/shared/testing";
import {
  applyMission25ChatPenalty,
  containsSpokenWireNumber,
} from "../mission25";

describe("mission25 no-spoken-numbers", () => {
  describe("containsSpokenWireNumber", () => {
    it.each([
      "I cut 1",
      "value 7 maybe",
      "Try 12 now",
      "  9  ",
    ])("matches spoken wire number in: %s", (text) => {
      expect(containsSpokenWireNumber(text)).toBe(true);
    });

    it.each([
      "",
      "thirteen",
      "value 13",
      "p2 should play",
      "room42",
      "0",
    ])("does not match non-wire-number text: %s", (text) => {
      expect(containsSpokenWireNumber(text)).toBe(false);
    });
  });

  describe("applyMission25ChatPenalty", () => {
    it("does nothing outside mission 25", () => {
      const state = makeGameState({ mission: 24, phase: "playing" });
      const before = state.board.detonatorPosition;

      const applied = applyMission25ChatPenalty(state, "I have 7");

      expect(applied).toBe(false);
      expect(state.board.detonatorPosition).toBe(before);
      expect(state.result).toBeNull();
      expect(state.phase).toBe("playing");
    });

    it("does nothing when game is not in playing phase", () => {
      const state = makeGameState({ mission: 25, phase: "setup_info_tokens" });
      const before = state.board.detonatorPosition;

      const applied = applyMission25ChatPenalty(state, "I have 7");

      expect(applied).toBe(false);
      expect(state.board.detonatorPosition).toBe(before);
      expect(state.result).toBeNull();
      expect(state.phase).toBe("setup_info_tokens");
    });

    it("advances detonator by one when chat contains wire numbers in mission 25", () => {
      const state = makeGameState({ mission: 25, phase: "playing" });
      const before = state.board.detonatorPosition;

      const applied = applyMission25ChatPenalty(state, "I think this is 7");

      expect(applied).toBe(true);
      expect(state.board.detonatorPosition).toBe(before + 1);
      expect(state.result).toBeNull();
      expect(state.phase).toBe("playing");
    });

    it("finishes game with loss_detonator when penalty reaches max", () => {
      const state = makeGameState({
        mission: 25,
        phase: "playing",
        board: {
          ...makeGameState().board,
          detonatorPosition: 2,
          detonatorMax: 3,
        },
      });

      const applied = applyMission25ChatPenalty(state, "value 8");

      expect(applied).toBe(true);
      expect(state.board.detonatorPosition).toBe(3);
      expect(state.result).toBe("loss_detonator");
      expect(state.phase).toBe("finished");
    });
  });
});

