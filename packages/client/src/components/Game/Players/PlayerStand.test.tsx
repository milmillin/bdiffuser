import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ClientPlayer } from "@bomb-busters/shared";
import { makePlayer, makeTile } from "@bomb-busters/shared/testing";
import { PlayerStand } from "./PlayerStand.js";

describe("PlayerStand", () => {
  it("renders parity tokens with even/odd images", () => {
    const player = makePlayer({
      id: "p1",
      name: "Alpha",
      hand: [makeTile({ id: "t1", color: "blue", gameValue: 3, sortValue: 3 })],
      infoTokens: [{ value: 0, parity: "odd", position: 0, isYellow: false }],
    }) as ClientPlayer;
    player.remainingTiles = 1;

    const html = renderToStaticMarkup(
      <PlayerStand
        player={player}
        isOpponent={false}
        isCurrentTurn={false}
        turnOrder={1}
      />,
    );

    expect(html).toContain("/images/info_odd.png");
  });

  it("renders mission-24 count tokens with x1/x2/x3 images", () => {
    const player = makePlayer({
      id: "p1",
      name: "Alpha",
      hand: [makeTile({ id: "t1", color: "blue", gameValue: 3, sortValue: 3 })],
      infoTokens: [{ value: 0, countHint: 3, position: 0, isYellow: false }],
    }) as ClientPlayer;
    player.remainingTiles = 1;

    const html = renderToStaticMarkup(
      <PlayerStand
        player={player}
        isOpponent={false}
        isCurrentTurn={false}
        turnOrder={1}
      />,
    );

    expect(html).toContain("/images/info_x3.png");
  });

  it("renders all info tokens present on a wire", () => {
    const player = makePlayer({
      id: "p1",
      name: "Alpha",
      hand: [makeTile({ id: "t1", color: "blue", gameValue: 5, sortValue: 5 })],
      infoTokens: [
        { value: 5, position: 0, isYellow: false },
        { value: 5, position: 0, isYellow: false },
      ],
    }) as ClientPlayer;
    player.remainingTiles = 1;

    const html = renderToStaticMarkup(
      <PlayerStand
        player={player}
        isOpponent={false}
        isCurrentTurn={false}
        turnOrder={1}
      />,
    );

    const matches = html.match(/alt="Info: 5"/g) ?? [];
    expect(matches).toHaveLength(2);
  });

  it("keeps stand segments aligned when only one stand has info tokens", () => {
    const player = makePlayer({
      id: "p1",
      name: "Alpha",
      hand: [
        makeTile({ id: "t1", color: "blue", gameValue: 5, sortValue: 5 }),
        makeTile({ id: "t2", color: "blue", gameValue: 8, sortValue: 8 }),
      ],
      standSizes: [1, 1],
      infoTokens: [{ value: 5, position: 0, isYellow: false }],
    }) as ClientPlayer;
    player.remainingTiles = 2;

    const html = renderToStaticMarkup(
      <PlayerStand
        player={player}
        isOpponent={false}
        isCurrentTurn={false}
        turnOrder={1}
      />,
    );

    const rowHeightStyles = html.match(/height:\d+px/g) ?? [];
    expect(rowHeightStyles.length).toBeGreaterThanOrEqual(2);
    expect(new Set(rowHeightStyles).size).toBe(1);
  });
});
