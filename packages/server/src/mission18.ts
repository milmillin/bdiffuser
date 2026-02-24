import type { ActionLegalityError } from "@bomb-busters/shared";

export function validateMission18DesignatedCutterTarget(
  requiredValue: number,
  targetPlayerId: string,
  radarResults: Readonly<Record<string, boolean>>,
): ActionLegalityError | null {
  if (radarResults[targetPlayerId]) return null;
  return {
    code: "MISSION_RULE_VIOLATION",
    message: `Mission 18: designated player must have an uncut wire with value ${requiredValue}`,
  };
}
