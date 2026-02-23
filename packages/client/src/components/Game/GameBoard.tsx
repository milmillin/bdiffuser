import { useState } from "react";
import type { ClientGameState, ClientMessage } from "@bomb-busters/shared";
import { BoardArea } from "./Board/BoardArea.js";
import { PlayerStand } from "./Players/PlayerStand.js";
import { ActionPanel } from "./Actions/ActionPanel.js";
import { InfoTokenSetup } from "./Actions/InfoTokenSetup.js";

export function GameBoard({
  gameState,
  send,
  playerId,
}: {
  gameState: ClientGameState;
  send: (msg: ClientMessage) => void;
  playerId: string;
}) {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === playerId;
  const me = gameState.players.find((p) => p.id === playerId);
  const opponents = gameState.players.filter((p) => p.id !== playerId);

  // Dual cut target selection state
  const [selectedTarget, setSelectedTarget] = useState<{
    playerId: string;
    tileIndex: number;
  } | null>(null);

  if (gameState.phase === "setup_info_tokens") {
    return (
      <div className="min-h-screen flex flex-col" data-testid="game-board" data-phase="setup_info_tokens">
        <Header gameState={gameState} playerId={playerId} />
        <div className="flex-1 flex flex-col items-center justify-center p-4 gap-6" data-testid="info-token-phase">
          <h2 className="text-xl font-bold text-yellow-400">
            Place an Info Token
          </h2>
          <p className="text-gray-400 text-center max-w-md">
            Choose one of your blue wires and place an Info token pointing to it.
            This gives your teammates information about your hand.
          </p>
          {me && (
            <InfoTokenSetup
              player={me}
              send={send}
              alreadyPlaced={me.infoTokens.length > 0}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ perspective: "1200px" }} data-testid="game-board" data-phase="playing">
      <Header gameState={gameState} playerId={playerId} />

      <div className="flex-1 flex flex-col gap-2 p-2 overflow-hidden">
        {/* Opponents area */}
        <div className="flex gap-2 justify-center flex-shrink-0 flex-wrap">
          {opponents.map((opp) => (
            <PlayerStand
              key={opp.id}
              player={opp}
              isOpponent={true}
              isCurrentTurn={opp.id === currentPlayer?.id}
              onTileClick={
                isMyTurn && gameState.phase === "playing"
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
          <BoardArea board={gameState.board} />
        </div>

        {/* My area */}
        <div className="flex-1 flex flex-col gap-2 min-h-0">
          {me && (
            <PlayerStand
              player={me}
              isOpponent={false}
              isCurrentTurn={me.id === currentPlayer?.id}
            />
          )}

          {/* Actions */}
          {isMyTurn && gameState.phase === "playing" && me && (
            <ActionPanel
              gameState={gameState}
              send={send}
              playerId={playerId}
              selectedTarget={selectedTarget}
              onClearTarget={() => setSelectedTarget(null)}
            />
          )}

          {!isMyTurn && gameState.phase === "playing" && (
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
        </div>
      </div>
    </div>
  );
}

function Header({
  gameState,
  playerId,
}: {
  gameState: ClientGameState;
  playerId: string;
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
      </div>
    </div>
  );
}
