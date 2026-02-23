import type { MissionId } from "./types.js";

export interface MissionDefinition {
  id: MissionId;
  name: string;
  difficulty: "novice" | "intermediate" | "expert";
  redWires: number;
  yellowWires: number;
  /** "X out of Y" setup: draw Y, keep X, discard rest without revealing */
  redOutOf?: { keep: number; draw: number };
  yellowOutOf?: { keep: number; draw: number };
  /** Special rules text */
  specialRules: string;
  /** Image file for front of mission card */
  imageFront: string;
  /** Image file for back (special rules) of mission card */
  imageBack?: string;
}

/**
 * Mission definitions for Training Missions 1-8.
 *
 * Missions 1-3: Novice (basics)
 * Missions 4-7: Intermediate (advanced concepts)
 * Mission 8: Expert (final exam)
 *
 * Note: Exact red/yellow wire counts and special rules per mission
 * are approximated here. The mission card images contain the
 * authoritative setup instructions.
 */
export const MISSIONS: Record<MissionId, MissionDefinition> = {
  1: {
    id: 1,
    name: "Training, Day 1",
    difficulty: "novice",
    redWires: 0,
    yellowWires: 0,
    specialRules: "No red or yellow wires. Learn the basics of Dual Cut.",
    imageFront: "mission_1.png",
  },
  2: {
    id: 2,
    name: "Training, Day 2",
    difficulty: "novice",
    redWires: 3,
    yellowWires: 0,
    specialRules: "Introduces red wires. Red wires have the value 'RED'.",
    imageFront: "mission_2.png",
  },
  3: {
    id: 3,
    name: "Training, Day 3",
    difficulty: "novice",
    redWires: 3,
    yellowWires: 3,
    specialRules: "Introduces yellow wires. Yellow wires have the value 'YELLOW'.",
    imageFront: "mission_3.png",
  },
  4: {
    id: 4,
    name: "A Sense of Priorities",
    difficulty: "intermediate",
    redWires: 5,
    yellowWires: 0,
    redOutOf: { keep: 5, draw: 5 },
    specialRules: "5 red wires. Introduces Solo Cut action.",
    imageFront: "mission_4.png",
  },
  5: {
    id: 5,
    name: "First Day in the Field",
    difficulty: "intermediate",
    redWires: 5,
    yellowWires: 3,
    specialRules: "5 red, 3 yellow wires. Full rules in effect.",
    imageFront: "mission_5.png",
  },
  6: {
    id: 6,
    name: "Under Pressure",
    difficulty: "intermediate",
    redWires: 7,
    yellowWires: 3,
    redOutOf: { keep: 7, draw: 7 },
    yellowOutOf: { keep: 2, draw: 3 },
    specialRules: "7 red, 2 out of 3 yellow wires. Equipment introduced.",
    imageFront: "mission_6.png",
  },
  7: {
    id: 7,
    name: "Completing the Training",
    difficulty: "intermediate",
    redWires: 9,
    yellowWires: 5,
    redOutOf: { keep: 9, draw: 9 },
    yellowOutOf: { keep: 3, draw: 5 },
    specialRules: "9 red, 3 out of 5 yellow. Full equipment and characters.",
    imageFront: "mission_7.png",
  },
  8: {
    id: 8,
    name: "Final Exam",
    difficulty: "expert",
    redWires: 11,
    yellowWires: 7,
    redOutOf: { keep: 11, draw: 11 },
    yellowOutOf: { keep: 5, draw: 7 },
    specialRules: "All 11 red, 5 out of 7 yellow. The ultimate challenge.",
    imageFront: "mission_8.png",
  },
};
