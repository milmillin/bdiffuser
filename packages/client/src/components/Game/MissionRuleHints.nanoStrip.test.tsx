import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ClientGameState, GameState } from "@bomb-busters/shared";
import { makeGameState, makePlayer, makeTile } from "@bomb-busters/shared/testing";
import { MissionRuleHints } from "./MissionRuleHints.js";
import { TABLE_WIRE_HEIGHT_CSS, TABLE_WIRE_WIDTH_CSS } from "./wireTileSizing.js";

function toClientGameState(state: GameState, playerId: string): ClientGameState {
  return {
    ...state,
    playerId,
    players: state.players.map((player) => ({
      ...player,
      remainingTiles: player.hand.filter((tile) => !tile.cut).length,
    })),
  } as unknown as ClientGameState;
}

function renderMission(mission: 43 | 53 | 59, campaign: GameState["campaign"]): string {
  const state = makeGameState({
    mission,
    phase: "playing",
    currentPlayerIndex: 0,
    players: [
      makePlayer({
        id: "me",
        name: "Me",
        hand: [makeTile({ id: "m1", color: "blue", gameValue: 4, sortValue: 4 })],
      }),
      makePlayer({
        id: "p2",
        name: "P2",
        hand: [makeTile({ id: "p1", color: "blue", gameValue: 5, sortValue: 5 })],
      }),
    ],
    campaign,
  });

  return renderToStaticMarkup(
    <MissionRuleHints gameState={toClientGameState(state, "me")} />,
  );
}

function countOccurrences(input: string, needle: string): number {
  const matches = input.match(new RegExp(needle, "g"));
  return matches?.length ?? 0;
}

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function openingTagForTestId(html: string, testId: string): string {
  const pattern = new RegExp(`<[^>]*data-testid="${escapeForRegExp(testId)}"[^>]*>`);
  const match = html.match(pattern);
  expect(match).not.toBeNull();
  return match?.[0] ?? "";
}

function styleForTestId(html: string, testId: string): string {
  const tag = openingTagForTestId(html, testId);
  const styleMatch = tag.match(/style="([^"]+)"/);
  expect(styleMatch).not.toBeNull();
  return styleMatch?.[1] ?? "";
}

function expectGridColumns(style: string, slotCount: number): void {
  expect(style).toMatch(
    new RegExp(`grid-template-columns:repeat\\(${slotCount},\\s*minmax\\(0,\\s*1fr\\)\\)`),
  );
}

describe("MissionRuleHints nano number strips", () => {
  it("mission 43 renders a 12-position nano strip with robot marker and wire-back count", () => {
    const html = renderMission(43, {
      nanoTracker: { position: 3, max: 11 },
      mission43NanoWireCount: 4,
    });

    expect(html).toContain('data-testid="mission-43-nano-strip"');
    expect(html).toContain('data-testid="mission-43-nano-strip-slot-12"');
    expect(html).toContain('data-testid="mission-43-nano-strip-robot"');
    expect(html).toContain('data-testid="mission-43-nano-wire-backs"');
    expect(countOccurrences(html, 'data-testid="mission-43-nano-wire-back"')).toBe(4);
    expectGridColumns(styleForTestId(html, "mission-43-nano-strip"), 12);

    const wireBackStyle = styleForTestId(html, "mission-43-nano-wire-back");
    expect(wireBackStyle).toContain(`width:${TABLE_WIRE_WIDTH_CSS}`);
    expect(wireBackStyle).toContain(`height:${TABLE_WIRE_HEIGHT_CSS}`);
  });

  it("mission 53 renders the nano number strip", () => {
    const html = renderMission(53, {
      nanoTracker: { position: 2, max: 8 },
    });

    expect(html).toContain('data-testid="mission-53-nano-strip"');
    expect(html).toContain('data-testid="mission-53-nano-strip-slot-9"');
    expect(html).toContain('data-testid="mission-53-nano-strip-robot"');
    expectGridColumns(styleForTestId(html, "mission-53-nano-strip"), 9);
  });

  it("mission 59 renders the nano number strip", () => {
    const html = renderMission(59, {
      nanoTracker: { position: 5, max: 8 },
    });

    expect(html).toContain('data-testid="mission-59-nano-strip"');
    expect(html).toContain('data-testid="mission-59-nano-strip-slot-9"');
    expect(html).toContain('data-testid="mission-59-nano-strip-robot"');
    expectGridColumns(styleForTestId(html, "mission-59-nano-strip"), 9);
  });
});
