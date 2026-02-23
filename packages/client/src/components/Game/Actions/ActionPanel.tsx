import { useEffect, useMemo, useState } from "react";
import type {
  BaseEquipmentId,
  ClientGameState,
  ClientMessage,
} from "@bomb-busters/shared";
import { BLUE_COPIES_PER_VALUE, EQUIPMENT_DEFS, wireLabel, resolveMissionSetup, getWirePoolCount } from "@bomb-busters/shared";
import {
  getMission9SequenceGate,
  isMission9BlockedCutValue,
} from "./actionPanelMissionRules.js";
import type { EquipmentMode } from "./EquipmentModePanel.js";

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

const DUAL_CUT_STEPS = [
  { num: 1, label: "Target" },
  { num: 2, label: "Guess" },
  { num: 3, label: "Cut" },
] as const;

function DualCutStepIndicator({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-1 text-xs">
      {DUAL_CUT_STEPS.map((s, i) => (
        <span key={s.num} className="flex items-center gap-1">
          {i > 0 && <span className="text-gray-600">&mdash;</span>}
          <span
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full font-bold ${
              s.num < step
                ? "bg-blue-500/20 text-blue-400"
                : s.num === step
                  ? step === 3
                    ? "bg-green-500 text-white"
                    : "bg-blue-500 text-white"
                  : "bg-gray-700 text-gray-500"
            }`}
          >
            {s.num} {s.label}
          </span>
        </span>
      ))}
    </div>
  );
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
  onEnterEquipmentMode,
}: {
  gameState: ClientGameState;
  send: (msg: ClientMessage) => void;
  playerId: string;
  isMyTurn: boolean;
  selectedTarget: { playerId: string; tileIndex: number } | null;
  selectedGuessTile: number | null;
  onClearTarget: () => void;
  onCutConfirmed: () => void;
  onEnterEquipmentMode: (mode: EquipmentMode) => void;
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

  const dualCutStep: 1 | 2 | 3 = !selectedTarget ? 1 : guessValue == null ? 2 : 3;

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
    if (equipmentId === "rewinder") {
      send({ type: "useEquipment", equipmentId: "rewinder", payload: { kind: "rewinder" } });
      onCutConfirmed();
      return;
    }
    if (equipmentId === "stabilizer") {
      send({ type: "useEquipment", equipmentId: "stabilizer", payload: { kind: "stabilizer" } });
      onCutConfirmed();
      return;
    }
    const initialMode = getInitialEquipmentMode(equipmentId);
    if (initialMode) onEnterEquipmentMode(initialMode);
  };

  return (
    <div
      className="bg-[var(--color-bomb-surface)] rounded-xl p-3 space-y-3"
      data-testid="action-panel"
    >
      {/* Header */}
      <div className={`flex items-center gap-2 pb-2 ${isMyTurn ? "border-b border-yellow-500/30" : "border-b border-gray-700"}`}>
        {isMyTurn ? (
          <>
            <span className="bg-yellow-500 text-black font-black uppercase text-xs px-2 py-0.5 rounded-full">
              Your Turn
            </span>
            <span className="text-sm font-bold text-yellow-400">Choose an Action</span>
          </>
        ) : (
          <span className="text-sm font-bold text-gray-400">Equipment Actions</span>
        )}
      </div>

      {mission11RevealBlockedHint && (
        <p className="text-xs text-sky-300" data-testid="mission11-reveal-hint">
          Mission 11: Reveal Reds requires all remaining wires to match the hidden red value.
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
        <div className="rounded-lg px-3 py-2.5 space-y-2 border border-blue-500/40 bg-blue-950/15">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-blue-300 uppercase">
              Dual Cut
            </div>
            <DualCutStepIndicator step={dualCutStep} />
          </div>
          {!selectedTarget ? (
            <p className="text-sm text-gray-400">
              Select a wire on an opponent&apos;s stand
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
                  className={`px-5 py-2.5 rounded-lg font-black text-base transition-colors ${
                    mission9DualCutBlocked
                      ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/50"
                  }`}
                >
                  {mission9DualCutBlocked
                    ? `Cut blocked (need ${mission9ActiveValue})`
                    : `Cut! (Guess: ${String(guessValue)})`}
                </button>
              ) : (
                <span className="text-sm text-gray-400">
                  Now select one of your wires as your guess
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Solo Cut */}
      {isMyTurn && !forceRevealReds && soloValues.length > 0 && (
        <div className="rounded-lg px-3 py-2.5 space-y-2 border border-violet-500/40 bg-violet-950/15">
          <div className="text-xs font-bold text-violet-300 uppercase">
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
                  className={`px-4 py-2 rounded-lg font-black text-base min-w-[3rem] transition-colors ${
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
                className="px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-black text-base shadow-lg shadow-green-900/50 transition-colors"
              >
                Solo Cut! ({String(selectedSoloValue)})
              </button>
            )}
          </div>
        </div>
      )}

      {/* Reveal Reds */}
      {isMyTurn && canRevealReds && (
        <div className={`rounded-lg px-3 py-2.5 space-y-2 border border-red-500/40 bg-red-950/15 ${forceRevealReds ? "animate-pulse" : ""}`}>
          <div className="text-xs font-bold text-red-300 uppercase">
            Reveal Reds
          </div>
          {forceRevealReds && (
            <p className="text-sm text-amber-300">
              You must reveal your remaining red wires before taking other actions.
            </p>
          )}
          <button
            onClick={() => send({ type: "revealReds" })}
            data-testid="reveal-reds"
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 rounded-lg font-black text-base shadow-lg shadow-red-900/50 transition-colors"
          >
            Reveal All Red Wires
          </button>
        </div>
      )}

      {/* Equipment */}
      {availableEquipment.length > 0 && (
        <div className="rounded-lg px-3 py-2.5 space-y-2 border border-emerald-500/40 bg-emerald-950/15">
          <div className="text-xs font-bold text-emerald-300 uppercase">
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
        </div>
      )}
    </div>
  );
}

function getInitialEquipmentMode(equipmentId: BaseEquipmentId): EquipmentMode | null {
  switch (equipmentId) {
    case "post_it":
      return { kind: "post_it" };
    case "general_radar":
      return { kind: "general_radar" };
    case "label_eq":
      return { kind: "label_eq", firstTileIndex: null };
    case "label_neq":
      return { kind: "label_neq", firstTileIndex: null };
    case "talkies_walkies":
      return { kind: "talkies_walkies", teammateId: null, teammateTileIndex: null, myTileIndex: null };
    case "emergency_batteries":
      return { kind: "emergency_batteries", selectedPlayerIds: [] };
    case "coffee_thermos":
      return { kind: "coffee_thermos" };
    case "triple_detector":
      return { kind: "triple_detector", targetPlayerId: null, targetTileIndices: [], guessTileIndex: null };
    case "super_detector":
      return { kind: "super_detector", targetPlayerId: null, guessTileIndex: null };
    case "x_or_y_ray":
      return { kind: "x_or_y_ray", targetPlayerId: null, targetTileIndex: null, guessATileIndex: null, guessBTileIndex: null };
    default:
      return null;
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
      const remaining = BLUE_COPIES_PER_VALUE - alreadyCut;
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
