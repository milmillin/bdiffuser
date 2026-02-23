import { useEffect, useRef, useState, useCallback } from "react";
import PartySocket from "partysocket";
import type {
  ActionLegalityCode,
  ClientMessage,
  ServerMessage,
  ClientGameState,
  LobbyState,
  GameAction,
  ChatMessage,
} from "@bomb-busters/shared";

const PARTYKIT_HOST =
  import.meta.env.VITE_PARTYKIT_HOST ?? "localhost:1999";

interface UsePartySocketReturn {
  connected: boolean;
  lobbyState: LobbyState | null;
  gameState: ClientGameState | null;
  lastAction: GameAction | null;
  chatMessages: ChatMessage[];
  error: string | null;
  errorCode: ActionLegalityCode | null;
  send: (msg: ClientMessage) => void;
  playerId: string | null;
}

export function usePartySocket(
  roomId: string,
  options?: { id?: string; onIdReady?: (id: string) => void },
): UsePartySocketReturn {
  const socketRef = useRef<PartySocket | null>(null);
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [connected, setConnected] = useState(false);
  const [lobbyState, setLobbyState] = useState<LobbyState | null>(null);
  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [lastAction, setLastAction] = useState<GameAction | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<ActionLegalityCode | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);

  // Stable refs so the effect doesn't re-run when callbacks change
  const onIdReadyRef = useRef(options?.onIdReady);
  onIdReadyRef.current = options?.onIdReady;

  useEffect(() => {
    const socket = new PartySocket({
      host: PARTYKIT_HOST,
      room: roomId,
      party: "bomb-busters-server",
      id: options?.id,
    });

    socketRef.current = socket;

    socket.addEventListener("open", () => {
      setConnected(true);
      setPlayerId(socket.id);
      onIdReadyRef.current?.(socket.id);
    });

    socket.addEventListener("close", () => {
      setConnected(false);
    });

    socket.addEventListener("error", (event) => {
      console.error("WebSocket error:", event);
    });

    socket.addEventListener("message", (event) => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(event.data);
      } catch (e) {
        console.error("Failed to parse server message:", e);
        return;
      }

      switch (msg.type) {
        case "lobby":
          setLobbyState(msg.state);
          setGameState(null);
          break;
        case "gameState":
          setGameState(msg.state);
          setLobbyState(null);
          setChatMessages(msg.state.chat ?? []);
          break;
        case "action":
          setLastAction(msg.action);
          break;
        case "chat":
          setChatMessages((prev) => [...prev, msg.message]);
          break;
        case "error":
          setError(msg.message);
          setErrorCode(msg.code ?? null);
          if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
          errorTimeoutRef.current = setTimeout(() => {
            setError(null);
            setErrorCode(null);
            errorTimeoutRef.current = null;
          }, 5000);
          break;
      }
    });

    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
        errorTimeoutRef.current = null;
      }
      socket.close();
      socketRef.current = null;
    };
  }, [roomId, options?.id]);

  const send = useCallback((msg: ClientMessage) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(msg));
    }
  }, []);

  return {
    connected,
    lobbyState,
    gameState,
    lastAction,
    chatMessages,
    error,
    errorCode,
    send,
    playerId,
  };
}
