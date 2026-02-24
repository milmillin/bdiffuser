import type {
  ClientGameState,
  ClientMessage,
  ClientPlayer,
  EquipmentGuessValue,
} from "@bomb-busters/shared";
import { wireLabel } from "@bomb-busters/shared";

export type EquipmentMode =
  | { kind: "post_it" }
  | {
      kind: "double_detector";
      targetPlayerId: string | null;
      selectedTiles: number[];
      guessTileIndex: number | null;
    }
  | { kind: "general_radar" }
  | { kind: "label_eq"; firstTileIndex: number | null }
  | { kind: "label_neq"; firstTileIndex: number | null }
  | {
      kind: "talkies_walkies";
      teammateId: string | null;
      teammateTileIndex: number | null;
      myTileIndex: number | null;
    }
  | { kind: "emergency_batteries"; selectedPlayerIds: string[] }
  | { kind: "coffee_mug" }
  | {
      kind: "triple_detector";
      targetPlayerId: string | null;
      targetTileIndices: number[];
      guessTileIndex: number | null;
    }
  | {
      kind: "super_detector";
      targetPlayerId: string | null;
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

const MODE_COLORS: Record<
  EquipmentMode["kind"],
  { border: string; bg: string; title: string; confirm: string }
> = {
  post_it: {
    border: "border-emerald-600/60",
    bg: "bg-emerald-900/20",
    title: "text-emerald-400",
    confirm: "bg-emerald-600 hover:bg-emerald-500 text-white",
  },
  double_detector: {
    border: "border-yellow-600/60",
    bg: "bg-yellow-900/20",
    title: "text-yellow-400",
    confirm: "bg-yellow-600 hover:bg-yellow-500 text-black",
  },
  general_radar: {
    border: "border-cyan-600/60",
    bg: "bg-cyan-900/20",
    title: "text-cyan-400",
    confirm: "bg-cyan-600 hover:bg-cyan-500 text-white",
  },
  label_eq: {
    border: "border-blue-600/60",
    bg: "bg-blue-900/20",
    title: "text-blue-400",
    confirm: "bg-blue-600 hover:bg-blue-500 text-white",
  },
  label_neq: {
    border: "border-orange-600/60",
    bg: "bg-orange-900/20",
    title: "text-orange-400",
    confirm: "bg-orange-600 hover:bg-orange-500 text-white",
  },
  talkies_walkies: {
    border: "border-indigo-600/60",
    bg: "bg-indigo-900/20",
    title: "text-indigo-400",
    confirm: "bg-indigo-600 hover:bg-indigo-500 text-white",
  },
  emergency_batteries: {
    border: "border-amber-600/60",
    bg: "bg-amber-900/20",
    title: "text-amber-400",
    confirm: "bg-amber-600 hover:bg-amber-500 text-black",
  },
  coffee_mug: {
    border: "border-lime-600/60",
    bg: "bg-lime-900/20",
    title: "text-lime-400",
    confirm: "bg-lime-600 hover:bg-lime-500 text-black",
  },
  triple_detector: {
    border: "border-purple-600/60",
    bg: "bg-purple-900/20",
    title: "text-purple-400",
    confirm: "bg-purple-600 hover:bg-purple-500 text-white",
  },
  super_detector: {
    border: "border-pink-600/60",
    bg: "bg-pink-900/20",
    title: "text-pink-400",
    confirm: "bg-pink-600 hover:bg-pink-500 text-white",
  },
  x_or_y_ray: {
    border: "border-violet-600/60",
    bg: "bg-violet-900/20",
    title: "text-violet-400",
    confirm: "bg-violet-600 hover:bg-violet-500 text-white",
  },
  false_bottom: {
    border: "border-teal-600/60",
    bg: "bg-teal-900/20",
    title: "text-teal-400",
    confirm: "bg-teal-600 hover:bg-teal-500 text-white",
  },
  single_wire_label: {
    border: "border-sky-600/60",
    bg: "bg-sky-900/20",
    title: "text-sky-400",
    confirm: "bg-sky-600 hover:bg-sky-500 text-white",
  },
  emergency_drop: {
    border: "border-rose-600/60",
    bg: "bg-rose-900/20",
    title: "text-rose-400",
    confirm: "bg-rose-600 hover:bg-rose-500 text-white",
  },
  fast_pass: {
    border: "border-fuchsia-600/60",
    bg: "bg-fuchsia-900/20",
    title: "text-fuchsia-400",
    confirm: "bg-fuchsia-600 hover:bg-fuchsia-500 text-white",
  },
  disintegrator: {
    border: "border-red-600/60",
    bg: "bg-red-900/20",
    title: "text-red-400",
    confirm: "bg-red-600 hover:bg-red-500 text-white",
  },
  grappling_hook: {
    border: "border-stone-600/60",
    bg: "bg-stone-900/20",
    title: "text-stone-300",
    confirm: "bg-stone-600 hover:bg-stone-500 text-white",
  },
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
  confirmButton,
}: {
  kind: EquipmentMode["kind"];
  testId?: string;
  children: React.ReactNode;
  onCancel: () => void;
  confirmButton?: React.ReactNode;
}) {
  const colors = MODE_COLORS[kind];
  return (
    <div
      className={`rounded-lg border ${colors.border} ${colors.bg} px-3 py-2 text-sm space-y-2`}
      data-testid={testId ?? "equipment-mode-panel"}
    >
      <div
        className={`font-bold ${colors.title} uppercase tracking-wide text-xs`}
      >
        {MODE_TITLES[kind]}
      </div>
      <div className="text-xs text-gray-300">{children}</div>
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-bold transition-colors"
        >
          Cancel
        </button>
        {confirmButton}
      </div>
    </div>
  );
}

export function EquipmentModePanel({
  mode,
  gameState,
  playerId,
  send,
  onCancel,
  onUpdateMode,
}: {
  mode: EquipmentMode;
  gameState: ClientGameState;
  playerId: string;
  send: (msg: ClientMessage) => void;
  onCancel: () => void;
  onUpdateMode: (mode: EquipmentMode) => void;
}) {
  const me = gameState.players.find((p) => p.id === playerId);
  if (!me) return null;
  const opponents = gameState.players.filter((p) => p.id !== playerId);
  const colors = MODE_COLORS[mode.kind];

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
              className={`px-3 py-1 rounded ${colors.confirm} text-xs font-bold transition-colors`}
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
            {Array.from({ length: 12 }, (_, i) => i + 1).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  sendAndCancel({
                    type: "useEquipment",
                    equipmentId: "general_radar",
                    payload: { kind: "general_radar", value },
                  })
                }
                className="px-2 py-1.5 rounded bg-cyan-700 hover:bg-cyan-600 text-white text-sm font-bold transition-colors"
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      );
      break;
    }

    case "label_eq":
    case "label_neq": {
      if (mode.firstTileIndex === null) {
        content = "Click one of your uncut wires to select the first wire.";
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
          </>
        );
      }
      break;
    }

    case "talkies_walkies": {
      const twAllComplete =
        mode.teammateId != null &&
        mode.teammateTileIndex != null &&
        mode.myTileIndex != null;
      if (twAllComplete) {
        const teammateName = opponents.find(
          (o) => o.id === mode.teammateId,
        )?.name;
        content = (
          <>
            Swap {teammateName}&apos;s wire{" "}
            {wireLabel(mode.teammateTileIndex!)} with your wire{" "}
            {wireLabel(mode.myTileIndex!)}.
          </>
        );
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
                  teammateTileIndex: mode.teammateTileIndex!,
                },
              })
            }
            className={`px-3 py-1 rounded ${colors.confirm} text-xs font-bold transition-colors`}
          >
            Confirm Talkies-Walkies
          </button>
        );
      } else {
        const parts: string[] = [];
        if (mode.teammateId != null && mode.teammateTileIndex != null) {
          const teammateName = opponents.find(
            (o) => o.id === mode.teammateId,
          )?.name;
          parts.push(`${teammateName}'s wire ${wireLabel(mode.teammateTileIndex)}`);
        }
        if (mode.myTileIndex != null) {
          parts.push(`your wire ${wireLabel(mode.myTileIndex)}`);
        }
        const needs: string[] = [];
        if (mode.teammateId == null) needs.push("an opponent's wire");
        if (mode.myTileIndex == null) needs.push("your uncut wire");
        content = (
          <>
            {parts.length > 0 && <>Selected: {parts.join(", ")}. </>}
            Still need: {needs.join(", ")}.
          </>
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
                      if (usedPlayers.length === 1) {
                        sendAndCancel({
                          type: "useEquipment",
                          equipmentId: "emergency_batteries",
                          payload: {
                            kind: "emergency_batteries",
                            playerIds: [player.id],
                          },
                        });
                        return;
                      }
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
              className={`px-3 py-1 rounded ${colors.confirm} text-xs font-bold transition-colors`}
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
            {candidates.map((player) => (
              <button
                key={player.id}
                type="button"
                onClick={() =>
                  sendAndCancel({
                    type: "useEquipment",
                    equipmentId: "coffee_mug",
                    payload: {
                      kind: "coffee_mug",
                      targetPlayerId: player.id,
                    },
                  })
                }
                className="px-3 py-1.5 rounded bg-lime-700 hover:bg-lime-600 text-white text-sm font-bold transition-colors"
              >
                {player.name}
              </button>
            ))}
          </div>
        </div>
      );
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
              className={`px-3 py-1 rounded ${colors.confirm} text-xs font-bold transition-colors`}
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
      const sdAllComplete =
        mode.targetPlayerId != null && mode.guessTileIndex != null;
      if (sdAllComplete) {
        const guessValue = me.hand[mode.guessTileIndex!]?.gameValue;
        const targetName = opponents.find(
          (o) => o.id === mode.targetPlayerId,
        )?.name;
        content = (
          <>
            Target: {targetName}&apos;s entire stand. Guess:{" "}
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
                  equipmentId: "super_detector",
                  payload: {
                    kind: "super_detector",
                    targetPlayerId: mode.targetPlayerId!,
                    guessValue,
                  },
                })
              }
              className={`px-3 py-1 rounded ${colors.confirm} text-xs font-bold transition-colors`}
            >
              Confirm Super Detector
            </button>
          );
        }
      } else {
        const parts: string[] = [];
        if (mode.targetPlayerId != null) {
          const targetName = opponents.find(
            (o) => o.id === mode.targetPlayerId,
          )?.name;
          parts.push(`${targetName}'s stand`);
        }
        if (mode.guessTileIndex != null) {
          parts.push(`guess ${String(me.hand[mode.guessTileIndex]?.gameValue)}`);
        }
        const needs: string[] = [];
        if (mode.targetPlayerId == null) needs.push("an opponent's stand");
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
              className={`px-3 py-1 rounded ${colors.confirm} text-xs font-bold transition-colors`}
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
          className={`px-3 py-1 rounded ${colors.confirm} text-xs font-bold transition-colors`}
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
          className={`px-3 py-1 rounded ${colors.confirm} text-xs font-bold transition-colors`}
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
                  className={`px-2 py-1.5 rounded text-sm font-bold transition-colors ${
                    isSelected
                      ? "bg-fuchsia-500 text-white"
                      : "bg-gray-700 hover:bg-gray-600 text-gray-200"
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
            className={`px-3 py-1 rounded ${colors.confirm} text-xs font-bold transition-colors`}
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
          className={`px-3 py-1 rounded ${colors.confirm} text-xs font-bold transition-colors`}
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
            className={`px-3 py-1 rounded ${colors.confirm} text-xs font-bold transition-colors`}
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
      confirmButton={confirmButton}
    >
      {content}
    </ModeWrapper>
  );
}
