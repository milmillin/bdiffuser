import type { CharacterId, ClientMessage, LobbyState, MissionId, PlayerCount } from "@bomb-busters/shared";
import { ALL_MISSION_IDS, CHARACTER_CARD_TEXT, MISSIONS, MISSION_SCHEMAS } from "@bomb-busters/shared";
import { useState, useCallback } from "react";

const btnBase = "rounded-xl font-extrabold tracking-wider uppercase cursor-pointer transition-all duration-200 border-b-4 active:border-b-0 active:translate-y-1";
const btnFull = `${btnBase} px-7 py-3.5 text-base`;
const btnSmall = `${btnBase} px-4 py-2 text-sm`;
const btnDisabled = "disabled:bg-gray-800 disabled:border-gray-900 disabled:text-gray-500 disabled:shadow-none disabled:active:border-b-4 disabled:active:translate-y-0";
const COLOR_CARD_LOCK_MAX_MISSION = 8;

function isYellowOrRedMissionLocked(id: MissionId): boolean {
  const difficulty = MISSION_SCHEMAS[id].difficulty;
  return id > COLOR_CARD_LOCK_MAX_MISSION && (difficulty === "intermediate" || difficulty === "expert");
}

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
  const missionLockedByColorRule = isYellowOrRedMissionLocked(lobby.mission);
  const missionInvalidForPlayerCount = allowed != null && !allowed.includes(playerCount as PlayerCount);
  const missionInvalid = missionLockedByColorRule || missionInvalidForPlayerCount;
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
    const lockedByColorRule = isYellowOrRedMissionLocked(id);
    // Only send to server if the mission is valid for current player count
    const a = MISSION_SCHEMAS[id].allowedPlayerCounts;
    const valid = a == null || a.includes(playerCount as PlayerCount);
    if (valid && !lockedByColorRule) {
      send({ type: "selectMission", mission: id });
    }
  }, [playerCount, send]);

  const mission = MISSIONS[previewMission];
  const previewAllowed = MISSION_SCHEMAS[previewMission].allowedPlayerCounts;

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
                  className={`${btnSmall} bg-gray-700 border-gray-900 text-white hover:bg-gray-600`}
                >
                  Leave
                </button>
                {isHost && lobby.players.length < 5 && (
                  <button
                    onClick={() => send({ type: "addBot" })}
                    className={`${btnSmall} bg-purple-700 border-purple-950 text-white hover:bg-purple-600`}
                  >
                    + Bot
                  </button>
                )}
              </div>
            </div>

            {/* Character Selection (missions 31+) */}
            <CharacterSelector
              mission={lobby.mission}
              send={send}
              playerId={playerId}
              players={lobby.players}
            />

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
                {missionLockedByColorRule
                  ? `Mission ${lobby.mission} is locked: yellow and red missions are disabled after mission ${COLOR_CARD_LOCK_MAX_MISSION}.`
                  : `Mission ${lobby.mission} requires ${allowed!.join(" or ")} players — currently ${playerCount}.`}
              </div>
            )}

            {isHost ? (
              <button
                onClick={() => send({ type: "startGame" })}
                disabled={!canStart}
                data-testid="start-game"
                className={`w-full ${btnFull} bg-green-600 border-green-900 text-white shadow-[0_4px_15px_rgba(22,163,74,0.4)] hover:bg-green-500 ${btnDisabled}`}
              >
                {playerCount < 2
                  ? "Need 2+ players"
                  : missionLockedByColorRule
                    ? `Mission locked after ${COLOR_CARD_LOCK_MAX_MISSION}`
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

function CharacterSelector({
  mission,
  send,
  playerId,
  players,
}: {
  mission: number;
  send: (msg: ClientMessage) => void;
  playerId: string;
  players: LobbyState["players"];
}) {
  if (mission < 31) return null;

  const me = players.find((p) => p.id === playerId);
  const allCharacters = Object.entries(CHARACTER_CARD_TEXT) as Array<
    [CharacterId, (typeof CHARACTER_CARD_TEXT)[CharacterId]]
  >;

  return (
    <div className="bg-[var(--color-bomb-surface)] rounded-xl p-4 space-y-3">
      <h2 className="text-sm font-bold text-gray-400 uppercase">
        Character Selection <span className="text-purple-400">(Rule Sticker B)</span>
      </h2>
      <p className="text-xs text-gray-500">Mission 31+ allows expert characters. Select your character:</p>
      <div className="grid grid-cols-3 gap-2">
        {allCharacters.map(([id, text]) => {
          const isSelected = me?.character === id;
          const isExpert = id.startsWith("character_e");
          return (
            <button
              key={id}
              onClick={() => send({ type: "selectCharacter", characterId: id })}
              className={`rounded-lg p-2 text-left text-xs transition-all border ${
                isSelected
                  ? "border-yellow-400 bg-yellow-900/30 ring-1 ring-yellow-400"
                  : "border-gray-700 bg-[var(--color-bomb-dark)] hover:border-gray-500"
              }`}
            >
              <div className="font-bold text-white">{text.name}</div>
              <div className={`text-[10px] ${isExpert ? "text-purple-400" : "text-gray-500"}`}>
                {text.abilityName}
              </div>
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2 mt-2">
        {players.filter((p) => p.character).map((p) => (
          <span key={p.id} className="text-xs bg-gray-800 rounded px-2 py-0.5 text-gray-300">
            {p.name}: <span className="text-yellow-400">{CHARACTER_CARD_TEXT[p.character!]?.name ?? p.character}</span>
          </span>
        ))}
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

  const missionDisabledReason = (id: MissionId): string => {
    const reasons: string[] = [];
    if (isYellowOrRedMissionLocked(id)) {
      reasons.push(`yellow/red locked after mission ${COLOR_CARD_LOCK_MAX_MISSION}`);
    }
    const allowed = MISSION_SCHEMAS[id].allowedPlayerCounts;
    if (allowed != null && !allowed.includes(playerCount as PlayerCount)) {
      reasons.push(playerConstraintLabel(id));
    }
    return reasons.join("; ");
  };

  const isMissionDisabled = (id: MissionId) => {
    return missionDisabledReason(id).length > 0;
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
          className={`${btnSmall} bg-red-600 border-red-900 text-white hover:bg-red-500`}
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
                const reason = missionDisabledReason(id);
                const disabled = isMissionDisabled(id);
                return (
                  <option key={id} value={id}>
                    #{id} — {MISSIONS[id].name}{disabled ? ` (${reason})` : ""}
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
          const disabledReason = missionDisabledReason(id);
          const disabled = isMissionDisabled(id);
          const isSelected = selectedMission === id;
          const isPreviewing = previewMission === id && !isSelected;
          return (
            <button
              key={id}
              onClick={() => !disabled && onSelect(id)}
              disabled={disabled}
              data-testid={`mission-select-${id}`}
              title={
                disabled
                  ? `${MISSIONS[id].name} — ${disabledReason}`
                  : MISSIONS[id].name
              }
              className={`w-full aspect-square rounded-lg text-xs font-extrabold uppercase tracking-wider cursor-pointer transition-all duration-200 border-b-2 active:border-b-0 active:translate-y-0.5 ${
                disabled
                  ? "bg-gray-800 border-gray-900 text-gray-600 cursor-not-allowed"
                  : isSelected
                    ? "bg-red-500 border-red-800 text-white ring-2 ring-red-300 scale-110"
                    : isPreviewing
                      ? "bg-yellow-600/50 border-yellow-800 text-white ring-1 ring-yellow-400"
                      : "bg-[var(--color-bomb-dark)] border-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white"
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
