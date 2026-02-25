import { describe, expect, it } from "vitest";
import { makeInfoToken, makePlayer } from "@bomb-busters/shared/testing";
import { pushInfoToken } from "../infoTokenRules";

describe("pushInfoToken value-class dedup", () => {
  it("numeric token replaces existing numeric token at the same position", () => {
    const player = makePlayer({
      id: "p1",
      infoTokens: [makeInfoToken({ value: 3, position: 0, isYellow: false })],
    });

    pushInfoToken(player, makeInfoToken({ value: 7, position: 0, isYellow: false }));

    expect(player.infoTokens).toHaveLength(1);
    expect(player.infoTokens[0].value).toBe(7);
  });

  it("parity token replaces existing parity token at the same position", () => {
    const player = makePlayer({
      id: "p1",
      infoTokens: [makeInfoToken({ value: 0, parity: "even", position: 2, isYellow: false })],
    });

    pushInfoToken(player, makeInfoToken({ value: 0, parity: "odd", position: 2, isYellow: false }));

    expect(player.infoTokens).toHaveLength(1);
    expect(player.infoTokens[0].parity).toBe("odd");
  });

  it("cross-variant: parity token replaces numeric token at the same position", () => {
    const player = makePlayer({
      id: "p1",
      infoTokens: [makeInfoToken({ value: 5, position: 1, isYellow: false })],
    });

    pushInfoToken(player, makeInfoToken({ value: 0, parity: "even", position: 1, isYellow: false }));

    expect(player.infoTokens).toHaveLength(1);
    expect(player.infoTokens[0].parity).toBe("even");
  });

  it("structural tokens (relation, singleWire) are preserved when value-class token replaces", () => {
    const player = makePlayer({
      id: "p1",
      infoTokens: [
        makeInfoToken({ value: 3, position: 0, isYellow: false }),
        makeInfoToken({ value: 0, position: 0, isYellow: false, relation: "eq", positionB: 1 }),
        makeInfoToken({ value: 5, position: 0, isYellow: false, singleWire: true }),
      ],
    });

    pushInfoToken(player, makeInfoToken({ value: 9, position: 0, isYellow: false }));

    // The numeric token (value 3) should be replaced, but structural tokens remain
    expect(player.infoTokens).toHaveLength(3);
    expect(player.infoTokens.find((t) => t.relation === "eq")).toBeTruthy();
    expect(player.infoTokens.find((t) => t.singleWire === true)).toBeTruthy();
    expect(player.infoTokens.find((t) => t.value === 9 && !t.relation && !t.singleWire)).toBeTruthy();
  });

  it("stand placement (position -1) does NOT trigger dedup", () => {
    const player = makePlayer({
      id: "p1",
      infoTokens: [makeInfoToken({ value: 3, position: -1, isYellow: false })],
    });

    pushInfoToken(player, makeInfoToken({ value: 7, position: -1, isYellow: false }));

    expect(player.infoTokens).toHaveLength(2);
  });

  it("tokens at different positions are not affected", () => {
    const player = makePlayer({
      id: "p1",
      infoTokens: [makeInfoToken({ value: 3, position: 0, isYellow: false })],
    });

    pushInfoToken(player, makeInfoToken({ value: 7, position: 1, isYellow: false }));

    expect(player.infoTokens).toHaveLength(2);
  });

  it("count token still replaces existing count token (regression)", () => {
    const player = makePlayer({
      id: "p1",
      infoTokens: [makeInfoToken({ value: 0, countHint: 1, position: 0, isYellow: false })],
    });

    pushInfoToken(player, makeInfoToken({ value: 0, countHint: 2, position: 0, isYellow: false }));

    expect(player.infoTokens).toHaveLength(1);
    expect(player.infoTokens[0].countHint).toBe(2);
  });
});
