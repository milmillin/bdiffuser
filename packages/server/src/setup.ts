import {
  BLUE_WIRE_VALUES,
  BLUE_COPIES_PER_VALUE,
  RED_WIRE_SORT_VALUES,
  YELLOW_WIRE_SORT_VALUES,
  PLAYER_COUNT_CONFIG,
  EQUIPMENT_DEFS,
  MISSIONS,
  getWireImage,
} from "@bomb-busters/shared";
import type {
  WireTile,
  WireColor,
  WireValue,
  Player,
  BoardState,
  GameState,
  EquipmentCard,
  BoardMarker,
  MissionId,
} from "@bomb-busters/shared";

let tileIdCounter = 0;

function createTileId(): string {
  return `tile_${++tileIdCounter}`;
}

function createBlueTiles(): WireTile[] {
  const tiles: WireTile[] = [];
  for (const value of BLUE_WIRE_VALUES) {
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

function createRedTiles(count: number): { tiles: WireTile[]; markers: BoardMarker[] } {
  // Draw 'count' random red tiles from the full set of 11
  const allRedValues = [...RED_WIRE_SORT_VALUES];
  shuffle(allRedValues);
  const selectedValues = allRedValues.slice(0, count);
  const markers: BoardMarker[] = selectedValues.map((sv) => ({
    value: Math.floor(sv), // 1.5 → 1, 2.5 → 2, etc. Actually, markers go on matching board slots
    color: "red" as const,
  }));

  const tiles: WireTile[] = selectedValues.map((sv) => ({
    id: createTileId(),
    color: "red" as const,
    sortValue: sv,
    gameValue: "RED" as const,
    image: getWireImage("red", sv),
    cut: false,
  }));

  return { tiles, markers };
}

function createYellowTiles(count: number): { tiles: WireTile[]; markers: BoardMarker[] } {
  const allYellowValues = [...YELLOW_WIRE_SORT_VALUES];
  shuffle(allYellowValues);
  const selectedValues = allYellowValues.slice(0, count);
  const markers: BoardMarker[] = selectedValues.map((sv) => ({
    value: Math.floor(sv),
    color: "yellow" as const,
  }));

  const tiles: WireTile[] = selectedValues.map((sv) => ({
    id: createTileId(),
    color: "yellow" as const,
    sortValue: sv,
    gameValue: "YELLOW" as const,
    image: getWireImage("yellow", sv),
    cut: false,
  }));

  return { tiles, markers };
}

function createYellowTilesOutOf(
  keep: number,
  draw: number,
): { tiles: WireTile[]; markers: BoardMarker[] } {
  const allYellowValues = [...YELLOW_WIRE_SORT_VALUES];
  shuffle(allYellowValues);
  const drawnValues = allYellowValues.slice(0, draw);

  // All drawn values get markers (players know these MIGHT be in play)
  const markers: BoardMarker[] = drawnValues.map((sv) => ({
    value: Math.floor(sv),
    color: "yellow" as const,
  }));

  // Only keep some, discard the rest without revealing
  shuffle(drawnValues);
  const keptValues = drawnValues.slice(0, keep);

  const tiles: WireTile[] = keptValues.map((sv) => ({
    id: createTileId(),
    color: "yellow" as const,
    sortValue: sv,
    gameValue: "YELLOW" as const,
    image: getWireImage("yellow", sv),
    cut: false,
  }));

  return { tiles, markers };
}

export function shuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function createEquipmentCards(count: number): EquipmentCard[] {
  // Take the first N equipment cards (sorted by unlock value)
  const sorted = [...EQUIPMENT_DEFS].sort((a, b) => a.unlockValue - b.unlockValue);
  return sorted.slice(0, count).map((def) => ({
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

  // Deal tiles round-robin directly into each player's hand
  for (let i = 0; i < tiles.length; i++) {
    players[i % players.length].hand.push(tiles[i]);
  }

  // Sort each player's hand by sortValue ascending
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
  const missionDef = MISSIONS[mission];

  if (!config) throw new Error(`Invalid player count: ${playerCount}`);

  // Initialize empty hand per player
  for (const player of players) {
    player.hand = [];
  }

  // Create tiles
  const blueTiles = createBlueTiles();
  let allMarkers: BoardMarker[] = [];

  // Red tiles
  let redTiles: WireTile[] = [];
  if (missionDef.redWires > 0) {
    const red = createRedTiles(missionDef.redWires);
    redTiles = red.tiles;
    allMarkers = allMarkers.concat(red.markers);
  }

  // Yellow tiles
  let yellowTiles: WireTile[] = [];
  if (missionDef.yellowWires > 0) {
    if (missionDef.yellowOutOf) {
      const yellow = createYellowTilesOutOf(
        missionDef.yellowOutOf.keep,
        missionDef.yellowOutOf.draw,
      );
      yellowTiles = yellow.tiles;
      allMarkers = allMarkers.concat(yellow.markers);
    } else {
      const yellow = createYellowTiles(missionDef.yellowWires);
      yellowTiles = yellow.tiles;
      allMarkers = allMarkers.concat(yellow.markers);
    }
  }

  // Combine all tiles and distribute
  const allTiles = [...blueTiles, ...redTiles, ...yellowTiles];
  distributeTiles(allTiles, players);

  // Create board
  const validationTrack: Record<number, number> = {};
  for (let i = 1; i <= 12; i++) {
    validationTrack[i] = 0;
  }

  const equipment = createEquipmentCards(config.equipmentCount);

  const board: BoardState = {
    detonatorPosition: config.detonatorStart,
    detonatorMax: config.detonatorMax,
    validationTrack,
    markers: allMarkers,
    equipment,
  };

  return { board, players };
}
