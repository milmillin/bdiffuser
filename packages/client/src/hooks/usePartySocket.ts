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
import { resolveServerClockOffsetMs } from "../time/serverClock.js";

// Match "soyoung" with optional spaces between any characters (case-insensitive).
const SOYOUNG_RE = /s\s*o\s*y\s*o\s*u\s*n\s*g/gi;

function transformDisplayName(name: string): string {
  if (SOYOUNG_RE.test(name)) return "공주";
  SOYOUNG_RE.lastIndex = 0;
  return name;
}

/** Replace occurrences of "soyoung" (with spaces) inline within arbitrary text. */
function transformTextInline(text: string): string {
  const result = text.replace(SOYOUNG_RE, "공주");
  SOYOUNG_RE.lastIndex = 0;
  return result;
}

function transformPlayerNames<T extends { players: Array<{ name: string }> }>(state: T): T {
  return {
    ...state,
    players: state.players.map((p) => ({ ...p, name: transformDisplayName(p.name) })),
    ...("log" in state && Array.isArray((state as Record<string, unknown>).log)
      ? { log: (state as Record<string, unknown[]>).log.map(transformLogEntry) }
      : {}),
  };
}

function transformLogEntry(entry: unknown): unknown {
  const e = entry as Record<string, unknown>;
  if (!e.detail || typeof e.detail !== "object") return entry;
  const detail = e.detail as Record<string, unknown>;
  if (detail.type === "text" && typeof detail.text === "string") {
    const transformed = transformTextInline(detail.text);
    if (transformed !== detail.text) return { ...e, detail: { ...detail, text: transformed } };
    return entry;
  }
  if (detail.type !== "template" || !detail.params || typeof detail.params !== "object") return entry;
  const params = detail.params as Record<string, unknown>;
  let changed = false;
  const newParams: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      const transformed = transformTextInline(value);
      if (transformed !== value) changed = true;
      newParams[key] = transformed;
    } else {
      newParams[key] = value;
    }
  }
  if (!changed) return entry;
  return { ...e, detail: { ...detail, params: newParams } };
}

function transformChatName(msg: ChatMessage): ChatMessage {
  return { ...msg, senderName: transformDisplayName(msg.senderName) };
}

const PARTYKIT_HOST =
  import.meta.env.VITE_PARTYKIT_HOST ?? "localhost:1999";

interface UsePartySocketReturn {
  connected: boolean;
  lobbyState: LobbyState | null;
  gameState: ClientGameState | null;
  serverClockOffsetMs: number;
  lastAction: GameAction | null;
  chatMessages: ChatMessage[];
  error: string | null;
  errorCode: ActionLegalityCode | null;
  kicked: boolean;
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
  const [serverClockOffsetMs, setServerClockOffsetMs] = useState(0);
  const [lastAction, setLastAction] = useState<GameAction | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<ActionLegalityCode | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [kicked, setKicked] = useState(false);

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
          setLobbyState(transformPlayerNames(msg.state));
          setGameState(null);
          break;
        case "gameState":
          {
            const receivedAtMs = Date.now();
            const offsetMs = resolveServerClockOffsetMs(
              msg.serverNowMs,
              receivedAtMs,
            );
            setServerClockOffsetMs(offsetMs);
          }
          setGameState(transformPlayerNames(msg.state));
          setLobbyState(null);
          setChatMessages((msg.state.chat ?? []).map(transformChatName));
          break;
        case "action":
          setLastAction(msg.action);
          break;
        case "chat":
          setChatMessages((prev) => [...prev, transformChatName(msg.message)]);
          break;
        case "kicked":
          setKicked(true);
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
    serverClockOffsetMs,
    lastAction,
    chatMessages,
    error,
    errorCode,
    kicked,
    send,
    playerId,
  };
}
