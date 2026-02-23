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
  if (gameState.mission !== 9) return null;

  const pointer =
    gameState.campaign?.specialMarkers?.find(
      (marker) => marker.kind === "sequence_pointer",
    )?.value ?? 0;
  const visibleValues =
    (gameState.campaign?.numberCards?.visible ?? []).map((card) => card.value);
  const activeValue = visibleValues[pointer];
  const rule = MISSION_SCHEMAS[9].hookRules?.find(
    (candidate) => candidate.kind === "sequence_priority",
  );
  const requiredCuts = rule?.kind === "sequence_priority" ? rule.requiredCuts : 2;
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
  const gate = getMission9SequenceGate(gameState);
  if (!gate || typeof gate.activeValue !== "number") return false;
  if (typeof value !== "number") return false;
  return value !== gate.activeValue;
}
