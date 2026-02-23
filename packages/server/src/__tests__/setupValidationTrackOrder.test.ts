import { describe, expect, it } from "vitest";
import { makePlayer } from "@bomb-busters/shared/testing";
import { setupGame } from "../setup";

describe("validation track marker order", () => {
  it("orders markers by value with yellow before red for equal values", () => {
    const players = [
      makePlayer({ id: "p1", hand: [] }),
      makePlayer({ id: "p2", hand: [] }),
      makePlayer({ id: "p3", hand: [] }),
      makePlayer({ id: "p4", hand: [] }),
    ];

    const { board } = setupGame(players, 12);

    for (let i = 1; i < board.markers.length; i++) {
      const prev = board.markers[i - 1];
      const curr = board.markers[i];

      const inValueOrder = prev.value < curr.value;
      const sameValueYellowBeforeRed =
        prev.value === curr.value &&
        !(prev.color === "red" && curr.color === "yellow");
      const sameColorOrValue =
        prev.value === curr.value && prev.color === curr.color;

      expect(inValueOrder || sameValueYellowBeforeRed || sameColorOrValue).toBe(
        true,
      );
    }
  });
});
