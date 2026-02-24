import { useState } from "react";
import type { ClientGameState, ClientMessage } from "@bomb-busters/shared";
import { wireLabel } from "@bomb-busters/shared";

export function DetectorTileChoicePanel({
  gameState,
  send,
  playerId,
}: {
  gameState: ClientGameState;
  send: (msg: ClientMessage) => void;
  playerId: string;
}) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const forced = gameState.pendingForcedAction;
  if (!forced || forced.kind !== "detectorTileChoice") return null;

  const me = gameState.players.find((p) => p.id === playerId);
  if (!me) return null;

  const actorName =
    forced.actorId === playerId
      ? "You"
      : (gameState.players.find((p) => p.id === forced.actorId)?.name ?? "Someone");

  const detectorLabel =
    forced.source === "doubleDetector"
      ? "Double Detector"
      : forced.source === "tripleDetector"
        ? "Triple Detector"
        : "Super Detector";

  const matchCount = forced.matchingTileIndices.length;

  // ── 0 matches + double detector: choose info token tile ──
  if (matchCount === 0 && forced.source === "doubleDetector") {
    const tileIndices = [forced.originalTileIndex1, forced.originalTileIndex2].filter(
      (i): i is number => i != null,
    );
    // Filter to non-red tiles (target can see their own tile colors)
    const selectableIndices = tileIndices.filter((idx) => {
      const tile = me.hand[idx];
      return tile && tile.color !== "red";
    });

    const autoSelected = selectableIndices.length === 1 ? selectableIndices[0] : null;
    const effectiveSelection = selectedIndex ?? autoSelected;

    return (
      <div
        className="rounded-lg border border-blue-500/50 bg-blue-950/20 px-3 py-2 text-xs space-y-2"
        data-testid="detector-tile-choice-panel"
      >
        <div className="font-bold text-blue-300 uppercase tracking-wide">
          Confirm Detector Result
        </div>
        <div className="text-gray-300">
          <p>
            {actorName} used <span className="text-cyan-400">{detectorLabel}</span>{" "}
            and guessed{" "}
            <span className="font-bold text-white">{forced.guessValue}</span>.
            {selectableIndices.length > 0
              ? " Choose which wire receives the info token."
              : ""}
          </p>
        </div>
        {selectableIndices.length > 1 ? (
          <div className="flex items-center gap-2 flex-wrap">
            {selectableIndices.map((tileIdx) => {
              const tile = me.hand[tileIdx];
              const label = wireLabel(tileIdx);
              const valueDisplay = tile?.gameValue ?? "?";
              return (
                <button
                  key={tileIdx}
                  onClick={() => setSelectedIndex(tileIdx)}
                  data-testid={`detector-choice-tile-${tileIdx}`}
                  className={`px-4 py-1.5 rounded font-bold transition-colors ${
                    effectiveSelection === tileIdx
                      ? "bg-blue-500 ring-2 ring-blue-300"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  Wire {label} ({String(valueDisplay)})
                </button>
              );
            })}
            <button
              type="button"
              disabled={effectiveSelection == null}
              onClick={() => {
                send({
                  type: "detectorTileChoice",
                  infoTokenTileIndex: effectiveSelection ?? undefined,
                });
              }}
              data-testid="detector-tile-choice-confirm"
              className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition-colors"
            >
              Confirm
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                send({
                  type: "detectorTileChoice",
                  infoTokenTileIndex: effectiveSelection ?? undefined,
                });
              }}
              data-testid="detector-tile-choice-confirm"
              className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors"
            >
              Confirm
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── 0 matches + triple/super detector: choose fallback wire ──
  if (matchCount === 0) {
    const tileIndices = forced.originalTargetTileIndices ?? [];
    // Filter to non-red, uncut tiles
    const selectableIndices = tileIndices.filter((idx) => {
      const tile = me.hand[idx];
      return tile && tile.color !== "red" && !tile.cut;
    });

    const autoSelected = selectableIndices.length === 1 ? selectableIndices[0] : null;
    const effectiveSelection = selectedIndex ?? autoSelected;

    return (
      <div
        className="rounded-lg border border-blue-500/50 bg-blue-950/20 px-3 py-2 text-xs space-y-2"
        data-testid="detector-tile-choice-panel"
      >
        <div className="font-bold text-blue-300 uppercase tracking-wide">
          Confirm Detector Result
        </div>
        <div className="text-gray-300">
          <p>
            {actorName} used <span className="text-cyan-400">{detectorLabel}</span>{" "}
            and guessed{" "}
            <span className="font-bold text-white">{forced.guessValue}</span>.
            {selectableIndices.length > 0
              ? " Choose which wire receives the fallback cut."
              : ""}
          </p>
        </div>
        {selectableIndices.length > 1 ? (
          <div className="flex items-center gap-2 flex-wrap">
            {selectableIndices.map((tileIdx) => {
              const tile = me.hand[tileIdx];
              const label = wireLabel(tileIdx);
              const valueDisplay = tile?.gameValue ?? "?";
              return (
                <button
                  key={tileIdx}
                  onClick={() => setSelectedIndex(tileIdx)}
                  data-testid={`detector-choice-tile-${tileIdx}`}
                  className={`px-4 py-1.5 rounded font-bold transition-colors ${
                    effectiveSelection === tileIdx
                      ? "bg-blue-500 ring-2 ring-blue-300"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  Wire {label} ({String(valueDisplay)})
                </button>
              );
            })}
            <button
              type="button"
              disabled={effectiveSelection == null}
              onClick={() => {
                send({
                  type: "detectorTileChoice",
                  tileIndex: effectiveSelection ?? undefined,
                });
              }}
              data-testid="detector-tile-choice-confirm"
              className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition-colors"
            >
              Confirm
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                send({
                  type: "detectorTileChoice",
                  tileIndex: effectiveSelection ?? undefined,
                });
              }}
              data-testid="detector-tile-choice-confirm"
              className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors"
            >
              Confirm
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── 1 match: auto-selected, just confirm ──
  if (matchCount === 1) {
    const tileIdx = forced.matchingTileIndices[0];
    const tile = me.hand[tileIdx];
    const label = wireLabel(tileIdx);
    const valueDisplay = tile?.gameValue ?? "?";

    return (
      <div
        className="rounded-lg border border-blue-500/50 bg-blue-950/20 px-3 py-2 text-xs space-y-2"
        data-testid="detector-tile-choice-panel"
      >
        <div className="font-bold text-blue-300 uppercase tracking-wide">
          Confirm Wire Cut
        </div>
        <div className="text-gray-300">
          <p>
            {actorName} used <span className="text-cyan-400">{detectorLabel}</span>{" "}
            and guessed{" "}
            <span className="font-bold text-white">{forced.guessValue}</span>.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div
            className="px-4 py-1.5 rounded font-bold bg-blue-500 ring-2 ring-blue-300"
            data-testid={`detector-choice-tile-${tileIdx}`}
          >
            Wire {label} ({String(valueDisplay)})
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              send({ type: "detectorTileChoice", tileIndex: tileIdx });
            }}
            data-testid="detector-tile-choice-confirm"
            className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    );
  }

  // ── 2+ matches: choose which tile to cut ──
  const canConfirm =
    selectedIndex != null &&
    forced.matchingTileIndices.includes(selectedIndex);

  return (
    <div
      className="rounded-lg border border-blue-500/50 bg-blue-950/20 px-3 py-2 text-xs space-y-2"
      data-testid="detector-tile-choice-panel"
    >
      <div className="font-bold text-blue-300 uppercase tracking-wide">
        Choose Which Wire to Cut
      </div>
      <div className="text-gray-300">
        <p>
          {actorName} used <span className="text-cyan-400">{detectorLabel}</span>{" "}
          and guessed{" "}
          <span className="font-bold text-white">{forced.guessValue}</span>.
        </p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {forced.matchingTileIndices.map((tileIdx) => {
          const tile = me.hand[tileIdx];
          const label = wireLabel(tileIdx);
          const valueDisplay = tile?.gameValue ?? "?";
          return (
            <button
              key={tileIdx}
              onClick={() => setSelectedIndex(tileIdx)}
              data-testid={`detector-choice-tile-${tileIdx}`}
              className={`px-4 py-1.5 rounded font-bold transition-colors ${
                selectedIndex === tileIdx
                  ? "bg-blue-500 ring-2 ring-blue-300"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              Wire {label} ({String(valueDisplay)})
            </button>
          );
        })}
        <button
          type="button"
          disabled={!canConfirm}
          onClick={() => {
            if (canConfirm) {
              send({ type: "detectorTileChoice", tileIndex: selectedIndex });
            }
          }}
          data-testid="detector-tile-choice-confirm"
          className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition-colors"
        >
          Confirm
        </button>
      </div>
    </div>
  );
}
