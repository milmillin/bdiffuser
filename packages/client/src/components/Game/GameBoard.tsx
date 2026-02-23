import { useEffect, useMemo, useState } from "react";
import type { ClientGameState, ClientMessage, ChatMessage, VisibleTile } from "@bomb-busters/shared";
import { EQUIPMENT_DEFS } from "@bomb-busters/shared";
import { BoardArea } from "./Board/BoardArea.js";
import { PlayerStand } from "./Players/PlayerStand.js";
import { ActionPanel } from "./Actions/ActionPanel.js";
import { ChooseNextPlayerPanel } from "./Actions/ChooseNextPlayerPanel.js";
import { InfoTokenSetup } from "./Actions/InfoTokenSetup.js";
import { ChatPanel } from "./Chat/ChatPanel.js";
import { ActionLog } from "./ActionLog.js";
import { MissionRuleHints } from "./MissionRuleHints.js";
import gameRulesMarkdown from "../../../../../GAME_RULES.md?raw";

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
  const opponents = gameState.players.filter((p) => p.id !== playerId);
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

  const isSetup = gameState.phase === "setup_info_tokens";
  const dynamicTurnActive = gameState.mission === 10 && gameState.phase === "playing";
  const previousPlayerName =
    gameState.pendingForcedAction?.kind === "chooseNextPlayer" &&
    gameState.pendingForcedAction.lastPlayerId
      ? gameState.players.find((p) => p.id === gameState.pendingForcedAction?.lastPlayerId)?.name
      : undefined;
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
              {opponents.map((opp) => (
                <PlayerStand
                  key={opp.id}
                  player={opp}
                  isOpponent={true}
                  isCurrentTurn={opp.id === currentPlayer?.id}
                  onTileClick={
                    !isSetup && isMyTurn && gameState.phase === "playing" && !gameState.pendingForcedAction
                      ? (tileIndex) =>
                          setSelectedTarget({ playerId: opp.id, tileIndex })
                      : undefined
                  }
                  selectedTileIndex={
                    selectedTarget?.playerId === opp.id
                      ? selectedTarget.tileIndex
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
              />
            </div>

            {/* My area */}
            <div className="flex-1 flex flex-col gap-2 min-h-0">
              {me && (
                <PlayerStand
                  player={me}
                  isOpponent={false}
                  isCurrentTurn={me.id === currentPlayer?.id}
                  onTileClick={
                    isSetup && isMyTurn
                      ? (tileIndex) => setSelectedInfoTile(tileIndex)
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
                      ? (selectedInfoTile ?? undefined)
                      : selectedTarget && isMyTurn && gameState.phase === "playing"
                        ? (selectedGuessTile ?? undefined)
                        : undefined
                  }
                  tileSelectableFilter={
                    isSetup && isMyTurn
                      ? (tile: VisibleTile) => tile.color === "blue" && tile.gameValue !== "RED" && tile.gameValue !== "YELLOW"
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
                  {gameState.pendingForcedAction?.kind === "chooseNextPlayer" ? (
                    <div className="text-sky-100/90">
                      Captain is choosing the next active player
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

              {gameState.phase !== "finished" && (
                <MissionRuleHints gameState={gameState} />
              )}

              {/* Playing phase: forced action (captain chooses next player) */}
              {gameState.phase === "playing" &&
                gameState.pendingForcedAction?.kind === "chooseNextPlayer" &&
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
                gameState.pendingForcedAction?.kind === "chooseNextPlayer" &&
                gameState.pendingForcedAction.captainId !== playerId && (
                <div className="text-center py-2 text-gray-400" data-testid="waiting-captain">
                  Waiting for the <span className="text-yellow-400 font-bold">Captain</span> to choose the next player...
                </div>
              )}

              {/* Playing phase: actions (including anytime equipment off-turn) */}
              {showActionPanel && me && (
                <ActionPanel
                  gameState={gameState}
                  send={send}
                  playerId={playerId}
                  isMyTurn={isMyTurn}
                  selectedTarget={selectedTarget}
                  selectedGuessTile={selectedGuessTile}
                  onClearTarget={() => { setSelectedTarget(null); setSelectedGuessTile(null); }}
                  onCutConfirmed={() => { setSelectedTarget(null); setSelectedGuessTile(null); }}
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

          {/* Sidebar: action log + chat */}
          <div className="hidden lg:flex w-72 flex-shrink-0 flex-col gap-2 overflow-hidden">
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
