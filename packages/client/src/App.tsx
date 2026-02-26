import { useState, useEffect, useCallback, useRef } from "react";
import { APP_COMMIT_ID, APP_VERSION } from "./buildInfo";
import { usePartySocket } from "./hooks/usePartySocket.js";
import { useTurnNotification } from "./hooks/useTurnNotification.js";
import { Lobby } from "./components/Lobby/Lobby.js";
import { GameBoard } from "./components/Game/GameBoard.js";
import { EndScreen } from "./components/EndScreen/EndScreen.js";

const btnBase = "rounded-xl font-extrabold tracking-wider uppercase cursor-pointer transition-all duration-200 border-b-4 active:border-b-0 active:translate-y-1";
const btnFull = `${btnBase} px-7 py-3.5 text-base`;
const btnSmall = `${btnBase} px-4 py-2 text-sm`;
const btnDisabled = "disabled:bg-gray-800 disabled:border-gray-900 disabled:text-gray-500 disabled:shadow-none disabled:active:border-b-4 disabled:active:translate-y-0";

const SESSION_KEY_PREFIX = "bb-session-";
const LAST_NAME_KEY = "bb-last-name";

interface StoredSession {
  playerId: string;
  playerName: string;
}

function getSession(roomId: string): StoredSession | null {
  try {
    const raw = localStorage.getItem(`${SESSION_KEY_PREFIX}${roomId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.playerId === "string" && typeof parsed.playerName === "string") {
      return parsed as StoredSession;
    }
  } catch { /* ignore */ }
  return null;
}

function saveSession(roomId: string, session: StoredSession) {
  try {
    localStorage.setItem(`${SESSION_KEY_PREFIX}${roomId}`, JSON.stringify(session));
  } catch { /* ignore */ }
}

function getLastName(): string {
  try {
    return localStorage.getItem(LAST_NAME_KEY) ?? "";
  } catch { return ""; }
}

function saveLastName(name: string) {
  try {
    localStorage.setItem(LAST_NAME_KEY, name);
  } catch { /* ignore */ }
}

const PARTYKIT_HOST =
  import.meta.env.VITE_PARTYKIT_HOST ?? "localhost:1999";

function getRoomFromPath(): string | null {
  const path = window.location.pathname.replace(/^\//, "").trim();
  if (/^.+\/debug(?:\/[^/]+)?$/.test(path)) return null;
  return path || null;
}

function maybeRedirectDebug() {
  const path = window.location.pathname.replace(/^\//, "").trim();
  const match = path.match(/^(.+)\/debug(?:\/([^/]+))?$/);
  if (match) {
    const uidSuffix = match[2] ? `/${match[2]}` : "";
    const protocol = PARTYKIT_HOST.startsWith("localhost") ? "http" : "https";
    window.location.href = `${protocol}://${PARTYKIT_HOST}/parties/bomb-busters-server/${match[1]}/debug${uidSuffix}`;
  }
}

export default function App() {
  maybeRedirectDebug();

  const [roomId, setRoomId] = useState<string | null>(() => {
    // Auto-join if we have a stored session for the URL room
    const pathRoom = getRoomFromPath();
    if (pathRoom && getSession(pathRoom)) return pathRoom;
    return null;
  });
  const [pendingRoom, setPendingRoom] = useState<string | null>(() => {
    // If URL has a room but no stored session, go to step 2
    const pathRoom = getRoomFromPath();
    if (pathRoom && !getSession(pathRoom)) return pathRoom;
    return null;
  });
  const [playerName, setPlayerName] = useState(() => {
    // For auto-join, use the stored session name
    const pathRoom = getRoomFromPath();
    if (pathRoom) {
      const session = getSession(pathRoom);
      if (session) return session.playerName;
    }
    return "";
  });

  const handleSelectRoom = useCallback((room: string) => {
    setPendingRoom(room);
    window.history.pushState(null, "", `/${room}`);
  }, []);

  const handleConfirmName = useCallback((room: string, name: string) => {
    saveLastName(name);
    setPendingRoom(null);
    setRoomId(room);
    setPlayerName(name);
  }, []);

  const handleBack = useCallback(() => {
    setPendingRoom(null);
    window.history.pushState(null, "", "/");
  }, []);

  const handleLeave = useCallback(() => {
    setRoomId(null);
    setPendingRoom(null);
    setPlayerName("");
    window.history.pushState(null, "", "/");
  }, []);

  // Handle browser back/forward
  useEffect(() => {
    const onPopState = () => {
      const pathRoom = getRoomFromPath();
      if (!pathRoom) {
        setRoomId(null);
        setPendingRoom(null);
        setPlayerName("");
      } else if (pathRoom !== roomId) {
        // Navigate to a room path — check for stored session
        if (getSession(pathRoom)) {
          const session = getSession(pathRoom)!;
          setRoomId(pathRoom);
          setPendingRoom(null);
          setPlayerName(session.playerName);
        } else {
          setRoomId(null);
          setPendingRoom(pathRoom);
        }
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [roomId]);

  let content;
  if (roomId) {
    content = <GameRoom roomId={roomId} playerName={playerName} onLeave={handleLeave} />;
  } else if (pendingRoom) {
    content = <NameEntry roomCode={pendingRoom} onConfirm={handleConfirmName} onBack={handleBack} />;
  } else {
    content = <LandingScreen onSelectRoom={handleSelectRoom} />;
  }

  return (
    <>
      {content}
      {!roomId && (
        <div
          data-testid="app-version"
          className="fixed bottom-3 left-3 text-xs font-mono text-gray-500 select-none"
        >
          {`${APP_COMMIT_ID} | v${APP_VERSION}`}
        </div>
      )}
    </>
  );
}

function LandingScreen({ onSelectRoom }: { onSelectRoom: (room: string) => void }) {
  const [room, setRoom] = useState("");
  const [stats, setStats] = useState<{ rooms: number; players: number } | null>(null);

  useEffect(() => {
    const protocol = PARTYKIT_HOST.startsWith("localhost") ? "http" : "https";
    const url = `${protocol}://${PARTYKIT_HOST}/stats`;
    const fetchStats = () => {
      fetch(url)
        .then((r) => r.json())
        .then((data) => setStats(data as { rooms: number; players: number }))
        .catch(() => {});
    };
    fetchStats();
    const id = setInterval(fetchStats, 30_000);
    return () => clearInterval(id);
  }, []);

  const handleCreate = () => {
    const newRoom = Math.random().toString(36).substring(2, 8);
    onSelectRoom(newRoom);
  };

  const handleJoin = () => {
    if (!room.trim()) return;
    onSelectRoom(room.trim().toLowerCase());
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" data-testid="join-screen">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-5xl font-black tracking-tight">
            BOMB<span className="text-red-500">BUSTERS</span>
          </h1>
          <p className="mt-2 text-gray-400">Cooperative wire-cutting game</p>
          {stats && (
            <p className="mt-1 text-xs text-gray-500">
              {stats.players} {stats.players === 1 ? "player" : "players"} in {stats.rooms} {stats.rooms === 1 ? "room" : "rooms"}
            </p>
          )}
        </div>

        <div className="bg-[var(--color-bomb-surface)] rounded-xl p-6 space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleJoin(); }}
              placeholder="Room code"
              maxLength={10}
              data-testid="room-code-input"
              className="flex-1 px-4 py-2 bg-[var(--color-bomb-dark)] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleJoin}
              disabled={!room.trim()}
              data-testid="join-room"
              className={`${btnSmall} bg-blue-600 border-blue-900 text-white shadow-[0_4px_15px_rgba(37,99,235,0.4)] hover:bg-blue-500 ${btnDisabled}`}
            >
              Join
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-600" />
            <span className="text-gray-500 text-sm">or create new</span>
            <div className="flex-1 h-px bg-gray-600" />
          </div>

          <button
            onClick={handleCreate}
            data-testid="create-room"
            className={`w-full ${btnFull} bg-red-600 border-red-900 text-white shadow-[0_4px_15px_rgba(220,38,38,0.4)] hover:bg-red-500`}
          >
            Create New Room
          </button>
        </div>
      </div>
    </div>
  );
}

function NameEntry({
  roomCode,
  onConfirm,
  onBack,
}: {
  roomCode: string;
  onConfirm: (room: string, name: string) => void;
  onBack: () => void;
}) {
  const [name, setName] = useState(getLastName);

  const handleSubmit = () => {
    if (!name.trim()) return;
    onConfirm(roomCode, name.trim());
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" data-testid="name-entry-screen">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-5xl font-black tracking-tight">
            BOMB<span className="text-red-500">BUSTERS</span>
          </h1>
          <p className="mt-2 text-gray-400">
            Joining room: <span className="font-mono text-white">{roomCode}</span>
          </p>
        </div>

        <div className="bg-[var(--color-bomb-surface)] rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
              placeholder="Enter your name"
              maxLength={20}
              autoFocus
              data-testid="name-input"
              className="w-full px-4 py-2 bg-[var(--color-bomb-dark)] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            data-testid="confirm-join"
            className={`w-full ${btnFull} bg-red-600 border-red-900 text-white shadow-[0_4px_15px_rgba(220,38,38,0.4)] hover:bg-red-500 ${btnDisabled}`}
          >
            Continue
          </button>

          <button
            onClick={onBack}
            data-testid="back-button"
            className={`w-full ${btnSmall} bg-gray-700 border-gray-900 text-white hover:bg-gray-600`}
          >
            &larr; Back
          </button>
        </div>
      </div>
    </div>
  );
}

function GameRoom({
  roomId,
  playerName,
  onLeave,
}: {
  roomId: string;
  playerName: string;
  onLeave: () => void;
}) {
  // Restore stored playerId for reconnection (captured once on mount so it
  // doesn't flip from undefined → id after saveSession, which would re-trigger
  // the usePartySocket effect and disconnect/reconnect).
  const [stableId] = useState(() => getSession(roomId)?.playerId);

  const handleIdReady = useCallback((id: string) => {
    saveSession(roomId, { playerId: id, playerName });
  }, [roomId, playerName]);

  const { connected, lobbyState, gameState, lastAction, chatMessages, error, kicked, send, playerId } =
    usePartySocket(roomId, { id: stableId, onIdReady: handleIdReady });
  useTurnNotification(gameState, playerId);
  const [joined, setJoined] = useState(false);

  // Leave the room when kicked by host
  const onLeaveRef = useRef(onLeave);
  onLeaveRef.current = onLeave;
  useEffect(() => {
    if (kicked) onLeaveRef.current();
  }, [kicked]);

  // Auto-join when connected
  if (connected && !joined) {
    send({ type: "join", name: playerName });
    setJoined(true);
  }

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="connecting-state">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">Connecting to room {roomId}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-pulse" data-testid="error-banner">
          {error}
        </div>
      )}

      {gameState && gameState.phase !== "finished" && (
        <GameBoard gameState={gameState} send={send} playerId={gameState.playerId} chatMessages={chatMessages} />
      )}

      {gameState && gameState.phase === "finished" && (
        <>
          <GameBoard gameState={gameState} send={send} playerId={gameState.playerId} chatMessages={chatMessages} />
          <EndScreen gameState={gameState} onPlayAgain={() => send({ type: "playAgain" })} />
        </>
      )}

      {lobbyState && !gameState && (
        <Lobby
          lobby={lobbyState}
          send={send}
          playerId={playerId!}
          roomId={roomId}
          onLeave={onLeave}
        />
      )}
    </div>
  );
}
