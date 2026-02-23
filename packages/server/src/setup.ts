import {
  BLUE_WIRE_VALUES,
  BLUE_COPIES_PER_VALUE,
  RED_WIRE_SORT_VALUES,
  YELLOW_WIRE_SORT_VALUES,
  PLAYER_COUNT_CONFIG,
  EQUIPMENT_DEFS,
  getWireImage,
  resolveMissionSetup,
  type MissionEquipmentSpec,
  type WirePoolSpec,
} from "@bomb-busters/shared";
import type {
  WireTile,
  Player,
  BoardState,
  EquipmentCard,
  BoardMarker,
  MissionId,
} from "@bomb-busters/shared";

let tileIdCounter = 0;

function createTileId(): string {
  return `tile_${++tileIdCounter}`;
}

function createBlueTiles(minValue: number, maxValue: number): WireTile[] {
  const tiles: WireTile[] = [];
  for (const value of BLUE_WIRE_VALUES) {
    if (value < minValue || value > maxValue) continue;
    for (let copy = 0; copy < BLUE_COPIES_PER_VALUE; copy++) {
      tiles.push({
        id: createTileId(),
        color: "blue",
        sortValue: value,
        gameValue: value,
        image: getWireImage("blue", value),
        cut: false,
      });
    }
  }
  return tiles;
}

function createColorTiles(
  color: "red" | "yellow",
  selectedSortValues: readonly number[],
): WireTile[] {
  return selectedSortValues.map((sortValue) => ({
    id: createTileId(),
    color,
    sortValue,
    gameValue: color === "red" ? "RED" : "YELLOW",
    image: getWireImage(color, sortValue),
    cut: false,
  }));
}

function createMarkers(
  color: "red" | "yellow",
  sortValues: readonly number[],
  possible = false,
): BoardMarker[] {
  return sortValues.map((sortValue) => ({
    value: Math.floor(sortValue),
    color,
    ...(possible ? { possible: true } : {}),
  }));
}

function compareMarkerOrder(a: BoardMarker, b: BoardMarker): number {
  if (a.value !== b.value) return a.value - b.value;
  if (a.color === b.color) return 0;
  return a.color === "yellow" ? -1 : 1;
}

function createRedTiles(
  spec: WirePoolSpec,
): { tiles: WireTile[]; markers: BoardMarker[] } {
  switch (spec.kind) {
    case "none":
      return { tiles: [], markers: [] };
    case "fixed":
      return {
        tiles: createColorTiles("red", spec.values),
        markers: createMarkers("red", spec.values),
      };
    case "exact": {
      const candidates = [...(spec.candidates ?? RED_WIRE_SORT_VALUES)];
      shuffle(candidates);
      const selected = candidates.slice(0, spec.count);
      return {
        tiles: createColorTiles("red", selected),
        markers: createMarkers("red", selected),
      };
    }
    case "out_of": {
      const candidates = [...(spec.candidates ?? RED_WIRE_SORT_VALUES)];
      shuffle(candidates);
      const drawn = candidates.slice(0, spec.draw);
      shuffle(drawn);
      const selected = drawn.slice(0, spec.keep);
      return {
        tiles: createColorTiles("red", selected),
        markers: createMarkers("red", drawn, true),
      };
    }
    case "exact_same_value": {
      const candidates = [...(spec.candidates ?? RED_WIRE_SORT_VALUES)];
      shuffle(candidates);
      const value = candidates[0];
      const repeated = Array.from({ length: spec.count }, () => value);
      return {
        tiles: createColorTiles("red", repeated),
        markers: createMarkers("red", [value]),
      };
    }
  }
}

function createYellowTiles(
  spec: WirePoolSpec,
): { tiles: WireTile[]; markers: BoardMarker[] } {
  switch (spec.kind) {
    case "none":
      return { tiles: [], markers: [] };
    case "fixed":
      return {
        tiles: createColorTiles("yellow", spec.values),
        markers: createMarkers("yellow", spec.values),
      };
    case "exact": {
      const candidates = [...(spec.candidates ?? YELLOW_WIRE_SORT_VALUES)];
      shuffle(candidates);
      const selected = candidates.slice(0, spec.count);
      return {
        tiles: createColorTiles("yellow", selected),
        markers: createMarkers("yellow", selected),
      };
    }
    case "out_of": {
      const candidates = [...(spec.candidates ?? YELLOW_WIRE_SORT_VALUES)];
      shuffle(candidates);
      const drawn = candidates.slice(0, spec.draw);
      shuffle(drawn);
      const selected = drawn.slice(0, spec.keep);
      return {
        tiles: createColorTiles("yellow", selected),
        markers: createMarkers("yellow", drawn, true),
      };
    }
    case "exact_same_value": {
      const candidates = [...(spec.candidates ?? YELLOW_WIRE_SORT_VALUES)];
      shuffle(candidates);
      const value = candidates[0];
      const repeated = Array.from({ length: spec.count }, () => value);
      return {
        tiles: createColorTiles("yellow", repeated),
        markers: createMarkers("yellow", [value]),
      };
    }
  }
}

export function shuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function resolveEquipmentPool(spec: MissionEquipmentSpec): (typeof EQUIPMENT_DEFS)[number][] {
  if (spec.mode === "none") return [];

  let candidateDefs: (typeof EQUIPMENT_DEFS)[number][];

  if (spec.mode === "fixed_pool") {
    // Respect mission-authored equipment ID order for deterministic forced pools.
    const defsById = new Map(EQUIPMENT_DEFS.map((def) => [def.id, def] as const));
    const seen = new Set<string>();
    candidateDefs = [];
    for (const id of spec.fixedEquipmentIds ?? []) {
      if (seen.has(id)) continue;
      const def = defsById.get(id);
      if (!def) continue;
      candidateDefs.push(def);
      seen.add(id);
    }
  } else {
    candidateDefs = EQUIPMENT_DEFS.filter((def) =>
      spec.includeCampaignEquipment ? true : def.pool === "base",
    );
  }

  if (spec.excludedUnlockValues?.length) {
    const excluded = new Set(spec.excludedUnlockValues);
    candidateDefs = candidateDefs.filter((def) => !excluded.has(def.unlockValue));
  }

  if (spec.excludedEquipmentIds?.length) {
    const excluded = new Set(spec.excludedEquipmentIds);
    candidateDefs = candidateDefs.filter((def) => !excluded.has(def.id));
  }

  return candidateDefs;
}

export function resolveEquipmentPoolIds(spec: MissionEquipmentSpec): string[] {
  return resolveEquipmentPool(spec).map((def) => def.id);
}

function createEquipmentCards(
  count: number,
  spec: MissionEquipmentSpec,
): EquipmentCard[] {
  if (spec.mode === "none") {
    return [];
  }

  const candidateDefs = resolveEquipmentPool(spec);

  if (spec.mode !== "fixed_pool") {
    shuffle(candidateDefs);
  }

  return candidateDefs.slice(0, count).map((def) => ({
    id: def.id,
    name: def.name,
    description: def.description,
    unlockValue: def.unlockValue,
    unlocked: false,
    used: false,
    image: def.image,
  }));
}

function distributeTiles(
  tiles: WireTile[],
  players: Player[],
): Record<string, string> {
  shuffle(tiles);
  const lastDealtTileIdByPlayer: Record<string, string> = {};

  for (let i = 0; i < tiles.length; i++) {
    const player = players[i % players.length];
    const tile = tiles[i];
    player.hand.push(tile);
    lastDealtTileIdByPlayer[player.id] = tile.id;
  }

  for (const player of players) {
    player.hand.sort((a, b) => a.sortValue - b.sortValue);
  }

  return lastDealtTileIdByPlayer;
}

export function setupGame(
  players: Player[],
  mission: MissionId,
): { board: BoardState; players: Player[] } {
  tileIdCounter = 0;
  const playerCount = players.length;
  const config = PLAYER_COUNT_CONFIG[playerCount];

  if (!config) throw new Error(`Invalid player count: ${playerCount}`);

  const { setup } = resolveMissionSetup(mission, playerCount);

  for (const player of players) {
    player.hand = [];
  }

  // Mission 27: no character cards are distributed this mission.
  if (mission === 27) {
    for (const player of players) {
      player.character = null;
      player.characterUsed = false;
    }
  }

  // Mission 17: Sergio/captain has no personal equipment.
  if (mission === 17) {
    const captain = players.find((player) => player.isCaptain);
    if (captain) {
      captain.character = null;
      captain.characterUsed = false;
    }
  }

  // Mission 28: Captain returns their character card to the box.
  if (mission === 28) {
    const captain = players.find((player) => player.isCaptain);
    if (captain) {
      captain.character = null;
      captain.characterUsed = false;
    }
  }

  const blueTiles = createBlueTiles(setup.blue.minValue, setup.blue.maxValue);

  const red = createRedTiles(setup.red);
  const yellow = createYellowTiles(setup.yellow);
  const allMarkers = [...red.markers, ...yellow.markers].sort(compareMarkerOrder);

  const allTiles = [...blueTiles, ...red.tiles, ...yellow.tiles];
  const lastDealtTileIdByPlayer = distributeTiles(allTiles, players);

  // Mission 20: the last dealt wire on each stand is moved unsorted to the far
  // right and marked with X.
  if (mission === 20) {
    for (const player of players) {
      const markerTileId = lastDealtTileIdByPlayer[player.id];
      if (!markerTileId) continue;
      const markerIndex = player.hand.findIndex((tile) => tile.id === markerTileId);
      if (markerIndex < 0) continue;
      const [markerTile] = player.hand.splice(markerIndex, 1);
      markerTile.isXMarked = true;
      player.hand.push(markerTile);
    }
  }

  const validationTrack: Record<number, number> = {};
  for (let i = 1; i <= 12; i++) {
    validationTrack[i] = 0;
  }

  const equipment = createEquipmentCards(config.equipmentCount, setup.equipment);

  const board: BoardState = {
    detonatorPosition: config.detonatorStart,
    detonatorMax: config.detonatorMax,
    validationTrack,
    markers: allMarkers,
    equipment,
  };

  return { board, players };
}
