import type { CharacterId, MissionId } from "./types.js";

const MISSION_FORBIDDEN_NON_CAPTAIN_CHARACTERS: Readonly<
  Partial<Record<MissionId, readonly CharacterId[]>>
> = {
  44: ["character_e4"],
  45: ["character_e4"],
  47: ["character_e4"],
  49: ["character_e4"],
  51: ["character_e4"],
  54: ["character_e4"],
  59: ["character_e4"],
  63: ["character_e4"],
  65: ["character_e4"],
} as const;

export function isNonCaptainCharacterForbidden(
  mission: MissionId,
  characterId: CharacterId,
): boolean {
  const forbiddenCharacters = MISSION_FORBIDDEN_NON_CAPTAIN_CHARACTERS[mission] ?? [];
  return forbiddenCharacters.includes(characterId);
}
