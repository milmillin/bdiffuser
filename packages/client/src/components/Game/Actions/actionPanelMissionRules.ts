import type { ClientGameState, WireValue } from "@bomb-busters/shared";
import { MISSION_SCHEMAS } from "@bomb-busters/shared";

export type Mission9CutValue = Extract<WireValue, number | "YELLOW" | "RED">;
type Mission9StateLike = {
  mission: number;
  players: Array<{
    hand: Array<{
      cut: boolean;
      gameValue?: WireValue;
    }>;
  }>;
  campaign?: {
    numberCards?: {
      visible: Array<{ value: number }>;
    };
    specialMarkers?: Array<{
      kind: string;
      value: number;
    }>;
  };
};

export interface Mission9SequenceGate {
  activeValue?: number;
  requiredCuts: number;
  activeProgress?: number;
}

function getSequencePointer(state: Mission9StateLike): number | null {
  const marker = state.campaign?.specialMarkers?.find(
    (candidate) => candidate.kind === "sequence_pointer",
  );
  if (!marker || typeof marker.value !== "number") return null;
  return marker.value;
}

function countCutValue(state: Mission9StateLike, value: number): number {
  let count = 0;
  for (const player of state.players) {
    for (const tile of player.hand) {
      if (tile.cut && tile.gameValue === value) count++;
    }
  }
  return count;
}

export function getMission9SequenceGate(
  gameState: Mission9StateLike,
): Mission9SequenceGate | null {
  const isMission9 = gameState.mission === 9;
  const isMission36 = gameState.mission === 36;
  if (!isMission9 && !isMission36) return null;

  const visibleValues =
    (gameState.campaign?.numberCards?.visible ?? []).map((card) => card.value);
  const pointerMarker = getSequencePointer(gameState);
  const pointer =
    pointerMarker == null
      ? isMission9
        ? 0
        : null
      : Math.max(0, Math.min(pointerMarker, Math.max(visibleValues.length - 1, 0)));
  const activeValue = pointer == null ? undefined : visibleValues[pointer];
  const hookRules = isMission9
    ? MISSION_SCHEMAS[9].hookRules
    : MISSION_SCHEMAS[36].hookRules;
  const rule = hookRules?.find(
    (candidate) =>
      candidate.kind === "sequence_priority" ||
      candidate.kind === "sequence_card_reposition",
  );
  const requiredCuts =
    rule?.kind === "sequence_priority" || rule?.kind === "sequence_card_reposition"
      ? rule.requiredCuts
      : 2;
  const activeProgress =
    typeof activeValue === "number"
      ? Math.min(countCutValue(gameState, activeValue), requiredCuts)
      : undefined;

  return {
    activeValue,
    requiredCuts,
    activeProgress,
  };
}

export function isMission9BlockedCutValue(
  gameState: Mission9StateLike,
  value: Mission9CutValue,
): boolean {
  const isMission9 = gameState.mission === 9;
  const isMission36 = gameState.mission === 36;
  if (!isMission9 && !isMission36) return false;
  if (typeof value !== "number") return false;

  const visibleValues =
    (gameState.campaign?.numberCards?.visible ?? []).map((card) => card.value);
  if (visibleValues.length === 0) return false;
  const pointerMarker = getSequencePointer(gameState);
  if (isMission36 && pointerMarker == null) return false;
  const pointer = Math.max(
    0,
    Math.min(pointerMarker ?? 0, Math.max(visibleValues.length - 1, 0)),
  );

  // Only block the later sequence card values, matching server validation.
  // pointer=0: values[1] and values[2] are blocked.
  // pointer=1: values[2] is blocked.
  // pointer>=2: nothing blocked.
  const blockedValues = isMission9
    ? pointer === 0
      ? [visibleValues[1], visibleValues[2]]
      : pointer === 1
        ? [visibleValues[2]]
        : []
    : visibleValues.filter((_cardValue, idx) => idx !== pointer);

  return blockedValues.includes(value);
}

export function isDualCutTargetAllowed(
  state: {
    mission: number;
    players?: Array<{
      hand?: Array<{ cut?: boolean; color?: string }>;
    }>;
  },
  targetColor: "red" | "yellow" | "blue" | undefined,
  targetIsXMarked = false,
): boolean {
  if (targetColor === "red" && state.mission === 13) {
    return false;
  }

  if (
    targetColor === "yellow" && (state.mission === 41 || state.mission === 48)
  ) {
    return false;
  }

  if (state.mission === 35 && targetIsXMarked) {
    const hasUncutYellowWires = (state.players ?? []).some((player) =>
      player.hand?.some((tile) => !tile.cut && tile.color === "yellow") ?? false,
    );
    if (hasUncutYellowWires) {
      return false;
    }
  }

  return true;
}

export function isMissionSpecialTargetAllowed(
  state: { mission: number },
  targetColor: "red" | "yellow" | "blue" | undefined,
): boolean {
  if (state.mission !== 13 && state.mission !== 41 && state.mission !== 48) return true;

  if (targetColor == null) return true;

  if (state.mission === 13) {
    return targetColor === "red";
  }

  return targetColor === "yellow";
}
