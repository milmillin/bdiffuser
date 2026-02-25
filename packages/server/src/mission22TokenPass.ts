import type { ForcedAction, GameState, InfoToken } from "@bomb-busters/shared";
import { applyMissionInfoTokenVariant } from "./infoTokenRules.js";

export function applyMission22TokenPassChoice(
  state: GameState,
  forced: Extract<ForcedAction, { kind: "mission22TokenPass" }>,
  value: number,
): { ok: true; recipientIndex: number; updatedRecipientToken: InfoToken } | { ok: false; message: string } {
  const isYellow = value === 0;
  const chooserIndex = forced.currentChooserIndex;
  const playerCount = state.players.length;
  const recipientIndex = (chooserIndex + 1) % playerCount;
  const recipient = state.players[recipientIndex];
  if (!recipient) {
    return { ok: false, message: "Invalid mission 22 token pass recipient" };
  }

  let sourcePlayerIndex = -1;
  let sourceTokenIndex = -1;
  for (let playerIndex = 0; playerIndex < state.players.length; playerIndex++) {
    const player = state.players[playerIndex];
    for (let tokenIndex = 0; tokenIndex < player.infoTokens.length; tokenIndex++) {
      const token = player.infoTokens[tokenIndex];
      if (token.position !== -1) continue;
      if (isYellow ? token.isYellow : (!token.isYellow && token.value === value)) {
        sourcePlayerIndex = playerIndex;
        sourceTokenIndex = tokenIndex;
        break;
      }
    }
    if (sourcePlayerIndex !== -1) break;
  }

  if (sourcePlayerIndex === -1 || sourceTokenIndex === -1) {
    return { ok: false, message: "Token value is not available on the board" };
  }

  const sourcePlayer = state.players[sourcePlayerIndex];
  const sourceToken = sourcePlayer.infoTokens.splice(sourceTokenIndex, 1)[0];
  if (!sourceToken) {
    return { ok: false, message: "Token source no longer available" };
  }

  const sourceValue = sourceToken.value;
  const sourceIsYellow = sourceToken.isYellow;
  let position = -1;
  if (sourceIsYellow) {
    const yellowIdx = recipient.hand.findIndex((t) => !t.cut && t.color === "yellow");
    if (yellowIdx !== -1) position = yellowIdx;
  } else {
    const wireIdx = recipient.hand.findIndex(
      (t) => !t.cut && typeof t.gameValue === "number" && t.gameValue === sourceValue,
    );
    if (wireIdx !== -1) position = wireIdx;
  }

  const token = applyMissionInfoTokenVariant(state, {
    value: sourceValue,
    position,
    isYellow: sourceIsYellow,
  }, recipient);
  recipient.infoTokens.push(token);

  return { ok: true, recipientIndex, updatedRecipientToken: token };
}
