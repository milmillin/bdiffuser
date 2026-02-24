import type { GameLogDetail, GameLogEntry, GameState } from "@bomb-busters/shared";
import { logText } from "@bomb-busters/shared";

export type GameLogDetailInput = GameLogDetail | string;

interface PushGameLogInput {
  playerId: string;
  action: string;
  detail: GameLogDetailInput;
  turn?: number;
  timestamp?: number;
}

export function toGameLogDetail(detail: GameLogDetailInput): GameLogDetail {
  if (typeof detail === "string") {
    return logText(detail);
  }
  return detail;
}

export function pushGameLog(
  state: Pick<GameState, "log" | "turnNumber">,
  input: PushGameLogInput,
): GameLogEntry {
  const entry: GameLogEntry = {
    turn: input.turn ?? state.turnNumber,
    playerId: input.playerId,
    action: input.action,
    detail: toGameLogDetail(input.detail),
    timestamp: input.timestamp ?? Date.now(),
  };
  state.log.push(entry);
  return entry;
}
