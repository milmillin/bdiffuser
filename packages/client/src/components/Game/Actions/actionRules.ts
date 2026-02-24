import type {
  AnyEquipmentId,
  BaseEquipmentId,
  ClientGameState,
  UseEquipmentPayload,
} from "@bomb-busters/shared";
import {
  BLUE_COPIES_PER_VALUE,
  getWirePoolCount,
  resolveMissionSetup,
} from "@bomb-busters/shared";
import type { EquipmentMode } from "./EquipmentModePanel.js";

const BASE_EQUIPMENT_IDS: readonly BaseEquipmentId[] = [
  "label_neq",
  "talkies_walkies",
  "triple_detector",
  "post_it",
  "super_detector",
  "rewinder",
  "emergency_batteries",
  "general_radar",
  "stabilizer",
  "x_or_y_ray",
  "coffee_mug",
  "label_eq",
] as const;

const BASE_EQUIPMENT_SET = new Set<string>(BASE_EQUIPMENT_IDS);

export function isBaseEquipmentId(id: string): id is BaseEquipmentId {
  return BASE_EQUIPMENT_SET.has(id);
}

export function getImmediateEquipmentPayload(
  equipmentId: AnyEquipmentId,
): UseEquipmentPayload | null {
  switch (equipmentId) {
    case "rewinder":
      return { kind: "rewinder" };
    case "stabilizer":
      return { kind: "stabilizer" };
    default:
      return null;
  }
}

export function getInitialEquipmentMode(
  equipmentId: AnyEquipmentId,
): EquipmentMode | null {
  switch (equipmentId) {
    case "post_it":
      return { kind: "post_it" };
    case "general_radar":
      return { kind: "general_radar" };
    case "label_eq":
      return { kind: "label_eq", firstTileIndex: null };
    case "label_neq":
      return { kind: "label_neq", firstTileIndex: null };
    case "talkies_walkies":
      return {
        kind: "talkies_walkies",
        teammateId: null,
        teammateTileIndex: null,
        myTileIndex: null,
      };
    case "emergency_batteries":
      return { kind: "emergency_batteries", selectedPlayerIds: [] };
    case "coffee_mug":
      return { kind: "coffee_mug" };
    case "triple_detector":
      return {
        kind: "triple_detector",
        targetPlayerId: null,
        targetTileIndices: [],
        guessTileIndex: null,
      };
    case "super_detector":
      return { kind: "super_detector", targetPlayerId: null, guessTileIndex: null };
    case "x_or_y_ray":
      return {
        kind: "x_or_y_ray",
        targetPlayerId: null,
        targetTileIndex: null,
        guessATileIndex: null,
        guessBTileIndex: null,
      };
    case "false_bottom":
      return { kind: "false_bottom" };
    case "single_wire_label":
      return { kind: "single_wire_label" };
    case "emergency_drop":
      return { kind: "emergency_drop" };
    case "fast_pass":
      return { kind: "fast_pass", selectedValue: null };
    case "disintegrator":
      return { kind: "disintegrator" };
    case "grappling_hook":
      return { kind: "grappling_hook", targetPlayerId: null, targetTileIndex: null };
    default:
      return null;
  }
}

export function getSoloCutValues(
  state: ClientGameState,
  playerId: string,
): (number | "YELLOW")[] {
  const me = state.players.find((p) => p.id === playerId);
  if (!me) return [];

  const myUncut = me.hand.filter((t) => !t.cut);
  const values: (number | "YELLOW")[] = [];

  const valueCounts = new Map<string, number>();
  for (const tile of myUncut) {
    if (tile.gameValue == null || tile.gameValue === "RED") continue;
    const key = String(tile.gameValue);
    valueCounts.set(key, (valueCounts.get(key) ?? 0) + 1);
  }

  for (const [key, myCount] of valueCounts) {
    const value = key === "YELLOW" ? "YELLOW" : Number(key);
    if (typeof value === "number") {
      const alreadyCut = state.board.validationTrack[value] ?? 0;
      const remaining = BLUE_COPIES_PER_VALUE - alreadyCut;
      if (myCount >= remaining && remaining > 0) {
        values.push(value);
      }
    } else {
      const { setup } = resolveMissionSetup(state.mission, state.players.length);
      const totalYellowsInGame = getWirePoolCount(setup.yellow);
      const allCutYellows = state.players.reduce(
        (sum, player) =>
          sum + player.hand.filter((tile) => tile.cut && tile.color === "yellow").length,
        0,
      );
      const remainingYellows = totalYellowsInGame - allCutYellows;
      if (myCount >= remainingYellows && remainingYellows > 0) {
        values.push("YELLOW");
      }
    }
  }

  return values;
}

export function canRevealReds(
  state: ClientGameState,
  playerId: string,
): boolean {
  const me = state.players.find((p) => p.id === playerId);
  if (!me) return false;
  const uncutTiles = me.hand.filter((t) => !t.cut);
  if (uncutTiles.length === 0) return false;
  return uncutTiles.every((t) => t.color === "red");
}
