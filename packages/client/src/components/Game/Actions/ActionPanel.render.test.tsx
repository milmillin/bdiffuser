import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ClientGameState } from "@bomb-busters/shared";
import {
  makeCampaignState,
  makeGameState,
  makeNumberCard,
  makeNumberCardState,
  makePlayer,
  makeSpecialMarker,
  makeTile,
} from "@bomb-busters/shared/testing";
import { ActionPanel } from "./ActionPanel.js";

function renderPanel(
  gameState: ClientGameState,
  {
    playerId = "actor",
    selectedTarget = null,
    selectedGuessTile = null,
    dualCutActive = false,
    onToggleDualCut = vi.fn(),
    currentPlayerName = "Actor",
    isCurrentPlayerBot = false,
    character = null,
    characterUsed = false,
    onUseCharacterAbility = undefined,
  }: {
    playerId?: string;
    selectedTarget?: { playerId: string; tileIndex: number } | null;
    selectedGuessTile?: number | null;
    dualCutActive?: boolean;
    onToggleDualCut?: () => void;
    currentPlayerName?: string;
    isCurrentPlayerBot?: boolean;
    character?: import("@bomb-busters/shared").CharacterId | null;
    characterUsed?: boolean;
    onUseCharacterAbility?: (() => void) | undefined;
  } = {},
): string {
  return renderToStaticMarkup(
    <ActionPanel
      gameState={gameState}
      send={vi.fn()}
      playerId={playerId}
      isMyTurn={true}
      selectedTarget={selectedTarget}
      selectedGuessTile={selectedGuessTile}
      dualCutActive={dualCutActive}
      onToggleDualCut={onToggleDualCut}
      onClearTarget={vi.fn()}
      onCutConfirmed={vi.fn()}
      onEnterEquipmentMode={vi.fn()}
      currentPlayerName={currentPlayerName}
      isCurrentPlayerBot={isCurrentPlayerBot}
      character={character}
      characterUsed={characterUsed}
      onUseCharacterAbility={onUseCharacterAbility}
    />,
  );
}

describe("ActionPanel mission render behavior", () => {
  it("mission 9: shows action gate panel and blocks invalid dual/solo submits", () => {
    const state = makeGameState({
      mission: 9,
      players: [
        makePlayer({
          id: "actor",
          hand: [
            makeTile({ id: "a1", color: "blue", gameValue: 5 }),
            makeTile({ id: "a2", color: "blue", gameValue: 5 }),
            makeTile({ id: "a3", color: "yellow", gameValue: "YELLOW" }),
            makeTile({ id: "a4", color: "yellow", gameValue: "YELLOW" }),
          ],
        }),
        makePlayer({
          id: "target",
          hand: [makeTile({ id: "t1", color: "blue", gameValue: 2 })],
        }),
        makePlayer({ id: "p3", hand: [makeTile({ id: "p3a", color: "blue", gameValue: 1 })] }),
      ],
      currentPlayerIndex: 0,
      campaign: makeCampaignState({
        numberCards: makeNumberCardState({
          visible: [
            makeNumberCard({ id: "c1", value: 2, faceUp: true }),
            makeNumberCard({ id: "c2", value: 5, faceUp: true }),
            makeNumberCard({ id: "c3", value: 8, faceUp: true }),
          ],
        }),
        specialMarkers: [makeSpecialMarker({ kind: "sequence_pointer", value: 0 })],
      }),
    }) as unknown as ClientGameState;
    state.board.validationTrack[5] = 2;

    const html = renderPanel(state, {
      dualCutActive: true,
      selectedTarget: { playerId: "target", tileIndex: 0 },
      selectedGuessTile: 0,
    });

    expect(html).toContain("data-testid=\"mission9-action-reminder\"");
    expect(html).toContain("Cut blocked (need 2)");
    expect(html).toContain("Yellow cuts are not restricted by sequence priority.");
    expect(html).toMatch(/(data-testid="dual-cut-submit"[^>]*disabled)|(disabled=""[^>]*data-testid="dual-cut-submit")/);
    expect(html).toMatch(/(data-testid="solo-cut-5"[^>]*disabled)|(disabled=""[^>]*data-testid="solo-cut-5")/);
  });

  it("mission 11: shows blocked reveal hint when reveal is not legal", () => {
    const state = makeGameState({
      mission: 11,
      players: [
        makePlayer({
          id: "actor",
          hand: [makeTile({ id: "a1", color: "blue", gameValue: 7 })],
        }),
        makePlayer({ id: "teammate" }),
      ],
      currentPlayerIndex: 0,
    }) as unknown as ClientGameState;

    const html = renderPanel(state);
    expect(html).toContain("data-testid=\"mission11-reveal-hint\"");
    expect(html).not.toContain("data-testid=\"reveal-reds\"");
  });
});
