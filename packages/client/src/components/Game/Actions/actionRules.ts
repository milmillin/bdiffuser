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
const VALUE_CONSTRAINT_IDS = new Set(["A", "B", "C", "D", "E", "F"]);

export function isBaseEquipmentId(id: string): id is BaseEquipmentId {
  return BASE_EQUIPMENT_SET.has(id);
}

function valuePassesConstraint(value: number, constraintId: string): boolean {
  switch (constraintId) {
    case "A":
      return value % 2 === 0;
    case "B":
      return value % 2 !== 0;
    case "C":
      return value >= 1 && value <= 6;
    case "D":
      return value >= 7 && value <= 12;
    case "E":
      return value >= 4 && value <= 9;
    case "F":
      return value < 4 || value > 9;
    default:
      return true;
  }
}

function getActiveConstraintIds(state: ClientGameState, playerId: string): string[] {
  const constraints = state.campaign?.constraints;
  if (!constraints) return [];

  const active: string[] = [];

  for (const card of constraints.global ?? []) {
    if (card.active) {
      active.push(card.id);
    }
  }

  for (const card of constraints.perPlayer?.[playerId] ?? []) {
    if (card.active) {
      active.push(card.id);
    }
  }

  return active;
}

function getMission44DepthCost(value: number): number {
  const normalized = Math.max(1, Math.min(12, Math.floor(value)));
  if (normalized <= 4) return 1;
  if (normalized <= 8) return 2;
  return 3;
}

function getMissionOxygenAvailability(state: ClientGameState, playerId: string): number | null {
  const oxygen = state.campaign?.oxygen;
  if (!oxygen) return null;

  const owned = Math.max(0, Math.floor(oxygen.playerOxygen[playerId] ?? 0));
  if (state.mission === 44) {
    return owned + Math.max(0, Math.floor(oxygen.pool));
  }

  if (state.mission === 49 || state.mission === 54 || state.mission === 63) {
    return owned;
  }

  return null;
}

function getMissionSoloCutOxygenCost(state: ClientGameState, value: number): number {
  if (state.mission === 44 || state.mission === 54) {
    return getMission44DepthCost(value);
  }

  if (state.mission === 49 || state.mission === 63) {
    return Math.max(0, Math.floor(value));
  }

  return 0;
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
  const activeValueConstraintIds = getActiveConstraintIds(state, playerId).filter((id) =>
    VALUE_CONSTRAINT_IDS.has(id),
  );

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
  const mission59ForwardValues = state.mission === 59
    ? new Set(getMission59ForwardValues(state))
    : null;
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
      if (state.mission === 59 && !mission59ForwardValues?.has(value)) {
        continue;
      }
      if (!isMission26CutValueVisible(state, value)) continue;
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
      if (state.mission === 59) {
        continue;
      }
      if (state.mission === 48 || state.mission === 41) {
        // Missions 48 and 41 use special actions for yellow wires and forbid normal solo cuts.
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

  const availableOxygen = getMissionOxygenAvailability(state, playerId);
  return values.filter((value): value is number | "YELLOW" => {
    if (value === "YELLOW") return true;
    if (
      activeValueConstraintIds.length > 0 &&
      !activeValueConstraintIds.every((constraintId) =>
        valuePassesConstraint(value, constraintId),
      )
    ) {
      return false;
    }
    if (availableOxygen == null) return true;
    return getMissionSoloCutOxygenCost(state, value) <= availableOxygen;
  });
}

export function isMission26CutValueVisible(
  state: ClientGameState,
  value: unknown,
): value is number {
  if (typeof value !== "number") return false;
  if (state.mission !== 26) return true;
  return new Set(
    (state.campaign?.numberCards?.visible ?? [])
      .filter((card) => card.faceUp)
      .map((card) => card.value),
  ).has(value);
}

export function getMission59ForwardValues(state: ClientGameState): number[] {
  if (state.mission !== 59) return [];

  const mission59Nano = state.campaign?.mission59Nano;
  if (!mission59Nano) return [];
  if (!Number.isInteger(mission59Nano.position)) return [];
  if (mission59Nano.facing !== 1 && mission59Nano.facing !== -1) return [];

  const line = state.campaign?.numberCards?.visible ?? [];
  if (line.length === 0) return [];

  const values: number[] = [];
  for (
    let index = mission59Nano.position;
    index >= 0 && index < line.length;
    index += mission59Nano.facing
  ) {
    const card = line[index];
    if (!card?.faceUp) continue;
    values.push(card.value);
  }

  return values;
}

export function isMission59CutValueVisible(
  state: ClientGameState,
  value: unknown,
): value is number {
  if (typeof value !== "number") return false;
  if (state.mission !== 59) return true;

  const visibleValues = new Set(getMission59ForwardValues(state));
  return visibleValues.has(value);
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

  if (state.mission === 59) {
    return false;
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
