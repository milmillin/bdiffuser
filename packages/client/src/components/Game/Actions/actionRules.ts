import type {
  AnyEquipmentId,
  BaseEquipmentId,
  ClientGameState,
  UseEquipmentPayload,
} from "@bomb-busters/shared";
import {
  getWirePoolCount,
  isLogTextDetail,
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
      return { kind: "post_it", selectedTileIndex: null };
    case "general_radar":
      return { kind: "general_radar", selectedValue: null };
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
      return { kind: "coffee_mug", selectedPlayerId: null };
    case "triple_detector":
      return {
        kind: "triple_detector",
        targetPlayerId: null,
        targetTileIndices: [],
        guessTileIndex: null,
      };
    case "super_detector":
      return {
        kind: "super_detector",
        targetPlayerId: null,
        targetStandIndex: null,
        guessTileIndex: null,
      };
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
      return { kind: "single_wire_label", selectedTileIndex: null };
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
  const hasConstraintK = (() => {
    const globalHasK = state.campaign?.constraints?.global?.some(
      (constraint) => constraint.id === "K" && constraint.active,
    );
    const playerHasK = state.campaign?.constraints?.perPlayer?.[
      playerId
    ]?.some((constraint) => constraint.id === "K" && constraint.active);
    return globalHasK || playerHasK;
  })();
  if (hasConstraintK) return [];

  const myUncut = me.hand.filter((t) => !t.cut);
  const values: (number | "YELLOW")[] = [];
  const mission35HasUncutYellowWires =
    state.mission === 35 &&
    state.players.some((player) =>
      player.hand.some((tile) => !tile.cut && tile.color === "yellow"),
    );

  const hasMission46NonSevenUncutWire = (() => {
    if (state.mission !== 46) return false;
    return me.hand.some(
      (tile) =>
        !tile.cut &&
        (tile.color !== "yellow" || tile.gameValue !== 7),
    );
  })();

  const protectedSimultaneousFourValue = (() => {
    if ((state.mission !== 23 && state.mission !== 39) || state.campaign?.mission23SpecialActionDone) {
      return null;
    }

    const visibleValue = state.campaign?.numberCards?.visible?.[0]?.value;
    return typeof visibleValue === "number" ? visibleValue : null;
  })();

  const totalRemainingValueCounts = new Map<number, number>();
  for (const player of state.players) {
    for (const tile of player.hand) {
      if (tile.cut) continue;
      if (typeof tile.gameValue !== "number") continue;
      totalRemainingValueCounts.set(
        tile.gameValue,
        (totalRemainingValueCounts.get(tile.gameValue) ?? 0) + 1,
      );
    }
  }

  const valueCounts = new Map<string, number>();
  for (const tile of myUncut) {
    if (tile.gameValue == null || tile.gameValue === "RED") continue;
    const key = String(tile.gameValue);
    valueCounts.set(key, (valueCounts.get(key) ?? 0) + 1);
  }

  for (const [key, myCount] of valueCounts) {
    const value = key === "YELLOW" ? "YELLOW" : Number(key);
    if (typeof value === "number") {
      if (value === protectedSimultaneousFourValue) {
        continue;
      }
      if (state.mission === 46 && value === 7 && hasMission46NonSevenUncutWire) {
        continue;
      }
      if (
        mission35HasUncutYellowWires
        && myUncut.some((tile) => tile.gameValue === value && tile.isXMarked)
      ) {
        continue;
      }
      const remaining = totalRemainingValueCounts.get(value) ?? 0;
      if (myCount === remaining && (myCount === 2 || myCount === 4)) {
        values.push(value);
      }
    } else {
      if (state.mission === 48) {
        // Mission 48 yellow wires can only be cut via the simultaneous 3-yellow action.
        continue;
      }
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

  if (state.mission === 11) {
    const hiddenBlueAsRedValue = getMission11BlueAsRedValue(state);
    if (hiddenBlueAsRedValue == null) return false;
    return uncutTiles.every((t) => t.gameValue === hiddenBlueAsRedValue);
  }

  const allRed = uncutTiles.every((t) => t.color === "red");
  if (!allRed) return false;

  // Mission 13 requires the dedicated simultaneous-red special action.
  if (state.mission === 13) return false;

  return true;
}

export function isRevealRedsForced(
  state: ClientGameState,
  playerId: string,
): boolean {
  const me = state.players.find((p) => p.id === playerId);
  if (!me) return false;

  const uncutTiles = me.hand.filter((tile) => !tile.cut);
  if (uncutTiles.length === 0) return false;

  if (state.campaign?.mission18DesignatorIndex != null) {
    return false;
  }

  if (state.mission === 11) {
    const hiddenBlueAsRedValue = getMission11BlueAsRedValue(state);
    if (hiddenBlueAsRedValue == null) return false;
    return uncutTiles.every((t) => t.gameValue === hiddenBlueAsRedValue);
  }

  return uncutTiles.every((t) => t.color === "red");
}

function getMission11BlueAsRedValue(state: ClientGameState): number | null {
  if (state.mission !== 11) return null;

  for (const entry of state.log) {
    if (entry.action !== "hookSetup") continue;
    if (!isLogTextDetail(entry.detail)) continue;
    const match = /^blue_as_red:(\d+)$/.exec(entry.detail.text.trim());
    if (!match) continue;
    const value = Number(match[1]);
    if (Number.isInteger(value) && value >= 1 && value <= 12) {
      return value;
    }
  }

  return null;
}
