export interface Mission30AudioClipDef {
  id: string;
  startMs: number;
  endMs: number;
  loop: boolean;
  kind: "instruction" | "action";
  subtitle?: string;
}

const s = (seconds: number) => Math.round(seconds * 1000);

export const MISSION_30_HIDDEN_SHORT_GRACE_MS = 3_000;
export const MISSION_30_HIDDEN_LONG_GRACE_MS = 5_000;
export const MISSION_30_NETWORK_GRACE_MS = 750;

export const MISSION_30_AUDIO_CLIPS = {
  briefing: {
    id: "briefing",
    startMs: s(2.63),
    endMs: s(54.32),
    loop: false,
    kind: "instruction",
    subtitle:
      "Briefing: no player can put any wire into play until the cue, and everyone must stop and listen whenever the cue returns.",
  },
  prologue: {
    id: "prologue",
    startMs: s(54.76),
    endMs: s(121.49),
    loop: false,
    kind: "action",
  },
  roundA1Instruction: {
    id: "roundA1Instruction",
    startMs: s(121.5),
    endMs: s(134.21),
    loop: false,
    kind: "instruction",
    subtitle: "At least two wires of this number must be cut within twenty seconds.",
  },
  roundABed: {
    id: "roundABed",
    startMs: s(134.59),
    endMs: s(155.35),
    loop: true,
    kind: "action",
  },
  roundA2Instruction: {
    id: "roundA2Instruction",
    startMs: s(155.36),
    endMs: s(176.34),
    loop: false,
    kind: "instruction",
    subtitle:
      "If the requested number was not cut, advance the detonator one space, replace the number card, and cut at least two more wires of the new number within twenty seconds.",
  },
  roundB1Instruction: {
    id: "roundB1Instruction",
    startMs: s(247.57),
    endMs: s(252.43),
    loop: false,
    kind: "instruction",
    subtitle: "Replace the number card. You've got twenty seconds.",
  },
  roundBBed: {
    id: "roundBBed",
    startMs: s(252.73),
    endMs: s(276.65),
    loop: true,
    kind: "action",
  },
  roundB2Instruction: {
    id: "roundB2Instruction",
    startMs: s(276.66),
    endMs: s(295.95),
    loop: false,
    kind: "instruction",
    subtitle:
      "If the requested number was cut, everyone now knows how many yellow wires each player has left. Replace the number card. This time you only have fifteen seconds.",
  },
  mimeIntroInstruction: {
    id: "mimeIntroInstruction",
    startMs: s(315.07),
    endMs: s(335.2),
    loop: false,
    kind: "instruction",
    subtitle:
      "Bomb disposal experts may no longer speak and can only communicate by miming. Each mistake moves the detonator one space.",
  },
  roundCBed: {
    id: "roundCBed",
    startMs: s(335.87),
    endMs: s(352.93),
    loop: true,
    kind: "action",
  },
  roundC1MissInstruction: {
    id: "roundC1MissInstruction",
    startMs: s(352.94),
    endMs: s(364.77),
    loop: false,
    kind: "instruction",
    subtitle:
      "If the requested number was not cut, the active expert draws one number card and publicly says whether they still hold that value.",
  },
  roundC2Instruction: {
    id: "roundC2Instruction",
    startMs: s(365.85),
    endMs: s(375.41),
    loop: false,
    kind: "instruction",
    subtitle: "It is not a free reveal. Replace the number card. Fifteen seconds. Go.",
  },
  roundC2FollowUpInstruction: {
    id: "roundC2FollowUpInstruction",
    startMs: s(391.36),
    endMs: s(403.92),
    loop: false,
    kind: "instruction",
    subtitle:
      "If the requested number has been cut, you may immediately finish the rest of that value before moving on.",
  },
  tripleLockInstruction: {
    id: "tripleLockInstruction",
    startMs: s(405.41),
    endMs: s(439.11),
    loop: false,
    kind: "instruction",
    subtitle:
      "Reveal three number cards. From now on, only those three values may be cut, and all four copies of each must be cut within two minutes.",
  },
  tripleLockBed: {
    id: "tripleLockBed",
    startMs: s(439.16),
    endMs: s(556.59),
    loop: true,
    kind: "action",
  },
  yellowSweepInstruction: {
    id: "yellowSweepInstruction",
    startMs: s(556.6),
    endMs: s(579.79),
    loop: false,
    kind: "instruction",
    subtitle:
      "Stop. If the three target values are done, the active expert must immediately cut all remaining yellow wires in one shot.",
  },
  finalCleanupInstruction: {
    id: "finalCleanupInstruction",
    startMs: s(580.11),
    endMs: s(587.6),
    loop: false,
    kind: "instruction",
    subtitle: "Forget the number cards. You have two minutes left to cut all the remaining wires.",
  },
  finalCleanupBed: {
    id: "finalCleanupBed",
    startMs: s(588.11),
    endMs: s(769.08),
    loop: true,
    kind: "action",
  },
} as const satisfies Record<string, Mission30AudioClipDef>;

export type Mission30AudioClipId = keyof typeof MISSION_30_AUDIO_CLIPS;

export function getMission30AudioClip(
  clipId: Mission30AudioClipId,
): Mission30AudioClipDef {
  return MISSION_30_AUDIO_CLIPS[clipId];
}
