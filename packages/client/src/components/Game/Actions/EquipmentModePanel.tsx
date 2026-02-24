import type {
  ClientGameState,
  ClientMessage,
  ClientPlayer,
  EquipmentGuessValue,
} from "@bomb-busters/shared";
import { wireLabel } from "@bomb-busters/shared";
import {
  BUTTON_OPTION_CLASS,
  BUTTON_OPTION_SELECTED_CLASS,
  BUTTON_PRIMARY_CLASS,
  BUTTON_SECONDARY_CLASS,
  PANEL_CLASS,
  PANEL_TEXT_CLASS,
  PANEL_TITLE_CLASS,
} from "./panelStyles.js";

export type EquipmentMode =
  | { kind: "post_it" }
  | {
      kind: "double_detector";
      targetPlayerId: string | null;
      selectedTiles: number[];
      guessTileIndex: number | null;
    }
  | { kind: "general_radar"; selectedValue: number | null }
  | { kind: "label_eq"; firstTileIndex: number | null }
  | { kind: "label_neq"; firstTileIndex: number | null }
  | {
      kind: "talkies_walkies";
      teammateId: string | null;
      teammateTileIndex: number | null;
      myTileIndex: number | null;
    }
  | { kind: "emergency_batteries"; selectedPlayerIds: string[] }
  | { kind: "coffee_mug"; selectedPlayerId: string | null }
  | {
      kind: "triple_detector";
      targetPlayerId: string | null;
      targetTileIndices: number[];
      guessTileIndex: number | null;
    }
  | {
      kind: "super_detector";
      targetPlayerId: string | null;
      targetStandIndex: number | null;
      guessTileIndex: number | null;
    }
  | {
      kind: "x_or_y_ray";
      targetPlayerId: string | null;
      targetTileIndex: number | null;
      guessATileIndex: number | null;
      guessBTileIndex: number | null;
    }
  | { kind: "false_bottom" }
  | { kind: "single_wire_label" }
  | { kind: "emergency_drop" }
  | { kind: "fast_pass"; selectedValue: number | null }
  | { kind: "disintegrator" }
  | {
      kind: "grappling_hook";
      targetPlayerId: string | null;
      targetTileIndex: number | null;
    };

const MODE_TITLES: Record<EquipmentMode["kind"], string> = {
  post_it: "Post-it Mode",
  double_detector: "Double Detector Mode",
  general_radar: "General Radar",
  label_eq: "Label = Mode",
  label_neq: "Label ≠ Mode",
  talkies_walkies: "Talkies-Walkies",
  emergency_batteries: "Emergency Batteries",
  coffee_mug: "Coffee Mug",
  triple_detector: "Triple Detector",
  super_detector: "Super Detector",
  x_or_y_ray: "X or Y Ray",
  false_bottom: "False Bottom",
  single_wire_label: "Single Wire Label",
  emergency_drop: "Emergency Drop",
  fast_pass: "Fast Pass",
  disintegrator: "Disintegrator",
  grappling_hook: "Grappling Hook",
};

function ModeWrapper({
  kind,
  testId,
  children,
  onCancel,
  onClear,
  confirmButton,
}: {
  kind: EquipmentMode["kind"];
  testId?: string;
  children: React.ReactNode;
  onCancel: () => void;
  onClear: () => void;
  confirmButton?: React.ReactNode;
}) {
  return (
    <div
      className={PANEL_CLASS}
      data-testid={testId ?? "equipment-mode-panel"}
    >
      <div className={PANEL_TITLE_CLASS}>
        {MODE_TITLES[kind]}
      </div>
      <div className={PANEL_TEXT_CLASS}>{children}</div>
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={onCancel}
          className={BUTTON_SECONDARY_CLASS}
        >
          Cancel
        </button>
        <button type="button" onClick={onClear} className={BUTTON_SECONDARY_CLASS}>
          Clear
        </button>
        {confirmButton}
      </div>
    </div>
  );
}

function getPlayerStandSizes(player: ClientPlayer): number[] {
  const maybeStandSizes = (player as ClientPlayer & { standSizes?: number[] }).standSizes;
  if (!Array.isArray(maybeStandSizes) || maybeStandSizes.length === 0) {
    return [player.hand.length];
  }
  if (!maybeStandSizes.every((size) => Number.isInteger(size) && size >= 0)) {
    return [player.hand.length];
  }
  const total = maybeStandSizes.reduce((sum, size) => sum + size, 0);
  if (total !== player.hand.length) {
    return [player.hand.length];
  }
  return maybeStandSizes;
}

export function EquipmentModePanel({
  mode,
  gameState,
  playerId,
  send,
  onCancel,
  onClear,
  onUpdateMode,
}: {
  mode: EquipmentMode;
  gameState: ClientGameState;
  playerId: string;
  send: (msg: ClientMessage) => void;
  onCancel: () => void;
  onClear: () => void;
  onUpdateMode: (mode: EquipmentMode) => void;
}) {
  const me = gameState.players.find((p) => p.id === playerId);
  if (!me) return null;
  const opponents = gameState.players.filter((p) => p.id !== playerId);

  const sendAndCancel = (msg: ClientMessage) => {
    send(msg);
    onCancel();
  };

  let content: React.ReactNode;
  let confirmButton: React.ReactNode = null;
  let testId: string | undefined;

  switch (mode.kind) {
    case "post_it": {
      testId = "post-it-mode-panel";
      content = "Click one of your blue wires to place the Post-it info token.";
      break;
    }

    case "double_detector": {
      testId = "dd-mode-panel";
      const ddAllComplete =
        mode.selectedTiles.length === 2 &&
        mode.targetPlayerId != null &&
        mode.guessTileIndex != null;
      if (ddAllComplete) {
        const guessValue = me.hand[mode.guessTileIndex!]?.gameValue;
        const targetName = opponents.find(
          (o) => o.id === mode.targetPlayerId,
        )?.name;
        content = (
          <>
            Target: {targetName}&apos;s wires {wireLabel(mode.selectedTiles[0])}{" "}
            & {wireLabel(mode.selectedTiles[1])}. Guess:{" "}
            {String(guessValue)}.
          </>
        );
        if (typeof guessValue === "number") {
          confirmButton = (
            <button
              type="button"
              data-testid="dd-confirm"
              onClick={() =>
                sendAndCancel({
                  type: "dualCutDoubleDetector",
                  targetPlayerId: mode.targetPlayerId!,
                  tileIndex1: mode.selectedTiles[0],
                  tileIndex2: mode.selectedTiles[1],
                  guessValue,
                  actorTileIndex: mode.guessTileIndex!,
                })
              }
              className={BUTTON_PRIMARY_CLASS}
            >
              Confirm Double Detector
            </button>
          );
        }
      } else {
        const parts: string[] = [];
        if (mode.selectedTiles.length > 0) {
          const targetName = opponents.find(
            (o) => o.id === mode.targetPlayerId,
          )?.name;
          parts.push(
            `${targetName}'s wires ${mode.selectedTiles.map((i) => wireLabel(i)).join(" & ")} (${mode.selectedTiles.length}/2)`,
          );
        }
        if (mode.guessTileIndex != null) {
          parts.push(`guess ${String(me.hand[mode.guessTileIndex]?.gameValue)}`);
        }
        const needs: string[] = [];
        if (mode.selectedTiles.length < 2) needs.push(`${2 - mode.selectedTiles.length} opponent tile(s)`);
        if (mode.guessTileIndex == null) needs.push("your blue guess tile");
        content = (
          <>
            {parts.length > 0 && <>Selected: {parts.join(", ")}. </>}
            Still need: {needs.join(", ")}.
          </>
        );
      }
      break;
    }

    case "general_radar": {
      content = (
        <div className="space-y-2">
          <div>Choose a value to announce (1–12):</div>
          <div className="grid grid-cols-4 gap-1">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((value) => {
              const isSelected = mode.selectedValue === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    onUpdateMode({ ...mode, selectedValue: value })
                  }
                  className={`${
                    isSelected
                      ? BUTTON_OPTION_SELECTED_CLASS
                      : BUTTON_OPTION_CLASS
                  }`}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </div>
      );
      if (typeof mode.selectedValue === "number") {
        const selectedValue = mode.selectedValue;
        confirmButton = (
          <button
            type="button"
            onClick={() =>
              sendAndCancel({
                type: "useEquipment",
                equipmentId: "general_radar",
                payload: { kind: "general_radar", value: selectedValue },
              })
            }
            className={BUTTON_PRIMARY_CLASS}
          >
            Confirm General Radar
          </button>
        );
      }
      break;
    }

    case "label_eq":
    case "label_neq": {
      if (mode.firstTileIndex === null) {
        content = mode.kind === "label_neq"
          ? "Click one of your wires to select the first wire."
          : "Click one of your uncut wires to select the first wire.";
      } else {
        const adjacentLabels: string[] = [];
        if (mode.firstTileIndex > 0)
          adjacentLabels.push(wireLabel(mode.firstTileIndex - 1));
        if (mode.firstTileIndex < me.hand.length - 1)
          adjacentLabels.push(wireLabel(mode.firstTileIndex + 1));
        content = (
          <>
            Selected wire {wireLabel(mode.firstTileIndex)}. Now click an
            adjacent wire ({adjacentLabels.join(" or ")}).
            {mode.kind === "label_neq"
              ? " You can include at most one cut wire."
              : ""}
          </>
        );
      }
      break;
    }

    case "talkies_walkies": {
      const selectedTeammateName = opponents.find(
        (opponent) => opponent.id === mode.teammateId,
      )?.name;
      const twAllComplete =
        mode.teammateId != null &&
        mode.myTileIndex != null;
      const parts: string[] = [];
      if (mode.teammateId != null) {
        parts.push(`target ${selectedTeammateName ?? "teammate"}`);
      }
      if (mode.myTileIndex != null) {
        parts.push(`your wire ${wireLabel(mode.myTileIndex)}`);
      }
      const needs: string[] = [];
      if (mode.teammateId == null) needs.push("a target player");
      if (mode.myTileIndex == null) needs.push("your uncut wire");

      content = (
        <div className="space-y-2">
          <div>
            Click one of your teammate's uncut wires on their stand, then click
            one of your own uncut wires.
          </div>
          <div>
            {twAllComplete ? (
              <>
                Ask {selectedTeammateName ?? "your teammate"} to choose one
                uncut wire to swap with your wire{" "}
                {wireLabel(mode.myTileIndex!)}.
              </>
            ) : (
              <>
                {parts.length > 0 && <>Selected: {parts.join(", ")}. </>}
                Still need: {needs.join(", ")}.
              </>
            )}
          </div>
        </div>
      );
      if (twAllComplete) {
        confirmButton = (
          <button
            type="button"
            data-testid="tw-confirm"
            onClick={() =>
              sendAndCancel({
                type: "useEquipment",
                equipmentId: "talkies_walkies",
                payload: {
                  kind: "talkies_walkies",
                  teammateId: mode.teammateId!,
                  myTileIndex: mode.myTileIndex!,
                },
              })
            }
            className={BUTTON_PRIMARY_CLASS}
          >
            Confirm Talkies-Walkies
          </button>
        );
      }
      break;
    }

    case "emergency_batteries": {
      const usedPlayers = gameState.players.filter((p) => p.characterUsed);
      if (usedPlayers.length === 0) {
        content =
          "No players have used character abilities to recharge.";
      } else {
        content = (
          <div className="space-y-2">
            <div>Select 1–2 players with used character abilities:</div>
            <div className="flex gap-2 flex-wrap">
              {usedPlayers.map((player) => {
                const isSelected = mode.selectedPlayerIds.includes(player.id);
                return (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => {
                      const newIds = isSelected
                        ? mode.selectedPlayerIds.filter(
                            (id) => id !== player.id,
                          )
                        : mode.selectedPlayerIds.length >= 2
                          ? mode.selectedPlayerIds
                          : [...mode.selectedPlayerIds, player.id];
                      onUpdateMode({ ...mode, selectedPlayerIds: newIds });
                    }}
                    className={`px-3 py-1.5 rounded text-sm font-bold transition-colors ${
                      isSelected
                        ? "bg-amber-500 text-black"
                        : "bg-gray-700 hover:bg-gray-600 text-gray-200"
                    }`}
                  >
                    {player.name}
                  </button>
                );
              })}
            </div>
          </div>
        );
        if (mode.selectedPlayerIds.length >= 1) {
          confirmButton = (
            <button
              type="button"
              onClick={() =>
                sendAndCancel({
                  type: "useEquipment",
                  equipmentId: "emergency_batteries",
                  payload: {
                    kind: "emergency_batteries",
                    playerIds: mode.selectedPlayerIds,
                  },
                })
              }
              className={BUTTON_PRIMARY_CLASS}
            >
              Confirm ({mode.selectedPlayerIds.length} selected)
            </button>
          );
        }
      }
      break;
    }

    case "coffee_mug": {
      const candidates = gameState.players.filter(
        (p) => p.id !== playerId && p.hand.some((t) => !t.cut),
      );
      content = (
        <div className="space-y-2">
          <div>Choose a player to give the next turn to:</div>
          <div className="flex gap-2 flex-wrap">
            {candidates.map((player) => {
              const isSelected = mode.selectedPlayerId === player.id;
              return (
                <button
                  key={player.id}
                  type="button"
                  onClick={() =>
                    onUpdateMode({ ...mode, selectedPlayerId: player.id })
                  }
                  className={`${
                    isSelected
                      ? BUTTON_OPTION_SELECTED_CLASS
                      : BUTTON_OPTION_CLASS
                  }`}
                >
                  {player.name}
                </button>
              );
            })}
          </div>
        </div>
      );
      if (mode.selectedPlayerId != null) {
        const selectedPlayerId = mode.selectedPlayerId;
        confirmButton = (
          <button
            type="button"
            onClick={() =>
              sendAndCancel({
                type: "useEquipment",
                equipmentId: "coffee_mug",
                payload: {
                  kind: "coffee_mug",
                  targetPlayerId: selectedPlayerId,
                },
              })
            }
            className={BUTTON_PRIMARY_CLASS}
          >
            Confirm Coffee Mug
          </button>
        );
      }
      break;
    }

    case "triple_detector": {
      const tdAllComplete =
        mode.targetTileIndices.length === 3 &&
        mode.targetPlayerId != null &&
        mode.guessTileIndex != null;
      if (tdAllComplete) {
        const guessValue = me.hand[mode.guessTileIndex!]?.gameValue;
        const targetName = opponents.find(
          (o) => o.id === mode.targetPlayerId,
        )?.name;
        content = (
          <>
            Target: {targetName}&apos;s wires{" "}
            {mode.targetTileIndices.map((i) => wireLabel(i)).join(", ")}. Guess:{" "}
            {String(guessValue)}.
          </>
        );
        if (typeof guessValue === "number") {
          confirmButton = (
            <button
              type="button"
              onClick={() =>
                sendAndCancel({
                  type: "useEquipment",
                  equipmentId: "triple_detector",
                  payload: {
                    kind: "triple_detector",
                    targetPlayerId: mode.targetPlayerId!,
                    targetTileIndices: mode.targetTileIndices,
                    guessValue,
                  },
                })
              }
              className={BUTTON_PRIMARY_CLASS}
            >
              Confirm Triple Detector
            </button>
          );
        }
      } else {
        const parts: string[] = [];
        if (mode.targetTileIndices.length > 0) {
          const targetName = opponents.find(
            (o) => o.id === mode.targetPlayerId,
          )?.name;
          parts.push(
            `${targetName}'s wires ${mode.targetTileIndices.map((i) => wireLabel(i)).join(", ")} (${mode.targetTileIndices.length}/3)`,
          );
        }
        if (mode.guessTileIndex != null) {
          parts.push(`guess ${String(me.hand[mode.guessTileIndex]?.gameValue)}`);
        }
        const needs: string[] = [];
        if (mode.targetTileIndices.length < 3) needs.push(`${3 - mode.targetTileIndices.length} opponent tile(s)`);
        if (mode.guessTileIndex == null) needs.push("your blue guess tile");
        content = (
          <>
            {parts.length > 0 && <>Selected: {parts.join(", ")}. </>}
            Still need: {needs.join(", ")}.
          </>
        );
      }
      break;
    }

    case "super_detector": {
      const targetPlayer = mode.targetPlayerId == null
        ? undefined
        : opponents.find((o) => o.id === mode.targetPlayerId);
      const targetStandCount = targetPlayer ? getPlayerStandSizes(targetPlayer).length : 0;
      const requiresStandPick = targetStandCount > 1;
      const targetStandIndex =
        mode.targetStandIndex != null &&
        mode.targetStandIndex >= 0 &&
        mode.targetStandIndex < targetStandCount
          ? mode.targetStandIndex
          : null;
      const resolvedStandIndex = requiresStandPick ? targetStandIndex : 0;
      const sdAllComplete =
        mode.targetPlayerId != null &&
        mode.guessTileIndex != null &&
        resolvedStandIndex != null;
      if (sdAllComplete) {
        const guessValue = me.hand[mode.guessTileIndex!]?.gameValue;
        const targetName = targetPlayer?.name;
        const standLabel = requiresStandPick
          ? ` stand ${resolvedStandIndex! + 1}`
          : "'s entire stand";
        content = (
          <>
            Target: {targetName}
            {standLabel}. Guess:{" "}
            {String(guessValue)}.
          </>
        );
        if (typeof guessValue === "number") {
          const payload = {
            kind: "super_detector" as const,
            targetPlayerId: mode.targetPlayerId!,
            guessValue,
            ...(resolvedStandIndex != null
              ? { targetStandIndex: resolvedStandIndex }
              : {}),
          };
          confirmButton = (
            <button
              type="button"
              onClick={() =>
                sendAndCancel({
                  type: "useEquipment",
                  equipmentId: "super_detector",
                  payload,
                })
              }
              className={BUTTON_PRIMARY_CLASS}
            >
              Confirm Super Detector
            </button>
          );
        }
      } else {
        const parts: string[] = [];
        let standPicker: React.ReactNode = null;
        if (mode.targetPlayerId != null) {
          const targetName = targetPlayer?.name;
          if (requiresStandPick && targetStandIndex != null) {
            parts.push(`${targetName}'s stand ${targetStandIndex + 1}`);
          } else {
            parts.push(`${targetName}'s stand`);
          }
        }
        if (mode.targetPlayerId != null && requiresStandPick) {
          standPicker = (
            <div className="space-y-1">
              <div>Select a stand:</div>
              <div className="flex gap-2">
                {Array.from({ length: targetStandCount }, (_, standIndex) => {
                  const isSelected = targetStandIndex === standIndex;
                  return (
                    <button
                      key={standIndex}
                      type="button"
                      onClick={() =>
                        onUpdateMode({
                          ...mode,
                          targetStandIndex: standIndex,
                        })
                      }
                      className={`${
                        isSelected
                          ? BUTTON_OPTION_SELECTED_CLASS
                          : BUTTON_OPTION_CLASS
                      }`}
                    >
                      Stand {standIndex + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        }
        if (mode.guessTileIndex != null) {
          parts.push(`guess ${String(me.hand[mode.guessTileIndex]?.gameValue)}`);
        }
        const needs: string[] = [];
        if (mode.targetPlayerId == null) needs.push("an opponent's stand");
        if (requiresStandPick && targetStandIndex == null) needs.push("a target stand");
        if (mode.guessTileIndex == null) needs.push("your blue guess tile");
        content = (
          <div className="space-y-2">
            <div>
              {parts.length > 0 && <>Selected: {parts.join(", ")}. </>}
              Still need: {needs.join(", ")}.
            </div>
            {standPicker}
          </div>
        );
      }
      break;
    }

    case "x_or_y_ray": {
      const xrAllComplete =
        mode.targetPlayerId != null &&
        mode.targetTileIndex != null &&
        mode.guessATileIndex != null &&
        mode.guessBTileIndex != null;
      if (xrAllComplete) {
        const targetName = opponents.find(
          (o) => o.id === mode.targetPlayerId,
        )?.name;
        const valueA = me.hand[mode.guessATileIndex!]?.gameValue;
        const valueB = me.hand[mode.guessBTileIndex!]?.gameValue;
        content = (
          <>
            Target: {targetName}&apos;s wire{" "}
            {wireLabel(mode.targetTileIndex!)}. Values: {String(valueA)} and{" "}
            {String(valueB)}.
          </>
        );
        if (valueA != null && valueB != null) {
          confirmButton = (
            <button
              type="button"
              onClick={() =>
                sendAndCancel({
                  type: "useEquipment",
                  equipmentId: "x_or_y_ray",
                  payload: {
                    kind: "x_or_y_ray",
                    targetPlayerId: mode.targetPlayerId!,
                    targetTileIndex: mode.targetTileIndex!,
                    guessValueA: valueA as EquipmentGuessValue,
                    guessValueB: valueB as EquipmentGuessValue,
                  },
                })
              }
              className={BUTTON_PRIMARY_CLASS}
            >
              Confirm X or Y Ray
            </button>
          );
        }
      } else {
        const parts: string[] = [];
        if (mode.targetPlayerId != null && mode.targetTileIndex != null) {
          const targetName = opponents.find(
            (o) => o.id === mode.targetPlayerId,
          )?.name;
          parts.push(`${targetName}'s wire ${wireLabel(mode.targetTileIndex)}`);
        }
        if (mode.guessATileIndex != null) {
          parts.push(`value A: ${String(me.hand[mode.guessATileIndex]?.gameValue)}`);
        }
        if (mode.guessBTileIndex != null) {
          parts.push(`value B: ${String(me.hand[mode.guessBTileIndex]?.gameValue)}`);
        }
        const needs: string[] = [];
        if (mode.targetPlayerId == null || mode.targetTileIndex == null) needs.push("an opponent's wire");
        if (mode.guessATileIndex == null) needs.push("first blue/yellow guess tile");
        if (mode.guessBTileIndex == null && mode.guessATileIndex != null) needs.push("second guess tile (different value)");
        else if (mode.guessBTileIndex == null) needs.push("two blue/yellow guess tiles");
        content = (
          <>
            {parts.length > 0 && <>Selected: {parts.join(", ")}. </>}
            Still need: {needs.join(", ")}.
          </>
        );
      }
      break;
    }

    case "false_bottom": {
      content = "Reveal a random equipment card from the reserve.";
      confirmButton = (
        <button
          type="button"
          onClick={() =>
            sendAndCancel({
              type: "useEquipment",
              equipmentId: "false_bottom",
              payload: { kind: "false_bottom" },
            })
          }
          className={BUTTON_PRIMARY_CLASS}
        >
          Confirm False Bottom
        </button>
      );
      break;
    }

    case "single_wire_label": {
      content =
        "Click one of your blue wires to apply the Single Wire Label.";
      break;
    }

    case "emergency_drop": {
      content = "Restore all used equipment cards.";
      confirmButton = (
        <button
          type="button"
          onClick={() =>
            sendAndCancel({
              type: "useEquipment",
              equipmentId: "emergency_drop",
              payload: { kind: "emergency_drop" },
            })
          }
          className={BUTTON_PRIMARY_CLASS}
        >
          Confirm Emergency Drop
        </button>
      );
      break;
    }

    case "fast_pass": {
      content = (
        <div className="space-y-2">
          <div>Choose a value to reveal (1–12):</div>
          <div className="grid grid-cols-4 gap-1">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((value) => {
              const isSelected = mode.selectedValue === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    onUpdateMode({
                      ...mode,
                      selectedValue: value,
                    })
                  }
                  className={`${
                    isSelected
                      ? BUTTON_OPTION_SELECTED_CLASS
                      : BUTTON_OPTION_CLASS
                  }`}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </div>
      );
      if (typeof mode.selectedValue === "number") {
        const selectedValue = mode.selectedValue;
        confirmButton = (
          <button
            type="button"
            onClick={() =>
              sendAndCancel({
                type: "useEquipment",
                equipmentId: "fast_pass",
                payload: { kind: "fast_pass", value: selectedValue },
              })
            }
            className={BUTTON_PRIMARY_CLASS}
          >
            Confirm Fast Pass
          </button>
        );
      }
      break;
    }

    case "disintegrator": {
      content = "Draw a random value and cut all matching blue wires.";
      confirmButton = (
        <button
          type="button"
          onClick={() =>
            sendAndCancel({
              type: "useEquipment",
              equipmentId: "disintegrator",
              payload: { kind: "disintegrator" },
            })
          }
          className={BUTTON_PRIMARY_CLASS}
        >
          Confirm Disintegrator
        </button>
      );
      break;
    }

    case "grappling_hook": {
      if (mode.targetPlayerId == null || mode.targetTileIndex == null) {
        content = "Click an uncut wire on an opponent's stand.";
      } else {
        const targetName = opponents.find(
          (o) => o.id === mode.targetPlayerId,
        )?.name;
        content = (
          <>
            Targeting {targetName}&apos;s wire{" "}
            {wireLabel(mode.targetTileIndex)}.
          </>
        );
        confirmButton = (
          <button
            type="button"
            onClick={() =>
              sendAndCancel({
                type: "useEquipment",
                equipmentId: "grappling_hook",
                payload: {
                  kind: "grappling_hook",
                  targetPlayerId: mode.targetPlayerId!,
                  targetTileIndex: mode.targetTileIndex!,
                },
              })
            }
            className={BUTTON_PRIMARY_CLASS}
          >
            Confirm Grappling Hook
          </button>
        );
      }
      break;
    }
  }

  return (
    <ModeWrapper
      kind={mode.kind}
      testId={testId}
      onCancel={onCancel}
      onClear={onClear}
      confirmButton={confirmButton}
    >
      {content}
    </ModeWrapper>
  );
}
