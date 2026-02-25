import { useEffect, useMemo, useState, useCallback } from "react";
import type {
  AnyEquipmentId,
  ClientGameState,
  ClientMessage,
  ChatMessage,
  UseEquipmentPayload,
  VisibleTile,
} from "@bomb-busters/shared";
import {
  BLUE_COPIES_PER_VALUE,
  CHARACTER_CARD_TEXT,
  CHARACTER_IMAGES,
  DOUBLE_DETECTOR_CHARACTERS,
  EQUIPMENT_DEFS,
  requiredSetupInfoTokenCountForMission,
  requiresSetupInfoTokenForMission,
  wireLabel,
} from "@bomb-busters/shared";
import { BoardArea, DetonatorDial } from "./Board/BoardArea.js";
import { PlayerStand } from "./Players/PlayerStand.js";
import { ChooseNextPlayerPanel } from "./Actions/ChooseNextPlayerPanel.js";
import { DesignateCutterPanel } from "./Actions/DesignateCutterPanel.js";
import {
  DetectorTileChoicePanel,
  getDetectorChoiceSelectableIndices as _getDetectorChoiceSelectableIndices,
} from "./Actions/DetectorTileChoicePanel.js";
import { Mission22TokenPassPanel } from "./Actions/Mission22TokenPassPanel.js";
import { TalkiesWalkiesChoicePanel } from "./Actions/TalkiesWalkiesChoicePanel.js";
import { InfoTokenSetup } from "./Actions/InfoTokenSetup.js";
import { RightPanel, MissionCard } from "./RightPanel.js";
import { ActionLog } from "./ActionLog.js";
import { ChatPanel } from "./Chat/ChatPanel.js";
import { MobileTabBar, type MobileTab } from "./MobileTabBar.js";
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
import { CardStrip } from "./CardStrip.js";
import { CardPreviewModal, type CardPreviewCard } from "./CardPreviewModal.js";
import {
  canRevealReds,
  isRevealRedsForced,
  isMission26CutValueVisible,
  getImmediateEquipmentPayload,
  getInitialEquipmentMode,
  getSoloCutValues,
  isBaseEquipmentId,
} from "./Actions/actionRules.js";
import {
  getMission9SequenceGate,
  isMission9BlockedCutValue,
} from "./Actions/actionPanelMissionRules.js";
import {
  BUTTON_PRIMARY_CLASS,
  BUTTON_SECONDARY_CLASS,
  PANEL_CLASS,
  PANEL_SUBTEXT_CLASS,
  PANEL_TEXT_CLASS,
  PANEL_TITLE_CLASS,
} from "./Actions/panelStyles.js";

type UnknownForcedAction = {
  kind: string;
  captainId?: string;
};

const FORCED_ACTION_CHOOSE_NEXT_PLAYER = "chooseNextPlayer";
const FORCED_ACTION_DESIGNATE_CUTTER = "designateCutter";
const FORCED_ACTION_DETECTOR_TILE_CHOICE = "detectorTileChoice";
const FORCED_ACTION_MISSION22_TOKEN_PASS = "mission22TokenPass";
const FORCED_ACTION_TALKIES_WALKIES_CHOICE = "talkiesWalkiesTileChoice";
const FORCED_ACTION_MISSION46_SEVENS_CUT = "mission46SevensCut";
const HANDLED_FORCED_ACTION_KINDS = new Set<string>([
  FORCED_ACTION_CHOOSE_NEXT_PLAYER,
  FORCED_ACTION_DESIGNATE_CUTTER,
  FORCED_ACTION_DETECTOR_TILE_CHOICE,
  FORCED_ACTION_MISSION22_TOKEN_PASS,
  FORCED_ACTION_TALKIES_WALKIES_CHOICE,
  FORCED_ACTION_MISSION46_SEVENS_CUT,
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

type MultiCutTarget = {
  playerId: string;
  tileIndex: number;
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
  const [mobileTab, setMobileTab] = useState<MobileTab>("game");

  const [previewCard, setPreviewCard] = useState<CardPreviewCard | null>(null);

  // Unified equipment mode state
  const [equipmentMode, setEquipmentMode] = useState<EquipmentMode | null>(
    null,
  );
  const [selectedDockCardId, setSelectedDockCardId] = useState<string | null>(
    null,
  );
  const cancelEquipmentMode = useCallback(() => {
    setEquipmentMode(null);
    setSelectedDockCardId(null);
  }, []);
  const clearEquipmentMode = useCallback(() => {
    setEquipmentMode((prev) => {
      if (!prev) return prev;
      const reset = getInitialEquipmentMode(prev.kind as AnyEquipmentId);
      return reset ?? prev;
    });
  }, []);

  // Talkies-Walkies forced-action: teammate picks their own wire on the stand
  const [detectorTileChoiceSelection, setDetectorTileChoiceSelection] = useState<
    number | null
  >(null);
  const [talkiesWalkiesSelection, setTalkiesWalkiesSelection] = useState<
    number | null
  >(null);
  const [mission46Targets, setMission46Targets] = useState<MultiCutTarget[]>([]);
  const [missionSpecialTargets, setMissionSpecialTargets] = useState<
    MultiCutTarget[]
  >([]);
  const [missionSpecialMode, setMissionSpecialMode] = useState(false);

  useEffect(() => {
    const fa = gameState.pendingForcedAction;
    if (
      !fa ||
      fa.kind !== FORCED_ACTION_DETECTOR_TILE_CHOICE ||
      fa.targetPlayerId !== playerId
    ) {
      setDetectorTileChoiceSelection(null);
    }
  }, [gameState.pendingForcedAction, playerId]);

  useEffect(() => {
    const fa = gameState.pendingForcedAction;
    if (
      !fa ||
      fa.kind !== "talkiesWalkiesTileChoice" ||
      fa.targetPlayerId !== playerId
    ) {
      setTalkiesWalkiesSelection(null);
    }
  }, [gameState.pendingForcedAction, playerId]);

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
  const hasXWireEquipmentRestriction =
    gameState.mission === 20 || gameState.mission === 35;
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
  const detectorForcedForMe =
    pendingForcedAction?.kind === FORCED_ACTION_DETECTOR_TILE_CHOICE &&
    pendingForcedAction.targetPlayerId === playerId
      ? pendingForcedAction
      : null;
  const mission46ForcedForMe =
    gameState.phase === "playing" &&
    isMyTurn &&
    pendingForcedAction?.kind === FORCED_ACTION_MISSION46_SEVENS_CUT &&
    pendingForcedAction.playerId === playerId;
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
      : pendingForcedAction?.kind === "mission22TokenPass"
        ? pendingForcedAction.currentChooserId
      : pendingForcedAction?.kind === "talkiesWalkiesTileChoice"
        ? pendingForcedAction.targetPlayerId
          : undefined);
  const forcedActionCaptainName = forcedActionCaptainId
    ? gameState.players.find((p) => p.id === forcedActionCaptainId)?.name
    : undefined;
  const detectorSelectableIndices =
    detectorForcedForMe && me
      ? _getDetectorChoiceSelectableIndices(detectorForcedForMe, me.hand)
      : [];
  const detectorAutoSelection =
    detectorSelectableIndices.length === 1
      ? detectorSelectableIndices[0]
      : null;
  const detectorEffectiveSelection =
    detectorTileChoiceSelection ?? detectorAutoSelection;

  useEffect(() => {
    if (!mission46ForcedForMe) {
      setMission46Targets([]);
      return;
    }
    // Mission 46 forced action supersedes any staged normal action.
    setPendingAction(null);
    setSelectedGuessTile(null);
    setEquipmentMode(null);
    setSelectedDockCardId(null);
  }, [mission46ForcedForMe]);

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
  const revealRedsForced = isMyTurn && (me != null && isRevealRedsForced(gameState, playerId));
  const missionSupportsSimultaneousThreeCut =
    gameState.mission === 13 || gameState.mission === 48 || gameState.mission === 41;
  const missionSpecialRequiredColor =
    gameState.mission === 13
      ? "red"
      : gameState.mission === 48
        ? "yellow"
        : gameState.mission === 41
          ? "yellow"
        : null;
  const missionSpecialTargetCount = gameState.mission === 41 ? 1 : 3;
  const missionSpecialActorHasRequiredColor =
    missionSpecialRequiredColor != null &&
    !!me &&
    me.hand.some(
      (tile) => !tile.cut && tile.color === missionSpecialRequiredColor,
    );
  const opponentTilesFullyVisibleForPlayer = gameState.players.every((player) =>
    player.id === playerId
      ? true
      : player.hand.every((tile) => tile.cut || tile.color != null),
  );
  const missionSpecialAnyTargetColorAvailable =
    missionSpecialRequiredColor != null &&
    (() => {
      if (gameState.mission === 41) {
        const teammateHasKnownTripwire = gameState.players.some(
          (player) =>
            player.id !== playerId &&
            player.hand.some(
              (tile) => !tile.cut && tile.color === missionSpecialRequiredColor,
            ),
        );

        if (opponentTilesFullyVisibleForPlayer) {
          return teammateHasKnownTripwire;
        }

        return gameState.players.some(
          (player) =>
            player.id !== playerId &&
            player.hand.some((tile) => !tile.cut),
        );
      }

      if (gameState.players.length >= 4) return true;
      return missionSpecialActorHasRequiredColor;
    })();
  const mission41SkipIfNeeded =
    gameState.mission === 41 && me != null
      ? (() => {
        const uncutTiles = me.hand.filter((tile) => !tile.cut);
        const uncutYellowCount = uncutTiles.filter((tile) => tile.color === "yellow").length;
        return (
          uncutYellowCount === 1 &&
          uncutTiles.length > 0 &&
          uncutTiles.every((tile) => tile.color === "yellow" || tile.color === "red")
        );
      })()
      : false;
  const missionSpecialActorEligible =
    missionSpecialRequiredColor != null &&
    (gameState.mission === 41 ? !mission41SkipIfNeeded : gameState.players.length >= 4 || missionSpecialActorHasRequiredColor);
  const missionSpecialCanBypassForcedReveal =
    revealRedsForced &&
    missionSupportsSimultaneousThreeCut &&
    missionSpecialAnyTargetColorAvailable &&
    missionSpecialActorEligible;
  const canStartMissionSpecialCut =
    missionSupportsSimultaneousThreeCut &&
    missionSpecialAnyTargetColorAvailable &&
    missionSpecialActorEligible &&
    gameState.phase === "playing" &&
    isMyTurn &&
    !gameState.pendingForcedAction &&
    !equipmentMode &&
    pendingAction == null &&
    !mission46ForcedForMe &&
    (!revealRedsForced || missionSpecialCanBypassForcedReveal);
  const mission11RevealBlockedHint =
    isMyTurn && gameState.mission === 11 && !revealRedsAvailable;
  const mission11RevealAttemptAvailable =
    isMyTurn &&
    gameState.phase === "playing" &&
    gameState.mission === 11 &&
    !gameState.pendingForcedAction &&
    !equipmentMode &&
    pendingAction == null &&
    selectedGuessTile == null &&
    !forceRevealReds &&
    !!me &&
    me.hand.some((tile) => !tile.cut);

  useEffect(() => {
    if (canStartMissionSpecialCut) return;
    setMissionSpecialMode(false);
    setMissionSpecialTargets([]);
  }, [canStartMissionSpecialCut]);

  const soloValues = me ? getSoloCutValues(gameState, playerId) : [];
  const soloValueSet = new Set<number | "YELLOW">(soloValues);
  const mission9Gate = getMission9SequenceGate(gameState);
  const mission9ActiveValue = mission9Gate?.activeValue;
  const mission9RequiredCuts = mission9Gate?.requiredCuts ?? 2;
  const mission9ActiveProgress = mission9Gate?.activeProgress;
  const isMission9BlockedValue = (value: number | "YELLOW"): boolean =>
    isMission9BlockedCutValue(gameState, value);
  const isVisibleMission26CutValue = (value: unknown): value is number => {
    return isMission26CutValueVisible(gameState, value);
  };
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
  const canConfirmSoloFromDraft =
    selectedGuessValue != null &&
    selectedGuessValue !== "RED" &&
    soloValueSet.has(selectedGuessValue) &&
    !isMission9BlockedValue(selectedGuessValue);
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

  const confirmSoloFromDraft = useCallback(() => {
    if (!canConfirmSoloFromDraft) return;
    if (selectedGuessValue == null) return;
    send({ type: "soloCut", value: selectedGuessValue });
    setSelectedGuessTile(null);
    setSelectedDockCardId(null);
  }, [canConfirmSoloFromDraft, selectedGuessValue, send]);

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
    if (selectedDockCardId && !equipmentMode && !pendingAction) {
      setSelectedDockCardId(null);
    }
  }, [selectedDockCardId, equipmentMode, pendingAction]);

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
    setSelectedDockCardId(null);
    setMissionSpecialMode(false);
    setMissionSpecialTargets([]);
  }, [gameState.turnNumber, gameState.phase]);

  useEffect(() => {
    if (!revealRedsForced || missionSpecialCanBypassForcedReveal) return;
    setPendingAction((prev) =>
      prev?.kind === "reveal_reds" ? prev : null,
    );
    setSelectedGuessTile(null);
  }, [revealRedsForced, missionSpecialCanBypassForcedReveal]);

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
    _getOpponentTileSelectableFilter(equipmentMode, oppId, gameState.mission);

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

  const getOpponentSelectedTileIndices = (oppId: string): number[] | undefined => {
    const fromEquipment = _getOpponentSelectedTileIndices(equipmentMode, oppId);
    if (fromEquipment !== undefined) return fromEquipment;
    if (equipmentMode) return undefined;
    if (missionSpecialMode) {
      const indices = missionSpecialTargets
        .filter((target) => target.playerId === oppId)
        .map((target) => target.tileIndex);
      return indices.length > 0 ? indices : undefined;
    }
    if (!mission46ForcedForMe) return undefined;
    const indices = mission46Targets
      .filter((target) => target.playerId === oppId)
      .map((target) => target.tileIndex);
    return indices.length > 0 ? indices : undefined;
  };

  const getOwnSelectedTileIndex = (): number | undefined => {
    if (isSetup)
      return requiresSetupToken ? (selectedInfoTile ?? undefined) : undefined;
    const fromEquipment = _getOwnSelectedTileIndex(equipmentMode);
    if (fromEquipment !== undefined) return fromEquipment;
    if (equipmentMode) return undefined;
    if (detectorForcedForMe) return detectorEffectiveSelection ?? undefined;
    if (mission46ForcedForMe) return undefined;
    if (talkiesWalkiesSelection != null) return talkiesWalkiesSelection;
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
    if (!equipmentMode && missionSpecialMode) {
      const indices = missionSpecialTargets
        .filter((target) => target.playerId === playerId)
        .map((target) => target.tileIndex);
      return indices.length > 0 ? indices : undefined;
    }
    if (!equipmentMode && mission46ForcedForMe) {
      const indices = mission46Targets
        .filter((target) => target.playerId === playerId)
        .map((target) => target.tileIndex);
      return indices.length > 0 ? indices : undefined;
    }
    if (
      selectedGuessTile != null &&
      pendingAction == null &&
      playingInteractionEnabled &&
      !revealRedsForced
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

  const canUseSkillFromCardStrip =
    !!me &&
    !!me.character &&
    !me.characterUsed &&
    isMyTurn &&
    gameState.phase === "playing" &&
    !gameState.pendingForcedAction &&
    !revealRedsForced &&
    DOUBLE_DETECTOR_CHARACTERS.has(me.character);

  const stageEquipmentActionFromCardStrip = (equipmentId: string): boolean => {
    if (!me || gameState.phase !== "playing" || gameState.pendingForcedAction) {
      return false;
    }
    if (equipmentMode || pendingAction || missionSpecialMode) return false;

    const equipment = gameState.board.equipment.find((eq) => eq.id === equipmentId);
    if (!equipment || !equipment.unlocked || equipment.used) return false;

    const def = EQUIPMENT_DEFS.find((entry) => entry.id === equipment.id);
    if (!def) return false;
    if (!isBaseEquipmentId(equipment.id) && def.pool !== "campaign") return false;

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
    const blockedByForcedReveal = revealRedsForced && isMyTurn;
    if (!timingAllowsUse || secondaryLocked || blockedByForcedReveal)
      return false;

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
      return true;
    }

    const modeOnConfirm = getInitialEquipmentMode(typedEquipmentId);
    if (!modeOnConfirm) return false;
    setEquipmentMode(modeOnConfirm);
    setSelectedGuessTile(null);
    return true;
  };

  const stageSkillFromCardStrip = (): boolean => {
    if (!me?.character || !canUseSkillFromCardStrip || missionSpecialMode) return false;
    setEquipmentMode({
      kind: "double_detector",
      targetPlayerId: null,
      selectedTiles: [],
      guessTileIndex: null,
    });
    setSelectedGuessTile(null);
    return true;
  };

  const openCharacterPreview = useCallback(
    (player: ClientGameState["players"][number]) => {
      if (!player.character) return;
      const card = CHARACTER_CARD_TEXT[player.character];
      setPreviewCard({
        name: card.name,
        previewImage: CHARACTER_IMAGES[player.character] ?? null,
        detailSubtitle: card.abilityName,
        detailTiming: card.timing,
        detailEffect: card.effect,
        detailReminders: [...card.reminders],
      });
    },
    [],
  );

  const cancelPendingAction = () => {
    setPendingAction(null);
    setSelectedGuessTile(null);
    setSelectedDockCardId(null);
  };

  const stageMission11RevealAttempt = () => {
    if (!isMyTurn || gameState.phase !== "playing" || gameState.mission !== 11 || !me) {
      return;
    }

    const actorTileIndex = me.hand.findIndex((tile) => !tile.cut);
    if (actorTileIndex === -1) return;

    setPendingAction({
      kind: "reveal_reds",
      actorTileIndex,
    });
    setSelectedGuessTile(null);
    setSelectedDockCardId(null);
  };

  const toggleMission46Target = useCallback(
    (targetPlayerId: string, tileIndex: number) => {
      setMission46Targets((current) => {
        const existingIndex = current.findIndex(
          (target) =>
            target.playerId === targetPlayerId && target.tileIndex === tileIndex,
        );
        if (existingIndex >= 0) {
          return current.filter((_, index) => index !== existingIndex);
        }
        if (current.length >= 4) {
          return current;
        }
        return [...current, { playerId: targetPlayerId, tileIndex }];
      });
    },
    [],
  );

  const toggleMissionSpecialTarget = useCallback(
    (targetPlayerId: string, tileIndex: number) => {
      if (gameState.mission === 41 && targetPlayerId === playerId) return;
    setMissionSpecialTargets((current) => {
        const existingIndex = current.findIndex(
          (target) =>
            target.playerId === targetPlayerId && target.tileIndex === tileIndex,
        );
        if (existingIndex >= 0) {
          return current.filter((_, index) => index !== existingIndex);
        }
        if (current.length >= missionSpecialTargetCount) {
          return current;
        }
        return [...current, { playerId: targetPlayerId, tileIndex }];
      });
    },
    [gameState.mission, missionSpecialTargetCount, playerId],
  );

  const clearMission46Targets = useCallback(() => {
    setMission46Targets([]);
  }, []);

  const startMissionSpecialCut = useCallback(() => {
    if (!canStartMissionSpecialCut) return;
    setMissionSpecialMode(true);
    setMissionSpecialTargets([]);
    setSelectedGuessTile(null);
    setPendingAction(null);
    setSelectedDockCardId(null);
    setEquipmentMode(null);
  }, [canStartMissionSpecialCut]);

  const clearMissionSpecialTargets = useCallback(() => {
    setMissionSpecialTargets([]);
  }, []);

  const cancelMissionSpecialCut = useCallback(() => {
    setMissionSpecialMode(false);
    setMissionSpecialTargets([]);
  }, []);

  const confirmMissionSpecialCut = useCallback(() => {
    if (!missionSpecialMode || missionSpecialTargets.length !== missionSpecialTargetCount) return;
    send({ type: "simultaneousRedCut", targets: missionSpecialTargets });
    setMissionSpecialMode(false);
    setMissionSpecialTargets([]);
    setPendingAction(null);
    setSelectedGuessTile(null);
    setSelectedDockCardId(null);
  }, [missionSpecialMode, missionSpecialTargets, send, missionSpecialTargetCount]);

  const confirmMission46SevensCut = useCallback(() => {
    if (!mission46ForcedForMe || mission46Targets.length !== 4) return;
    send({ type: "simultaneousFourCut", targets: mission46Targets });
    setMission46Targets([]);
    setPendingAction(null);
    setSelectedGuessTile(null);
    setSelectedDockCardId(null);
  }, [mission46ForcedForMe, mission46Targets, send]);

  const cancelSelectedDockCard = useCallback(() => {
    setSelectedDockCardId(null);
    setEquipmentMode(null);
    setPendingAction(null);
    setSelectedGuessTile(null);
  }, []);

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
    setSelectedDockCardId(null);
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
            onOpenRules={() => setIsRulesPopupOpen(true)}
          />
          <BoardArea
            board={gameState.board}
            missionId={gameState.mission}
            playerCount={gameState.players.length}
          />
        </div>

        <div
          className="grid grid-cols-[1fr] md:grid-cols-[1fr_auto] gap-2 pr-2 py-2 pb-14 md:pb-2 overflow-hidden min-w-0 min-h-0"
        >
          {/* Game area */}
          <div
            className={`grid gap-2 min-w-0 min-h-0 ${mobileTab !== "game" ? "hidden md:grid" : ""}`}
            style={{ gridTemplateRows: "1fr auto" }}
          >
            {/* Scrollable top area */}
            <div className="overflow-y-auto overscroll-none overflow-x-hidden min-h-0 min-w-0">
              <div className="w-full min-w-0 flex flex-col gap-2 overflow-x-hidden">
                {/* Opponents area */}
                <div className="flex gap-2 justify-center overflow-x-hidden flex-wrap min-w-0 w-full">
                  {opponentsWithOrder.map(({ player: opp, turnOrder }) => (
                    <PlayerStand
                      key={opp.id}
                      player={opp}
                      isOpponent={true}
                      isCurrentTurn={opp.id === currentPlayer?.id}
                      turnOrder={turnOrder}
                      onCharacterClick={
                        opp.character
                          ? () => openCharacterPreview(opp)
                          : undefined
                      }
                      onTileClick={
                        equipmentMode &&
                        MODES_NEEDING_OPPONENT_CLICK.has(equipmentMode.kind) &&
                        gameState.phase === "playing"
                          ? (tileIndex) =>
                              handleOpponentTileClick(opp.id, tileIndex)
                          : missionSpecialMode
                            ? (tileIndex) => {
                                const oppTile = opp.hand[tileIndex];
                                if (!oppTile || oppTile.cut) return;
                                toggleMissionSpecialTarget(opp.id, tileIndex);
                              }
                          : mission46ForcedForMe
                            ? (tileIndex) => {
                                const oppTile = opp.hand[tileIndex];
                                if (!oppTile || oppTile.cut) return;
                                toggleMission46Target(opp.id, tileIndex);
                              }
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
                                    !revealRedsForced &&
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
                              if (!isVisibleMission26CutValue(guessValue)) return;
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
                        equipmentMode &&
                        gameState.phase === "playing" &&
                        MODES_NEEDING_OPPONENT_CLICK.has(equipmentMode.kind)
                          ? getOpponentTileSelectableFilter(opp.id)
                          : missionSpecialMode
                            ? (tile: VisibleTile) => !tile.cut
                          : mission46ForcedForMe
                            ? (tile: VisibleTile) => !tile.cut
                          : pendingAction?.kind === "dual_cut"
                            ? (tile: VisibleTile) => !tile.cut
                            : playingInteractionEnabled &&
                                isMyTurn &&
                                selectedGuessTile != null &&
                                !revealRedsForced &&
                                !pendingAction
                              ? (tile: VisibleTile) => !tile.cut
                              : undefined
                      }
                    />
                  ))}
                </div>

                {me && (
                  <div className="w-full flex justify-center">
                    <div className="w-full max-w-6xl">
                      <CardStrip
                        equipment={gameState.board.equipment}
                        character={me.character}
                        characterUsed={me.characterUsed}
                        isMyTurn={isMyTurn}
                        canSelectCards={!isSetup && !missionSpecialMode}
                        selectedCardId={selectedDockCardId}
                        onSelectCard={setSelectedDockCardId}
                        onDeselectCard={cancelSelectedDockCard}
                        onSelectEquipmentAction={stageEquipmentActionFromCardStrip}
                        onSelectPersonalSkill={stageSkillFromCardStrip}
                      />
                    </div>
                  </div>
                )}

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

              </div>
            </div>
            {/* Player stand + actions — always at the bottom */}
            {me && (
              <div className="flex flex-col gap-2 min-w-0">
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

                {/* Playing phase: forced action (mission 22 token pass choice) */}
                {gameState.phase === "playing" &&
                  gameState.pendingForcedAction?.kind ===
                    FORCED_ACTION_MISSION22_TOKEN_PASS &&
                  gameState.pendingForcedAction.currentChooserId === playerId &&
                  me && (
                    <Mission22TokenPassPanel
                      gameState={gameState}
                      send={send}
                      playerId={playerId}
                    />
                  )}

                {/* Playing phase: forced action (walkies target chooses wire) */}
                {gameState.phase === "playing" &&
                  gameState.pendingForcedAction?.kind ===
                    FORCED_ACTION_TALKIES_WALKIES_CHOICE &&
                  gameState.pendingForcedAction.targetPlayerId === playerId &&
                  me && (
                    <TalkiesWalkiesChoicePanel
                      gameState={gameState}
                      send={send}
                      playerId={playerId}
                      selectedIndex={talkiesWalkiesSelection}
                    />
                  )}

                {gameState.phase === "playing" && mission46ForcedForMe && (
                  <Mission46SevensCutPanel
                    selectedCount={mission46Targets.length}
                    onClear={clearMission46Targets}
                    onConfirm={confirmMission46SevensCut}
                  />
                )}

                {gameState.phase === "playing" &&
                  canStartMissionSpecialCut &&
                  !missionSpecialMode && (
                    <div
                      className="rounded-lg border border-red-500/50 bg-red-950/20 px-3 py-2 text-xs space-y-2"
                      data-testid="mission-special-three-cut-launch"
                    >
                      <div className="font-bold text-red-300 uppercase tracking-wide">
                        Mission {gameState.mission} Special Action
                      </div>
                      <div className="text-red-100">
                        {gameState.mission === 13
                          ? "Cut the 3 red wires at the same time."
                          : gameState.mission === 48
                            ? "Cut the 3 yellow wires at the same time."
                            : "Cut 1 tripwire."}
                      </div>
                      <button
                        type="button"
                        onClick={startMissionSpecialCut}
                        className="px-3 py-1 rounded bg-red-700 hover:bg-red-600 text-white font-black transition-colors"
                      >
                        {gameState.mission === 41 ? "Select 1 Wire" : "Select 3 Wires"}
                      </button>
                    </div>
                  )}

                {gameState.phase === "playing" && missionSpecialMode && (
                  <MissionSpecialThreeCutPanel
                    mission={gameState.mission}
                    selectedCount={missionSpecialTargets.length}
                    requiredCount={missionSpecialTargetCount}
                    onClear={clearMissionSpecialTargets}
                    onCancel={cancelMissionSpecialCut}
                    onConfirm={confirmMissionSpecialCut}
                  />
                )}

                {/* Playing phase: future-proof fallback for unsupported forced-action kinds */}
                {gameState.phase === "playing" &&
                  unknownForcedAction &&
                  (isUnknownForcedActionCaptain ? (
                    <div className={PANEL_CLASS} data-testid="forced-action-fallback-captain">
                      <div className={PANEL_TITLE_CLASS}>Mission Action Required</div>
                      <p className={PANEL_TEXT_CLASS}>
                        You must resolve a mission-required action before normal
                        turns continue.
                      </p>
                      <p className={PANEL_SUBTEXT_CLASS}>
                        This client version does not support this forced action
                        yet.
                      </p>
                      <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className={BUTTON_PRIMARY_CLASS}
                      >
                        Reload Client
                      </button>
                    </div>
                  ) : (
                    <div className={PANEL_CLASS} data-testid="waiting-forced-action">
                      <div className={PANEL_TITLE_CLASS}>Mission Action Required</div>
                      <div className={PANEL_SUBTEXT_CLASS}>
                        Mission-required action is pending
                        {forcedActionCaptainName ? (
                          <>
                            {" "}
                            for{" "}
                            <span className="text-slate-200 font-bold">
                              {forcedActionCaptainName}
                            </span>
                          </>
                        ) : null}
                        .
                      </div>
                    </div>
                  ))}

                {/* Equipment mode panel (unified for all equipment types) */}
                {equipmentMode && (
                  <EquipmentModePanel
                    mode={equipmentMode}
                    gameState={gameState}
                    playerId={playerId}
                    send={send}
                    onCancel={cancelEquipmentMode}
                    onClear={clearEquipmentMode}
                    onUpdateMode={setEquipmentMode}
                  />
                )}

                {!equipmentMode && gameState.phase === "playing" && (
                  <PendingActionStrip
                    players={gameState.players}
                    pendingAction={pendingAction}
                    selectedGuessTile={selectedGuessTile}
                    selectedGuessValue={selectedGuessValue}
                    canConfirmSoloFromDraft={canConfirmSoloFromDraft}
                    mission9SelectedGuessBlocked={mission9SelectedGuessBlocked}
                    mission9ActiveValue={mission9ActiveValue}
                    mission11RevealAttemptAvailable={mission11RevealAttemptAvailable}
                    canConfirm={
                      pendingAction != null &&
                      !(
                        pendingAction.kind === "dual_cut" &&
                        mission9PendingDualBlocked
                      )
                    }
                    onMission11RevealAttempt={stageMission11RevealAttempt}
                    onConfirmSoloFromDraft={confirmSoloFromDraft}
                    onCancel={cancelPendingAction}
                    onConfirm={confirmPendingAction}
                  />
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
                      selectedIndex={detectorEffectiveSelection}
                    />
                  )}

                {/* Setup phase: info token placement */}
                {isSetup && isMyTurn && (
                  <InfoTokenSetup
                    player={me}
                    selectedTileIndex={selectedInfoTile}
                    selectedTokenValue={selectedInfoTokenValue}
                    requiresToken={requiresSetupToken}
                    totalTokens={requiredSetupInfoTokenCountForMission(gameState.mission, gameState.players.length, me.isCaptain)}
                    useFalseTokenMode={useFalseSetupTokenMode}
                    send={send}
                    onPlaced={() => {
                      setSelectedInfoTile(null);
                      setSelectedInfoTokenValue(null);
                    }}
                    onSelectedTokenValueChange={setSelectedInfoTokenValue}
                  />
                )}

                <PlayerStand
                  player={me}
                  isOpponent={false}
                  isCurrentTurn={me.id === currentPlayer?.id}
                  turnOrder={myOrder}
                  statusContent={getStatusContent(
                    gameState,
                    playerId,
                    currentPlayer,
                    isMyTurn,
                    isSetup,
                    forcedActionCaptainName,
                    currentPlayer?.isBot ?? false,
                  )}
                  onCharacterClick={
                    me.character
                      ? () => openCharacterPreview(me)
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
                        : detectorForcedForMe && me
                          ? (tileIndex) => {
                              if (!detectorSelectableIndices.includes(tileIndex))
                                return;
                              setDetectorTileChoiceSelection((current) =>
                                current === tileIndex ? null : tileIndex,
                              );
                            }
                        : gameState.pendingForcedAction?.kind ===
                              FORCED_ACTION_TALKIES_WALKIES_CHOICE &&
                            gameState.pendingForcedAction.targetPlayerId ===
                              playerId &&
                            me
                          ? (tileIndex) => {
                              const tile = me.hand[tileIndex];
                              if (!tile || tile.cut) return;
                              if (hasXWireEquipmentRestriction && tile.isXMarked)
                                return;
                              setTalkiesWalkiesSelection(
                                talkiesWalkiesSelection === tileIndex
                                  ? null
                                  : tileIndex,
                              );
                            }
                          : missionSpecialMode
                            ? (tileIndex) => {
                                const tile = me.hand[tileIndex];
                                if (!tile || tile.cut) return;
                                toggleMissionSpecialTarget(playerId, tileIndex);
                              }
                          : mission46ForcedForMe
                            ? (tileIndex) => {
                                const tile = me.hand[tileIndex];
                                if (!tile || tile.cut) return;
                                toggleMission46Target(playerId, tileIndex);
                              }
                          : playingInteractionEnabled &&
                              isMyTurn
                            ? (tileIndex) => {
                              if (pendingAction?.kind === "dual_cut") {
                                if (tileIndex === pendingAction.actorTileIndex) return;
                                const tile = me.hand[tileIndex];
                                if (!tile || tile.cut || tile.color === "red") return;
                                const newGuessValue = tile.gameValue;
                                if (newGuessValue == null || newGuessValue === "RED") return;
                                if (!isVisibleMission26CutValue(newGuessValue)) return;
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
                                if (gameState.mission !== 11 && tile.color !== "red") return;
                                setPendingAction({
                                  kind: "reveal_reds",
                                  actorTileIndex: tileIndex,
                                });
                                return;
                              }
                              if (tile.color === "red") return;
                              if (!isVisibleMission26CutValue(tile.gameValue)) return;

                              if (selectedGuessTile == null) {
                                setSelectedGuessTile(tileIndex);
                                return;
                              }
                              if (selectedGuessTile === tileIndex) {
                                setSelectedGuessTile(null);
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
                        : detectorForcedForMe && me
                          ? (_tile: VisibleTile, idx: number) =>
                              detectorSelectableIndices.includes(idx)
                  : gameState.pendingForcedAction?.kind ===
                          FORCED_ACTION_TALKIES_WALKIES_CHOICE &&
                        gameState.pendingForcedAction.targetPlayerId ===
                          playerId &&
                        me
                          ? (tile: VisibleTile) =>
                              !tile.cut &&
                              !(hasXWireEquipmentRestriction && tile.isXMarked)
                          : missionSpecialMode
                            ? (tile: VisibleTile) => !tile.cut
                          : mission46ForcedForMe
                            ? (tile: VisibleTile) => !tile.cut
                          : playingInteractionEnabled &&
                              isMyTurn
                            ? (tile: VisibleTile) => {
                              if (pendingAction?.kind === "dual_cut") {
                                return !tile.cut && tile.color !== "red";
                              }
                              if (pendingAction) return false;
                              if (tile.cut) return false;
                              if (forceRevealReds) return gameState.mission === 11 || tile.color === "red";
                              if (!isVisibleMission26CutValue(tile.gameValue)) return false;
                              return tile.color !== "red";
                            }
                          : undefined
                  }
                />
              </div>
            )}
          </div>

          {/* Mobile-only tab content */}
          {mobileTab === "mission" && (
            <div className="md:hidden overflow-y-auto min-h-0 space-y-3 px-2">
              <MissionCard missionId={gameState.mission} />
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
            </div>
          )}
          {mobileTab === "log" && (
            <div className="md:hidden overflow-hidden min-h-0 flex flex-col">
              <ActionLog
                log={gameState.log}
                players={gameState.players}
                result={gameState.result}
              />
            </div>
          )}
          {mobileTab === "chat" && (
            <div className="md:hidden overflow-hidden min-h-0 flex flex-col">
              <ChatPanel
                messages={chatMessages}
                send={send}
                playerId={playerId}
              />
            </div>
          )}

          {/* Sidebar: mission card + action log / chat (hidden on mobile via RightPanel's own classes) */}
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

      </div>

      <GameRulesPopup
        isOpen={isRulesPopupOpen}
        onClose={() => setIsRulesPopupOpen(false)}
        gameState={gameState}
      />

      {previewCard && (
        <CardPreviewModal card={previewCard} onClose={() => setPreviewCard(null)} />
      )}

      <MobileTabBar activeTab={mobileTab} onTabChange={setMobileTab} />
    </>
  );
}

function getStatusContent(
  gameState: ClientGameState,
  playerId: string,
  currentPlayer: ClientGameState["players"][number] | undefined,
  isMyTurn: boolean,
  isSetup: boolean,
  forcedActionCaptainName: string | undefined,
  isCurrentPlayerBot: boolean,
): React.ReactNode {
  if (gameState.phase === "finished") return null;

  const pendingForcedAction = gameState.pendingForcedAction;

  // Turn distance for "you're next" / "N more turns" hint
  const myIndex = gameState.players.findIndex((p) => p.id === playerId);
  const turnDistance =
    myIndex >= 0
      ? (myIndex - gameState.currentPlayerIndex + gameState.players.length) %
        gameState.players.length
      : 0;

  // --- Forced action messages (playing phase only) ---
  if (
    gameState.phase === "playing" &&
    pendingForcedAction?.kind === "mission46SevensCut"
  ) {
    if (pendingForcedAction.playerId === playerId) {
      return (
        <span className="inline-flex items-center gap-2">
          <span className="bg-amber-500 text-black font-black uppercase text-[10px] px-1.5 py-0.5 rounded-full">
            Forced
          </span>
          <span className="text-amber-300 font-bold">
            Mission 46: select 4 wires for the simultaneous 7-cut.
          </span>
        </span>
      );
    }

    const forcedPlayerName =
      gameState.players.find((player) => player.id === pendingForcedAction.playerId)
        ?.name ?? "the active player";
    return (
      <span className="text-gray-300">
        Waiting for{" "}
        <span className="text-yellow-400 font-bold">{forcedPlayerName}</span>{" "}
        to resolve Mission 46&apos;s forced simultaneous 7-cut...
      </span>
    );
  }

  if (
    gameState.phase === "playing" &&
    pendingForcedAction?.kind === "chooseNextPlayer" &&
    pendingForcedAction.captainId !== playerId
  ) {
    return (
      <span className="text-gray-300">
        Waiting for{" "}
        <span className="text-yellow-400 font-bold">
          {forcedActionCaptainName ?? "the Captain"}
        </span>{" "}
        to choose the next player...
      </span>
    );
  }
  if (
    gameState.phase === "playing" &&
    pendingForcedAction?.kind === "designateCutter" &&
    pendingForcedAction.designatorId !== playerId
  ) {
    return (
      <span className="text-gray-300">
        Waiting for{" "}
        <span className="text-yellow-400 font-bold">
          {forcedActionCaptainName ?? "the active player"}
        </span>{" "}
        to designate who cuts...
        {pendingForcedAction.value && (
          <span className="text-gray-500 ml-1">
            (Number card:{" "}
            <span className="text-white font-bold">
              {pendingForcedAction.value}
            </span>
            )
          </span>
        )}
      </span>
    );
  }
  if (
    gameState.phase === "playing" &&
    pendingForcedAction?.kind === "mission22TokenPass" &&
    pendingForcedAction.currentChooserId !== playerId
  ) {
    return (
      <span className="text-gray-300">
        Waiting for{" "}
        <span className="text-yellow-400 font-bold">
          {forcedActionCaptainName ?? "the active player"}
        </span>{" "}
        to choose a token value to pass...
      </span>
    );
  }
  if (
    gameState.phase === "playing" &&
    pendingForcedAction?.kind === "detectorTileChoice" &&
    pendingForcedAction.targetPlayerId !== playerId
  ) {
    return (
      <span className="text-gray-300">
        Waiting for{" "}
        <span className="text-yellow-400 font-bold">
          {forcedActionCaptainName ?? "the target player"}
        </span>{" "}
        to confirm...
      </span>
    );
  }
  if (
    gameState.phase === "playing" &&
    pendingForcedAction?.kind === "talkiesWalkiesTileChoice" &&
    pendingForcedAction.targetPlayerId !== playerId
  ) {
    return (
      <span className="text-gray-300">
        Waiting for{" "}
        <span className="text-yellow-400 font-bold">
          {forcedActionCaptainName ?? "the target player"}
        </span>{" "}
        to choose a wire for Walkie-Talkies...
      </span>
    );
  }
  // --- Setup phase ---
  if (isSetup && isMyTurn) {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="bg-yellow-500 text-black font-black uppercase text-[10px] px-1.5 py-0.5 rounded-full">
          Your Turn
        </span>
        <span className="text-yellow-300 font-bold">Place Info Token</span>
      </span>
    );
  }
  if (isSetup && !isMyTurn) {
    return (
      <span className="text-gray-400">
        Waiting for{" "}
        <span className="text-white font-bold">{currentPlayer?.name}</span> to
        place their info token...
      </span>
    );
  }
  // --- Playing phase: normal turn ---
  if (gameState.phase === "playing" && isMyTurn) {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="bg-yellow-500 text-black font-black uppercase text-[10px] px-1.5 py-0.5 rounded-full">
          Your Turn
        </span>
        <span className="text-yellow-300 font-bold">Choose an action</span>
      </span>
    );
  }
  if (gameState.phase === "playing" && !isMyTurn) {
    return isCurrentPlayerBot ? (
      <span className="inline-flex items-center gap-2 text-gray-300">
        <span className="inline-block w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-purple-300 font-bold">
          {currentPlayer?.name}
        </span>{" "}
        is thinking...
      </span>
    ) : (
      <span className="text-gray-300">
        Waiting for{" "}
        <span className="font-bold text-white">{currentPlayer?.name}</span>
        {turnDistance > 1 ? (
          <span className="text-gray-500"> ({turnDistance} more turns)</span>
        ) : null}
      </span>
    );
  }
  return null;
}

function Mission46SevensCutPanel({
  selectedCount,
  onClear,
  onConfirm,
}: {
  selectedCount: number;
  onClear: () => void;
  onConfirm: () => void;
}) {
  const canConfirm = selectedCount === 4;

  return (
    <div
      className="rounded-lg border border-amber-500/50 bg-amber-950/25 px-3 py-2 text-xs space-y-2"
      data-testid="mission46-sevens-cut-panel"
    >
      <div className="font-bold text-amber-300 uppercase tracking-wide">
        Mission 46 Forced Action
      </div>
      <div className="text-amber-100">
        Select exactly 4 uncut wires to attempt the simultaneous 7-wire cut.
      </div>
      <div className="text-amber-200/90">{selectedCount}/4 wires selected</div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClear}
          className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold transition-colors"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={!canConfirm}
          className={`px-3 py-1 rounded font-black transition-colors ${
            canConfirm
              ? "bg-red-600 hover:bg-red-500 text-white"
              : "bg-gray-700 text-gray-400 cursor-not-allowed"
          }`}
        >
          Confirm 4-Wire Cut
        </button>
      </div>
    </div>
  );
}

function MissionSpecialThreeCutPanel({
  mission,
  selectedCount,
  requiredCount,
  onClear,
  onCancel,
  onConfirm,
}: {
  mission: number;
  selectedCount: number;
  requiredCount: number;
  onClear: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const canConfirm = selectedCount === requiredCount;
  const label = mission === 48 ? "yellow" : "red";

  return (
    <div
      className="rounded-lg border border-red-500/50 bg-red-950/20 px-3 py-2 text-xs space-y-2"
      data-testid="mission-special-three-cut-panel"
    >
      <div className="font-bold text-red-300 uppercase tracking-wide">
        Mission {mission} Special Action
      </div>
      <div className="text-red-100">
        {mission === 41
          ? "Select exactly 1 uncut teammate tripwire to attempt the special tripwire cut."
          : `Select exactly ${requiredCount} uncut ${label} wires to attempt the simultaneous ${label} cut.`}
      </div>
      <div className="text-red-200/90">
        {selectedCount}/{requiredCount} {requiredCount === 1 ? "wire" : "wires"} selected
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClear}
          className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold transition-colors"
        >
          Clear
        </button>
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
              ? "bg-red-600 hover:bg-red-500 text-white"
              : "bg-gray-700 text-gray-400 cursor-not-allowed"
          }`}
        >
          {requiredCount === 1 ? "Confirm Wire Cut" : "Confirm 3-Wire Cut"}
        </button>
      </div>
    </div>
  );
}

function PendingActionStrip({
  players,
  pendingAction,
  selectedGuessTile,
  selectedGuessValue,
  canConfirmSoloFromDraft,
  mission9SelectedGuessBlocked,
  mission9ActiveValue,
  mission11RevealAttemptAvailable,
  canConfirm,
  onMission11RevealAttempt,
  onConfirmSoloFromDraft,
  onConfirm,
  onCancel,
}: {
  players: ClientGameState["players"];
  pendingAction: PendingAction | null;
  selectedGuessTile: number | null;
  selectedGuessValue: ClientGameState["players"][number]["hand"][number]["gameValue"] | null;
  canConfirmSoloFromDraft: boolean;
  mission9SelectedGuessBlocked: boolean;
  mission9ActiveValue?: number;
  mission11RevealAttemptAvailable: boolean;
  canConfirm: boolean;
  onMission11RevealAttempt: () => void;
  onConfirmSoloFromDraft: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!pendingAction) {
    if (selectedGuessTile == null) {
      if (!mission11RevealAttemptAvailable) return null;
      return (
        <div
          className="rounded-lg border border-sky-500/50 bg-sky-950/25 px-3 py-2 text-xs space-y-2"
          data-testid="mission11-reveal-attempt"
        >
          <div className="font-bold text-sky-300 uppercase tracking-wide">
            Mission 11 Reveal Check
          </div>
          <div className="text-sky-100">
            If your remaining wires match the hidden red-like value, stage Reveal Reds to confirm.
          </div>
          <button
            type="button"
            onClick={onMission11RevealAttempt}
            className="px-3 py-1 rounded bg-sky-700 hover:bg-sky-600 text-white font-bold transition-colors"
          >
            Attempt Reveal Reds
          </button>
        </div>
      );
    }
    return (
      <div
        className={PANEL_CLASS}
        data-testid="pending-action-draft"
      >
        <div className={PANEL_TITLE_CLASS}>
          Action Draft
        </div>
        <div className={PANEL_TEXT_CLASS}>
          Selected your wire <span className="font-semibold">{wireLabel(selectedGuessTile)}</span>{" "}
          (value {String(selectedGuessValue)}). Click an opponent wire for Dual Cut.
        </div>
        {mission9SelectedGuessBlocked && (
          <div className={PANEL_SUBTEXT_CLASS}>
            Mission 9: this value cannot be used for Dual Cut right now
            {typeof mission9ActiveValue === "number"
              ? ` (need ${mission9ActiveValue})`
              : ""}
            .
          </div>
        )}
        <div className="mt-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className={BUTTON_SECONDARY_CLASS}
            >
              Cancel
            </button>
            {canConfirmSoloFromDraft && (
              <button
                type="button"
                onClick={onConfirmSoloFromDraft}
                className={BUTTON_PRIMARY_CLASS}
              >
                Confirm Solo Cut ({String(selectedGuessValue)})
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  let summary = "";
  const hideCancelForRewinder =
    pendingAction.kind === "equipment" &&
    pendingAction.equipmentId === "rewinder";
  let confirmLabel = "Confirm";
  switch (pendingAction.kind) {
    case "dual_cut": {
      const targetName =
        players.find((player) => player.id === pendingAction.targetPlayerId)?.name ??
        pendingAction.targetPlayerId;
      summary = `Dual Cut: ${wireLabel(pendingAction.actorTileIndex)} (${String(
        pendingAction.guessValue,
      )}) -> ${targetName} ${wireLabel(pendingAction.targetTileIndex)}`;
      confirmLabel = `Confirm Dual Cut (${String(pendingAction.guessValue)})`;
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
      className={PANEL_CLASS}
      data-testid="pending-action-strip"
    >
      <div className={PANEL_TITLE_CLASS}>
        Pending Action
      </div>
      <div className={PANEL_TEXT_CLASS}>{summary}</div>
      <div className="flex items-center gap-2">
        {!hideCancelForRewinder && (
          <button
            type="button"
            onClick={onCancel}
            className={BUTTON_SECONDARY_CLASS}
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={onConfirm}
          disabled={!canConfirm}
          className={BUTTON_PRIMARY_CLASS}
        >
          {confirmLabel}
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
          {mission === 11
            ? "Reveal Reds: click one of your hidden red-like wires, then Confirm."
            : "Reveal Reds: click one of your red wires, then Confirm."}
        </div>
      )}
    </div>
  );
}

function Header({
  gameState,
  playerId,
  timerDisplay,
  onOpenRules,
}: {
  gameState: ClientGameState;
  playerId: string;
  timerDisplay: { text: string; isCritical: boolean } | null;
  onOpenRules: () => void;
}) {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const me = gameState.players.find((p) => p.id === playerId);

  return (
    <div
      className="flex flex-col md:flex-row md:items-center md:justify-between px-3 md:px-4 py-1.5 md:py-2 gap-1 md:gap-0 bg-[var(--color-bomb-surface)] border-b border-gray-700 flex-shrink-0"
      data-testid="game-header"
    >
      {/* Row 1: Brand + context (+ mobile-only turn/rules) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <h1 className="text-sm md:text-lg font-black shrink-0">
            BOMB<span className="text-red-500">BUSTERS</span>
          </h1>
          <span className="hidden md:inline text-[9px] font-mono text-gray-600 select-none">{`${APP_COMMIT_ID} | v${APP_VERSION}`}</span>
          <span className="text-xs md:text-sm text-gray-400 shrink-0" data-testid="mission-label">
            <span className="md:hidden">M#{gameState.mission}</span>
            <span className="hidden md:inline">Mission #{gameState.mission}</span>
          </span>
          <code
            className="hidden sm:inline text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded font-mono tracking-wider"
            data-testid="room-code"
          >
            {gameState.roomId}
          </code>
          {gameState.isSpectator && (
            <span
              className="text-[10px] md:text-xs font-bold bg-purple-600/80 text-white px-1.5 md:px-2 py-0.5 rounded shrink-0"
              data-testid="spectator-badge"
            >
              <span className="md:hidden">SPEC</span>
              <span className="hidden md:inline">SPECTATOR</span>
            </span>
          )}
        </div>
        {/* Mobile-only: turn + rules in row 1 */}
        <div className="flex md:hidden items-center gap-2 shrink-0 ml-2">
          <div className="text-xs text-gray-400" data-testid="turn-number-mobile">
            T<span className="font-bold text-white">{gameState.turnNumber}</span>
          </div>
          <button
            type="button"
            onClick={onOpenRules}
            className="rounded border border-gray-600 bg-gray-900/85 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-200 transition-colors hover:border-amber-400 hover:text-amber-200"
          >
            Rules
          </button>
        </div>
      </div>

      {/* Row 2: Gameplay-critical status */}
      <div className="flex items-center gap-2 md:gap-4 text-sm">
        <DetonatorDial
          position={gameState.board.detonatorPosition}
          max={gameState.board.detonatorMax}
        />
        {timerDisplay && (
          <div
            data-testid="mission-timer"
            className={`px-1.5 md:px-2 py-0.5 rounded font-bold text-xs md:text-sm ${
              timerDisplay.isCritical
                ? "bg-red-700/80 text-white"
                : "bg-amber-700/70 text-white"
            }`}
          >
            ⏱ {timerDisplay.text}
          </div>
        )}
        <div className="hidden md:block" data-testid="turn-number">
          Turn{" "}
          <span className="font-bold text-white">{gameState.turnNumber}</span>
        </div>
        <button
          type="button"
          onClick={onOpenRules}
          className="hidden md:block rounded border border-gray-600 bg-gray-900/85 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-gray-200 transition-colors hover:border-amber-400 hover:text-amber-200"
        >
          Rules
        </button>
        <div className="flex items-center gap-1 md:gap-1.5 overflow-x-auto" data-testid="player-list">
          {gameState.players.map((p) => {
            const isCurrentTurn = p.id === currentPlayer?.id;
            const isMe = p.id === playerId;
            return (
              <div
                key={p.id}
                title={p.name}
                className={`flex items-center gap-1 px-1.5 md:px-2 py-0.5 rounded-full text-[11px] md:text-xs font-medium shrink-0 ${
                  isCurrentTurn
                    ? "ring-2 ring-yellow-500 bg-gray-700 text-white"
                    : "bg-gray-800 text-gray-400"
                }`}
              >
                <span className="md:hidden">{p.name.slice(0, 3)}</span>
                <span className="hidden md:inline">{p.name}</span>
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
