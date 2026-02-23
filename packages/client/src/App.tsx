import { useState, useEffect, useCallback } from "react";
import { usePartySocket } from "./hooks/usePartySocket.js";
import { Lobby } from "./components/Lobby/Lobby.js";
import { GameBoard } from "./components/Game/GameBoard.js";
import { EndScreen } from "./components/EndScreen/EndScreen.js";

const SESSION_KEY_PREFIX = "bb-session-";

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

function getRoomFromPath(): string | null {
  const path = window.location.pathname.replace(/^\//, "").trim();
  return path || null;
}

export default function App() {
  const [roomId, setRoomId] = useState<string | null>(getRoomFromPath);
  const [playerName, setPlayerName] = useState("");

  // Pre-fill name from stored session when loading with a room path
  const [initialSession] = useState(() => {
    const hashRoom = getRoomFromPath();
    return hashRoom ? getSession(hashRoom) : null;
  });

  const handleJoin = useCallback((room: string, name: string) => {
    setRoomId(room);
    setPlayerName(name);
    window.history.pushState(null, "", `/${room}`);
  }, []);

  const handleLeave = useCallback(() => {
    setRoomId(null);
    setPlayerName("");
    window.history.pushState(null, "", "/");
  }, []);

  // Handle browser back/forward
  useEffect(() => {
    const onPopState = () => {
      const hashRoom = getRoomFromPath();
      if (!hashRoom) {
        setRoomId(null);
        setPlayerName("");
      } else if (hashRoom !== roomId) {
        // User navigated to a different room path — show join screen for it
        setRoomId(null);
        setPlayerName("");
        // Let the next render pick up the path via JoinScreen's initial state
        // We don't auto-join because we need the player name
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [roomId]);

  return (
    <>
      {!roomId
        ? <JoinScreen
            onJoin={handleJoin}
            initialRoom={getRoomFromPath() ?? ""}
            initialName={initialSession?.playerName ?? ""}
          />
        : <GameRoom roomId={roomId} playerName={playerName} onLeave={handleLeave} />
      }
      <div
        data-testid="app-version"
        className="fixed bottom-3 left-3 text-xs font-mono text-gray-500 select-none"
      >
        {`${__APP_COMMIT_ID__} | v${__APP_VERSION__}`}
      </div>
    </>
  );
}

function JoinScreen({
  onJoin,
  initialRoom,
  initialName,
}: {
  onJoin: (roomId: string, name: string) => void;
  initialRoom: string;
  initialName: string;
}) {
  const [name, setName] = useState(initialName);
  const [room, setRoom] = useState(initialRoom);

  const handleCreate = () => {
    if (!name.trim()) return;
    const newRoom = Math.random().toString(36).substring(2, 8);
    onJoin(newRoom, name.trim());
  };

  const handleJoin = () => {
    if (!name.trim() || !room.trim()) return;
    onJoin(room.trim().toLowerCase(), name.trim());
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" data-testid="join-screen">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-5xl font-black tracking-tight">
            BOMB<span className="text-red-500">BUSTERS</span>
          </h1>
          <p className="mt-2 text-gray-400">Cooperative wire-cutting game</p>
        </div>

        <div className="bg-[var(--color-bomb-surface)] rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              maxLength={20}
              data-testid="name-input"
              className="w-full px-4 py-2 bg-[var(--color-bomb-dark)] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
            />
          </div>

          <button
            onClick={handleCreate}
            disabled={!name.trim() || !!room.trim()}
            data-testid="create-room"
            className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg font-bold text-lg transition-colors"
          >
            Create New Room
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-600" />
            <span className="text-gray-500 text-sm">or join existing</span>
            <div className="flex-1 h-px bg-gray-600" />
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="Room code"
              maxLength={10}
              data-testid="room-code-input"
              className="flex-1 px-4 py-2 bg-[var(--color-bomb-dark)] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleJoin}
              disabled={!name.trim() || !room.trim()}
              data-testid="join-room"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg font-bold transition-colors"
            >
              Join
            </button>
          </div>
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
  // Restore stored playerId for reconnection
  const storedSession = getSession(roomId);
  const stableId = storedSession?.playerId;

  const handleIdReady = useCallback((id: string) => {
    saveSession(roomId, { playerId: id, playerName });
  }, [roomId, playerName]);

  const { connected, lobbyState, gameState, lastAction, chatMessages, error, send, playerId } =
    usePartySocket(roomId, { id: stableId, onIdReady: handleIdReady });
  const [joined, setJoined] = useState(false);

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
    <div className="min-h-screen flex flex-col">
      {error && (
        <div className="fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-pulse" data-testid="error-banner">
          {error}
        </div>
      )}

      {gameState && (
        <GameBoard gameState={gameState} send={send} playerId={gameState.playerId} chatMessages={chatMessages} onPlayAgain={onLeave} />
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
