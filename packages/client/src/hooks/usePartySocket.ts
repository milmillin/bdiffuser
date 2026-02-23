import { useEffect, useRef, useState, useCallback } from "react";
import PartySocket from "partysocket";
import type {
  ClientMessage,
  ServerMessage,
  ClientGameState,
  LobbyState,
  GameAction,
} from "@bomb-busters/shared";

const PARTYKIT_HOST =
  import.meta.env.VITE_PARTYKIT_HOST ?? "localhost:1999";

interface UsePartySocketReturn {
  connected: boolean;
  lobbyState: LobbyState | null;
  gameState: ClientGameState | null;
  lastAction: GameAction | null;
  error: string | null;
  send: (msg: ClientMessage) => void;
  playerId: string | null;
}

export function usePartySocket(roomId: string): UsePartySocketReturn {
  const socketRef = useRef<PartySocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [lobbyState, setLobbyState] = useState<LobbyState | null>(null);
  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [lastAction, setLastAction] = useState<GameAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);

  useEffect(() => {
    const socket = new PartySocket({
      host: PARTYKIT_HOST,
      room: roomId,
      party: "bomb-busters-server",
    });

    socketRef.current = socket;

    socket.addEventListener("open", () => {
      setConnected(true);
      setPlayerId(socket.id);
    });

    socket.addEventListener("close", () => {
      setConnected(false);
    });

    socket.addEventListener("message", (event) => {
      const msg: ServerMessage = JSON.parse(event.data);

      switch (msg.type) {
        case "lobby":
          setLobbyState(msg.state);
          setGameState(null);
          break;
        case "gameState":
          setGameState(msg.state);
          setLobbyState(null);
          break;
        case "action":
          setLastAction(msg.action);
          break;
        case "error":
          setError(msg.message);
          setTimeout(() => setError(null), 5000);
          break;
      }
    });

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [roomId]);

  const send = useCallback((msg: ClientMessage) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(msg));
    }
  }, []);

  return { connected, lobbyState, gameState, lastAction, error, send, playerId };
}
