import type { ClientMessage, LobbyState, MissionId, PlayerCount } from "@bomb-busters/shared";
import { ALL_MISSION_IDS, MISSIONS, MISSION_SCHEMAS } from "@bomb-busters/shared";
import { useState, useCallback } from "react";

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
  const [copied, setCopied] = useState(false);
  // Preview mission: defaults to lobby selection, but host can browse others
  const [previewMission, setPreviewMission] = useState<MissionId>(lobby.mission);

  // Keep preview in sync when lobby selection changes (e.g. from another host action)
  const [lastLobbyMission, setLastLobbyMission] = useState(lobby.mission);
  if (lobby.mission !== lastLobbyMission) {
    setLastLobbyMission(lobby.mission);
    setPreviewMission(lobby.mission);
  }

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(roomId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch((e) => console.error("Clipboard write failed:", e));
  }, [roomId]);

  const handleSelectMission = useCallback((id: MissionId) => {
    setPreviewMission(id);
    // Only send to server if the mission is valid for current player count
    const a = MISSION_SCHEMAS[id].allowedPlayerCounts;
    const valid = a == null || a.includes(playerCount as PlayerCount);
    if (valid) {
      send({ type: "selectMission", mission: id });
    }
  }, [playerCount, send]);

  const mission = MISSIONS[previewMission];
  const previewAllowed = MISSION_SCHEMAS[previewMission].allowedPlayerCounts;
  const previewInvalid = previewAllowed != null && !previewAllowed.includes(playerCount as PlayerCount);

  return (
    <div className="min-h-screen flex items-center justify-center p-4" data-testid="lobby-screen">
      <div className="max-w-5xl w-full space-y-6">
        {/* Title + Room Code */}
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <h1 className="text-4xl font-black">
            BOMB<span className="text-red-500">BUSTERS</span>
          </h1>
          <div className="flex items-center gap-2 bg-[var(--color-bomb-surface)] rounded-lg px-3 py-1.5">
            <code className="text-lg font-mono font-bold text-yellow-400 tracking-widest">
              {roomId}
            </code>
            <button
              onClick={handleCopy}
              data-testid="copy-room-code"
              className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                copied
                  ? "bg-green-600 text-white"
                  : "bg-[var(--color-bomb-dark)] text-gray-400 hover:text-white"
              }`}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6">
          {/* Left column */}
          <div className="space-y-6 min-w-0">

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
              <div className="flex gap-2 mt-3">
                <button
                  onClick={onLeave}
                  data-testid="leave-room"
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm"
                >
                  Leave
                </button>
                {isHost && lobby.players.length < 5 && (
                  <button
                    onClick={() => send({ type: "addBot" })}
                    className="px-4 py-2 bg-purple-700 hover:bg-purple-600 rounded-lg transition-colors font-bold text-sm"
                  >
                    + Bot
                  </button>
                )}
              </div>
            </div>

            {/* Mission Selection (host only) */}
            {isHost && (
              <MissionSelector
                selectedMission={lobby.mission}
                previewMission={previewMission}
                playerCount={lobby.players.length as PlayerCount}
                onSelect={handleSelectMission}
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
          </div>

          {/* Right column — Mission card preview */}
          <div className="space-y-3 lg:w-80">
            <div className="bg-[var(--color-bomb-surface)] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-gray-400 uppercase">
                  Mission {previewMission}
                </h2>
                <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${DIFFICULTY_COLORS[mission.difficulty]}`}>
                  {mission.difficulty}
                </span>
              </div>

              <p className="text-lg font-bold">{mission.name}</p>

              {previewAllowed && (
                <p className="text-xs text-gray-400">
                  Players: {previewAllowed.join(", ")}
                </p>
              )}

              {/* Card image */}
              <img
                key={previewMission}
                src={`/images/${mission.imageFront}`}
                alt={`Mission ${previewMission} card`}
                className="w-full rounded-lg"
              />

            </div>

            {/* Actions */}
            {missionInvalid && (
              <div
                data-testid="mission-invalid-banner"
                className="bg-red-900/40 border border-red-700 rounded-lg px-4 py-2 text-sm text-red-300 text-center"
              >
                Mission {lobby.mission} requires {allowed!.join(" or ")} players — currently {playerCount}.
              </div>
            )}

            {isHost ? (
              <button
                onClick={() => send({ type: "startGame" })}
                disabled={!canStart}
                data-testid="start-game"
                className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg font-bold text-lg transition-colors"
              >
                {playerCount < 2
                  ? "Need 2+ players"
                  : missionInvalid
                    ? `Mission unavailable for ${playerCount} players`
                    : "Start Game"}
              </button>
            ) : (
              <div className="w-full py-3 text-center text-gray-400 bg-[var(--color-bomb-surface)] rounded-lg">
                Waiting for host to start...
              </div>
            )}
          </div>
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
const DIFFICULTY_COLORS: Record<string, string> = {
  novice: "bg-green-700 text-green-100",
  intermediate: "bg-yellow-700 text-yellow-100",
  expert: "bg-red-700 text-red-100",
  campaign: "bg-purple-700 text-purple-100",
};

function MissionSelector({
  selectedMission,
  previewMission,
  playerCount,
  onSelect,
}: {
  selectedMission: MissionId;
  previewMission: MissionId;
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
      onSelect(num as MissionId);
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
          value={previewMission}
          onChange={handleDropdownChange}
          data-testid="mission-dropdown"
          className="flex-1 min-w-0 px-3 py-1.5 bg-[var(--color-bomb-dark)] border border-gray-600 rounded-lg text-sm focus:outline-none focus:border-red-400 appearance-none"
        >
          {grouped.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.missions.map((id) => {
                const disabled = isMissionDisabled(id);
                return (
                  <option key={id} value={id}>
                    #{id} — {MISSIONS[id].name}{disabled ? ` (${playerConstraintLabel(id)})` : ""}
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
          const isSelected = selectedMission === id;
          const isPreviewing = previewMission === id && !isSelected;
          return (
            <button
              key={id}
              onClick={() => onSelect(id)}
              data-testid={`mission-select-${id}`}
              title={
                disabled
                  ? `${MISSIONS[id].name} — ${playerConstraintLabel(id)}`
                  : MISSIONS[id].name
              }
              className={`w-full aspect-square rounded text-xs font-bold transition-all ${
                isSelected
                  ? "bg-red-500 text-white ring-2 ring-red-300 scale-110"
                  : isPreviewing
                    ? "bg-yellow-600/50 text-white ring-1 ring-yellow-400"
                    : disabled
                      ? "bg-gray-800 text-gray-600 hover:bg-gray-700 hover:text-gray-400"
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

function playerConstraintLabel(id: MissionId): string {
  const allowed = MISSION_SCHEMAS[id].allowedPlayerCounts;
  if (!allowed) return "";
  return `${allowed.join("/")}p only`;
}
