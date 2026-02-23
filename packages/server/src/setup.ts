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

  let candidateDefs =
    spec.mode === "fixed_pool"
      ? [...EQUIPMENT_DEFS]
      : EQUIPMENT_DEFS.filter((def) =>
          spec.includeCampaignEquipment ? true : def.pool === "base",
        );

  if (spec.excludedUnlockValues?.length) {
    const excluded = new Set(spec.excludedUnlockValues);
    candidateDefs = candidateDefs.filter((def) => !excluded.has(def.unlockValue));
  }

  if (spec.excludedEquipmentIds?.length) {
    const excluded = new Set(spec.excludedEquipmentIds);
    candidateDefs = candidateDefs.filter((def) => !excluded.has(def.id));
  }

  if (spec.mode === "fixed_pool") {
    const fixedSet = new Set(spec.fixedEquipmentIds ?? []);
    candidateDefs = candidateDefs.filter((def) => fixedSet.has(def.id));
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

function distributeTiles(tiles: WireTile[], players: Player[]): void {
  shuffle(tiles);

  for (let i = 0; i < tiles.length; i++) {
    players[i % players.length].hand.push(tiles[i]);
  }

  for (const player of players) {
    player.hand.sort((a, b) => a.sortValue - b.sortValue);
  }
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
  distributeTiles(allTiles, players);

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
