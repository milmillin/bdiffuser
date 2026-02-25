import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ClientGameState, GameState } from "@bomb-busters/shared";
import { logText } from "@bomb-busters/shared";
import {
  makeGameState,
  makePlayer,
  makeTile,
  makeYellowTile,
} from "@bomb-busters/shared/testing";
import { DetectorTileChoicePanel } from "./DetectorTileChoicePanel.js";

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

function renderPanel(
  gameState: ClientGameState,
  playerId: string,
  selectedIndex: number | null,
): string {
  return renderToStaticMarkup(
    <DetectorTileChoicePanel
      gameState={gameState}
      send={vi.fn()}
      playerId={playerId}
      selectedIndex={selectedIndex}
    />,
  );
}

function getConfirmButtonTag(html: string): string {
  return html.match(/<button[^>]*data-testid="detector-tile-choice-confirm"[^>]*>/)?.[0] ?? "";
}

describe("DetectorTileChoicePanel stand-selection flow", () => {
  it("double-detector no-match requires stand selection before confirm when two options exist", () => {
    const state = makeGameState({
      phase: "playing",
      players: [
        makePlayer({
          id: "target",
          name: "Target",
          hand: [
            makeTile({ id: "t0", color: "blue", gameValue: 1, sortValue: 1 }),
            makeYellowTile({ id: "t1", sortValue: 2.1 }),
          ],
        }),
        makePlayer({
          id: "actor",
          name: "Actor",
          hand: [makeTile({ id: "a0", color: "blue", gameValue: 5, sortValue: 5 })],
        }),
      ],
      currentPlayerIndex: 1,
      pendingForcedAction: {
        kind: "detectorTileChoice",
        actorId: "actor",
        targetPlayerId: "target",
        matchingTileIndices: [],
        guessValue: 5,
        source: "doubleDetector",
        originalTileIndex1: 0,
        originalTileIndex2: 1,
      },
    });

    const html = renderPanel(toClientGameState(state, "target"), "target", null);
    const confirmButton = getConfirmButtonTag(html);

    expect(html).toContain("stand below");
    expect(confirmButton).toMatch(/\sdisabled(?:=|>| )/);
  });

  it("double-detector no-match enables confirm after stand selection", () => {
    const state = makeGameState({
      phase: "playing",
      players: [
        makePlayer({
          id: "target",
          name: "Target",
          hand: [
            makeTile({ id: "t0", color: "blue", gameValue: 1, sortValue: 1 }),
            makeYellowTile({ id: "t1", sortValue: 2.1 }),
          ],
        }),
        makePlayer({
          id: "actor",
          name: "Actor",
          hand: [makeTile({ id: "a0", color: "blue", gameValue: 5, sortValue: 5 })],
        }),
      ],
      currentPlayerIndex: 1,
      pendingForcedAction: {
        kind: "detectorTileChoice",
        actorId: "actor",
        targetPlayerId: "target",
        matchingTileIndices: [],
        guessValue: 5,
        source: "doubleDetector",
        originalTileIndex1: 0,
        originalTileIndex2: 1,
      },
    });

    const html = renderPanel(toClientGameState(state, "target"), "target", 1);
    const confirmButton = getConfirmButtonTag(html);

    expect(confirmButton).not.toMatch(/\sdisabled(?:=|>| )/);
  });

  it("mission 11 excludes hidden red-like wire from double-detector no-match selectable options", () => {
    const state = makeGameState({
      mission: 11,
      phase: "playing",
      players: [
        makePlayer({
          id: "target",
          name: "Target",
          hand: [
            makeTile({ id: "t0", color: "blue", gameValue: 7, sortValue: 1 }),
            makeTile({ id: "t1", color: "blue", gameValue: 3, sortValue: 2 }),
          ],
        }),
        makePlayer({
          id: "actor",
          name: "Actor",
          hand: [makeTile({ id: "a0", color: "blue", gameValue: 5, sortValue: 5 })],
        }),
      ],
      currentPlayerIndex: 1,
      log: [
        {
          turn: 0,
          playerId: "system",
          action: "hookSetup",
          detail: logText("blue_as_red:7"),
          timestamp: 1000,
        },
      ],
      pendingForcedAction: {
        kind: "detectorTileChoice",
        actorId: "actor",
        targetPlayerId: "target",
        matchingTileIndices: [],
        guessValue: 5,
        source: "doubleDetector",
        originalTileIndex1: 0,
        originalTileIndex2: 1,
      },
    });

    const html = renderPanel(toClientGameState(state, "target"), "target", null);
    const confirmButton = getConfirmButtonTag(html);

    expect(html).toContain("Info token target: wire B.");
    expect(confirmButton).not.toMatch(/\sdisabled(?:=|>| )/);
  });

  it("multi-match flow uses stand selection (no per-wire choice buttons)", () => {
    const state = makeGameState({
      phase: "playing",
      players: [
        makePlayer({
          id: "target",
          name: "Target",
          hand: [
            makeTile({ id: "t0", color: "blue", gameValue: 5, sortValue: 5 }),
            makeTile({ id: "t1", color: "blue", gameValue: 5, sortValue: 5 }),
          ],
        }),
        makePlayer({
          id: "actor",
          name: "Actor",
          hand: [makeTile({ id: "a0", color: "blue", gameValue: 5, sortValue: 5 })],
        }),
      ],
      currentPlayerIndex: 1,
      pendingForcedAction: {
        kind: "detectorTileChoice",
        actorId: "actor",
        targetPlayerId: "target",
        matchingTileIndices: [0, 1],
        guessValue: 5,
        source: "tripleDetector",
        originalTargetTileIndices: [0, 1, 2],
      },
    });

    const html = renderPanel(toClientGameState(state, "target"), "target", null);
    const confirmButton = getConfirmButtonTag(html);

    expect(html).toContain("Click one of your matching wires on your stand below.");
    expect(html).not.toContain("detector-choice-tile-0");
    expect(confirmButton).toMatch(/\sdisabled(?:=|>| )/);
  });
});
