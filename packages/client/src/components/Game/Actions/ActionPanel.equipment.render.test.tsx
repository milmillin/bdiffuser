import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ClientGameState } from "@bomb-busters/shared";
import {
  makeEquipmentCard,
  makeGameState,
  makePlayer,
  makeTile,
} from "@bomb-busters/shared/testing";
import { ActionPanel } from "./ActionPanel.js";

function renderPanel(
  gameState: ClientGameState,
  overrides: {
    playerId?: string;
    isMyTurn?: boolean;
    selectedTarget?: { playerId: string; tileIndex: number } | null;
    selectedGuessTile?: number | null;
  } = {},
): string {
  return renderToStaticMarkup(
    <ActionPanel
      gameState={gameState}
      send={vi.fn()}
      playerId={overrides.playerId ?? "actor"}
      isMyTurn={overrides.isMyTurn ?? true}
      selectedTarget={overrides.selectedTarget ?? null}
      selectedGuessTile={overrides.selectedGuessTile ?? null}
      dualCutActive={false}
      onToggleDualCut={vi.fn()}
      onClearTarget={vi.fn()}
      onCutConfirmed={vi.fn()}
      onEnterEquipmentMode={vi.fn()}
      currentPlayerName="Actor"
      isCurrentPlayerBot={false}
      character={null}
      characterUsed={false}
      onUseCharacterAbility={undefined}
    />,
  );
}

describe("ActionPanel equipment button rendering", () => {
  it("renders 'Use X' button for unlocked, unused equipment", () => {
    const state = makeGameState({
      players: [
        makePlayer({
          id: "actor",
          hand: [makeTile({ id: "a1", color: "blue", gameValue: 5 })],
        }),
        makePlayer({ id: "other" }),
      ],
      currentPlayerIndex: 0,
      board: {
        detonatorPosition: 0,
        detonatorMax: 3,
        validationTrack: {},
        markers: [],
        equipment: [
          makeEquipmentCard({
            id: "rewinder",
            name: "Rewinder",
            unlockValue: 6,
            unlocked: true,
            used: false,
          }),
        ],
      },
    }) as unknown as ClientGameState;

    const html = renderPanel(state);
    expect(html).toContain("Use Rewinder");
  });

  it("does not render buttons for locked equipment", () => {
    const state = makeGameState({
      players: [
        makePlayer({
          id: "actor",
          hand: [makeTile({ id: "a1", color: "blue", gameValue: 5 })],
        }),
        makePlayer({ id: "other" }),
      ],
      currentPlayerIndex: 0,
      board: {
        detonatorPosition: 0,
        detonatorMax: 3,
        validationTrack: {},
        markers: [],
        equipment: [
          makeEquipmentCard({
            id: "rewinder",
            name: "Rewinder",
            unlockValue: 6,
            unlocked: false,
            used: false,
          }),
        ],
      },
    }) as unknown as ClientGameState;

    const html = renderPanel(state);
    expect(html).not.toContain("Use Rewinder");
  });

  it("does not render buttons for used equipment", () => {
    const state = makeGameState({
      players: [
        makePlayer({
          id: "actor",
          hand: [makeTile({ id: "a1", color: "blue", gameValue: 5 })],
        }),
        makePlayer({ id: "other" }),
      ],
      currentPlayerIndex: 0,
      board: {
        detonatorPosition: 0,
        detonatorMax: 3,
        validationTrack: {},
        markers: [],
        equipment: [
          makeEquipmentCard({
            id: "rewinder",
            name: "Rewinder",
            unlockValue: 6,
            unlocked: true,
            used: true,
          }),
        ],
      },
    }) as unknown as ClientGameState;

    const html = renderPanel(state);
    expect(html).not.toContain("Use Rewinder");
  });

  it("disables in_turn equipment when off-turn", () => {
    const state = makeGameState({
      players: [
        makePlayer({
          id: "actor",
          hand: [makeTile({ id: "a1", color: "blue", gameValue: 5 })],
        }),
        makePlayer({ id: "other" }),
      ],
      currentPlayerIndex: 1,
      board: {
        detonatorPosition: 0,
        detonatorMax: 3,
        validationTrack: {},
        markers: [],
        equipment: [
          makeEquipmentCard({
            id: "coffee_thermos",
            name: "Coffee Thermos",
            unlockValue: 11,
            unlocked: true,
            used: false,
          }),
        ],
      },
    }) as unknown as ClientGameState;

    const html = renderPanel(state, { isMyTurn: false });
    expect(html).toContain("Use Coffee Thermos");
    expect(html).toMatch(/disabled=""/);
  });

  it("enables anytime equipment when off-turn", () => {
    const state = makeGameState({
      players: [
        makePlayer({
          id: "actor",
          hand: [makeTile({ id: "a1", color: "blue", gameValue: 5 })],
        }),
        makePlayer({ id: "other" }),
      ],
      currentPlayerIndex: 1,
      board: {
        detonatorPosition: 0,
        detonatorMax: 3,
        validationTrack: {},
        markers: [],
        equipment: [
          makeEquipmentCard({
            id: "rewinder",
            name: "Rewinder",
            unlockValue: 6,
            unlocked: true,
            used: false,
          }),
        ],
      },
    }) as unknown as ClientGameState;

    const html = renderPanel(state, { isMyTurn: false });
    expect(html).toContain("Use Rewinder");
    expect(html).not.toMatch(/<button[^>]*disabled[^>]*>Use Rewinder<\/button>/);
  });

  it("disables equipment with active secondary lock", () => {
    const state = makeGameState({
      players: [
        makePlayer({
          id: "actor",
          hand: [makeTile({ id: "a1", color: "blue", gameValue: 5 })],
        }),
        makePlayer({ id: "other" }),
      ],
      currentPlayerIndex: 0,
      board: {
        detonatorPosition: 0,
        detonatorMax: 3,
        validationTrack: {},
        markers: [],
        equipment: [
          makeEquipmentCard({
            id: "rewinder",
            name: "Rewinder",
            unlockValue: 6,
            unlocked: true,
            used: false,
            secondaryLockValue: 5,
            secondaryLockCutsRequired: 2,
          }),
        ],
      },
    }) as unknown as ClientGameState;

    const html = renderPanel(state);
    expect(html).toContain("Use Rewinder");
    expect(html).toMatch(/disabled=""/);
  });

  it("shows secondary lock progress in button label", () => {
    const state = makeGameState({
      players: [
        makePlayer({
          id: "actor",
          hand: [
            makeTile({ id: "a1", color: "blue", gameValue: 5 }),
            makeTile({ id: "a2", color: "blue", gameValue: 5, cut: true }),
          ],
        }),
        makePlayer({ id: "other" }),
      ],
      currentPlayerIndex: 0,
      board: {
        detonatorPosition: 0,
        detonatorMax: 3,
        validationTrack: {},
        markers: [],
        equipment: [
          makeEquipmentCard({
            id: "rewinder",
            name: "Rewinder",
            unlockValue: 6,
            unlocked: true,
            used: false,
            secondaryLockValue: 5,
            secondaryLockCutsRequired: 2,
          }),
        ],
      },
    }) as unknown as ClientGameState;

    const html = renderPanel(state);
    expect(html).toContain("Use Rewinder (5: 1/2)");
  });

  it("disables all equipment when forced reveal-reds active", () => {
    const state = makeGameState({
      players: [
        makePlayer({
          id: "actor",
          hand: [
            makeTile({ id: "a1", color: "red", gameValue: "RED", cut: false }),
            makeTile({ id: "a2", color: "red", gameValue: "RED", cut: false }),
          ],
        }),
        makePlayer({ id: "other" }),
      ],
      currentPlayerIndex: 0,
      board: {
        detonatorPosition: 0,
        detonatorMax: 3,
        validationTrack: {},
        markers: [],
        equipment: [
          makeEquipmentCard({
            id: "rewinder",
            name: "Rewinder",
            unlockValue: 6,
            unlocked: true,
            used: false,
          }),
        ],
      },
    }) as unknown as ClientGameState;

    const html = renderPanel(state, { isMyTurn: true });
    expect(html).toContain("Use Rewinder");
    expect(html).toMatch(/disabled=""/);
  });

  it("renders Equipment header when equipment available", () => {
    const state = makeGameState({
      players: [
        makePlayer({
          id: "actor",
          hand: [makeTile({ id: "a1", color: "blue", gameValue: 5 })],
        }),
        makePlayer({ id: "other" }),
      ],
      currentPlayerIndex: 0,
      board: {
        detonatorPosition: 0,
        detonatorMax: 3,
        validationTrack: {},
        markers: [],
        equipment: [
          makeEquipmentCard({
            id: "label_neq",
            name: "Label \u2260",
            unlockValue: 1,
            unlocked: true,
            used: false,
          }),
        ],
      },
    }) as unknown as ClientGameState;

    const html = renderPanel(state);
    expect(html).toContain("Equipment");
    expect(html).toContain("Use Label");
  });

  it("does not render Equipment section when no equipment available", () => {
    const state = makeGameState({
      players: [
        makePlayer({
          id: "actor",
          hand: [makeTile({ id: "a1", color: "blue", gameValue: 5 })],
        }),
        makePlayer({ id: "other" }),
      ],
      currentPlayerIndex: 0,
      board: {
        detonatorPosition: 0,
        detonatorMax: 3,
        validationTrack: {},
        markers: [],
        equipment: [
          makeEquipmentCard({
            id: "rewinder",
            name: "Rewinder",
            unlockValue: 6,
            unlocked: false,
            used: false,
          }),
          makeEquipmentCard({
            id: "post_it",
            name: "Post-it",
            unlockValue: 4,
            unlocked: true,
            used: true,
          }),
        ],
      },
    }) as unknown as ClientGameState;

    const html = renderPanel(state);
    expect(html).not.toContain("Use Rewinder");
    expect(html).not.toContain("Use Post-it");
  });
});
