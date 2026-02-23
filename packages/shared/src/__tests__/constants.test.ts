import { describe, it, expect } from "vitest";
import {
  BLUE_WIRE_VALUES,
  BLUE_COPIES_PER_VALUE,
  BLUE_WIRE_COUNT,
  RED_WIRE_COUNT,
  YELLOW_WIRE_COUNT,
  PLAYER_COUNT_CONFIG,
} from "../constants";

describe("constants", () => {
  it("BLUE_WIRE_COUNT equals values × copies", () => {
    expect(BLUE_WIRE_VALUES.length * BLUE_COPIES_PER_VALUE).toBe(BLUE_WIRE_COUNT);
  });

  it("RED_WIRE_COUNT is 11", () => {
    expect(RED_WIRE_COUNT).toBe(11);
  });

  it("YELLOW_WIRE_COUNT is 11", () => {
    expect(YELLOW_WIRE_COUNT).toBe(11);
  });

  it("PLAYER_COUNT_CONFIG covers 2-5 players", () => {
    expect(Object.keys(PLAYER_COUNT_CONFIG).sort()).toEqual(["2", "3", "4", "5"]);
  });
});
