import { useEffect, useMemo, useState } from "react";
import type {
  BaseEquipmentId,
  ClientGameState,
  ClientMessage,
  EquipmentGuessValue,
  UseEquipmentPayload,
} from "@bomb-busters/shared";
import { EQUIPMENT_DEFS, wireLabel, resolveMissionSetup, getWirePoolCount } from "@bomb-busters/shared";
import {
  getMission9SequenceGate,
  isMission9BlockedCutValue,
} from "./actionPanelMissionRules.js";

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
  onEnterPostItMode,
}: {
  gameState: ClientGameState;
  send: (msg: ClientMessage) => void;
  playerId: string;
  isMyTurn: boolean;
  selectedTarget: { playerId: string; tileIndex: number } | null;
  selectedGuessTile: number | null;
  onClearTarget: () => void;
  onCutConfirmed: () => void;
  onEnterPostItMode?: () => void;
}) {
  const me = gameState.players.find((p) => p.id === playerId);
  if (!me) return null;

  const byId = useMemo(
    () => new Map(EQUIPMENT_DEFS.map((def) => [def.id, def])),
    [],
  );

  // Check if solo cut is available (all remaining copies in my hand)
  const soloValues = getSoloCutValues(gameState, playerId);
  const mission9HasYellowSoloValue = soloValues.includes("YELLOW");

  // Check if reveal reds is available
  const canRevealReds = checkCanRevealReds(gameState, playerId);
  const forceRevealReds = isMyTurn && canRevealReds;
  const mission11RevealBlockedHint =
    isMyTurn && gameState.mission === 11 && !canRevealReds;

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

  const getCutCountForValue = (value: number): number => {
    let count = 0;
    for (const player of gameState.players) {
      for (const tile of player.hand) {
        if (tile.cut && tile.gameValue === value) count++;
      }
    }
    return count;
  };

  const [selectedSoloValue, setSelectedSoloValue] = useState<
    number | "YELLOW" | null
  >(null);

  const guessValue =
    selectedGuessTile != null ? me.hand[selectedGuessTile]?.gameValue : null;
  const mission9Gate = getMission9SequenceGate(gameState);
  const mission9ActiveValue = mission9Gate?.activeValue;
  const mission9RequiredCuts = mission9Gate?.requiredCuts ?? 2;
  const mission9ActiveProgress = mission9Gate?.activeProgress;
  const isMission9BlockedValue = (value: number | "YELLOW"): boolean =>
    isMission9BlockedCutValue(gameState, value);
  const mission9DualCutBlocked =
    guessValue != null &&
    isMission9BlockedCutValue(gameState, guessValue);

  useEffect(() => {
    if (!(gameState.mission === 9 && typeof mission9ActiveValue === "number")) {
      return;
    }
    setSelectedSoloValue((prev) =>
      typeof prev === "number" && prev !== mission9ActiveValue ? null : prev,
    );
  }, [mission9ActiveValue, gameState.mission]);

  const handleDualCut = () => {
    if (!isMyTurn || !selectedTarget || guessValue == null) return;
    if (mission9DualCutBlocked) return;
    send({
      type: "dualCut",
      targetPlayerId: selectedTarget.playerId,
      targetTileIndex: selectedTarget.tileIndex,
      guessValue: guessValue as number | "YELLOW",
      actorTileIndex: selectedGuessTile ?? undefined,
    });
    onCutConfirmed();
  };

  const useEquipment = (equipmentId: BaseEquipmentId) => {
    if (equipmentId === "post_it") {
      onEnterPostItMode?.();
      return;
    }
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

      {forceRevealReds && (
        <p className="text-sm text-amber-300">
          You must reveal your remaining red wires before taking other actions.
        </p>
      )}

      {mission11RevealBlockedHint && (
        <p className="text-xs text-sky-300" data-testid="mission11-reveal-hint">
          Mission 11: Reveal Reds is only legal when all your remaining wires match the hidden red-like value.
        </p>
      )}

      {gameState.mission === 9 && typeof mission9ActiveValue === "number" && (
        <div
          className="rounded-lg border border-emerald-500/40 bg-emerald-950/25 px-3 py-2 text-xs text-emerald-100 space-y-1"
          data-testid="mission9-action-reminder"
        >
          <div className="font-bold uppercase tracking-wide text-emerald-200">
            Mission 9 Sequence Action Gate
          </div>
          <div>
            Active value: <span className="font-semibold">{mission9ActiveValue}</span> (
            {mission9ActiveProgress}/{mission9RequiredCuts} cuts).
          </div>
          {mission9DualCutBlocked && (
            <div className="text-amber-200">
              Current guess is blocked by sequence priority. Choose value {mission9ActiveValue}.
            </div>
          )}
          {mission9HasYellowSoloValue && (
            <div className="text-emerald-200/90">
              Yellow cuts are not restricted by sequence priority.
            </div>
          )}
        </div>
      )}

      {/* Dual Cut */}
      {isMyTurn && !forceRevealReds && (
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
                  disabled={mission9DualCutBlocked}
                  data-testid="dual-cut-submit"
                  className={`px-4 py-1.5 rounded font-bold text-sm transition-colors ${
                    mission9DualCutBlocked
                      ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700 text-white"
                  }`}
                >
                  {mission9DualCutBlocked
                    ? `Cut blocked (need ${mission9ActiveValue})`
                    : `Cut! (Guess: ${String(guessValue)})`}
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
      {isMyTurn && !forceRevealReds && soloValues.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-bold text-gray-400 uppercase">
            Solo Cut
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {soloValues.map((v) => {
              const blockedBySequence = isMission9BlockedValue(v);
              return (
                <button
                  key={String(v)}
                  onClick={() =>
                    setSelectedSoloValue(selectedSoloValue === v ? null : v)
                  }
                  disabled={blockedBySequence}
                  data-testid={`solo-cut-${String(v).toLowerCase()}`}
                  className={`px-3 py-1.5 rounded font-bold text-sm transition-colors ${
                    blockedBySequence
                      ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                      : selectedSoloValue === v
                        ? "bg-yellow-500 text-black"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  {String(v)}
                </button>
              );
            })}
            {selectedSoloValue != null && !isMission9BlockedValue(selectedSoloValue) && (
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
              const timingAllowsUse =
                timing === "anytime" ||
                (timing === "in_turn" && isMyTurn) ||
                (timing === "start_of_turn" && isMyTurn);
              const secondaryValue = equipment.secondaryLockValue;
              const secondaryRequired = equipment.secondaryLockCutsRequired ?? 2;
              const secondaryProgress =
                secondaryValue !== undefined
                  ? getCutCountForValue(secondaryValue)
                  : secondaryRequired;
              const secondaryLocked =
                secondaryValue !== undefined &&
                secondaryProgress < secondaryRequired;
              const blockedByForcedReveal = forceRevealReds && isMyTurn;
              const canUse = timingAllowsUse && !secondaryLocked && !blockedByForcedReveal;

              return (
                <button
                  key={equipment.id}
                  onClick={() => useEquipment(equipment.id)}
                  disabled={!canUse}
                  className={`px-3 py-1.5 rounded font-bold text-sm transition-colors ${
                    canUse
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : secondaryLocked
                        ? "bg-amber-900/60 text-amber-200 cursor-not-allowed"
                        : "bg-gray-700 text-gray-400 cursor-not-allowed"
                  }`}
                  title={
                    blockedByForcedReveal
                      ? "Reveal your remaining red wires first"
                      : secondaryLocked
                      ? `${equipment.name} locked: ${secondaryValue} ${Math.min(secondaryProgress, secondaryRequired)}/${secondaryRequired}`
                      : canUse
                        ? `${equipment.name} (${timing})`
                        : `${equipment.name} is only usable ${timing.replaceAll("_", " ")}`
                  }
                >
                  Use {equipment.name}
                  {secondaryLocked ? ` (${secondaryValue}: ${Math.min(secondaryProgress, secondaryRequired)}/${secondaryRequired})` : ""}
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
    case "post_it":
      return null;
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

export function getSoloCutValues(
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
      // Yellow wire: count total yellows from mission schema, subtract visible cut yellows.
      const { setup } = resolveMissionSetup(state.mission, state.players.length);
      const totalYellowsInGame = getWirePoolCount(setup.yellow);
      const allCutYellows = state.players.reduce(
        (sum, p) => sum + p.hand.filter((t) => t.cut && t.color === "yellow").length,
        0,
      );
      const remainingYellows = totalYellowsInGame - allCutYellows;
      if (myCount >= remainingYellows && remainingYellows > 0) {
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
