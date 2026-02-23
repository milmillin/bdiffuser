import { useMemo, useState } from "react";
import type {
  BaseEquipmentId,
  ClientGameState,
  ClientMessage,
  EquipmentGuessValue,
  UseEquipmentPayload,
} from "@bomb-busters/shared";
import { EQUIPMENT_DEFS, wireLabel } from "@bomb-busters/shared";

const BASE_EQUIPMENT_IDS: readonly BaseEquipmentId[] = [
  "label_neq",
  "talkies_walkies",
  "triple_detector",
  "post_it",
  "super_detector",
  "rewinder",
  "emergency_batteries",
  "general_radar",
  "stabilizer",
  "x_or_y_ray",
  "coffee_thermos",
  "label_eq",
] as const;
const BASE_EQUIPMENT_SET = new Set<string>(BASE_EQUIPMENT_IDS);

function isBaseEquipmentId(id: string): id is BaseEquipmentId {
  return BASE_EQUIPMENT_SET.has(id);
}

export function ActionPanel({
  gameState,
  send,
  playerId,
  isMyTurn,
  selectedTarget,
  selectedGuessTile,
  onClearTarget,
  onCutConfirmed,
}: {
  gameState: ClientGameState;
  send: (msg: ClientMessage) => void;
  playerId: string;
  isMyTurn: boolean;
  selectedTarget: { playerId: string; tileIndex: number } | null;
  selectedGuessTile: number | null;
  onClearTarget: () => void;
  onCutConfirmed: () => void;
}) {
  const me = gameState.players.find((p) => p.id === playerId);
  if (!me) return null;

  const byId = useMemo(
    () => new Map(EQUIPMENT_DEFS.map((def) => [def.id, def])),
    [],
  );

  // Check if solo cut is available (all remaining copies in my hand)
  const soloValues = getSoloCutValues(gameState, playerId);

  // Check if reveal reds is available
  const canRevealReds = checkCanRevealReds(gameState, playerId);

  const availableEquipment = gameState.board.equipment.filter(
    (
      equipment,
    ): equipment is (typeof gameState.board.equipment)[number] & {
      id: BaseEquipmentId;
    } =>
      !equipment.used &&
      equipment.unlocked &&
      isBaseEquipmentId(equipment.id),
  );

  const [selectedSoloValue, setSelectedSoloValue] = useState<
    number | "YELLOW" | null
  >(null);

  const guessValue =
    selectedGuessTile != null ? me.hand[selectedGuessTile]?.gameValue : null;

  const handleDualCut = () => {
    if (!isMyTurn || !selectedTarget || guessValue == null) return;
    send({
      type: "dualCut",
      targetPlayerId: selectedTarget.playerId,
      targetTileIndex: selectedTarget.tileIndex,
      guessValue: guessValue as number | "YELLOW",
    });
    onCutConfirmed();
  };

  const useEquipment = (equipmentId: BaseEquipmentId) => {
    const payload = buildEquipmentPayload(gameState, playerId, equipmentId);
    if (!payload) return;
    send({
      type: "useEquipment",
      equipmentId,
      payload,
    });
    onCutConfirmed();
  };

  return (
    <div
      className="bg-[var(--color-bomb-surface)] rounded-xl p-3 space-y-3"
      data-testid="action-panel"
    >
      <div className="text-sm font-bold text-yellow-400">
        {isMyTurn ? "Your Turn - Choose an Action" : "Equipment Actions"}
      </div>

      {/* Dual Cut */}
      {isMyTurn && (
        <div className="space-y-2">
          <div className="text-xs font-bold text-gray-400 uppercase">
            Dual Cut
          </div>
          {!selectedTarget ? (
            <p className="text-sm text-gray-400">
              Click a wire on an opponent&apos;s stand to target it
            </p>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-300" data-testid="dual-cut-target">
                Targeting{" "}
                {
                  gameState.players.find((p) => p.id === selectedTarget.playerId)
                    ?.name
                }
                &apos;s wire {wireLabel(selectedTarget.tileIndex)}
              </span>
              <button
                onClick={onClearTarget}
                data-testid="dual-cut-cancel"
                className="text-xs text-red-400 hover:text-red-300"
              >
                Cancel
              </button>
              {guessValue != null ? (
                <button
                  onClick={handleDualCut}
                  data-testid="dual-cut-submit"
                  className="px-4 py-1.5 bg-green-600 hover:bg-green-700 rounded font-bold text-sm transition-colors"
                >
                  Cut! (Guess: {String(guessValue)})
                </button>
              ) : (
                <span className="text-sm text-gray-400">
                  - click one of your wires below to guess its value
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Solo Cut */}
      {isMyTurn && soloValues.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-bold text-gray-400 uppercase">
            Solo Cut
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {soloValues.map((v) => (
              <button
                key={String(v)}
                onClick={() =>
                  setSelectedSoloValue(selectedSoloValue === v ? null : v)
                }
                data-testid={`solo-cut-${String(v).toLowerCase()}`}
                className={`px-3 py-1.5 rounded font-bold text-sm transition-colors ${
                  selectedSoloValue === v
                    ? "bg-yellow-500 text-black"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                {String(v)}
              </button>
            ))}
            {selectedSoloValue != null && (
              <button
                onClick={() => {
                  send({ type: "soloCut", value: selectedSoloValue });
                  setSelectedSoloValue(null);
                }}
                data-testid="solo-cut-submit"
                className="px-4 py-1.5 bg-green-600 hover:bg-green-700 rounded font-bold text-sm transition-colors"
              >
                Solo Cut! ({String(selectedSoloValue)})
              </button>
            )}
          </div>
        </div>
      )}

      {/* Reveal Reds */}
      {isMyTurn && canRevealReds && (
        <div>
          <button
            onClick={() => send({ type: "revealReds" })}
            data-testid="reveal-reds"
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded font-bold text-sm transition-colors"
          >
            Reveal All Red Wires
          </button>
        </div>
      )}

      {/* Equipment */}
      {availableEquipment.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-bold text-gray-400 uppercase">
            Equipment
          </div>
          <div className="flex flex-wrap gap-2">
            {availableEquipment.map((equipment) => {
              const def = byId.get(equipment.id);
              const timing = def?.useTiming ?? "anytime";
              const canUse =
                timing === "anytime" ||
                (timing === "in_turn" && isMyTurn) ||
                (timing === "start_of_turn" && isMyTurn);

              return (
                <button
                  key={equipment.id}
                  onClick={() => useEquipment(equipment.id)}
                  disabled={!canUse}
                  className={`px-3 py-1.5 rounded font-bold text-sm transition-colors ${
                    canUse
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-gray-700 text-gray-400 cursor-not-allowed"
                  }`}
                  title={
                    canUse
                      ? `${equipment.name} (${timing})`
                      : `${equipment.name} is only usable ${timing.replaceAll("_", " ")}`
                  }
                >
                  Use {equipment.name}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-500">
            For cards requiring targets/values, prompts will ask for stand and wire indices.
          </p>
        </div>
      )}
    </div>
  );
}

function parsePromptIndex(
  promptText: string,
  min: number,
  max: number,
): number | null {
  const raw = window.prompt(promptText);
  if (raw == null) return null;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    window.alert(`Please enter an integer between ${min} and ${max}.`);
    return null;
  }
  return parsed;
}

function parseGuessValue(value: string): EquipmentGuessValue | null {
  const normalized = value.trim().toUpperCase();
  if (normalized === "Y" || normalized === "YELLOW") return "YELLOW";
  const numeric = Number(normalized);
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 12) {
    return numeric;
  }
  return null;
}

function choosePlayerByPrompt(
  candidates: { id: string; name: string }[],
  title: string,
): string | null {
  if (candidates.length === 0) return null;
  const options = candidates
    .map((player, index) => `${index}: ${player.name}`)
    .join("\n");
  const selected = parsePromptIndex(`${title}\n${options}`, 0, candidates.length - 1);
  if (selected == null) return null;
  return candidates[selected]?.id ?? null;
}

function buildEquipmentPayload(
  gameState: ClientGameState,
  playerId: string,
  equipmentId: BaseEquipmentId,
): UseEquipmentPayload | null {
  const me = gameState.players.find((player) => player.id === playerId);
  if (!me) return null;

  switch (equipmentId) {
    case "rewinder":
      return { kind: "rewinder" };
    case "stabilizer":
      return { kind: "stabilizer" };
    case "general_radar": {
      const value = parsePromptIndex("General Radar value (1-12):", 1, 12);
      if (value == null) return null;
      return { kind: "general_radar", value };
    }
    case "post_it": {
      const tileIndex = parsePromptIndex(
        `Post-it: choose your blue wire index (0-${me.hand.length - 1}):`,
        0,
        Math.max(0, me.hand.length - 1),
      );
      if (tileIndex == null) return null;
      const tile = me.hand[tileIndex];
      if (!tile || tile.cut || tile.color !== "blue" || typeof tile.gameValue !== "number") {
        window.alert("Post-it requires one of your uncut blue wires.");
        return null;
      }
      return { kind: "post_it", tileIndex, value: tile.gameValue };
    }
    case "label_eq":
    case "label_neq": {
      const tileIndexA = parsePromptIndex(
        `Choose first wire index (0-${me.hand.length - 1}):`,
        0,
        Math.max(0, me.hand.length - 1),
      );
      if (tileIndexA == null) return null;
      const tileIndexB = parsePromptIndex(
        `Choose second adjacent wire index (0-${me.hand.length - 1}):`,
        0,
        Math.max(0, me.hand.length - 1),
      );
      if (tileIndexB == null) return null;
      return equipmentId === "label_eq"
        ? { kind: "label_eq", tileIndexA, tileIndexB }
        : { kind: "label_neq", tileIndexA, tileIndexB };
    }
    case "talkies_walkies": {
      const teammates = gameState.players.filter((player) => player.id !== playerId);
      const teammateId = choosePlayerByPrompt(
        teammates,
        "Talkies-Walkies: choose teammate index:",
      );
      if (!teammateId) return null;
      const teammate = gameState.players.find((player) => player.id === teammateId);
      if (!teammate) return null;

      const myTileIndex = parsePromptIndex(
        `Choose your uncut wire index (0-${me.hand.length - 1}):`,
        0,
        Math.max(0, me.hand.length - 1),
      );
      if (myTileIndex == null) return null;
      const teammateTileIndex = parsePromptIndex(
        `Choose ${teammate.name}'s wire index (0-${teammate.hand.length - 1}):`,
        0,
        Math.max(0, teammate.hand.length - 1),
      );
      if (teammateTileIndex == null) return null;

      return {
        kind: "talkies_walkies",
        teammateId,
        myTileIndex,
        teammateTileIndex,
      };
    }
    case "emergency_batteries": {
      const usedPlayers = gameState.players.filter((player) => player.characterUsed);
      if (usedPlayers.length === 0) {
        window.alert("No used character cards are available to recharge.");
        return null;
      }
      const options = usedPlayers
        .map((player, index) => `${index}: ${player.name}`)
        .join("\n");
      const raw = window.prompt(
        `Emergency Batteries: choose 1-2 player indices (comma-separated)\n${options}`,
      );
      if (raw == null) return null;
      const parsed = raw
        .split(",")
        .map((part) => Number(part.trim()))
        .filter((n) => Number.isInteger(n));
      if (parsed.length < 1 || parsed.length > 2) {
        window.alert("Please choose one or two players.");
        return null;
      }
      const ids = [...new Set(parsed)]
        .map((index) => usedPlayers[index]?.id)
        .filter((id): id is string => Boolean(id));
      if (ids.length < 1 || ids.length > 2) {
        window.alert("Invalid player selection.");
        return null;
      }
      return { kind: "emergency_batteries", playerIds: ids };
    }
    case "coffee_thermos": {
      const candidates = gameState.players.filter(
        (player) =>
          player.id !== playerId &&
          player.hand.some((tile) => !tile.cut),
      );
      const targetPlayerId = choosePlayerByPrompt(
        candidates,
        "Coffee Thermos: choose next active player index:",
      );
      if (!targetPlayerId) return null;
      return { kind: "coffee_thermos", targetPlayerId };
    }
    case "triple_detector": {
      const candidates = gameState.players.filter((player) => player.id !== playerId);
      const targetPlayerId = choosePlayerByPrompt(
        candidates,
        "Triple Detector: choose target player index:",
      );
      if (!targetPlayerId) return null;
      const target = gameState.players.find((player) => player.id === targetPlayerId);
      if (!target) return null;

      const rawIndices = window.prompt(
        `Triple Detector: enter 3 target indices from ${target.name}'s stand (comma-separated, 0-${target.hand.length - 1})`,
      );
      if (rawIndices == null) return null;
      const targetTileIndices = rawIndices
        .split(",")
        .map((part) => Number(part.trim()))
        .filter((n) => Number.isInteger(n));
      const guessValue = parsePromptIndex("Triple Detector guess value (1-12):", 1, 12);
      if (guessValue == null) return null;
      return {
        kind: "triple_detector",
        targetPlayerId,
        targetTileIndices,
        guessValue,
      };
    }
    case "super_detector": {
      const candidates = gameState.players.filter((player) => player.id !== playerId);
      const targetPlayerId = choosePlayerByPrompt(
        candidates,
        "Super Detector: choose target player index:",
      );
      if (!targetPlayerId) return null;
      const guessValue = parsePromptIndex("Super Detector guess value (1-12):", 1, 12);
      if (guessValue == null) return null;
      return { kind: "super_detector", targetPlayerId, guessValue };
    }
    case "x_or_y_ray": {
      const candidates = gameState.players.filter((player) => player.id !== playerId);
      const targetPlayerId = choosePlayerByPrompt(
        candidates,
        "X or Y Ray: choose target player index:",
      );
      if (!targetPlayerId) return null;
      const target = gameState.players.find((player) => player.id === targetPlayerId);
      if (!target) return null;
      const targetTileIndex = parsePromptIndex(
        `X or Y Ray: choose target wire index (0-${target.hand.length - 1}):`,
        0,
        Math.max(0, target.hand.length - 1),
      );
      if (targetTileIndex == null) return null;
      const rawA = window.prompt("X or Y Ray: first announced value (1-12 or YELLOW):");
      if (rawA == null) return null;
      const rawB = window.prompt("X or Y Ray: second announced value (1-12 or YELLOW):");
      if (rawB == null) return null;
      const guessValueA = parseGuessValue(rawA);
      const guessValueB = parseGuessValue(rawB);
      if (!guessValueA || !guessValueB) {
        window.alert("Both announced values must be 1-12 or YELLOW.");
        return null;
      }
      return {
        kind: "x_or_y_ray",
        targetPlayerId,
        targetTileIndex,
        guessValueA,
        guessValueB,
      };
    }
  }
}

function getSoloCutValues(
  state: ClientGameState,
  playerId: string,
): (number | "YELLOW")[] {
  const me = state.players.find((p) => p.id === playerId);
  if (!me) return [];

  const myUncut = me.hand.filter((t) => !t.cut);
  const values: (number | "YELLOW")[] = [];

  // Group my uncut tiles by game value
  const valueCounts = new Map<string, number>();
  for (const tile of myUncut) {
    if (tile.gameValue == null || tile.gameValue === "RED") continue;
    const key = String(tile.gameValue);
    valueCounts.set(key, (valueCounts.get(key) ?? 0) + 1);
  }

  for (const [key, myCount] of valueCounts) {
    const value = key === "YELLOW" ? "YELLOW" : Number(key);

    if (typeof value === "number") {
      // Blue wire: 4 copies total in the game.
      // Remaining = 4 - already cut (from validation track).
      // Solo cut requires all remaining copies to be in my hand.
      const alreadyCut = state.board.validationTrack[value] ?? 0;
      const remaining = 4 - alreadyCut;
      if (myCount >= remaining && remaining > 0) {
        values.push(value);
      }
    } else {
      // Yellow wire: only offer when opponents have no hidden uncut tiles.
      const opponentsHaveUncut = state.players.some(
        (p) => p.id !== playerId && p.hand.some((t) => !t.cut && t.gameValue == null),
      );
      if (!opponentsHaveUncut && myCount >= 1) {
        values.push("YELLOW");
      }
    }
  }

  return values;
}

function checkCanRevealReds(
  state: ClientGameState,
  playerId: string,
): boolean {
  const me = state.players.find((p) => p.id === playerId);
  if (!me) return false;

  const uncutTiles = me.hand.filter((t) => !t.cut);
  if (uncutTiles.length === 0) return false;

  return uncutTiles.every((t) => t.color === "red");
}
