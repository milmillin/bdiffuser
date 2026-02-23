import type { ClientMessage, LobbyState, MissionId, PlayerCount } from "@bomb-busters/shared";
import { ALL_MISSION_IDS, MISSIONS, MISSION_SCHEMAS } from "@bomb-busters/shared";
import { useState } from "react";

export function Lobby({
  lobby,
  send,
  playerId,
  roomId,
  onLeave,
}: {
  lobby: LobbyState;
  send: (msg: ClientMessage) => void;
  playerId: string;
  roomId: string;
  onLeave: () => void;
}) {
  const isHost = playerId === lobby.hostId;
  const playerCount = lobby.players.length;
  const allowed = MISSION_SCHEMAS[lobby.mission].allowedPlayerCounts;
  const missionInvalid = allowed != null && !allowed.includes(playerCount as PlayerCount);
  const canStart = playerCount >= 2 && isHost && !missionInvalid;

  return (
    <div className="min-h-screen flex items-center justify-center p-4" data-testid="lobby-screen">
      <div className="max-w-lg w-full space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-black">
            BOMB<span className="text-red-500">BUSTERS</span>
          </h1>
          <div className="mt-2 flex items-center justify-center gap-2">
            <span className="text-gray-400">Room:</span>
            <code className="bg-[var(--color-bomb-surface)] px-3 py-1 rounded text-lg font-mono font-bold text-yellow-400">
              {roomId}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(roomId).catch((e) => console.error("Clipboard write failed:", e))}
              data-testid="copy-room-code"
              className="text-gray-400 hover:text-white text-sm"
              title="Copy room code"
            >
              Copy
            </button>
          </div>
        </div>

        {/* Players */}
        <div className="bg-[var(--color-bomb-surface)] rounded-xl p-4">
          <h2 className="text-sm font-bold text-gray-400 uppercase mb-3">
            Players ({lobby.players.length}/5)
          </h2>
          <div className="space-y-2">
            {lobby.players.map((p) => (
              <div
                key={p.id}
                data-testid={`lobby-player-${p.id}`}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                  p.id === playerId ? "bg-blue-900/30 border border-blue-700" : "bg-[var(--color-bomb-dark)]"
                }`}
              >
                <span className="font-medium flex-1">{p.name}</span>
                {p.isBot && (
                  <span className="text-xs bg-purple-600 px-2 py-0.5 rounded font-bold">BOT</span>
                )}
                {p.isHost && (
                  <span className="text-xs bg-yellow-600 px-2 py-0.5 rounded font-bold">HOST</span>
                )}
                {!p.connected && !p.isBot && (
                  <span className="text-xs text-red-400">Disconnected</span>
                )}
                {p.isBot && isHost && (
                  <button
                    onClick={() => send({ type: "removeBot", botId: p.id })}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Mission Selection (host only) */}
        {isHost && (
          <MissionSelector
            selectedMission={lobby.mission}
            playerCount={lobby.players.length as PlayerCount}
            onSelect={(id) => send({ type: "selectMission", mission: id })}
          />
        )}

        {!isHost && (
          <div className="bg-[var(--color-bomb-surface)] rounded-xl p-4">
            <h2 className="text-sm font-bold text-gray-400 uppercase mb-3 text-center">Mission</h2>
            <p className="text-center text-lg font-bold" data-testid={`mission-current-${lobby.mission}`}>
              #{lobby.mission} — {MISSIONS[lobby.mission].name}
            </p>
          </div>
        )}

        {missionInvalid && (
          <div
            data-testid="mission-invalid-banner"
            className="bg-red-900/40 border border-red-700 rounded-lg px-4 py-2 text-sm text-red-300 text-center"
          >
            Mission {lobby.mission} requires {allowed!.join(" or ")} players — currently {playerCount}.
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onLeave}
            data-testid="leave-room"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            Leave
          </button>
          {isHost && lobby.players.length < 5 && (
            <button
              onClick={() => send({ type: "addBot" })}
              className="px-4 py-2 bg-purple-700 hover:bg-purple-600 rounded-lg transition-colors font-bold"
            >
              + Bot
            </button>
          )}
          {isHost && (
            <button
              onClick={() => send({ type: "startGame" })}
              disabled={!canStart}
              data-testid="start-game"
              className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg font-bold text-lg transition-colors"
            >
              {playerCount < 2
                ? "Need 2+ players"
                : missionInvalid
                  ? `Mission unavailable for ${playerCount} players`
                  : "Start Game"}
            </button>
          )}
          {!isHost && (
            <div className="flex-1 py-3 text-center text-gray-400 bg-[var(--color-bomb-surface)] rounded-lg">
              Waiting for host to start...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const DIFFICULTY_ORDER = ["novice", "intermediate", "expert", "campaign"] as const;
const DIFFICULTY_LABELS: Record<string, string> = {
  novice: "Novice",
  intermediate: "Intermediate",
  expert: "Expert",
  campaign: "Campaign",
};

function MissionSelector({
  selectedMission,
  playerCount,
  onSelect,
}: {
  selectedMission: MissionId;
  playerCount: PlayerCount | number;
  onSelect: (id: MissionId) => void;
}) {
  const [textInput, setTextInput] = useState("");

  const isMissionDisabled = (id: MissionId) => {
    const allowed = MISSION_SCHEMAS[id].allowedPlayerCounts;
    return allowed != null && !allowed.includes(playerCount as PlayerCount);
  };

  const handleTextSubmit = () => {
    const num = Number(textInput);
    if (num >= 1 && num <= 66 && ALL_MISSION_IDS.includes(num as MissionId)) {
      const id = num as MissionId;
      if (!isMissionDisabled(id)) {
        onSelect(id);
      }
    }
    setTextInput("");
  };

  const handleDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const num = Number(e.target.value);
    if (num && ALL_MISSION_IDS.includes(num as MissionId)) {
      onSelect(num as MissionId);
    }
  };

  // Group missions by difficulty
  const grouped = DIFFICULTY_ORDER.map((diff) => ({
    label: DIFFICULTY_LABELS[diff],
    missions: ALL_MISSION_IDS.filter((id) => MISSION_SCHEMAS[id].difficulty === diff),
  })).filter((g) => g.missions.length > 0);

  return (
    <div className="bg-[var(--color-bomb-surface)] rounded-xl p-4 space-y-3">
      <h2 className="text-sm font-bold text-gray-400 uppercase">Mission</h2>

      {/* Textbox + Dropdown row */}
      <div className="flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          placeholder="Mission #"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleTextSubmit()}
          data-testid="mission-text-input"
          className="w-24 px-3 py-1.5 bg-[var(--color-bomb-dark)] border border-gray-600 rounded-lg text-sm focus:outline-none focus:border-red-400"
        />
        <button
          onClick={handleTextSubmit}
          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-bold transition-colors"
        >
          Go
        </button>
        <select
          value={selectedMission}
          onChange={handleDropdownChange}
          data-testid="mission-dropdown"
          className="flex-1 min-w-0 px-3 py-1.5 bg-[var(--color-bomb-dark)] border border-gray-600 rounded-lg text-sm focus:outline-none focus:border-red-400 appearance-none"
        >
          {grouped.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.missions.map((id) => {
                const disabled = isMissionDisabled(id);
                return (
                  <option key={id} value={id} disabled={disabled}>
                    #{id} — {MISSIONS[id].name}{disabled ? " (unavailable)" : ""}
                  </option>
                );
              })}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Numbered button grid */}
      <div className="grid grid-cols-11 gap-1">
        {ALL_MISSION_IDS.map((id) => {
          const disabled = isMissionDisabled(id);
          return (
            <button
              key={id}
              onClick={() => !disabled && onSelect(id)}
              disabled={disabled}
              data-testid={`mission-select-${id}`}
              title={
                disabled
                  ? `Not available for ${playerCount} players`
                  : `${MISSIONS[id].name}`
              }
              className={`w-full aspect-square rounded text-xs font-bold transition-all ${
                disabled
                  ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                  : selectedMission === id
                    ? "bg-red-500 text-white ring-2 ring-red-300 scale-110"
                    : "bg-[var(--color-bomb-dark)] text-gray-300 hover:bg-gray-600 hover:text-white"
              }`}
            >
              {id}
            </button>
          );
        })}
      </div>
    </div>
  );
}
