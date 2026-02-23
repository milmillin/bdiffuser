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
});
