import { useEffect, useMemo, useState, useCallback } from "react";
import type { ClientGameState, ClientMessage, ChatMessage, CharacterId, VisibleTile } from "@bomb-busters/shared";
import { DOUBLE_DETECTOR_CHARACTERS, EQUIPMENT_DEFS, MISSION_IMAGES, MISSION_SCHEMAS, MISSIONS, describeWirePoolSpec, wireLabel } from "@bomb-busters/shared";
import { BoardArea } from "./Board/BoardArea.js";
import { PlayerStand } from "./Players/PlayerStand.js";
import { CharacterCardOverlay } from "./Players/CharacterCardOverlay.js";
import { ActionPanel } from "./Actions/ActionPanel.js";
import { ChooseNextPlayerPanel } from "./Actions/ChooseNextPlayerPanel.js";
import { InfoTokenSetup } from "./Actions/InfoTokenSetup.js";
import { ChatPanel } from "./Chat/ChatPanel.js";
import { ActionLog } from "./ActionLog.js";
import { MissionRuleHints } from "./MissionRuleHints.js";
import gameRulesMarkdown from "../../../../../GAME_RULES.md?raw";

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
    !!me &&
    (isMyTurn || hasAnytimeEquipment);

  // Dual cut target selection state
  const [selectedTarget, setSelectedTarget] = useState<{
    playerId: string;
    tileIndex: number;
  } | null>(null);

  // Dual cut guess wire selection (on my stand)
  const [selectedGuessTile, setSelectedGuessTile] = useState<number | null>(null);

  // Info token setup tile selection state
  const [selectedInfoTile, setSelectedInfoTile] = useState<number | null>(null);
  const [isRulesPopupOpen, setIsRulesPopupOpen] = useState(false);
  const [missionCardShowText, setMissionCardShowText] = useState(false);

  // Character card overlay state
  const [viewingCharacter, setViewingCharacter] = useState<{
    playerId: string;
    characterId: CharacterId;
  } | null>(null);

  // Double Detector selection mode state
  const [doubleDetectorMode, setDoubleDetectorMode] = useState(false);
  const [ddSelectedTiles, setDdSelectedTiles] = useState<number[]>([]);
  const [ddTargetPlayerId, setDdTargetPlayerId] = useState<string | null>(null);
  const [ddGuessTile, setDdGuessTile] = useState<number | null>(null);

  const cancelDoubleDetector = useCallback(() => {
    setDoubleDetectorMode(false);
    setDdSelectedTiles([]);
    setDdTargetPlayerId(null);
    setDdGuessTile(null);
  }, []);

  // Post-it selection mode state
  const [postItMode, setPostItMode] = useState(false);
  const cancelPostIt = useCallback(() => setPostItMode(false), []);

  const isSetup = gameState.phase === "setup_info_tokens";
  const requiresSetupToken =
    !(
      isSetup &&
      gameState.mission === 11 &&
      gameState.players.length === 2 &&
      me?.isCaptain
    );
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
    }
  }, [requiresSetupToken]);

  useEffect(() => {
    if (!unknownForcedAction) return;
    console.warn(
      `[GameBoard] Unsupported forced action kind "${unknownForcedAction.kind}" is pending; fallback UI is active.`,
    );
  }, [unknownForcedAction?.kind]);

  // Cancel post-it mode when turn or phase changes
  useEffect(() => {
    setPostItMode(false);
  }, [gameState.turnNumber, gameState.phase]);

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
                    doubleDetectorMode && isMyTurn && gameState.phase === "playing"
                      ? (tileIndex) => {
                          // In DD mode: select up to 2 tiles on the same opponent
                          if (ddTargetPlayerId && ddTargetPlayerId !== opp.id) return;
                          setDdTargetPlayerId(opp.id);
                          setDdSelectedTiles((prev) => {
                            if (prev.includes(tileIndex)) {
                              return prev.filter((i) => i !== tileIndex);
                            }
                            if (prev.length >= 2) return prev;
                            return [...prev, tileIndex];
                          });
                        }
                      : !isSetup && isMyTurn && gameState.phase === "playing" && !gameState.pendingForcedAction
                        ? (tileIndex) =>
                            setSelectedTarget({ playerId: opp.id, tileIndex })
                        : undefined
                  }
                  selectedTileIndex={
                    doubleDetectorMode && ddTargetPlayerId === opp.id
                      ? undefined
                      : selectedTarget?.playerId === opp.id
                        ? selectedTarget.tileIndex
                        : undefined
                  }
                  selectedTileIndices={
                    doubleDetectorMode && ddTargetPlayerId === opp.id
                      ? ddSelectedTiles
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
                        ? (tileIndex) => setSelectedInfoTile(tileIndex)
                        : undefined)
                      : postItMode && isMyTurn && gameState.phase === "playing"
                        ? (tileIndex) => {
                            const tile = me.hand[tileIndex];
                            if (!tile || tile.cut || tile.color !== "blue" || typeof tile.gameValue !== "number") return;
                            if (me.infoTokens.some((t) => t.position === tileIndex)) return;
                            send({
                              type: "useEquipment",
                              equipmentId: "post_it",
                              payload: { kind: "post_it", tileIndex },
                            });
                            setPostItMode(false);
                          }
                        : doubleDetectorMode && isMyTurn && ddSelectedTiles.length === 2
                          ? (tileIndex) => {
                              const tile = me.hand[tileIndex];
                              if (!tile || tile.cut || tile.color !== "blue" || typeof tile.gameValue !== "number") return;
                              setDdGuessTile(tileIndex);
                            }
                          : selectedTarget && isMyTurn && gameState.phase === "playing"
                            ? (tileIndex) => {
                                const tile = me.hand[tileIndex];
                                if (!tile || tile.cut || tile.color === "red") return;
                                setSelectedGuessTile(tileIndex);
                              }
                            : undefined
                  }
                  selectedTileIndex={
                    isSetup
                      ? (requiresSetupToken ? (selectedInfoTile ?? undefined) : undefined)
                      : postItMode
                        ? undefined
                        : doubleDetectorMode && isMyTurn
                          ? (ddGuessTile ?? undefined)
                          : selectedTarget && isMyTurn && gameState.phase === "playing"
                            ? (selectedGuessTile ?? undefined)
                            : undefined
                  }
                  tileSelectableFilter={
                    isSetup && isMyTurn
                      ? (requiresSetupToken
                        ? (tile: VisibleTile) => tile.color === "blue" && tile.gameValue !== "RED" && tile.gameValue !== "YELLOW"
                        : undefined)
                      : postItMode && isMyTurn
                        ? (tile: VisibleTile, idx: number) => !tile.cut && tile.color === "blue" && typeof tile.gameValue === "number" && !me.infoTokens.some((t) => t.position === idx)
                        : doubleDetectorMode && isMyTurn && ddSelectedTiles.length === 2
                          ? (tile: VisibleTile) => !tile.cut && tile.color === "blue" && typeof tile.gameValue === "number"
                          : selectedTarget && isMyTurn && gameState.phase === "playing"
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
                  requiresToken={requiresSetupToken}
                  send={send}
                  onPlaced={() => setSelectedInfoTile(null)}
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

              {/* Double Detector mode panel */}
              {doubleDetectorMode && isMyTurn && me && (
                <div
                  className="rounded-lg border border-yellow-600/60 bg-yellow-900/20 px-3 py-2 text-sm space-y-2"
                  data-testid="dd-mode-panel"
                >
                  <div className="font-bold text-yellow-400 uppercase tracking-wide text-xs">
                    Double Detector Mode
                  </div>
                  <div className="text-xs text-gray-300">
                    {ddSelectedTiles.length < 2 ? (
                      <>Select 2 tiles on one opponent's stand ({ddSelectedTiles.length}/2 selected{ddTargetPlayerId ? ` on ${opponents.find((o) => o.id === ddTargetPlayerId)?.name}` : ""}).</>
                    ) : ddGuessTile == null ? (
                      <>Now select one of your blue tiles as the guess value.</>
                    ) : (
                      <>
                        Target: {opponents.find((o) => o.id === ddTargetPlayerId)?.name} wires {wireLabel(ddSelectedTiles[0])} & {wireLabel(ddSelectedTiles[1])}.
                        Guess: {me.hand[ddGuessTile]?.gameValue}.
                      </>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={cancelDoubleDetector}
                      className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-bold transition-colors"
                    >
                      Cancel
                    </button>
                    {ddSelectedTiles.length === 2 && ddGuessTile != null && ddTargetPlayerId && (
                      <button
                        type="button"
                        data-testid="dd-confirm"
                        onClick={() => {
                          const guessValue = me.hand[ddGuessTile]?.gameValue;
                          if (typeof guessValue !== "number" || !ddTargetPlayerId) return;
                          send({
                            type: "dualCutDoubleDetector",
                            targetPlayerId: ddTargetPlayerId,
                            tileIndex1: ddSelectedTiles[0],
                            tileIndex2: ddSelectedTiles[1],
                            guessValue,
                            actorTileIndex: ddGuessTile,
                          });
                          cancelDoubleDetector();
                        }}
                        className="px-3 py-1 rounded bg-yellow-600 hover:bg-yellow-500 text-black text-xs font-bold transition-colors"
                      >
                        Confirm Double Detector
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Post-it mode panel */}
              {postItMode && isMyTurn && me && (
                <div
                  className="rounded-lg border border-emerald-600/60 bg-emerald-900/20 px-3 py-2 text-sm space-y-2"
                  data-testid="post-it-mode-panel"
                >
                  <div className="font-bold text-emerald-400 uppercase tracking-wide text-xs">
                    Post-it Mode
                  </div>
                  <div className="text-xs text-gray-300">
                    Click one of your blue wires to place the Post-it info token.
                  </div>
                  <button
                    type="button"
                    onClick={cancelPostIt}
                    className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-bold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Playing phase: actions (including anytime equipment off-turn) */}
              {showActionPanel && !doubleDetectorMode && !postItMode && me && (
                <ActionPanel
                  gameState={gameState}
                  send={send}
                  playerId={playerId}
                  isMyTurn={isMyTurn}
                  selectedTarget={selectedTarget}
                  selectedGuessTile={selectedGuessTile}
                  onClearTarget={() => { setSelectedTarget(null); setSelectedGuessTile(null); }}
                  onCutConfirmed={() => { setSelectedTarget(null); setSelectedGuessTile(null); }}
                  onEnterPostItMode={() => {
                    cancelDoubleDetector();
                    setSelectedTarget(null);
                    setSelectedGuessTile(null);
                    setPostItMode(true);
                  }}
                />
              )}

              {!isMyTurn && gameState.phase === "playing" && !gameState.pendingForcedAction && !showActionPanel && (
                <div className="text-center py-2 text-gray-400" data-testid="waiting-turn">
                  {currentPlayer?.isBot ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-block w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                      <span className="text-purple-300 font-bold">{currentPlayer.name}</span> is thinking...
                    </span>
                  ) : (
                    <>Waiting for <span className="text-white font-bold">{currentPlayer?.name}</span>'s turn...</>
                  )}
                </div>
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
            <div className="flex-shrink-0 relative">
              {missionCardShowText ? (() => {
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
                  <div className="rounded-lg border border-gray-700 bg-slate-950 p-3 space-y-2">
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
                  src={`/images/${MISSION_IMAGES[gameState.mission]}`}
                  alt={`Mission ${gameState.mission}`}
                  className="w-full h-auto rounded-lg"
                />
              )}
              <button
                onClick={() => setMissionCardShowText((v) => !v)}
                className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-black/60 text-[10px] text-gray-300 hover:text-white hover:bg-black/80 transition-colors"
              >
                {missionCardShowText ? "IMG" : "TXT"}
              </button>
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
                  setDoubleDetectorMode(true);
                  setDdSelectedTiles([]);
                  setDdTargetPlayerId(null);
                  setDdGuessTile(null);
                  // Clear any normal dual cut selection
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
          {me?.name} {me?.isCaptain ? "(Captain)" : ""}
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

function GameRulesPopup({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 p-3 sm:p-6"
      data-testid="rules-popup"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Game rules"
    >
      <div
        className="mx-auto flex h-full max-h-[95vh] max-w-5xl flex-col overflow-hidden rounded-xl border border-gray-700 bg-[var(--color-bomb-surface)] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-sm font-black uppercase tracking-wide text-gray-100">
              Game Rules
            </h2>
            <p className="text-xs text-gray-400">Source: GAME_RULES.md</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            data-testid="close-rules-popup"
            className="rounded border border-gray-600 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-gray-200 transition-colors hover:bg-gray-800"
          >
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <pre className="whitespace-pre-wrap break-words text-[11px] leading-relaxed text-gray-200">
            {gameRulesMarkdown}
          </pre>
        </div>
      </div>
    </div>
  );
}
