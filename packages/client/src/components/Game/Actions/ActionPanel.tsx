import { useEffect, useMemo, useRef, useState } from "react";
import type {
  BaseEquipmentId,
  CharacterId,
  ClientGameState,
  ClientMessage,
} from "@bomb-busters/shared";
import { BLUE_COPIES_PER_VALUE, CHARACTER_CARD_TEXT, EQUIPMENT_DEFS, wireLabel, resolveMissionSetup, getWirePoolCount } from "@bomb-busters/shared";
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
  { num: 1, label: "Guess" },
  { num: 2, label: "Target" },
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

/* Improvement #4: Timing-to-color map for equipment buttons */
const TIMING_ORDER = ["anytime", "in_turn", "start_of_turn"] as const;
const TIMING_COLORS: Record<string, { bg: string; hover: string; label: string }> = {
  anytime: { bg: "bg-emerald-600", hover: "hover:bg-emerald-700", label: "anytime" },
  in_turn: { bg: "bg-blue-600", hover: "hover:bg-blue-700", label: "in turn" },
  start_of_turn: { bg: "bg-amber-600", hover: "hover:bg-amber-700", label: "start of turn" },
};

export function ActionPanel({
  gameState,
  send,
  playerId,
  isMyTurn,
  selectedTarget,
  selectedGuessTile,
  dualCutActive,
  onToggleDualCut,
  onClearTarget,
  onCutConfirmed,
  onEnterEquipmentMode,
  currentPlayerName,
  isCurrentPlayerBot,
  character,
  characterUsed,
  onUseCharacterAbility,
}: {
  gameState: ClientGameState;
  send: (msg: ClientMessage) => void;
  playerId: string;
  isMyTurn: boolean;
  selectedTarget: { playerId: string; tileIndex: number } | null;
  selectedGuessTile: number | null;
  dualCutActive: boolean;
  onToggleDualCut: () => void;
  onClearTarget: () => void;
  onCutConfirmed: () => void;
  onEnterEquipmentMode: (mode: EquipmentMode) => void;
  currentPlayerName: string | undefined;
  isCurrentPlayerBot: boolean;
  character: CharacterId | null;
  characterUsed: boolean;
  onUseCharacterAbility: (() => void) | undefined;
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

  // Improvement #4: Sort equipment by timing (anytime -> in_turn -> start_of_turn)
  const sortedEquipment = [...availableEquipment].sort((a, b) => {
    const aDef = byId.get(a.id);
    const bDef = byId.get(b.id);
    const aIdx = TIMING_ORDER.indexOf((aDef?.useTiming ?? "anytime") as (typeof TIMING_ORDER)[number]);
    const bIdx = TIMING_ORDER.indexOf((bDef?.useTiming ?? "anytime") as (typeof TIMING_ORDER)[number]);
    return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
  });

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

  // Improvement #3: Auto-clear solo cut selection after 3 seconds
  const soloTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (soloTimerRef.current) clearTimeout(soloTimerRef.current);
    if (selectedSoloValue != null) {
      soloTimerRef.current = setTimeout(() => setSelectedSoloValue(null), 3000);
    }
    return () => { if (soloTimerRef.current) clearTimeout(soloTimerRef.current); };
  }, [selectedSoloValue]);

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

  const dualCutStep: 1 | 2 | 3 = guessValue == null ? 1 : !selectedTarget ? 2 : 3;

  useEffect(() => {
    if (gameState.mission !== 9) return;
    setSelectedSoloValue((prev) =>
      prev != null && isMission9BlockedCutValue(gameState, prev) ? null : prev,
    );
  }, [mission9ActiveValue, gameState.mission]);

  // Improvement #1: Compute turn distance for waiting state
  const myIndex = gameState.players.findIndex((p) => p.id === playerId);
  const turnDistance = myIndex >= 0
    ? (myIndex - gameState.currentPlayerIndex + gameState.players.length) % gameState.players.length
    : 0;

  // Improvement #5: Game summary stats
  const validatedCount = Object.values(gameState.board.validationTrack).filter(
    (count) => count >= BLUE_COPIES_PER_VALUE,
  ).length;
  const myUncutCount = me.hand.filter((t) => !t.cut).length;

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
      {/* Header — Improvement #1: Stronger "Your Turn" + turn distance */}
      {isMyTurn ? (
        <div className="flex items-center gap-2 pb-2 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 -mx-3 -mt-3 px-3 pt-3 rounded-t-xl border-b-2 border-yellow-500">
          <span className="bg-yellow-500 text-black font-black uppercase text-sm px-2 py-0.5 rounded-full">
            Your Turn
          </span>
          <span className="text-sm font-bold text-yellow-400">Choose an Action</span>
        </div>
      ) : (
        <div className="pb-2 border-b border-gray-700 space-y-2">
          <span className="text-sm text-gray-400" data-testid="waiting-turn">
            {isCurrentPlayerBot ? (
              <span className="inline-flex items-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-purple-300 font-bold">{currentPlayerName}</span> is thinking...
              </span>
            ) : (
              <>
                Waiting for <span className="text-white font-bold">{currentPlayerName}</span>&apos;s turn
                {turnDistance === 1 ? (
                  <span className="text-yellow-400 font-bold"> (you&apos;re next!)</span>
                ) : turnDistance > 1 ? (
                  <span className="text-gray-500"> ({turnDistance} more until yours)</span>
                ) : null}
              </>
            )}
          </span>

          {/* Improvement #5: Game summary stats in waiting state */}
          <div className="flex items-center gap-3 text-xs" data-testid="game-summary">
            <span>
              <span className="text-gray-500">Detonator: </span>
              <span className={`font-bold ${gameState.board.detonatorPosition >= gameState.board.detonatorMax - 1 ? "text-red-400" : "text-gray-300"}`}>
                {gameState.board.detonatorPosition}/{gameState.board.detonatorMax}
              </span>
            </span>
            <span className="text-gray-600">|</span>
            <span>
              <span className="text-gray-500">Validated: </span>
              <span className="font-bold text-gray-300">{validatedCount}/12</span>
            </span>
            <span className="text-gray-600">|</span>
            <span>
              <span className="text-gray-500">My wires: </span>
              <span className="font-bold text-gray-300">{myUncutCount} uncut</span>
            </span>
          </div>
        </div>
      )}

      {mission11RevealBlockedHint && (
        <p className="text-xs text-sky-300" data-testid="mission11-reveal-hint">
          Mission 11: Reveal Reds requires all remaining wires to match the hidden red value.
        </p>
      )}

      {gameState.mission === 9 && typeof mission9ActiveValue === "number" && (
        <div
          className="rounded-lg border border-emerald-500/50 bg-emerald-950/25 px-3 py-2 text-xs text-emerald-100 space-y-1"
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

      {/* Dual Cut — Action-first flow with toggle */}
      {isMyTurn && !forceRevealReds && (
        !dualCutActive ? (
          <div className="rounded-lg px-3 py-2.5 space-y-2 border border-blue-500/50 bg-blue-950/15">
            <div className="text-xs font-bold text-blue-300 uppercase">
              Dual Cut
            </div>
            <button
              onClick={onToggleDualCut}
              data-testid="dual-cut-activate"
              className="px-4 py-2 rounded-lg font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
              Dual Cut
            </button>
          </div>
        ) : guessValue == null ? (
          <div className="rounded-lg px-3 py-2.5 space-y-2 border border-blue-500/50 bg-blue-950/15">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-blue-300 uppercase">
                Dual Cut
              </div>
              <DualCutStepIndicator step={1} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Select one of your wires as your guess</span>
              <button
                onClick={onToggleDualCut}
                data-testid="dual-cut-cancel"
                className="text-xs text-red-400 hover:text-red-300"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : !selectedTarget ? (
          <div className="rounded-lg px-3 py-2.5 space-y-2 border border-blue-500/50 bg-blue-950/15">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-blue-300 uppercase">
                Dual Cut
              </div>
              <DualCutStepIndicator step={2} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-300" data-testid="dual-cut-out-wire">
                Guess: wire {wireLabel(selectedGuessTile!)} (value: {String(guessValue)})
              </span>
              <span className="text-sm text-gray-400">Select a wire on an opponent&apos;s stand</span>
              <button
                onClick={onClearTarget}
                data-testid="dual-cut-cancel"
                className="text-xs text-red-400 hover:text-red-300"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-lg px-3 py-2.5 space-y-2 border border-blue-500/50 bg-blue-950/15">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-blue-300 uppercase">
                Dual Cut
              </div>
              <DualCutStepIndicator step={3} />
            </div>
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
            </div>
          </div>
        )
      )}

      {/* Solo Cut — Improvement #3: Inline confirmation (click-to-select, click-again-to-confirm) */}
      {isMyTurn && !forceRevealReds && soloValues.length > 0 && (
        <div className="rounded-lg px-3 py-2.5 space-y-2 border border-violet-500/50 bg-violet-950/15">
          <div className="text-xs font-bold text-violet-300 uppercase">
            Solo Cut
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {soloValues.map((v) => {
              const blockedBySequence = isMission9BlockedValue(v);
              const isConfirming = selectedSoloValue === v;
              return (
                <button
                  key={String(v)}
                  onClick={() => {
                    if (isConfirming) {
                      send({ type: "soloCut", value: v });
                      setSelectedSoloValue(null);
                    } else {
                      setSelectedSoloValue(v);
                    }
                  }}
                  disabled={blockedBySequence}
                  data-testid={isConfirming ? "solo-cut-submit" : `solo-cut-${String(v).toLowerCase()}`}
                  className={`px-4 py-2 rounded-lg font-black text-base min-w-[3rem] transition-colors ${
                    blockedBySequence
                      ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                      : isConfirming
                        ? "bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/50"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  {isConfirming ? `Confirm ${String(v)}` : String(v)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Reveal Reds */}
      {isMyTurn && canRevealReds && (
        <div className={`rounded-lg px-3 py-2.5 space-y-2 border border-red-500/50 bg-red-950/15 ${forceRevealReds ? "animate-pulse" : ""}`}>
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

      {/* Personal Skill — Improvement #7: Collapse when used */}
      {character != null && (() => {
        const cardText = CHARACTER_CARD_TEXT[character];
        const canUseSkill = isMyTurn && !forceRevealReds && !characterUsed && !!onUseCharacterAbility;

        if (characterUsed) {
          return (
            <div className="flex items-center gap-2 text-xs text-gray-500 py-1" data-testid="personal-skill-section">
              <span className="font-bold uppercase">Personal Skill</span>
              <span>&mdash; {cardText.abilityName}</span>
              <span className="bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded-full text-[10px] font-bold" data-testid="skill-used-badge">Used</span>
            </div>
          );
        }

        const skillDisabledReason = !canUseSkill
          ? !isMyTurn
            ? "Your turn only"
            : forceRevealReds
              ? "Reveal reds first"
              : undefined
          : undefined;

        return (
          <div className="rounded-lg px-3 py-2.5 space-y-2 border border-fuchsia-500/50 bg-fuchsia-950/15" data-testid="personal-skill-section">
            <div className="text-xs font-bold text-fuchsia-300 uppercase">
              Personal Skill — {cardText.abilityName}
            </div>
            {isMyTurn && <p className="text-xs text-gray-400">{cardText.timing}</p>}
            <div>
              <button
                onClick={onUseCharacterAbility}
                disabled={!canUseSkill}
                data-testid="use-skill-button"
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
                  canUseSkill
                    ? "bg-fuchsia-600 hover:bg-fuchsia-700 text-white"
                    : "bg-gray-700 text-gray-400 cursor-not-allowed"
                }`}
                title={
                  !isMyTurn
                    ? "Can only use during your turn"
                    : forceRevealReds
                      ? "Reveal your remaining red wires first"
                      : undefined
                }
              >
                Use Skill
              </button>
              {skillDisabledReason && (
                <p className="text-[10px] text-gray-500 mt-1">{skillDisabledReason}</p>
              )}
            </div>
          </div>
        );
      })()}

      {/* Equipment — Improvement #4: Color-coded by timing, sorted */}
      {sortedEquipment.length > 0 && (
        <div className="rounded-lg px-3 py-2.5 space-y-2 border border-emerald-500/50 bg-emerald-950/15">
          <div className="text-xs font-bold text-emerald-300 uppercase">
            Equipment
          </div>
          <div className="flex flex-wrap gap-2">
            {sortedEquipment.map((equipment) => {
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

              const timingColor = TIMING_COLORS[timing] ?? TIMING_COLORS.anytime;

              // Improvement #6: Inline disabled reason
              const equipDisabledReason = !canUse
                ? blockedByForcedReveal
                  ? "Reveal reds first"
                  : secondaryLocked
                    ? `${secondaryValue}: ${Math.min(secondaryProgress, secondaryRequired)}/${secondaryRequired}`
                    : timing === "start_of_turn"
                      ? "Start of turn only"
                      : timing === "in_turn"
                        ? "Your turn only"
                        : undefined
                : undefined;

              return (
                <div key={equipment.id} className="flex flex-col items-start">
                  <button
                    onClick={() => useEquipment(equipment.id)}
                    disabled={!canUse}
                    className={`px-3 py-1.5 rounded font-bold text-sm transition-colors ${
                      canUse
                        ? `${timingColor.bg} ${timingColor.hover} text-white`
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
                  <span className="text-[10px] text-gray-500 mt-0.5">{timingColor.label}</span>
                  {equipDisabledReason && (
                    <span className="text-[10px] text-gray-500">{equipDisabledReason}</span>
                  )}
                </div>
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
