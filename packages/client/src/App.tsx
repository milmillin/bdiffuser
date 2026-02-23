import { useState } from "react";
import { usePartySocket } from "./hooks/usePartySocket.js";
import { Lobby } from "./components/Lobby/Lobby.js";
import { GameBoard } from "./components/Game/GameBoard.js";
import { EndScreen } from "./components/EndScreen/EndScreen.js";

export default function App() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState("");

  return (
    <>
      {!roomId
        ? <JoinScreen onJoin={(room, name) => { setRoomId(room); setPlayerName(name); }} />
        : <GameRoom roomId={roomId} playerName={playerName} onLeave={() => setRoomId(null)} />
      }
      <div
        data-testid="app-version"
        className="fixed bottom-3 left-3 text-xs font-mono text-gray-500 select-none"
      >
        {`commit ${__APP_COMMIT_ID__} | ${__APP_COMMIT_DATETIME__}`}
      </div>
    </>
  );
}

function JoinScreen({ onJoin }: { onJoin: (roomId: string, name: string) => void }) {
  const [name, setName] = useState("");
  const [room, setRoom] = useState("");

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
            disabled={!name.trim()}
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
  const { connected, lobbyState, gameState, lastAction, chatMessages, error, send, playerId } =
    usePartySocket(roomId);
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
        <GameBoard gameState={gameState} send={send} playerId={playerId!} chatMessages={chatMessages} onPlayAgain={onLeave} />
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
