import type { GameState } from "@bomb-busters/shared";

const WIRE_NUMBER_CHAT_REGEX = /\b(?:[1-9]|1[0-2])\b/;

/**
 * Mission 25 ("It's to hear you better..."):
 * speaking wire numbers 1-12 advances the detonator by one notch.
 */
export function containsSpokenWireNumber(text: string): boolean {
  return WIRE_NUMBER_CHAT_REGEX.test(text);
}

/**
 * Apply mission-25 chat penalty if the message contains a spoken wire number.
 * Returns true when a penalty was applied.
 */
export function applyMission25ChatPenalty(
  state: GameState,
  text: string,
): boolean {
  if (state.mission !== 25 || state.phase !== "playing") return false;
  if (!containsSpokenWireNumber(text)) return false;

  state.board.detonatorPosition += 1;
  if (state.board.detonatorPosition >= state.board.detonatorMax) {
    state.result = "loss_detonator";
    state.phase = "finished";
  }
  return true;
}

