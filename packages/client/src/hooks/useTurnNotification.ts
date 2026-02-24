import { useEffect, useRef } from "react";
import type { ClientGameState } from "@bomb-busters/shared";

const ORIGINAL_TITLE = document.title;

export function useTurnNotification(
  gameState: ClientGameState | null,
  playerId: string | null,
) {
  const prevPlayerIndex = useRef<number | null>(null);
  const titleOverridden = useRef(false);

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Restore title when tab becomes visible
  useEffect(() => {
    const onVisibilityChange = () => {
      if (!document.hidden && titleOverridden.current) {
        document.title = ORIGINAL_TITLE;
        titleOverridden.current = false;
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (titleOverridden.current) {
        document.title = ORIGINAL_TITLE;
        titleOverridden.current = false;
      }
    };
  }, []);

  // Fire notification when it becomes my turn
  useEffect(() => {
    if (!gameState || !playerId) return;

    const { currentPlayerIndex, players, phase } = gameState;
    const prev = prevPlayerIndex.current;
    prevPlayerIndex.current = currentPlayerIndex;

    if (prev === null || prev === currentPlayerIndex) return;
    if (phase !== "playing") return;

    const currentPlayer = players[currentPlayerIndex];
    if (!currentPlayer || currentPlayer.id !== playerId) return;
    if (!document.hidden) return;

    // Change tab title
    document.title = "YOUR TURN! - BOMBBUSTERS";
    titleOverridden.current = true;

    // Send browser notification
    if ("Notification" in window && Notification.permission === "granted") {
      const n = new Notification("BOMBBUSTERS - Your Turn!", {
        body: "It's your turn to act.",
        tag: "turn-notification",
      });
      n.onclick = () => {
        window.focus();
        n.close();
      };
    }
  }, [gameState, playerId]);
}
