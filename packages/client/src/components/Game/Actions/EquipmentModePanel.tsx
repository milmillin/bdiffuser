import type {
  ClientGameState,
  ClientMessage,
  ClientPlayer,
  EquipmentGuessValue,
  UseEquipmentPayload,
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

type EquipmentModeSource = "equipment" | "character";

export type EquipmentMode = (
  | { kind: "post_it"; selectedTileIndex?: number | null }
  | {
      kind: "double_detector";
      targetPlayerId: string | null;
      selectedTiles: number[];
      guessTileIndex: number | null;
      oxygenRecipientPlayerId?: string;
    }
  | { kind: "general_radar"; selectedValue: number | null }
  | { kind: "label_eq"; firstTileIndex: number | null; secondTileIndex: number | null }
  | { kind: "label_neq"; firstTileIndex: number | null; secondTileIndex: number | null }
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
  | { kind: "single_wire_label"; selectedTileIndex?: number | null }
  | { kind: "emergency_drop" }
  | { kind: "fast_pass"; selectedValue: number | null }
  | { kind: "disintegrator" }
  | {
      kind: "grappling_hook";
      targetPlayerId: string | null;
      targetTileIndex: number | null;
      receiverStandIndex?: number | null;
    }
) & { source?: EquipmentModeSource };

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
  showClearButton = true,
  confirmButton,
}: {
  kind: EquipmentMode["kind"];
  testId?: string;
  children: React.ReactNode;
  onCancel: () => void;
  onClear: () => void;
  showClearButton?: boolean;
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
        {showClearButton ? (
          <button
            type="button"
            onClick={onClear}
            className={BUTTON_SECONDARY_CLASS}
          >
            Clear
          </button>
        ) : null}
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

function flatIndexToStandIndex(player: ClientPlayer, flatIndex: number): number | null {
  if (!Number.isInteger(flatIndex) || flatIndex < 0 || flatIndex >= player.hand.length) {
    return null;
  }

  const standSizes = getPlayerStandSizes(player);
  let cursor = 0;
  for (let standIndex = 0; standIndex < standSizes.length; standIndex += 1) {
    const size = standSizes[standIndex] ?? 0;
    const endExclusive = cursor + size;
    if (flatIndex < endExclusive) {
      return standIndex;
    }
    cursor = endExclusive;
  }

  return null;
}

function areFlatIndicesAdjacentWithinStand(
  player: ClientPlayer,
  indexA: number,
  indexB: number,
): boolean {
  if (Math.abs(indexA - indexB) !== 1) return false;
  const standA = flatIndexToStandIndex(player, indexA);
  const standB = flatIndexToStandIndex(player, indexB);
  return standA != null && standA === standB;
}

function isLabelEqual(tileA: ClientPlayer["hand"][number], tileB: ClientPlayer["hand"][number]): boolean {
  if (tileA.color === "red" && tileB.color === "red") return true;
  if (tileA.color === "yellow" && tileB.color === "yellow") return true;
  if (tileA.color === "blue" && tileB.color === "blue") {
    return tileA.gameValue === tileB.gameValue;
  }
  return false;
}

export function buildTalkiesWalkiesPayload(
  mode: Extract<EquipmentMode, { kind: "talkies_walkies" }>,
): Extract<UseEquipmentPayload, { kind: "talkies_walkies" }> | null {
  if (mode.teammateId == null || mode.myTileIndex == null) return null;
  return {
    kind: "talkies_walkies",
    teammateId: mode.teammateId,
    myTileIndex: mode.myTileIndex,
  };
}

export function EquipmentModePanel({
  mode,
  gameState,
  playerId,
  send,
  onCancel,
  onClear,
  onUpdateMode,
  mission59RotateNano = false,
  onMission59RotateNanoChange = () => {},
}: {
  mode: EquipmentMode;
  gameState: ClientGameState;
  playerId: string;
  send: (msg: ClientMessage) => void;
  onCancel: () => void;
  onClear: () => void;
  onUpdateMode: (mode: EquipmentMode) => void;
  mission59RotateNano?: boolean;
  onMission59RotateNanoChange?: (value: boolean) => void;
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
  const mission49DefaultRecipientId =
    gameState.mission === 49
      ? (() => {
          const actorIndex = gameState.players.findIndex((p) => p.id === playerId);
          if (actorIndex < 0 || gameState.players.length < 2) return undefined;
          return gameState.players[(actorIndex + 1) % gameState.players.length]?.id;
        })()
      : undefined;

  switch (mode.kind) {
    case "post_it": {
      testId = "post-it-mode-panel";
      const selectedTileIndex = mode.selectedTileIndex ?? null;
      if (selectedTileIndex == null) {
        content = "Click one of your blue wires to place the Post-it info token.";
      } else {
        content = (
          <>
            Selected wire {wireLabel(selectedTileIndex)}. Confirm to place the
            Post-it info token.
          </>
        );
        confirmButton = (
          <button
            type="button"
            data-testid="post-it-confirm"
            onClick={() =>
              sendAndCancel({
                type: "useEquipment",
                equipmentId: "post_it",
                payload: { kind: "post_it", tileIndex: selectedTileIndex },
              })
            }
            className={BUTTON_PRIMARY_CLASS}
          >
            Confirm Post-it
          </button>
        );
      }
      break;
    }

    case "double_detector": {
      testId = "dd-mode-panel";
      const mission49Recipients = gameState.mission === 49 ? opponents : [];
      const selectedMission49RecipientId = mission49Recipients.some(
        (player) => player.id === mode.oxygenRecipientPlayerId,
      )
        ? mode.oxygenRecipientPlayerId
        : mission49DefaultRecipientId ?? mission49Recipients[0]?.id;
      const ddAllComplete =
        mode.selectedTiles.length === 2 &&
        mode.targetPlayerId != null &&
        mode.guessTileIndex != null;
      if (ddAllComplete) {
        const guessValue = me.hand[mode.guessTileIndex!]?.gameValue;
        const targetName = opponents.find((o) => o.id === mode.targetPlayerId)?.name;
        const mission59RotateControl = gameState.mission === 59 ? (
          <label className="mt-2 flex items-center gap-2 text-xs text-sky-100/90">
            <input
              type="checkbox"
              checked={mission59RotateNano}
              onChange={(event) => {
                onMission59RotateNanoChange(event.target.checked);
              }}
            />
            <span>Rotate Nano 180° after this cut</span>
          </label>
        ) : null;
        content = (
          <>
            Target: {targetName}&apos;s wires {wireLabel(mode.selectedTiles[0])}{" "}
            & {wireLabel(mode.selectedTiles[1])}. Guess:{" "}
            {String(guessValue)}.
            {mission59RotateControl}
            {gameState.mission === 49 && mission49Recipients.length > 0 ? (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-red-200">Give oxygen to:</span>
                <select
                  data-testid="dd-oxygen-recipient-select"
                  className="rounded bg-red-900/60 border border-red-400/60 text-red-100 px-2 py-1 text-xs"
                  value={selectedMission49RecipientId ?? ""}
                  onChange={(event) =>
                    onUpdateMode({
                      ...mode,
                      oxygenRecipientPlayerId: event.target.value,
                    })
                  }
                >
                  {mission49Recipients.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
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
                  ...(gameState.mission === 59 && mission59RotateNano
                    ? { mission59RotateNano: true }
                    : {}),
                  ...(gameState.mission === 49 &&
                  selectedMission49RecipientId != null
                    ? { oxygenRecipientPlayerId: selectedMission49RecipientId }
                    : {}),
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
        content = "Click one of your wires to select the first wire.";
      } else if (mode.secondTileIndex !== null) {
        const symbol = mode.kind === "label_eq" ? "=" : "≠";
        const firstTile = me.hand[mode.firstTileIndex];
        const secondTile = me.hand[mode.secondTileIndex];
        const pairAdjacent = firstTile && secondTile
          ? areFlatIndicesAdjacentWithinStand(
              me,
              mode.firstTileIndex,
              mode.secondTileIndex,
            )
          : false;
        const pairEqual = firstTile && secondTile
          ? isLabelEqual(firstTile, secondTile)
          : false;
        const pairValid = firstTile && secondTile
          ? mode.kind === "label_eq"
            ? pairAdjacent && pairEqual
            : pairAdjacent && !pairEqual && !(firstTile.cut && secondTile.cut)
          : false;

        if (pairValid) {
          content = (
            <>
              Wires {wireLabel(mode.firstTileIndex)} &amp;{" "}
              {wireLabel(mode.secondTileIndex)} will be labeled {symbol}.
            </>
          );
          confirmButton = (
            <button
              type="button"
              data-testid={`${mode.kind}-confirm`}
              onClick={() =>
                sendAndCancel({
                  type: "useEquipment",
                  equipmentId: mode.kind,
                  payload: {
                    kind: mode.kind,
                    tileIndexA: mode.firstTileIndex!,
                    tileIndexB: mode.secondTileIndex!,
                  },
                })
              }
              className={BUTTON_PRIMARY_CLASS}
            >
              {mode.kind === "label_eq" ? "Confirm Label =" : "Confirm Label ≠"}
            </button>
          );
        } else {
          content = mode.kind === "label_eq"
            ? "Invalid pair: Label = requires adjacent wires on the same stand with matching values."
            : "Invalid pair: Label ≠ requires adjacent wires on the same stand with different values (not both cut).";
        }
      } else {
        const adjacentLabels: string[] = [mode.firstTileIndex - 1, mode.firstTileIndex + 1]
          .filter((index) =>
            index >= 0 &&
            index < me.hand.length &&
            areFlatIndicesAdjacentWithinStand(me, mode.firstTileIndex!, index),
          )
          .map((index) => wireLabel(index));
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
            Click any uncut wire on a teammate&apos;s stand to select that teammate,
            then click one of your own uncut wires.
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
        const payload = buildTalkiesWalkiesPayload(mode);
        if (!payload) break;
        confirmButton = (
          <button
            type="button"
            data-testid="tw-confirm"
            onClick={() =>
              sendAndCancel({
                type: "useEquipment",
                equipmentId: "talkies_walkies",
                payload,
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
      content = "Draw 2 equipment cards from the reserve and put them into play.";
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
      const selectedTileIndex = mode.selectedTileIndex ?? null;
      if (selectedTileIndex == null) {
        content = "Click one of your blue wires to apply the Single Wire Label.";
      } else {
        content = (
          <>
            Selected wire {wireLabel(selectedTileIndex)}. Confirm to place the
            Single Wire Label info token.
          </>
        );
        confirmButton = (
          <button
            type="button"
            data-testid="single-wire-label-confirm"
            onClick={() =>
              sendAndCancel({
                type: "useEquipment",
                equipmentId: "single_wire_label",
                payload: { kind: "single_wire_label", tileIndex: selectedTileIndex },
              })
            }
            className={BUTTON_PRIMARY_CLASS}
          >
            Confirm Single Wire Label
          </button>
        );
      }
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
          <div>Choose a value to cut (1–12):</div>
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
      const myStandCount = getPlayerStandSizes(me).length;
      const requiresStandPick = myStandCount > 1;
      const hasValidStandChoice = !requiresStandPick || mode.receiverStandIndex != null;

      if (mode.targetPlayerId == null || mode.targetTileIndex == null) {
        content = "Click an uncut wire on an opponent's stand.";
      } else {
        const targetName = opponents.find(
          (o) => o.id === mode.targetPlayerId,
        )?.name;
        const standPicker = requiresStandPick
          ? (
            <div className="space-y-1">
              <div>Choose which of your stands receives it:</div>
              <div className="flex gap-2">
                {Array.from({ length: myStandCount }, (_, standIndex) => {
                  const selected = mode.receiverStandIndex === standIndex;
                  return (
                    <button
                      key={standIndex}
                      type="button"
                      onClick={() => onUpdateMode({ ...mode, receiverStandIndex: standIndex })}
                      className={selected ? BUTTON_OPTION_SELECTED_CLASS : BUTTON_OPTION_CLASS}
                    >
                      Stand {standIndex + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          )
          : null;
        content = (
          <div className="space-y-2">
            <div>
              Targeting {targetName}&apos;s wire {wireLabel(mode.targetTileIndex)}.
            </div>
            {standPicker}
          </div>
        );
        if (hasValidStandChoice) {
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
                    ...(requiresStandPick && mode.receiverStandIndex != null
                      ? { receiverStandIndex: mode.receiverStandIndex }
                      : {}),
                  },
                })
              }
              className={BUTTON_PRIMARY_CLASS}
            >
              Confirm Grappling Hook
            </button>
          );
        }
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
      showClearButton={
        mode.kind !== "general_radar" && mode.kind !== "double_detector"
      }
      confirmButton={confirmButton}
    >
      {content}
    </ModeWrapper>
  );
}
