import { useEffect, useRef } from "react";
import type { ClientGameState } from "@bomb-busters/shared";
import { deriveActionAttentionState } from "../components/Game/Actions/forcedActionAttention.js";
import { isRevealRedsForced } from "../components/Game/Actions/actionRules.js";

const ORIGINAL_TITLE = document.title;

export function useTurnNotification(
  gameState: ClientGameState | null,
  playerId: string | null,
) {
  const initialized = useRef(false);
  const prevCurrentPlayerId = useRef<string | null>(null);
  const prevNeedsForcedInput = useRef(false);
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

  // Fire notification when it becomes my turn or a forced action targets me.
  useEffect(() => {
    if (!gameState || !playerId) return;

    const { currentPlayerIndex, players, phase } = gameState;
    const currentPlayerId = players[currentPlayerIndex]?.id ?? null;
    const revealRedsForcedNow =
      phase === "playing" &&
      currentPlayerId === playerId &&
      isRevealRedsForced(gameState, playerId);
    const attention = deriveActionAttentionState({
      gameState,
      playerId,
      revealRedsForcedNow,
    });
    const needsForcedInput =
      attention.state === "forced_actor" ||
      attention.state === "forced_reveal_reds";

    if (!initialized.current) {
      initialized.current = true;
      prevCurrentPlayerId.current = currentPlayerId;
      prevNeedsForcedInput.current = needsForcedInput;
      return;
    }

    const becameTurn =
      phase === "playing" &&
      currentPlayerId === playerId &&
      prevCurrentPlayerId.current !== playerId;
    const becameForced =
      phase === "playing" &&
      needsForcedInput &&
      !prevNeedsForcedInput.current;

    prevCurrentPlayerId.current = currentPlayerId;
    prevNeedsForcedInput.current = needsForcedInput;

    if (!becameTurn && !becameForced) return;
    if (!document.hidden) return;

    // Change tab title
    document.title = becameForced
      ? "ACTION REQUIRED! - BOMBBUSTERS"
      : "YOUR TURN! - BOMBBUSTERS";
    titleOverridden.current = true;

    // Send browser notification
    if ("Notification" in window && Notification.permission === "granted") {
      const n = new Notification(
        becameForced ? "BOMBBUSTERS - Action Required!" : "BOMBBUSTERS - Your Turn!",
        {
          body: becameForced
            ? "A forced mission action needs your input."
            : "It's your turn to act.",
          tag: "turn-notification",
        },
      );
      n.onclick = () => {
        window.focus();
        n.close();
      };
    }
  }, [gameState, playerId]);
}
