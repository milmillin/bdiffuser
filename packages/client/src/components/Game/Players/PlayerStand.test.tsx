import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ClientPlayer } from "@bomb-busters/shared";
import { makePlayer, makeTile } from "@bomb-busters/shared/testing";
import { PlayerStand } from "./PlayerStand.js";

describe("PlayerStand", () => {
  it("renders character avatar using card aspect ratio", () => {
    const player = makePlayer({
      id: "p1",
      name: "Alpha",
      hand: [makeTile({ id: "t1", color: "blue", gameValue: 3, sortValue: 3 })],
      character: "double_detector",
      characterUsed: false,
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

    expect(html).toContain("aspect-[739/1040]");
    expect(html).toContain("/images/character_1.png");
  });

  it("renders character back avatar when skill is used", () => {
    const player = makePlayer({
      id: "p1",
      name: "Alpha",
      hand: [makeTile({ id: "t1", color: "blue", gameValue: 3, sortValue: 3 })],
      character: "double_detector",
      characterUsed: true,
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

    expect(html).toContain("/images/character_back.png");
  });

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

  it("renders mission-24 count token with x4 image", () => {
    const player = makePlayer({
      id: "p1",
      name: "Alpha",
      hand: [makeTile({ id: "t1", color: "blue", gameValue: 3, sortValue: 3 })],
      infoTokens: [{ value: 0, countHint: 4, position: 0, isYellow: false }],
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

    expect(html).toContain("/images/info_x4.png");
  });

  it("renders mission X marker image for X-marked wires", () => {
    const player = makePlayer({
      id: "p1",
      name: "Alpha",
      hand: [makeTile({ id: "t1", color: "blue", gameValue: 3, sortValue: 3, isXMarked: true })],
      infoTokens: [],
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

    expect(html).toContain("/images/info_x.png");
    expect(html).toContain("alt=\"Info: X\"");
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

  it("renders both X marker and info token on the same wire and reserves stacked height", () => {
    const player = makePlayer({
      id: "p1",
      name: "Alpha",
      hand: [
        makeTile({ id: "t1", color: "blue", gameValue: 5, sortValue: 5, isXMarked: true }),
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

    expect(html).toContain("/images/info_x.png");
    expect(html).toContain("/images/info_5.png");
    expect(html).toContain("height:102px");
  });

  it("renders off-stand info token text when position is -1", () => {
    const player = makePlayer({
      id: "p1",
      name: "Alpha",
      hand: [makeTile({ id: "t1", color: "blue", gameValue: 5, sortValue: 5 })],
      infoTokens: [{ value: 11, position: -1, isYellow: false }],
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

    expect(html).toContain("data-testid=\"off-stand-token-text-p1\"");
    expect(html).toContain("Off-stand: 11");
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

  it("keeps two stand segments non-shrinking to avoid overlap on resize", () => {
    const player = makePlayer({
      id: "p1",
      name: "Alpha",
      hand: [
        makeTile({ id: "t1", color: "blue", gameValue: 5, sortValue: 5 }),
        makeTile({ id: "t2", color: "blue", gameValue: 8, sortValue: 8 }),
      ],
      standSizes: [1, 1],
      infoTokens: [],
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

    expect(html).toContain("justify-center mx-auto w-max min-w-full");
    expect(html).toContain("data-testid=\"player-stand-segment-p1-0\" class=\"shrink-0");
    expect(html).toContain("data-testid=\"player-stand-segment-p1-1\" class=\"shrink-0 ml-2 pl-2 border-l border-gray-700/70");
  });
});
