import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import type { ClientGameState, ClientMessage, ChatMessage, CharacterId, VisibleTile } from "@bomb-busters/shared";
import { DOUBLE_DETECTOR_CHARACTERS, EQUIPMENT_DEFS, MISSION_IMAGES, MISSION_SCHEMAS, MISSIONS, describeWirePoolSpec, requiresSetupInfoTokenForMission, wireLabel } from "@bomb-busters/shared";
import { BoardArea } from "./Board/BoardArea.js";
import { PlayerStand } from "./Players/PlayerStand.js";
import { CharacterCardOverlay } from "./Players/CharacterCardOverlay.js";
import { ActionPanel } from "./Actions/ActionPanel.js";
import { ChooseNextPlayerPanel } from "./Actions/ChooseNextPlayerPanel.js";
import { InfoTokenSetup } from "./Actions/InfoTokenSetup.js";
import { ChatPanel } from "./Chat/ChatPanel.js";
import { ActionLog } from "./ActionLog.js";
import { MissionRuleHints } from "./MissionRuleHints.js";
import { EquipmentModePanel } from "./Actions/EquipmentModePanel.js";
import type { EquipmentMode } from "./Actions/EquipmentModePanel.js";
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
import { GameRulesPopup } from "./GameRulesPopup/index.js";

type UnknownForcedAction = {
  kind: string;
  captainId?: string;
};

const FORCED_ACTION_CHOOSE_NEXT_PLAYER = "chooseNextPlayer";
const HANDLED_FORCED_ACTION_KINDS = new Set<string>([
  FORCED_ACTION_CHOOSE_NEXT_PLAYER,
]);

function getUnknownForcedAction(gameState: ClientGameState): UnknownForcedAction | null {
  const raw = (gameState as { pendingForcedAction?: unknown }).pendingForcedAction;
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
]);

function usesFalseSetupTokenMode(mission: number, isCaptain: boolean): boolean {
  return mission === 52 || (mission === 17 && isCaptain);
}

function getDefaultFalseSetupTokenValue(tile: VisibleTile | undefined): number | null {
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

export function GameBoard({
  gameState,
  send,
  playerId,
  chatMessages,
  onPlayAgain,
}: {
  gameState: ClientGameState;
  send: (msg: ClientMessage) => void;
  playerId: string;
  chatMessages: ChatMessage[];
  onPlayAgain?: () => void;
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
  const hasAnytimeEquipment = gameState.board.equipment.some(
    (equipment) =>
      equipment.unlocked &&
      !equipment.used &&
      equipmentTiming.get(equipment.id) === "anytime",
  );
  const showActionPanel =
    gameState.phase === "playing" &&
    !gameState.pendingForcedAction &&
    !!me;

  // Dual cut target selection state
  const [selectedTarget, setSelectedTarget] = useState<{
    playerId: string;
    tileIndex: number;
  } | null>(null);

  // Dual cut guess wire selection (on my stand)
  const [selectedGuessTile, setSelectedGuessTile] = useState<number | null>(null);

  // Whether the "Dual Cut" action has been activated from the ActionPanel
  const [dualCutActive, setDualCutActive] = useState(false);

  // Info token setup tile selection state
  const [selectedInfoTile, setSelectedInfoTile] = useState<number | null>(null);
  const [selectedInfoTokenValue, setSelectedInfoTokenValue] = useState<number | null>(null);
  const [isRulesPopupOpen, setIsRulesPopupOpen] = useState(false);
  const [missionCardView, setMissionCardView] = useState<"front" | "back" | "text">("front");
  const cycleMissionView = useCallback(
    () => setMissionCardView((v) => (v === "front" ? "back" : v === "back" ? "text" : "front")),
    [],
  );
  const missionImageRef = useRef<HTMLImageElement>(null);
  const [missionImageHeight, setMissionImageHeight] = useState<number | undefined>(undefined);
  const onMissionImageLoad = useCallback(() => {
    if (missionImageRef.current) {
      setMissionImageHeight(missionImageRef.current.clientHeight);
    }
  }, []);

  // Character card overlay state
  const [viewingCharacter, setViewingCharacter] = useState<{
    playerId: string;
    characterId: CharacterId;
  } | null>(null);

  // Unified equipment mode state
  const [equipmentMode, setEquipmentMode] = useState<EquipmentMode | null>(null);
  const cancelEquipmentMode = useCallback(() => setEquipmentMode(null), []);

  const isSetup = gameState.phase === "setup_info_tokens";
  const requiresSetupToken = !isSetup || !me
    ? true
    : requiresSetupInfoTokenForMission(
      gameState.mission,
      gameState.players.length,
      me.isCaptain,
    );
  const useFalseSetupTokenMode =
    !!me && usesFalseSetupTokenMode(gameState.mission, me.isCaptain);
  const dynamicTurnActive = gameState.mission === 10 && gameState.phase === "playing";
  const previousPlayerName =
    gameState.pendingForcedAction?.kind === FORCED_ACTION_CHOOSE_NEXT_PLAYER &&
    gameState.pendingForcedAction.lastPlayerId
      ? gameState.players.find((p) => p.id === gameState.pendingForcedAction?.lastPlayerId)?.name
      : undefined;
  const pendingForcedAction = gameState.pendingForcedAction;
  const unknownForcedAction = getUnknownForcedAction(gameState);
  const isUnknownForcedActionCaptain =
    unknownForcedAction?.captainId != null &&
    unknownForcedAction.captainId === playerId;
  const forcedActionCaptainId =
    unknownForcedAction?.captainId ?? pendingForcedAction?.captainId;
  const forcedActionCaptainName =
    forcedActionCaptainId
      ? gameState.players.find((p) => p.id === forcedActionCaptainId)?.name
      : undefined;
  const activeGlobalConstraints =
    gameState.campaign?.constraints?.global?.filter((constraint) => constraint.active) ?? [];
  const activeTurnPlayerConstraints =
    currentPlayer
      ? (gameState.campaign?.constraints?.perPlayer?.[currentPlayer.id] ?? []).filter(
        (constraint) => constraint.active,
      )
      : [];
  const showTurnConstraintReminder =
    gameState.phase === "playing" &&
    (activeGlobalConstraints.length > 0 || activeTurnPlayerConstraints.length > 0);
  const turnConstraintPlayerLabel =
    currentPlayer?.id === playerId ? "You" : (currentPlayer?.name ?? "Current player");
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (gameState.timerDeadline == null || gameState.phase === "finished") return;
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

  // Cancel equipment mode and dual cut when turn or phase changes
  useEffect(() => {
    setEquipmentMode(null);
    setDualCutActive(false);
    setSelectedTarget(null);
    setSelectedGuessTile(null);
  }, [gameState.turnNumber, gameState.phase]);

  // --- Equipment mode tile click handlers (delegated to pure functions) ---

  const handleOpponentTileClick = (oppId: string, tileIndex: number) => {
    const newMode = _handleOpponentTileClick(equipmentMode, oppId, tileIndex);
    if (newMode !== equipmentMode) setEquipmentMode(newMode);
  };

  const handleOwnTileClickEquipment = (tileIndex: number) => {
    const result = _handleOwnTileClickEquipment(equipmentMode, tileIndex, me);
    if (result.sendPayload) send(result.sendPayload);
    if (result.newMode !== equipmentMode) setEquipmentMode(result.newMode);
  };

  // --- Selectability filters (delegated to pure functions) ---

  const getOpponentTileSelectableFilter = (oppId: string) =>
    _getOpponentTileSelectableFilter(equipmentMode, oppId);

  const getOwnTileSelectableFilter = () =>
    _getOwnTileSelectableFilter(equipmentMode, me);

  // --- Selection highlights ---

  const getOpponentSelectedTileIndex = (oppId: string): number | undefined => {
    const fromEquipment = _getOpponentSelectedTileIndex(equipmentMode, oppId);
    if (fromEquipment !== undefined) return fromEquipment;
    if (equipmentMode) return undefined;
    return selectedTarget?.playerId === oppId ? selectedTarget.tileIndex : undefined;
  };

  const getOpponentSelectedTileIndices = (oppId: string) =>
    _getOpponentSelectedTileIndices(equipmentMode, oppId);

  const getOwnSelectedTileIndex = (): number | undefined => {
    if (isSetup) return requiresSetupToken ? (selectedInfoTile ?? undefined) : undefined;
    const fromEquipment = _getOwnSelectedTileIndex(equipmentMode);
    if (fromEquipment !== undefined) return fromEquipment;
    if (equipmentMode) return undefined;
    if (dualCutActive && isMyTurn && gameState.phase === "playing") {
      return selectedGuessTile ?? undefined;
    }
    return undefined;
  };

  const getOwnSelectedTileIndices = () =>
    _getOwnSelectedTileIndices(equipmentMode);

  return (
    <>
      <div className="min-h-screen flex flex-col" style={{ perspective: "1200px" }} data-testid="game-board" data-phase={gameState.phase}>
        <Header
          gameState={gameState}
          playerId={playerId}
          timerDisplay={timerDisplay}
          onOpenRules={() => setIsRulesPopupOpen(true)}
        />

        <div className="flex-1 flex gap-2 p-2 overflow-hidden">
          {/* Game area */}
          <div className="flex-1 flex flex-col gap-2 min-w-0">
            {/* Opponents area */}
            <div className="flex gap-2 justify-center flex-shrink-0 flex-wrap">
              {opponentsWithOrder.map(({ player: opp, turnOrder }) => (
                <PlayerStand
                  key={opp.id}
                  player={opp}
                  isOpponent={true}
                  isCurrentTurn={opp.id === currentPlayer?.id}
                  turnOrder={turnOrder}
                  onCharacterClick={
                    opp.character
                      ? () => setViewingCharacter({ playerId: opp.id, characterId: opp.character! })
                      : undefined
                  }
                  onTileClick={
                    equipmentMode && MODES_NEEDING_OPPONENT_CLICK.has(equipmentMode.kind) && gameState.phase === "playing"
                      ? (tileIndex) => handleOpponentTileClick(opp.id, tileIndex)
                      : dualCutActive && selectedGuessTile != null && !isSetup && isMyTurn && gameState.phase === "playing" && !gameState.pendingForcedAction && !equipmentMode
                        ? (tileIndex) => {
                            if (selectedTarget?.playerId === opp.id && selectedTarget.tileIndex === tileIndex) {
                              setSelectedTarget(null);
                            } else {
                              setSelectedTarget({ playerId: opp.id, tileIndex });
                            }
                          }
                        : undefined
                  }
                  selectedTileIndex={getOpponentSelectedTileIndex(opp.id)}
                  selectedTileIndices={getOpponentSelectedTileIndices(opp.id)}
                  tileSelectableFilter={
                    equipmentMode && gameState.phase === "playing"
                      ? getOpponentTileSelectableFilter(opp.id)
                      : dualCutActive && selectedGuessTile != null && isMyTurn && gameState.phase === "playing"
                        ? (tile: VisibleTile) => !tile.cut
                        : undefined
                  }
                />
              ))}
            </div>

            {/* Board area */}
            <div className="flex-shrink-0">
              <BoardArea
                board={gameState.board}
                missionId={gameState.mission}
                playerCount={gameState.players.length}
                character={me?.character}
                characterUsed={me?.characterUsed}
              />
            </div>

            {/* My area */}
            <div className="flex-1 flex flex-col gap-2 min-h-0">
              {me && (
                <PlayerStand
                  player={me}
                  isOpponent={false}
                  isCurrentTurn={me.id === currentPlayer?.id}
                  turnOrder={myOrder}
                  onCharacterClick={
                    me.character
                      ? () => setViewingCharacter({ playerId: me.id, characterId: me.character! })
                      : undefined
                  }
                  onTileClick={
                    isSetup && isMyTurn
                      ? (requiresSetupToken
                        ? (tileIndex) => {
                            if (selectedInfoTile === tileIndex) {
                              setSelectedInfoTile(null);
                              setSelectedInfoTokenValue(null);
                              return;
                            }

                            setSelectedInfoTile(tileIndex);
                            if (useFalseSetupTokenMode) {
                              setSelectedInfoTokenValue(
                                getDefaultFalseSetupTokenValue(me?.hand[tileIndex]),
                              );
                            } else {
                              setSelectedInfoTokenValue(null);
                            }
                          }
                        : undefined)
                      : equipmentMode && gameState.phase === "playing"
                        ? (tileIndex) => handleOwnTileClickEquipment(tileIndex)
                        : dualCutActive && isMyTurn && !selectedTarget && gameState.phase === "playing"
                          ? (tileIndex) => {
                              const tile = me.hand[tileIndex];
                              if (!tile || tile.cut || tile.color === "red") return;
                              if (selectedGuessTile === tileIndex) {
                                setSelectedGuessTile(null);
                              } else {
                                setSelectedGuessTile(tileIndex);
                              }
                            }
                          : undefined
                  }
                  selectedTileIndex={getOwnSelectedTileIndex()}
                  selectedTileIndices={getOwnSelectedTileIndices()}
                  tileSelectableFilter={
                    isSetup && isMyTurn
                      ? (requiresSetupToken
                        ? (tile: VisibleTile) => {
                            if (tile.cut) return false;
                            if (useFalseSetupTokenMode && gameState.mission === 52) {
                              return tile.color === "blue" || tile.color === "red";
                            }
                            return (
                              tile.color === "blue" &&
                              tile.gameValue !== "RED" &&
                              tile.gameValue !== "YELLOW"
                            );
                          }
                        : undefined)
                      : equipmentMode && gameState.phase === "playing"
                        ? getOwnTileSelectableFilter()
                        : dualCutActive && isMyTurn && !selectedTarget && gameState.phase === "playing"
                          ? (tile: VisibleTile) => !tile.cut && tile.color !== "red"
                          : undefined
                  }
                />
              )}

              {/* Setup phase: info token placement */}
              {isSetup && isMyTurn && me && (
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
                <div className="text-center py-2 text-gray-400">
                  Waiting for <span className="text-white font-bold">{currentPlayer?.name}</span> to place their info token...
                </div>
              )}

              {dynamicTurnActive && (
                <div className="rounded-lg border border-sky-600/50 bg-sky-900/25 px-3 py-2 text-xs text-sky-100">
                  <div className="font-bold uppercase tracking-wide text-sky-200">
                    Dynamic Turn Order
                  </div>
                  {gameState.pendingForcedAction?.kind === FORCED_ACTION_CHOOSE_NEXT_PLAYER ? (
                    <div className="text-sky-100/90">
                      {forcedActionCaptainName
                        ? <>Captain <span className="font-semibold">{forcedActionCaptainName}</span> is choosing the next active player</>
                        : <>Captain is choosing the next active player</>}
                      {previousPlayerName ? (
                        <> (previous: <span className="font-semibold">{previousPlayerName}</span>)</>
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
                      Global: {activeGlobalConstraints.map((constraint) => constraint.name || constraint.id).join(", ")}
                    </div>
                  )}
                  {activeTurnPlayerConstraints.length > 0 && (
                    <div className="text-amber-100/90">
                      {turnConstraintPlayerLabel}: {activeTurnPlayerConstraints.map((constraint) => constraint.name || constraint.id).join(", ")}
                    </div>
                  )}
                </div>
              )}

              {gameState.phase !== "finished" && (
                <MissionRuleHints gameState={gameState} />
              )}

              {/* Playing phase: forced action (captain chooses next player) */}
              {gameState.phase === "playing" &&
                gameState.pendingForcedAction?.kind === FORCED_ACTION_CHOOSE_NEXT_PLAYER &&
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
                gameState.pendingForcedAction?.kind === FORCED_ACTION_CHOOSE_NEXT_PLAYER &&
                gameState.pendingForcedAction.captainId !== playerId && (
                <div className="text-center py-2 text-gray-400" data-testid="waiting-captain">
                  Waiting for{" "}
                  <span className="text-yellow-400 font-bold">
                    {forcedActionCaptainName ?? "the Captain"}
                  </span>{" "}
                  to choose the next player...
                </div>
              )}

              {/* Playing phase: future-proof fallback for unsupported forced-action kinds */}
              {gameState.phase === "playing" &&
                unknownForcedAction && (
                isUnknownForcedActionCaptain ? (
                  <div
                    className="rounded-lg border border-amber-500/50 bg-amber-950/25 px-3 py-2 text-center text-amber-200 space-y-2"
                    data-testid="forced-action-fallback-captain"
                  >
                    <p>
                      You must resolve a mission-required action before normal turns continue.
                    </p>
                    <p className="text-xs text-amber-300/90">
                      This client version does not support this forced action yet.
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
                  <div className="text-center py-2 text-gray-400" data-testid="waiting-forced-action">
                    Mission-required action is pending
                    {forcedActionCaptainName ? (
                      <> for <span className="text-yellow-400 font-bold">{forcedActionCaptainName}</span></>
                    ) : null}
                    .
                  </div>
                )
              )}

              {/* Equipment mode panel (unified for all equipment types) */}
              {equipmentMode && me && (
                <EquipmentModePanel
                  mode={equipmentMode}
                  gameState={gameState}
                  playerId={playerId}
                  send={send}
                  onCancel={cancelEquipmentMode}
                  onUpdateMode={setEquipmentMode}
                />
              )}

              {/* Playing phase: actions (including anytime equipment off-turn) */}
              {showActionPanel && !equipmentMode && me && (
                <ActionPanel
                  gameState={gameState}
                  send={send}
                  playerId={playerId}
                  isMyTurn={isMyTurn}
                  selectedTarget={selectedTarget}
                  selectedGuessTile={selectedGuessTile}
                  dualCutActive={dualCutActive}
                  onToggleDualCut={() => {
                    if (dualCutActive) {
                      setDualCutActive(false);
                      setSelectedTarget(null);
                      setSelectedGuessTile(null);
                    } else {
                      setDualCutActive(true);
                    }
                  }}
                  onClearTarget={() => { setDualCutActive(false); setSelectedTarget(null); setSelectedGuessTile(null); }}
                  onCutConfirmed={() => { setDualCutActive(false); setSelectedTarget(null); setSelectedGuessTile(null); }}
                  onEnterEquipmentMode={(mode) => {
                    setEquipmentMode(mode);
                    setDualCutActive(false);
                    setSelectedTarget(null);
                    setSelectedGuessTile(null);
                  }}
                  currentPlayerName={currentPlayer?.name}
                  isCurrentPlayerBot={currentPlayer?.isBot ?? false}
                  character={me.character}
                  characterUsed={me.characterUsed}
                  onUseCharacterAbility={
                    me.character && DOUBLE_DETECTOR_CHARACTERS.has(me.character)
                      ? () => {
                          setEquipmentMode({
                            kind: "double_detector",
                            targetPlayerId: null,
                            selectedTiles: [],
                            guessTileIndex: null,
                          });
                          setDualCutActive(false);
                          setSelectedTarget(null);
                          setSelectedGuessTile(null);
                        }
                      : undefined
                  }
                />
              )}

              {/* Game over banner */}
              {isFinished && (
                <div className="rounded-xl p-4 text-center space-y-3" data-testid="game-over-banner">
                  <div className={`text-2xl font-black ${gameState.result === "win" ? "text-green-400" : "text-red-500"}`}>
                    {gameState.result === "win" ? "MISSION COMPLETE!" : gameState.result === "loss_timer" ? "TIME'S UP!" : "BOOM!"}
                  </div>
                  <p className="text-sm text-gray-300">
                    {gameState.result === "win" && "All wires have been safely cut!"}
                    {gameState.result === "loss_red_wire" && "A red wire was cut and the bomb exploded!"}
                    {gameState.result === "loss_detonator" && "The detonator reached the end!"}
                    {gameState.result === "loss_timer" && "The mission timer expired!"}
                  </p>
                  {onPlayAgain && (
                    <button
                      onClick={onPlayAgain}
                      data-testid="play-again"
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold text-sm transition-colors"
                    >
                      Play Again
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar: mission card + action log + chat */}
          <div className="hidden lg:flex w-72 flex-shrink-0 flex-col gap-2 overflow-hidden">
            <div className="flex-shrink-0 relative cursor-pointer" onClick={cycleMissionView}>
              {missionCardView === "text" ? (() => {
                const schema = MISSION_SCHEMAS[gameState.mission];
                const def = MISSIONS[gameState.mission];
                const playerCount = gameState.players.length;
                const override = schema.overrides?.[playerCount as 2 | 3 | 4 | 5];
                const setup = {
                  blue: override?.blue ?? schema.setup.blue,
                  red: override?.red ?? schema.setup.red,
                  yellow: override?.yellow ?? schema.setup.yellow,
                  equipment: override?.equipment ?? schema.setup.equipment,
                };
                return (
                  <div className="rounded-lg border border-gray-700 bg-slate-950 p-3 space-y-2 overflow-y-auto" style={missionImageHeight ? { minHeight: missionImageHeight } : undefined}>
                    <div className="text-[10px] uppercase tracking-wide text-gray-400">
                      Mission {gameState.mission} — {def.difficulty}
                    </div>
                    <div className="text-sm font-bold text-white leading-tight">{schema.name}</div>

                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wide text-cyan-300">Setup ({playerCount}p)</div>
                      <div className="text-[11px] leading-snug text-gray-100 space-y-0.5">
                        <div>Blue: {setup.blue.minValue}–{setup.blue.maxValue}</div>
                        <div>Red: {describeWirePoolSpec(setup.red)}</div>
                        <div>Yellow: {describeWirePoolSpec(setup.yellow)}</div>
                        <div>Equipment: {setup.equipment.mode}</div>
                      </div>
                    </div>

                    {schema.behaviorHooks && schema.behaviorHooks.length > 0 && (
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wide text-amber-300">Special Rules</div>
                        <ul className="text-[11px] leading-snug text-gray-100 space-y-0.5">
                          {schema.behaviorHooks.map((hook) => (
                            <li key={hook}>- {hook.replace(/^mission_\d+_/, "").replaceAll("_", " ")}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {schema.notes && schema.notes.length > 0 && (
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wide text-fuchsia-300">Notes</div>
                        <ul className="text-[11px] leading-snug text-gray-300 space-y-0.5">
                          {schema.notes.map((note) => (
                            <li key={note}>- {note}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })() : (
                <img
                  ref={missionImageRef}
                  src={missionCardView === "back"
                    ? `/images/mission_${gameState.mission}_back.jpg`
                    : `/images/${MISSION_IMAGES[gameState.mission]}`}
                  alt={`Mission ${gameState.mission} (${missionCardView})`}
                  className="w-full h-auto rounded-lg"
                  onLoad={onMissionImageLoad}
                />
              )}
              <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-black/60 text-[10px] text-gray-300 pointer-events-none select-none">
                {missionCardView === "front" ? "FRONT" : missionCardView === "back" ? "BACK" : "TEXT"}
              </span>
            </div>
            <div className="flex-1 min-h-0 flex flex-col">
              <ActionLog log={gameState.log} players={gameState.players} result={gameState.result} />
            </div>
            <div className="flex-1 min-h-0 flex flex-col">
              <ChatPanel messages={chatMessages} send={send} playerId={playerId} />
            </div>
          </div>
        </div>
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
          isOwnCharacter={viewingCharacter.playerId === playerId}
          isMyTurn={isMyTurn}
          onClose={() => setViewingCharacter(null)}
          onUseAbility={
            viewingCharacter.playerId === playerId &&
            DOUBLE_DETECTOR_CHARACTERS.has(viewingCharacter.characterId)
              ? () => {
                  setViewingCharacter(null);
                  setEquipmentMode({
                    kind: "double_detector",
                    targetPlayerId: null,
                    selectedTiles: [],
                    guessTileIndex: null,
                  });
                  setDualCutActive(false);
                  setSelectedTarget(null);
                  setSelectedGuessTile(null);
                }
              : undefined
          }
        />
      )}
    </>
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
    <div className="flex items-center justify-between px-4 py-2 bg-[var(--color-bomb-surface)] border-b border-gray-700 flex-shrink-0" data-testid="game-header">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-black">
          BOMB<span className="text-red-500">BUSTERS</span>
        </h1>
        <span className="text-sm text-gray-400" data-testid="mission-label">
          Mission #{gameState.mission}
        </span>
        <code className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded font-mono tracking-wider" data-testid="room-code">
          {gameState.roomId}
        </code>
        {gameState.isSpectator && (
          <span className="text-xs font-bold bg-purple-600/80 text-white px-2 py-0.5 rounded" data-testid="spectator-badge">
            SPECTATOR
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 text-sm">
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
          Turn <span className="font-bold text-white">{gameState.turnNumber}</span>
        </div>
        <div data-testid="current-player">
          Playing:{" "}
          <span className={currentPlayer?.id === playerId ? "text-yellow-400 font-bold" : "text-white"}>
            {currentPlayer?.id === playerId ? "YOU" : currentPlayer?.name}
          </span>
        </div>
        <div className="text-gray-400">
          {gameState.isSpectator ? "Spectator" : <>{me?.name} {me?.isCaptain ? "(Captain)" : ""}</>}
        </div>
        <button
          type="button"
          onClick={onOpenRules}
          data-testid="open-rules-popup"
          className="px-2 py-1 rounded border border-gray-600 bg-gray-900 hover:bg-gray-800 text-gray-200 font-semibold text-xs uppercase tracking-wide transition-colors"
        >
          Rules
        </button>
      </div>
    </div>
  );
}
