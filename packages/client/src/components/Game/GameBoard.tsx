import { useEffect, useMemo, useState, useCallback } from "react";
import type {
  AnyEquipmentId,
  ClientGameState,
  ClientMessage,
  ChatMessage,
  CharacterId,
  UseEquipmentPayload,
  VisibleTile,
} from "@bomb-busters/shared";
import {
  BLUE_COPIES_PER_VALUE,
  DOUBLE_DETECTOR_CHARACTERS,
  EQUIPMENT_DEFS,
  requiresSetupInfoTokenForMission,
  wireLabel,
} from "@bomb-busters/shared";
import { BoardArea, DetonatorDial } from "./Board/BoardArea.js";
import { PlayerStand } from "./Players/PlayerStand.js";
import { CharacterCardOverlay } from "./Players/CharacterCardOverlay.js";
import { ChooseNextPlayerPanel } from "./Actions/ChooseNextPlayerPanel.js";
import { DesignateCutterPanel } from "./Actions/DesignateCutterPanel.js";
import { DetectorTileChoicePanel } from "./Actions/DetectorTileChoicePanel.js";
import { InfoTokenSetup } from "./Actions/InfoTokenSetup.js";
import { RightPanel } from "./RightPanel.js";
import { ActionLog } from "./ActionLog.js";
import { ChatPanel } from "./Chat/ChatPanel.js";
import { MissionRuleHints } from "./MissionRuleHints.js";
import { MissionAudioPlayer } from "./MissionAudioPlayer.js";
import { EquipmentModePanel } from "./Actions/EquipmentModePanel.js";
import type { EquipmentMode } from "./Actions/EquipmentModePanel.js";
import { APP_COMMIT_ID, APP_VERSION } from "../../buildInfo.js";
import {
  getOpponentTileSelectableFilter as _getOpponentTileSelectableFilter,
  getOwnTileSelectableFilter as _getOwnTileSelectableFilter,
  getOpponentSelectedTileIndex as _getOpponentSelectedTileIndex,
  getOpponentSelectedTileIndices as _getOpponentSelectedTileIndices,
  getOwnSelectedTileIndex as _getOwnSelectedTileIndex,
  getOwnSelectedTileIndices as _getOwnSelectedTileIndices,
  handleOpponentTileClick as _handleOpponentTileClick,
  handleOwnTileClickEquipment as _handleOwnTileClickEquipment,
} from "./equipmentModeLogic.js";
import { stopMissionAudio } from "../../audio/audio.js";
import { GameRulesPopup } from "./GameRulesPopup/index.js";
import { LeftDock } from "./LeftDock.js";
import {
  canRevealReds,
  getImmediateEquipmentPayload,
  getInitialEquipmentMode,
  getSoloCutValues,
  isBaseEquipmentId,
} from "./Actions/actionRules.js";
import {
  getMission9SequenceGate,
  isMission9BlockedCutValue,
} from "./Actions/actionPanelMissionRules.js";

type UnknownForcedAction = {
  kind: string;
  captainId?: string;
};

const FORCED_ACTION_CHOOSE_NEXT_PLAYER = "chooseNextPlayer";
const FORCED_ACTION_DESIGNATE_CUTTER = "designateCutter";
const FORCED_ACTION_DETECTOR_TILE_CHOICE = "detectorTileChoice";
const HANDLED_FORCED_ACTION_KINDS = new Set<string>([
  FORCED_ACTION_CHOOSE_NEXT_PLAYER,
  FORCED_ACTION_DESIGNATE_CUTTER,
  FORCED_ACTION_DETECTOR_TILE_CHOICE,
]);

function getUnknownForcedAction(
  gameState: ClientGameState,
): UnknownForcedAction | null {
  const raw = (gameState as { pendingForcedAction?: unknown })
    .pendingForcedAction;
  if (!raw || typeof raw !== "object") return null;

  const candidate = raw as { kind?: unknown; captainId?: unknown };
  if (typeof candidate.kind !== "string") return null;
  if (HANDLED_FORCED_ACTION_KINDS.has(candidate.kind)) return null;

  return {
    kind: candidate.kind,
    ...(typeof candidate.captainId === "string"
      ? { captainId: candidate.captainId }
      : {}),
  };
}

const MODES_NEEDING_OPPONENT_CLICK = new Set<EquipmentMode["kind"]>([
  "double_detector",
  "talkies_walkies",
  "triple_detector",
  "super_detector",
  "x_or_y_ray",
  "grappling_hook",
]);

function usesFalseSetupTokenMode(mission: number, isCaptain: boolean): boolean {
  return mission === 52 || (mission === 17 && isCaptain);
}

function getDefaultFalseSetupTokenValue(
  tile: VisibleTile | undefined,
): number | null {
  if (
    tile?.color === "blue" &&
    typeof tile.gameValue === "number" &&
    tile.gameValue >= 1 &&
    tile.gameValue <= 12
  ) {
    return tile.gameValue === 1 ? 2 : 1;
  }
  return 1;
}

type PendingAction =
  | {
      kind: "dual_cut";
      guessValue: number | "YELLOW";
      actorTileIndex: number;
      targetPlayerId: string;
      targetTileIndex: number;
    }
  | {
      kind: "solo_cut";
      value: number | "YELLOW";
      actorTileIndex: number;
    }
  | {
      kind: "reveal_reds";
      actorTileIndex: number;
    }
  | {
      kind: "equipment";
      equipmentId: AnyEquipmentId;
      equipmentName: string;
      immediatePayload?: UseEquipmentPayload;
    };

export function GameBoard({
  gameState,
  send,
  playerId,
  chatMessages,
}: {
  gameState: ClientGameState;
  send: (msg: ClientMessage) => void;
  playerId: string;
  chatMessages: ChatMessage[];
}) {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isFinished = gameState.phase === "finished";
  const isMyTurn = !isFinished && currentPlayer?.id === playerId;
  const me = gameState.players.find((p) => p.id === playerId);
  const opponentsWithOrder = gameState.players
    .map((p, i) => ({ player: p, turnOrder: i + 1 }))
    .filter((entry) => entry.player.id !== playerId);
  const opponents = opponentsWithOrder.map((entry) => entry.player);
  const myOrder = gameState.players.findIndex((p) => p.id === playerId) + 1;
  const equipmentTiming = new Map(
    EQUIPMENT_DEFS.map((def) => [def.id, def.useTiming]),
  );

  // Primary own-tile selection for dual/solo staging.
  const [selectedGuessTile, setSelectedGuessTile] = useState<number | null>(
    null,
  );

  // Staged action requiring explicit Confirm / Cancel.
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );

  // Info token setup tile selection state
  const [selectedInfoTile, setSelectedInfoTile] = useState<number | null>(null);
  const [selectedInfoTokenValue, setSelectedInfoTokenValue] = useState<
    number | null
  >(null);
  const [isRulesPopupOpen, setIsRulesPopupOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<"mission" | "equipment" | "log" | null>(null);

  // Character card overlay state
  const [viewingCharacter, setViewingCharacter] = useState<{
    playerId: string;
    characterId: CharacterId;
  } | null>(null);

  // Unified equipment mode state
  const [equipmentMode, setEquipmentMode] = useState<EquipmentMode | null>(
    null,
  );
  const cancelEquipmentMode = useCallback(() => setEquipmentMode(null), []);

  const isSetup = gameState.phase === "setup_info_tokens";
  const requiresSetupToken =
    !isSetup || !me
      ? true
      : requiresSetupInfoTokenForMission(
          gameState.mission,
          gameState.players.length,
          me.isCaptain,
        );
  const useFalseSetupTokenMode =
    !!me && usesFalseSetupTokenMode(gameState.mission, me.isCaptain);
  const dynamicTurnActive =
    gameState.mission === 10 && gameState.phase === "playing";
  const previousPlayerName = (() => {
    const fa = gameState.pendingForcedAction;
    if (fa?.kind !== FORCED_ACTION_CHOOSE_NEXT_PLAYER || !fa.lastPlayerId)
      return undefined;
    return gameState.players.find((p) => p.id === fa.lastPlayerId)?.name;
  })();
  const pendingForcedAction = gameState.pendingForcedAction;
  const unknownForcedAction = getUnknownForcedAction(gameState);
  const isUnknownForcedActionCaptain =
    unknownForcedAction?.captainId != null &&
    unknownForcedAction.captainId === playerId;
  const forcedActionCaptainId =
    unknownForcedAction?.captainId ??
    (pendingForcedAction?.kind === "chooseNextPlayer"
      ? pendingForcedAction.captainId
      : pendingForcedAction?.kind === "designateCutter"
        ? pendingForcedAction.designatorId
        : pendingForcedAction?.kind === "detectorTileChoice"
          ? pendingForcedAction.targetPlayerId
          : undefined);
  const forcedActionCaptainName = forcedActionCaptainId
    ? gameState.players.find((p) => p.id === forcedActionCaptainId)?.name
    : undefined;
  const activeGlobalConstraints =
    gameState.campaign?.constraints?.global?.filter(
      (constraint) => constraint.active,
    ) ?? [];
  const activeTurnPlayerConstraints = currentPlayer
    ? (
        gameState.campaign?.constraints?.perPlayer?.[currentPlayer.id] ?? []
      ).filter((constraint) => constraint.active)
    : [];
  const showTurnConstraintReminder =
    gameState.phase === "playing" &&
    (activeGlobalConstraints.length > 0 ||
      activeTurnPlayerConstraints.length > 0);
  const turnConstraintPlayerLabel =
    currentPlayer?.id === playerId
      ? "You"
      : (currentPlayer?.name ?? "Current player");

  const playingInteractionEnabled =
    gameState.phase === "playing" &&
    !gameState.pendingForcedAction &&
    !equipmentMode &&
    !!me;
  const revealRedsAvailable = me ? canRevealReds(gameState, playerId) : false;
  const forceRevealReds = isMyTurn && revealRedsAvailable;
  const mission11RevealBlockedHint =
    isMyTurn && gameState.mission === 11 && !revealRedsAvailable;
  const soloValues = me ? getSoloCutValues(gameState, playerId) : [];
  const soloValueSet = new Set<number | "YELLOW">(soloValues);
  const mission9Gate = getMission9SequenceGate(gameState);
  const mission9ActiveValue = mission9Gate?.activeValue;
  const mission9RequiredCuts = mission9Gate?.requiredCuts ?? 2;
  const mission9ActiveProgress = mission9Gate?.activeProgress;
  const isMission9BlockedValue = (value: number | "YELLOW"): boolean =>
    isMission9BlockedCutValue(gameState, value);
  const selectedGuessValue =
    selectedGuessTile != null ? me?.hand[selectedGuessTile]?.gameValue : null;
  const mission9SelectedGuessBlocked =
    selectedGuessValue != null &&
    selectedGuessValue !== "RED" &&
    isMission9BlockedValue(selectedGuessValue);
  const mission9PendingDualBlocked =
    pendingAction?.kind === "dual_cut" &&
    isMission9BlockedValue(pendingAction.guessValue);
  const mission9HasYellowSoloValue = soloValues.includes("YELLOW");
  const soloCandidateIndices =
    selectedGuessTile != null && me
      ? me.hand
          .map((tile, index) => ({ tile, index }))
          .filter(({ tile }) => {
            if (tile.cut) return false;
            if (tile.gameValue === "RED" || tile.gameValue == null) return false;
            return (
              tile.gameValue === selectedGuessValue &&
              soloValueSet.has(tile.gameValue) &&
              !isMission9BlockedValue(tile.gameValue)
            );
          })
          .map(({ index }) => index)
      : [];

  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (gameState.timerDeadline == null || gameState.phase === "finished")
      return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [gameState.timerDeadline, gameState.phase]);

  const timerDisplay = useMemo(() => {
    if (gameState.timerDeadline == null) return null;
    const remainingMs = Math.max(0, gameState.timerDeadline - nowMs);
    const totalSeconds = Math.floor(remainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return {
      text: `${minutes}:${String(seconds).padStart(2, "0")}`,
      isCritical: totalSeconds <= 60,
    };
  }, [gameState.timerDeadline, nowMs]);

  useEffect(() => {
    if (!isRulesPopupOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsRulesPopupOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isRulesPopupOpen]);

  useEffect(() => {
    if (!requiresSetupToken) {
      setSelectedInfoTile(null);
      setSelectedInfoTokenValue(null);
    }
  }, [requiresSetupToken]);

  useEffect(() => {
    if (!unknownForcedAction) return;
    console.warn(
      `[GameBoard] Unsupported forced action kind "${unknownForcedAction.kind}" is pending; fallback UI is active.`,
    );
  }, [unknownForcedAction?.kind]);

  useEffect(() => {
    if (gameState.phase === "finished") {
      stopMissionAudio();
    }
  }, [gameState.phase]);

  useEffect(() => {
    return () => {
      stopMissionAudio();
    };
  }, []);

  // Clear staged interaction state when turn or phase changes.
  useEffect(() => {
    setEquipmentMode(null);
    setPendingAction(null);
    setSelectedGuessTile(null);
  }, [gameState.turnNumber, gameState.phase]);

  useEffect(() => {
    if (!forceRevealReds) return;
    setPendingAction((prev) =>
      prev?.kind === "reveal_reds" ? prev : null,
    );
    setSelectedGuessTile(null);
  }, [forceRevealReds]);

  // --- Equipment mode tile click handlers (delegated to pure functions) ---

  const handleOpponentTileClick = (oppId: string, tileIndex: number) => {
    const newMode = _handleOpponentTileClick(equipmentMode, oppId, tileIndex);
    if (newMode !== equipmentMode) setEquipmentMode(newMode);
  };

  const handleOwnTileClickEquipment = (tileIndex: number) => {
    const result = _handleOwnTileClickEquipment(
      equipmentMode,
      tileIndex,
      me,
      gameState,
    );
    if (result.sendPayload) send(result.sendPayload);
    if (result.newMode !== equipmentMode) setEquipmentMode(result.newMode);
  };

  // --- Selectability filters (delegated to pure functions) ---

  const getOpponentTileSelectableFilter = (oppId: string) =>
    _getOpponentTileSelectableFilter(equipmentMode, oppId);

  const getOwnTileSelectableFilter = () =>
    _getOwnTileSelectableFilter(equipmentMode, me, gameState);

  // --- Selection highlights ---

  const getOpponentSelectedTileIndex = (oppId: string): number | undefined => {
    const fromEquipment = _getOpponentSelectedTileIndex(equipmentMode, oppId);
    if (fromEquipment !== undefined) return fromEquipment;
    if (equipmentMode) return undefined;
    if (pendingAction?.kind === "dual_cut" && pendingAction.targetPlayerId === oppId) {
      return pendingAction.targetTileIndex;
    }
    return undefined;
  };

  const getOpponentSelectedTileIndices = (oppId: string) =>
    _getOpponentSelectedTileIndices(equipmentMode, oppId);

  const getOwnSelectedTileIndex = (): number | undefined => {
    if (isSetup)
      return requiresSetupToken ? (selectedInfoTile ?? undefined) : undefined;
    const fromEquipment = _getOwnSelectedTileIndex(equipmentMode);
    if (fromEquipment !== undefined) return fromEquipment;
    if (equipmentMode) return undefined;
    if (pendingAction?.kind === "dual_cut") return pendingAction.actorTileIndex;
    if (pendingAction?.kind === "solo_cut") return pendingAction.actorTileIndex;
    if (pendingAction?.kind === "reveal_reds") return pendingAction.actorTileIndex;
    if (playingInteractionEnabled) {
      return selectedGuessTile ?? undefined;
    }
    return undefined;
  };

  const getOwnSelectedTileIndices = (): number[] | undefined => {
    const fromEquipment = _getOwnSelectedTileIndices(equipmentMode);
    if (fromEquipment !== undefined) return fromEquipment;
    if (
      selectedGuessTile != null &&
      pendingAction == null &&
      playingInteractionEnabled &&
      !forceRevealReds
    ) {
      return soloCandidateIndices.length > 0 ? soloCandidateIndices : undefined;
    }
    return undefined;
  };

  const getCutCountForValue = (value: number): number => {
    let count = 0;
    for (const player of gameState.players) {
      for (const tile of player.hand) {
        if (tile.cut && tile.gameValue === value) count++;
      }
    }
    return count;
  };

  const canUseSkillFromLeftDock =
    !!me &&
    !!me.character &&
    !me.characterUsed &&
    isMyTurn &&
    gameState.phase === "playing" &&
    !gameState.pendingForcedAction &&
    !forceRevealReds &&
    DOUBLE_DETECTOR_CHARACTERS.has(me.character);

  const stageEquipmentActionFromLeftDock = (equipmentId: string) => {
    if (!me || gameState.phase !== "playing" || gameState.pendingForcedAction) {
      return;
    }
    if (equipmentMode || pendingAction) return;

    const equipment = gameState.board.equipment.find((eq) => eq.id === equipmentId);
    if (!equipment || !equipment.unlocked || equipment.used) return;

    const def = EQUIPMENT_DEFS.find((entry) => entry.id === equipment.id);
    if (!def) return;
    if (!isBaseEquipmentId(equipment.id) && def.pool !== "campaign") return;

    const timingAllowsUse =
      def.useTiming === "anytime" ||
      def.useTiming === "immediate" ||
      ((def.useTiming === "in_turn" || def.useTiming === "start_of_turn") &&
        isMyTurn);
    const secondaryValue = equipment.secondaryLockValue;
    const secondaryRequired = equipment.secondaryLockCutsRequired ?? 2;
    const secondaryProgress =
      secondaryValue !== undefined
        ? getCutCountForValue(secondaryValue)
        : secondaryRequired;
    const secondaryLocked =
      secondaryValue !== undefined && secondaryProgress < secondaryRequired;
    const blockedByForcedReveal = forceRevealReds && isMyTurn;
    if (!timingAllowsUse || secondaryLocked || blockedByForcedReveal) return;

    const typedEquipmentId = equipment.id as AnyEquipmentId;
    const immediatePayload = getImmediateEquipmentPayload(typedEquipmentId);
    if (immediatePayload) {
      setPendingAction({
        kind: "equipment",
        equipmentId: typedEquipmentId,
        equipmentName: equipment.name,
        immediatePayload,
      });
      setSelectedGuessTile(null);
      return;
    }

    const modeOnConfirm = getInitialEquipmentMode(typedEquipmentId);
    if (!modeOnConfirm) return;
    setEquipmentMode(modeOnConfirm);
    setSelectedGuessTile(null);
  };

  const stageSkillFromLeftDock = () => {
    if (!me?.character || !canUseSkillFromLeftDock) return;
    setEquipmentMode({
      kind: "double_detector",
      targetPlayerId: null,
      selectedTiles: [],
      guessTileIndex: null,
    });
    setSelectedGuessTile(null);
  };

  const cancelPendingAction = () => {
    setPendingAction(null);
    setSelectedGuessTile(null);
  };

  const confirmPendingAction = () => {
    if (!pendingAction) return;

    switch (pendingAction.kind) {
      case "dual_cut": {
        if (isMission9BlockedValue(pendingAction.guessValue)) return;
        send({
          type: "dualCut",
          targetPlayerId: pendingAction.targetPlayerId,
          targetTileIndex: pendingAction.targetTileIndex,
          guessValue: pendingAction.guessValue,
          actorTileIndex: pendingAction.actorTileIndex,
        });
        break;
      }
      case "solo_cut":
        send({ type: "soloCut", value: pendingAction.value });
        break;
      case "reveal_reds":
        send({ type: "revealReds" });
        break;
      case "equipment":
        if (pendingAction.immediatePayload) {
          send({
            type: "useEquipment",
            equipmentId: pendingAction.equipmentId,
            payload: pendingAction.immediatePayload,
          });
        }
        break;
    }

    setPendingAction(null);
    setSelectedGuessTile(null);
  };

  return (
    <>
      <div
        className="grid h-dvh w-dvw overflow-hidden"
        style={{ gridTemplateRows: "auto 1fr" }}
        data-testid="game-board"
        data-phase={gameState.phase}
      >
        <div className="min-h-0 overflow-hidden">
          <Header
            gameState={gameState}
            playerId={playerId}
            timerDisplay={timerDisplay}
          />
          <TurnStatusBar
            gameState={gameState}
            playerId={playerId}
            currentPlayerName={currentPlayer?.name}
            isCurrentPlayerBot={currentPlayer?.isBot ?? false}
          />
          <BoardArea
            board={gameState.board}
            missionId={gameState.mission}
            playerCount={gameState.players.length}
          />
        </div>

        <div
          className="grid gap-2 pr-2 py-2 overflow-hidden min-w-0 min-h-0"
          style={{ gridTemplateColumns: "auto 1fr auto" }}
        >
          {/* Left dock: mission & equipment cards */}
          <div className="overflow-y-auto overscroll-none min-h-0 h-full">
            <LeftDock
              equipment={gameState.board.equipment}
              character={me?.character}
              characterUsed={me?.characterUsed}
              onOpenRules={() => setIsRulesPopupOpen(true)}
              onSelectEquipmentAction={stageEquipmentActionFromLeftDock}
              onSelectPersonalSkill={stageSkillFromLeftDock}
            />
          </div>

          {/* Game area */}
          <div
            className="grid gap-2 min-w-0 min-h-0"
            style={{ gridTemplateRows: "1fr auto" }}
          >
            {/* Scrollable top area */}
            <div className="overflow-y-auto overscroll-none overflow-x-hidden min-h-0 min-w-0">
              <div className="w-full min-w-0 flex flex-col gap-2 overflow-x-hidden">
                {/* Opponents area */}
                <div className="flex gap-2 justify-center overflox-x-hidden flex-wrap min-w-0 w-full">
                  {opponentsWithOrder.map(({ player: opp, turnOrder }) => (
                    <PlayerStand
                      key={opp.id}
                      player={opp}
                      isOpponent={true}
                      isCurrentTurn={opp.id === currentPlayer?.id}
                      turnOrder={turnOrder}
                      onCharacterClick={
                        opp.character
                          ? () =>
                              setViewingCharacter({
                                playerId: opp.id,
                                characterId: opp.character!,
                              })
                          : undefined
                      }
                      onTileClick={
                        equipmentMode &&
                        MODES_NEEDING_OPPONENT_CLICK.has(equipmentMode.kind) &&
                        gameState.phase === "playing"
                          ? (tileIndex) =>
                              handleOpponentTileClick(opp.id, tileIndex)
                          : pendingAction?.kind === "dual_cut"
                            ? (tileIndex) => {
                                const oppTile = opp.hand[tileIndex];
                                if (!oppTile || oppTile.cut) return;
                                setPendingAction({
                                  ...pendingAction,
                                  targetPlayerId: opp.id,
                                  targetTileIndex: tileIndex,
                                });
                              }
                            : playingInteractionEnabled &&
                                isMyTurn &&
                                selectedGuessTile != null &&
                                !forceRevealReds &&
                                !pendingAction
                              ? (tileIndex) => {
                                  const guessValue = me?.hand[selectedGuessTile]?.gameValue;
                                  if (
                                    guessValue == null ||
                                    guessValue === "RED" ||
                                    typeof guessValue === "undefined"
                                  ) {
                                    return;
                                  }
                                  setPendingAction({
                                    kind: "dual_cut",
                                    actorTileIndex: selectedGuessTile,
                                    guessValue,
                                    targetPlayerId: opp.id,
                                    targetTileIndex: tileIndex,
                                  });
                                }
                              : undefined
                      }
                      selectedTileIndex={getOpponentSelectedTileIndex(opp.id)}
                      selectedTileIndices={getOpponentSelectedTileIndices(
                        opp.id,
                      )}
                      tileSelectableFilter={
                        equipmentMode && gameState.phase === "playing"
                          ? getOpponentTileSelectableFilter(opp.id)
                          : pendingAction?.kind === "dual_cut"
                            ? (tile: VisibleTile) => !tile.cut
                            : playingInteractionEnabled &&
                                isMyTurn &&
                                selectedGuessTile != null &&
                                !forceRevealReds &&
                                !pendingAction
                              ? (tile: VisibleTile) => !tile.cut
                              : undefined
                      }
                    />
                  ))}
                </div>

                {dynamicTurnActive && (
                  <div className="rounded-lg border border-sky-600/50 bg-sky-900/25 px-3 py-2 text-xs text-sky-100">
                    <div className="font-bold uppercase tracking-wide text-sky-200">
                      Dynamic Turn Order
                    </div>
                    {gameState.pendingForcedAction?.kind ===
                    FORCED_ACTION_CHOOSE_NEXT_PLAYER ? (
                      <div className="text-sky-100/90">
                        {forcedActionCaptainName ? (
                          <>
                            Captain{" "}
                            <span className="font-semibold">
                              {forcedActionCaptainName}
                            </span>{" "}
                            is choosing the next active player
                          </>
                        ) : (
                          <>Captain is choosing the next active player</>
                        )}
                        {previousPlayerName ? (
                          <>
                            {" "}
                            (previous:{" "}
                            <span className="font-semibold">
                              {previousPlayerName}
                            </span>
                            )
                          </>
                        ) : null}
                        .
                      </div>
                    ) : (
                      <div className="text-sky-100/90">
                        Turn order is captain-selected, not clockwise.
                      </div>
                    )}
                  </div>
                )}

                {showTurnConstraintReminder && (
                  <div
                    className="rounded-lg border border-amber-500/50 bg-amber-950/25 px-3 py-2 text-xs text-amber-100"
                    data-testid="turn-constraint-reminder"
                  >
                    <div className="font-bold uppercase tracking-wide text-amber-200">
                      Mission Constraints
                    </div>
                    {activeGlobalConstraints.length > 0 && (
                      <div className="text-amber-100/90">
                        Global:{" "}
                        {activeGlobalConstraints
                          .map((constraint) => constraint.name || constraint.id)
                          .join(", ")}
                      </div>
                    )}
                    {activeTurnPlayerConstraints.length > 0 && (
                      <div className="text-amber-100/90">
                        {turnConstraintPlayerLabel}:{" "}
                        {activeTurnPlayerConstraints
                          .map((constraint) => constraint.name || constraint.id)
                          .join(", ")}
                      </div>
                    )}
                  </div>
                )}

                {gameState.phase !== "finished" && (
                  <MissionRuleHints gameState={gameState} />
                )}

                {gameState.phase !== "finished" && (
                  <MissionAudioPlayer gameState={gameState} send={send} />
                )}

                {/* Playing phase: forced action (captain chooses next player) */}
                {gameState.phase === "playing" &&
                  gameState.pendingForcedAction?.kind ===
                    FORCED_ACTION_CHOOSE_NEXT_PLAYER &&
                  gameState.pendingForcedAction.captainId === playerId &&
                  me && (
                    <ChooseNextPlayerPanel
                      gameState={gameState}
                      send={send}
                      playerId={playerId}
                    />
                  )}

                {/* Playing phase: waiting for captain to choose (non-captain view) */}
                {gameState.phase === "playing" &&
                  gameState.pendingForcedAction?.kind ===
                    FORCED_ACTION_CHOOSE_NEXT_PLAYER &&
                  gameState.pendingForcedAction.captainId !== playerId && (
                    <div
                      className="text-center py-2 text-gray-400"
                      data-testid="waiting-captain"
                    >
                      Waiting for{" "}
                      <span className="text-yellow-400 font-bold">
                        {forcedActionCaptainName ?? "the Captain"}
                      </span>{" "}
                      to choose the next player...
                    </div>
                  )}

                {/* Playing phase: forced action (designate cutter - mission 18) */}
                {gameState.phase === "playing" &&
                  gameState.pendingForcedAction?.kind ===
                    FORCED_ACTION_DESIGNATE_CUTTER &&
                  gameState.pendingForcedAction.designatorId === playerId &&
                  me && (
                    <DesignateCutterPanel
                      gameState={gameState}
                      send={send}
                      playerId={playerId}
                    />
                  )}

                {/* Playing phase: waiting for designator (non-designator view - mission 18) */}
                {gameState.phase === "playing" &&
                  gameState.pendingForcedAction?.kind ===
                    FORCED_ACTION_DESIGNATE_CUTTER &&
                  gameState.pendingForcedAction.designatorId !== playerId && (
                    <div
                      className="text-center py-2 text-gray-400"
                      data-testid="waiting-designator"
                    >
                      Waiting for{" "}
                      <span className="text-yellow-400 font-bold">
                        {forcedActionCaptainName ?? "the active player"}
                      </span>{" "}
                      to designate who cuts...
                      {gameState.pendingForcedAction.value && (
                        <span className="block text-xs text-gray-500 mt-1">
                          Number card:{" "}
                          <span className="text-white font-bold">
                            {gameState.pendingForcedAction.value}
                          </span>
                        </span>
                      )}
                    </div>
                  )}

                {/* Playing phase: forced action (detector tile choice - target player) */}
                {gameState.phase === "playing" &&
                  gameState.pendingForcedAction?.kind ===
                    FORCED_ACTION_DETECTOR_TILE_CHOICE &&
                  gameState.pendingForcedAction.targetPlayerId === playerId &&
                  me && (
                    <DetectorTileChoicePanel
                      gameState={gameState}
                      send={send}
                      playerId={playerId}
                    />
                  )}

                {/* Playing phase: waiting for target player to choose tile (other players' view) */}
                {gameState.phase === "playing" &&
                  gameState.pendingForcedAction?.kind ===
                    FORCED_ACTION_DETECTOR_TILE_CHOICE &&
                  gameState.pendingForcedAction.targetPlayerId !== playerId && (
                    <div
                      className="text-center py-2 text-gray-400"
                      data-testid="waiting-detector-choice"
                    >
                      Waiting for{" "}
                      <span className="text-yellow-400 font-bold">
                        {forcedActionCaptainName ?? "the target player"}
                      </span>{" "}
                      to confirm...
                    </div>
                  )}

                {/* Playing phase: future-proof fallback for unsupported forced-action kinds */}
                {gameState.phase === "playing" &&
                  unknownForcedAction &&
                  (isUnknownForcedActionCaptain ? (
                    <div
                      className="rounded-lg border border-amber-500/50 bg-amber-950/25 px-3 py-2 text-center text-amber-200 space-y-2"
                      data-testid="forced-action-fallback-captain"
                    >
                      <p>
                        You must resolve a mission-required action before normal
                        turns continue.
                      </p>
                      <p className="text-xs text-amber-300/90">
                        This client version does not support this forced action
                        yet.
                      </p>
                      <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="px-3 py-1 rounded bg-amber-600 hover:bg-amber-500 text-black text-xs font-bold transition-colors"
                      >
                        Reload Client
                      </button>
                    </div>
                  ) : (
                    <div
                      className="text-center py-2 text-gray-400"
                      data-testid="waiting-forced-action"
                    >
                      Mission-required action is pending
                      {forcedActionCaptainName ? (
                        <>
                          {" "}
                          for{" "}
                          <span className="text-yellow-400 font-bold">
                            {forcedActionCaptainName}
                          </span>
                        </>
                      ) : null}
                      .
                    </div>
                  ))}
              </div>
            </div>
            {/* Player stand + actions — always at the bottom */}
            {me && (
              <div className="flex flex-col gap-2 min-w-0">
                {/* Equipment mode panel (unified for all equipment types) */}
                {equipmentMode && (
                  <EquipmentModePanel
                    mode={equipmentMode}
                    gameState={gameState}
                    playerId={playerId}
                    send={send}
                    onCancel={cancelEquipmentMode}
                    onUpdateMode={setEquipmentMode}
                  />
                )}

                {!equipmentMode && gameState.phase === "playing" && (
                  <PendingActionStrip
                    players={gameState.players}
                    pendingAction={pendingAction}
                    selectedGuessTile={selectedGuessTile}
                    selectedGuessValue={selectedGuessValue}
                    mission9SelectedGuessBlocked={mission9SelectedGuessBlocked}
                    mission9ActiveValue={mission9ActiveValue}
                    canConfirm={
                      pendingAction != null &&
                      !(
                        pendingAction.kind === "dual_cut" &&
                        mission9PendingDualBlocked
                      )
                    }
                    onCancel={cancelPendingAction}
                    onConfirm={confirmPendingAction}
                  />
                )}

                {/* Setup phase: info token placement */}
                {isSetup && isMyTurn && (
                  <InfoTokenSetup
                    player={me}
                    selectedTileIndex={selectedInfoTile}
                    selectedTokenValue={selectedInfoTokenValue}
                    requiresToken={requiresSetupToken}
                    useFalseTokenMode={useFalseSetupTokenMode}
                    send={send}
                    onPlaced={() => {
                      setSelectedInfoTile(null);
                      setSelectedInfoTokenValue(null);
                    }}
                    onSelectedTokenValueChange={setSelectedInfoTokenValue}
                  />
                )}

                {isSetup && !isMyTurn && (
                  <div className="bg-[var(--color-bomb-surface)] rounded-lg p-2 text-xs text-center text-gray-400">
                    Waiting for{" "}
                    <span className="text-white font-bold">
                      {currentPlayer?.name}
                    </span>{" "}
                    to place their info token...
                  </div>
                )}
                <PlayerStand
                  player={me}
                  isOpponent={false}
                  isCurrentTurn={me.id === currentPlayer?.id}
                  turnOrder={myOrder}
                  onCharacterClick={
                    me.character
                      ? () =>
                          setViewingCharacter({
                            playerId: me.id,
                            characterId: me.character!,
                          })
                      : undefined
                  }
                  onTileClick={
                    isSetup && isMyTurn
                      ? requiresSetupToken
                        ? (tileIndex) => {
                            if (selectedInfoTile === tileIndex) {
                              setSelectedInfoTile(null);
                              setSelectedInfoTokenValue(null);
                              return;
                            }

                            setSelectedInfoTile(tileIndex);
                            if (useFalseSetupTokenMode) {
                              setSelectedInfoTokenValue(
                                getDefaultFalseSetupTokenValue(
                                  me?.hand[tileIndex],
                                ),
                              );
                            } else {
                              setSelectedInfoTokenValue(null);
                            }
                          }
                        : undefined
                      : equipmentMode && gameState.phase === "playing"
                        ? (tileIndex) => handleOwnTileClickEquipment(tileIndex)
                        : playingInteractionEnabled &&
                            isMyTurn
                          ? (tileIndex) => {
                              if (pendingAction?.kind === "dual_cut") {
                                if (tileIndex === pendingAction.actorTileIndex) return;
                                const tile = me.hand[tileIndex];
                                if (!tile || tile.cut || tile.color === "red") return;
                                const newGuessValue = tile.gameValue;
                                if (newGuessValue == null || newGuessValue === "RED") return;
                                setPendingAction({
                                  ...pendingAction,
                                  actorTileIndex: tileIndex,
                                  guessValue: newGuessValue,
                                });
                                return;
                              }
                              if (pendingAction) return;
                              const tile = me.hand[tileIndex];
                              if (!tile || tile.cut) return;
                              if (forceRevealReds) {
                                if (tile.color !== "red") return;
                                setPendingAction({
                                  kind: "reveal_reds",
                                  actorTileIndex: tileIndex,
                                });
                                return;
                              }
                              if (tile.color === "red") return;

                              const tileValue = tile.gameValue;
                              const canStageSolo =
                                tileValue != null &&
                                tileValue !== "RED" &&
                                tileValue === selectedGuessValue &&
                                soloValueSet.has(tileValue) &&
                                !isMission9BlockedValue(tileValue);

                              if (selectedGuessTile == null) {
                                setSelectedGuessTile(tileIndex);
                                return;
                              }
                              if (selectedGuessTile === tileIndex) {
                                if (canStageSolo) {
                                  setPendingAction({
                                    kind: "solo_cut",
                                    value: tileValue,
                                    actorTileIndex: tileIndex,
                                  });
                                  return;
                                }
                                setSelectedGuessTile(null);
                                return;
                              }
                              if (canStageSolo) {
                                setPendingAction({
                                  kind: "solo_cut",
                                  value: tileValue,
                                  actorTileIndex: tileIndex,
                                });
                                return;
                              }
                              setSelectedGuessTile(tileIndex);
                            }
                          : undefined
                  }
                  selectedTileIndex={getOwnSelectedTileIndex()}
                  selectedTileIndices={getOwnSelectedTileIndices()}
                  tileSelectableFilter={
                    isSetup && isMyTurn
                      ? requiresSetupToken
                        ? (tile: VisibleTile, idx: number) => {
                            if (tile.cut) return false;
                            if (
                              me.infoTokens.some(
                                (token) =>
                                  token.position === idx ||
                                  token.positionB === idx,
                              )
                            ) {
                              return false;
                            }
                            if (useFalseSetupTokenMode) {
                              if (gameState.mission === 52) {
                                return (
                                  tile.color === "blue" || tile.color === "red"
                                );
                              }
                              // Mission 17: captain false tokens can target any non-red wire.
                              return tile.color !== "red";
                            }
                            return (
                              tile.color === "blue" &&
                              tile.gameValue !== "RED" &&
                              tile.gameValue !== "YELLOW"
                            );
                          }
                        : undefined
                      : equipmentMode && gameState.phase === "playing"
                        ? getOwnTileSelectableFilter()
                        : playingInteractionEnabled &&
                            isMyTurn
                          ? (tile: VisibleTile) => {
                              if (pendingAction?.kind === "dual_cut") {
                                return !tile.cut && tile.color !== "red";
                              }
                              if (pendingAction) return false;
                              if (tile.cut) return false;
                              if (forceRevealReds) return tile.color === "red";
                              return tile.color !== "red";
                            }
                          : undefined
                  }
                />
              </div>
            )}
          </div>

          {/* Sidebar: mission card + action log / chat */}
          <RightPanel
            missionId={gameState.mission}
            log={gameState.log}
            players={gameState.players}
            result={gameState.result}
            chatMessages={chatMessages}
            send={send}
            playerId={playerId}
            missionExtras={
              <ActionMissionHints
                mission={gameState.mission}
                isMyTurn={isMyTurn}
                mission11RevealBlockedHint={mission11RevealBlockedHint}
                mission9ActiveValue={mission9ActiveValue}
                mission9RequiredCuts={mission9RequiredCuts}
                mission9ActiveProgress={mission9ActiveProgress}
                mission9DualGuessBlocked={
                  mission9PendingDualBlocked || mission9SelectedGuessBlocked
                }
                mission9HasYellowSoloValue={mission9HasYellowSoloValue}
                forceRevealReds={forceRevealReds}
              />
            }
          />
        </div>

        {/* Mobile bottom drawer */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40">
          {/* Tab buttons */}
          <div className="flex bg-[var(--color-bomb-surface)] border-t border-gray-700">
            {(["mission", "equipment", "log"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setMobileTab(mobileTab === tab ? null : tab)}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide transition-colors ${
                  mobileTab === tab
                    ? "text-yellow-400 bg-gray-800"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {tab === "mission" ? "Mission" : tab === "equipment" ? "Equipment" : "Log"}
              </button>
            ))}
          </div>

          {/* Drawer content */}
          {mobileTab && (
            <div className="bg-[var(--color-bomb-dark)] border-t border-gray-700 max-h-[50vh] overflow-y-auto p-3">
              {mobileTab === "mission" && (
                <>
                  <MissionRuleHints gameState={gameState} />
                  <ActionMissionHints
                    mission={gameState.mission}
                    isMyTurn={isMyTurn}
                    mission11RevealBlockedHint={mission11RevealBlockedHint}
                    mission9ActiveValue={mission9ActiveValue}
                    mission9RequiredCuts={mission9RequiredCuts}
                    mission9ActiveProgress={mission9ActiveProgress}
                    mission9DualGuessBlocked={
                      mission9PendingDualBlocked || mission9SelectedGuessBlocked
                    }
                    mission9HasYellowSoloValue={mission9HasYellowSoloValue}
                    forceRevealReds={forceRevealReds}
                  />
                  <MissionAudioPlayer gameState={gameState} send={send} />
                </>
              )}
              {mobileTab === "equipment" && (
                <div className="space-y-2">
                  {gameState.board.equipment.map((eq) => (
                    <div key={eq.id} className={`rounded-lg px-3 py-2 text-xs ${eq.used ? "bg-gray-800 text-gray-500 line-through" : eq.unlocked ? "bg-emerald-900/30 text-emerald-200" : "bg-gray-800 text-gray-400"}`}>
                      <div className="font-bold">{eq.name}</div>
                      <div className="text-[10px] opacity-70">{eq.description}</div>
                    </div>
                  ))}
                </div>
              )}
              {mobileTab === "log" && (
                <div className="space-y-2">
                  <ActionLog log={gameState.log} players={gameState.players} result={gameState.result} />
                  <ChatPanel messages={chatMessages} send={send} playerId={playerId} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile bottom padding to prevent content being hidden behind tab bar */}
        <div className="md:hidden h-12" />
      </div>

      <GameRulesPopup
        isOpen={isRulesPopupOpen}
        onClose={() => setIsRulesPopupOpen(false)}
        gameState={gameState}
      />

      {viewingCharacter && (
        <CharacterCardOverlay
          characterId={viewingCharacter.characterId}
          characterUsed={
            gameState.players.find((p) => p.id === viewingCharacter.playerId)
              ?.characterUsed ?? false
          }
          onClose={() => setViewingCharacter(null)}
        />
      )}
    </>
  );
}

function TurnStatusBar({
  gameState,
  playerId,
  currentPlayerName,
  isCurrentPlayerBot,
}: {
  gameState: ClientGameState;
  playerId: string;
  currentPlayerName?: string;
  isCurrentPlayerBot: boolean;
}) {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === playerId && gameState.phase === "playing";
  const myIndex = gameState.players.findIndex((player) => player.id === playerId);
  const turnDistance =
    myIndex >= 0
      ? (myIndex - gameState.currentPlayerIndex + gameState.players.length) %
        gameState.players.length
      : 0;
  const validatedCount = Object.values(gameState.board.validationTrack).filter(
    (count) => count >= BLUE_COPIES_PER_VALUE,
  ).length;
  const me = gameState.players.find((player) => player.id === playerId);
  const myUncutCount = me?.hand.filter((tile) => !tile.cut).length ?? 0;

  if (gameState.phase !== "playing") return null;

  return (
    <div
      className="flex items-center justify-between gap-3 px-3 py-1.5 border-b border-gray-700 bg-[var(--color-bomb-surface)] text-xs"
      data-testid="turn-status-bar"
    >
      {isMyTurn ? (
        <div className="inline-flex items-center gap-2">
          <span className="bg-yellow-500 text-black font-black uppercase text-[10px] px-1.5 py-0.5 rounded-full">
            Your Turn
          </span>
          <span className="text-yellow-300 font-bold">Choose an action</span>
        </div>
      ) : (
        <div className="text-gray-300" data-testid="waiting-turn">
          {isCurrentPlayerBot ? (
            <span className="inline-flex items-center gap-2">
              <span className="inline-block w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-purple-300 font-bold">{currentPlayerName}</span>{" "}
              is thinking...
            </span>
          ) : (
            <>
              Waiting for <span className="font-bold text-white">{currentPlayerName}</span>
              {turnDistance === 1 ? (
                <span className="text-yellow-400 font-bold"> (you&apos;re next)</span>
              ) : turnDistance > 1 ? (
                <span className="text-gray-500"> ({turnDistance} more turns)</span>
              ) : null}
            </>
          )}
        </div>
      )}

      <div className="inline-flex items-center gap-3 text-gray-300" data-testid="game-summary">
        <span>
          Detonator:{" "}
          <span
            className={`font-bold ${
              gameState.board.detonatorPosition >= gameState.board.detonatorMax - 1
                ? "text-red-400"
                : "text-gray-100"
            }`}
          >
            {gameState.board.detonatorPosition}/{gameState.board.detonatorMax}
          </span>
        </span>
        <span className="text-gray-600">|</span>
        <span>
          Validated: <span className="font-bold text-gray-100">{validatedCount}/12</span>
        </span>
        <span className="text-gray-600">|</span>
        <span>
          My wires: <span className="font-bold text-gray-100">{myUncutCount}</span>
        </span>
      </div>
    </div>
  );
}

function PendingActionStrip({
  players,
  pendingAction,
  selectedGuessTile,
  selectedGuessValue,
  mission9SelectedGuessBlocked,
  mission9ActiveValue,
  canConfirm,
  onConfirm,
  onCancel,
}: {
  players: ClientGameState["players"];
  pendingAction: PendingAction | null;
  selectedGuessTile: number | null;
  selectedGuessValue: ClientGameState["players"][number]["hand"][number]["gameValue"] | null;
  mission9SelectedGuessBlocked: boolean;
  mission9ActiveValue?: number;
  canConfirm: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!pendingAction) {
    if (selectedGuessTile == null) return null;
    return (
      <div
        className="rounded-lg border border-blue-500/50 bg-blue-950/20 px-3 py-2 text-xs"
        data-testid="pending-action-draft"
      >
        <div className="font-bold text-blue-300 uppercase tracking-wide">
          Action Draft
        </div>
        <div className="text-gray-300">
          Selected your wire <span className="font-semibold">{wireLabel(selectedGuessTile)}</span>{" "}
          (value {String(selectedGuessValue)}). Click an opponent wire for Dual Cut, or click a highlighted own wire for Solo Cut.
        </div>
        {mission9SelectedGuessBlocked && (
          <div className="text-amber-300">
            Mission 9: this value cannot be used for Dual Cut right now
            {typeof mission9ActiveValue === "number"
              ? ` (need ${mission9ActiveValue})`
              : ""}
            .
          </div>
        )}
        <div className="mt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  let summary = "";
  switch (pendingAction.kind) {
    case "dual_cut": {
      const targetName =
        players.find((player) => player.id === pendingAction.targetPlayerId)?.name ??
        pendingAction.targetPlayerId;
      summary = `Dual Cut: ${wireLabel(pendingAction.actorTileIndex)} (${String(
        pendingAction.guessValue,
      )}) -> ${targetName} ${wireLabel(pendingAction.targetTileIndex)}`;
      break;
    }
    case "solo_cut":
      summary = `Solo Cut: ${String(pendingAction.value)}`;
      break;
    case "reveal_reds":
      summary = `Reveal Reds from your stand`;
      break;
    case "equipment":
      summary = `Use Equipment: ${pendingAction.equipmentName}`;
      break;
  }

  return (
    <div
      className="rounded-lg border border-emerald-500/50 bg-emerald-950/20 px-3 py-2 text-xs space-y-2"
      data-testid="pending-action-strip"
    >
      <div className="font-bold text-emerald-300 uppercase tracking-wide">
        Pending Action
      </div>
      <div className="text-gray-200">{summary}</div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={!canConfirm}
          className={`px-3 py-1 rounded font-black transition-colors ${
            canConfirm
              ? "bg-green-600 hover:bg-green-500 text-white"
              : "bg-gray-700 text-gray-400 cursor-not-allowed"
          }`}
        >
          Confirm
        </button>
      </div>
    </div>
  );
}

function ActionMissionHints({
  mission,
  isMyTurn,
  mission11RevealBlockedHint,
  mission9ActiveValue,
  mission9RequiredCuts,
  mission9ActiveProgress,
  mission9DualGuessBlocked,
  mission9HasYellowSoloValue,
  forceRevealReds,
}: {
  mission: number;
  isMyTurn: boolean;
  mission11RevealBlockedHint: boolean;
  mission9ActiveValue?: number;
  mission9RequiredCuts: number;
  mission9ActiveProgress?: number;
  mission9DualGuessBlocked: boolean;
  mission9HasYellowSoloValue: boolean;
  forceRevealReds: boolean;
}) {
  if (!isMyTurn && mission !== 9) return null;

  return (
    <div className="space-y-2">
      {mission11RevealBlockedHint && (
        <div
          className="rounded-lg border border-sky-500/50 bg-sky-950/25 px-3 py-2 text-xs text-sky-100"
          data-testid="mission11-reveal-hint"
        >
          Mission 11: Reveal Reds is unavailable until your remaining wires match the hidden red-like value.
        </div>
      )}

      {mission === 9 && typeof mission9ActiveValue === "number" && (
        <div
          className="rounded-lg border border-emerald-500/50 bg-emerald-950/25 px-3 py-2 text-xs text-emerald-100 space-y-1"
          data-testid="mission9-action-reminder"
        >
          <div className="font-bold uppercase tracking-wide text-emerald-200">
            Mission 9 Sequence Action Gate
          </div>
          <div>
            Active value: <span className="font-semibold">{mission9ActiveValue}</span> (
            {mission9ActiveProgress ?? 0}/{mission9RequiredCuts} cuts).
          </div>
          {mission9DualGuessBlocked && (
            <div className="text-amber-200">
              Current dual guess is blocked by sequence priority.
            </div>
          )}
          {mission9HasYellowSoloValue && (
            <div className="text-emerald-200/90">
              Yellow solo cuts are not restricted by sequence priority.
            </div>
          )}
        </div>
      )}

      {forceRevealReds && (
        <div
          className="rounded-lg border border-red-500/50 bg-red-950/20 px-3 py-2 text-xs text-red-100"
          data-testid="reveal-reds-click-hint"
        >
          Reveal Reds: click one of your red wires, then Confirm.
        </div>
      )}
    </div>
  );
}

function Header({
  gameState,
  playerId,
  timerDisplay,
}: {
  gameState: ClientGameState;
  playerId: string;
  timerDisplay: { text: string; isCritical: boolean } | null;
}) {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const me = gameState.players.find((p) => p.id === playerId);

  return (
    <div
      className="flex items-center justify-between px-4 py-2 bg-[var(--color-bomb-surface)] border-b border-gray-700 flex-shrink-0"
      data-testid="game-header"
    >
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-black">
          BOMB<span className="text-red-500">BUSTERS</span>
        </h1>
        <span className="text-[9px] font-mono text-gray-600 select-none">{`${APP_COMMIT_ID} | v${APP_VERSION}`}</span>
        <span className="text-sm text-gray-400" data-testid="mission-label">
          Mission #{gameState.mission}
        </span>
        <code
          className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded font-mono tracking-wider"
          data-testid="room-code"
        >
          {gameState.roomId}
        </code>
        {gameState.isSpectator && (
          <span
            className="text-xs font-bold bg-purple-600/80 text-white px-2 py-0.5 rounded"
            data-testid="spectator-badge"
          >
            SPECTATOR
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 text-sm">
        <DetonatorDial
          position={gameState.board.detonatorPosition}
          max={gameState.board.detonatorMax}
        />
        {timerDisplay && (
          <div
            data-testid="mission-timer"
            className={`px-2 py-0.5 rounded font-bold ${
              timerDisplay.isCritical
                ? "bg-red-700/80 text-white"
                : "bg-amber-700/70 text-white"
            }`}
          >
            ⏱ {timerDisplay.text}
          </div>
        )}
        <div data-testid="turn-number">
          Turn{" "}
          <span className="font-bold text-white">{gameState.turnNumber}</span>
        </div>
        <div className="flex items-center gap-1.5" data-testid="player-list">
          {gameState.players.map((p) => {
            const isCurrentTurn = p.id === currentPlayer?.id;
            const isMe = p.id === playerId;
            return (
              <div
                key={p.id}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  isCurrentTurn
                    ? "ring-2 ring-yellow-500 bg-gray-700 text-white"
                    : "bg-gray-800 text-gray-400"
                }`}
              >
                {p.name}
                {isMe && (
                  <span className="bg-blue-600 text-white text-[10px] rounded px-1 font-bold leading-tight">
                    YOU
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
