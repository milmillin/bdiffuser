import { useMemo, useState } from "react";
import type { ClientGameState, ClientMessage } from "@bomb-busters/shared";
import {
  BUTTON_PRIMARY_CLASS,
  PANEL_CLASS,
  PANEL_SUBTEXT_CLASS,
  PANEL_TEXT_CLASS,
  PANEL_TITLE_CLASS,
} from "./panelStyles.js";

export function MissionChallengeRedCutPanel({
  gameState,
  send,
  playerId,
}: {
  gameState: ClientGameState;
  send: (msg: ClientMessage) => void;
  playerId: string;
}) {
  const targetPlayers = useMemo(
    () =>
      gameState.players
        .filter((player) => player.id !== playerId)
        .map((player) => ({
          player,
          uncutTileIndices: player.hand
            .map((tile, index) => (!tile.cut ? index : -1))
            .filter((index) => index >= 0),
        }))
        .filter((entry) => entry.uncutTileIndices.length > 0),
    [gameState.players, playerId],
  );

  const [selectedTargetId, setSelectedTargetId] = useState<string>(
    targetPlayers[0]?.player.id ?? "",
  );
  const selectedTarget = targetPlayers.find((entry) => entry.player.id === selectedTargetId)
    ?? targetPlayers[0];
  const [selectedTileIndex, setSelectedTileIndex] = useState<number>(
    selectedTarget?.uncutTileIndices[0] ?? -1,
  );

  if (targetPlayers.length === 0) return null;

  const resolvedTileIndex = selectedTarget?.uncutTileIndices.includes(selectedTileIndex)
    ? selectedTileIndex
    : (selectedTarget?.uncutTileIndices[0] ?? -1);

  return (
    <div className={PANEL_CLASS} data-testid="mission-challenge-red-cut-panel">
      <div className={PANEL_TITLE_CLASS}>Challenge 1 — Cut a Red Wire</div>
      <p className={PANEL_TEXT_CLASS}>
        Instead of your normal action, choose a teammate wire and declare that it is red.
      </p>
      <p className={PANEL_SUBTEXT_CLASS}>
        If the chosen wire is not red, the bomb explodes immediately.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {targetPlayers.map(({ player }) => (
          <button
            key={player.id}
            type="button"
            onClick={() => {
              setSelectedTargetId(player.id);
              const nextTarget = targetPlayers.find((entry) => entry.player.id === player.id);
              setSelectedTileIndex(nextTarget?.uncutTileIndices[0] ?? -1);
            }}
            className={`${BUTTON_PRIMARY_CLASS} ${selectedTarget?.player.id === player.id ? "ring-2 ring-amber-300" : ""}`}
            data-testid={`challenge-red-target-${player.id}`}
          >
            {player.name}
          </button>
        ))}
      </div>

      {selectedTarget ? (
        <div className="flex flex-wrap items-center gap-2">
          {selectedTarget.uncutTileIndices.map((tileIndex) => (
            <button
              key={`${selectedTarget.player.id}-${tileIndex}`}
              type="button"
              onClick={() => setSelectedTileIndex(tileIndex)}
              className={`${BUTTON_PRIMARY_CLASS} ${resolvedTileIndex === tileIndex ? "ring-2 ring-red-300" : ""}`}
              data-testid={`challenge-red-tile-${selectedTarget.player.id}-${tileIndex}`}
            >
              Wire {tileIndex + 1}
            </button>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        disabled={!selectedTarget || resolvedTileIndex < 0}
        onClick={() => {
          if (!selectedTarget || resolvedTileIndex < 0) return;
          send({
            type: "challengeRedCut",
            targetPlayerId: selectedTarget.player.id,
            targetTileIndex: resolvedTileIndex,
          });
        }}
        className={BUTTON_PRIMARY_CLASS}
        data-testid="challenge-red-submit"
      >
        Cut Chosen Wire
      </button>
    </div>
  );
}
