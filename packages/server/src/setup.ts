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
  for (let pass = 0; pass < 2; pass++) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
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

function resolveSetupEquipmentPool(
  mission: MissionId,
  spec: MissionEquipmentSpec,
  yellow: WirePoolSpec,
): (typeof EQUIPMENT_DEFS)[number][] {
  if (spec.mode === "none") return [];

  const candidateDefs = resolveEquipmentPool(spec);
  const byId = new Map(candidateDefs.map((def) => [def.id, def] as const));

  // Rule Sticker A (missions 9+): shuffle False Bottom into the equipment pool
  // for missions with yellow wires.
  if (mission >= 9 && yellow.kind !== "none") {
    const falseBottom = EQUIPMENT_DEFS.find((def) => def.id === "false_bottom");
    if (falseBottom && !byId.has(falseBottom.id)) {
      byId.set(falseBottom.id, falseBottom);
    }
  }

  // Rule Sticker C (missions 55+): shuffle campaign equipment into the pool
  // unless the mission setup already includes campaign cards.
  if (mission >= 55 && !spec.includeCampaignEquipment) {
    for (const def of EQUIPMENT_DEFS) {
      if (def.pool !== "campaign" || byId.has(def.id)) continue;
      byId.set(def.id, def);
    }
  }

  return Array.from(byId.values());
}

function defToCard(def: (typeof EQUIPMENT_DEFS)[number]): EquipmentCard {
  return {
    id: def.id,
    name: def.name,
    description: def.description,
    unlockValue: def.unlockValue,
    unlocked: false,
    used: false,
    image: def.image,
  };
}

function createEquipmentCards(
  count: number,
  candidateDefs: (typeof EQUIPMENT_DEFS)[number][],
  shuffleBeforeDeal = true,
  mission: MissionId,
): { dealt: EquipmentCard[]; reserve: EquipmentCard[] } {
  const pool = [...candidateDefs];
  if (shuffleBeforeDeal) {
    shuffle(pool);
  }

  const redrawForbiddenIds =
    mission === 41
      ? new Set(["false_bottom"])
      : mission === 10
        ? new Set(["coffee_mug"])
      : mission === 46
        ? new Set(["emergency_batteries"])
      : mission === 57
        ? new Set(["disintegrator"])
        : mission === 58
          ? new Set(["post_it", "emergency_batteries"])
          : mission === 54 || mission === 59 || mission === 63 || mission === 65
            ? new Set(["x_or_y_ray"])
            : null;

  if (redrawForbiddenIds) {
    const dealt: typeof pool = [];
    let cursor = 0;
    while (dealt.length < count && cursor < pool.length) {
      const card = pool[cursor];
      cursor += 1;
      if (redrawForbiddenIds.has(card.id)) continue;
      dealt.push(card);
    }

    return {
      dealt: dealt.map(defToCard),
      reserve: pool.slice(cursor).map(defToCard),
    };
  }

  return {
    dealt: pool.slice(0, count).map(defToCard),
    reserve: pool.slice(count).map(defToCard),
  };
}

interface StandSeat {
  playerId: string;
  standIndex: number;
  tiles: WireTile[];
  lastDealtTileId?: string;
}

interface PredealtTileAssignment {
  playerId: string;
  standIndex: number;
  tile: WireTile;
}

function standCountForPlayer(
  player: Player,
  playerCount: number,
  captainId: string | undefined,
): number {
  if (playerCount === 2) return 2;
  if (playerCount === 3) return player.id === captainId ? 2 : 1;
  return 1;
}

function buildClockwiseCaptainPredeals(
  players: Player[],
  tiles: WireTile[],
): PredealtTileAssignment[] {
  if (players.length === 0 || tiles.length === 0) return [];

  const captainIndex = players.findIndex((player) => player.isCaptain);
  const startIndex = captainIndex >= 0 ? captainIndex : 0;
  const captain = players[startIndex];
  const captainId = captain?.id;
  const assignments: PredealtTileAssignment[] = [];
  let captainStandCursor = 0;

  for (let i = 0; i < tiles.length; i++) {
    const recipient = players[(startIndex + i) % players.length];
    const recipientStandCount = standCountForPlayer(recipient, players.length, captainId);
    let standIndex = 0;

    // Mission 13/48 rulebook exception: with 2 players, the captain places one
    // pre-dealt special wire on each stand.
    if (
      players.length === 2 &&
      recipient.id === captainId &&
      recipientStandCount > 1
    ) {
      standIndex = captainStandCursor % recipientStandCount;
      captainStandCursor += 1;
    }

    assignments.push({
      playerId: recipient.id,
      standIndex,
      tile: tiles[i],
    });
  }

  return assignments;
}

function buildMission41TripwirePredeals(
  players: Player[],
  tiles: WireTile[],
): PredealtTileAssignment[] {
  if (players.length === 0 || tiles.length === 0) return [];

  const captainIndex = players.findIndex((player) => player.isCaptain);
  const startIndex = captainIndex >= 0 ? captainIndex : 0;
  const skipCaptain = players.length === 5;
  const assignments: PredealtTileAssignment[] = [];

  for (let i = 0; i < players.length && assignments.length < tiles.length; i++) {
    const recipient = players[(startIndex + i) % players.length];
    if (skipCaptain && recipient.isCaptain) continue;

    assignments.push({
      playerId: recipient.id,
      standIndex: 0,
      tile: tiles[assignments.length],
    });
  }

  return assignments;
}

function distributeTilesAcrossStands(
  tiles: WireTile[],
  players: Player[],
  predealtTiles: readonly PredealtTileAssignment[] = [],
): StandSeat[] {
  shuffle(tiles);
  const captainId = players.find((player) => player.isCaptain)?.id ?? players[0]?.id;
  const standSeats: StandSeat[] = [];

  for (const player of players) {
    const standCount = standCountForPlayer(player, players.length, captainId);
    for (let standIndex = 0; standIndex < standCount; standIndex++) {
      standSeats.push({
        playerId: player.id,
        standIndex,
        tiles: [],
      });
    }
  }

  if (standSeats.length === 0) return standSeats;

  if (predealtTiles.length > 0) {
    const standSeatByKey = new Map<string, StandSeat>();
    for (const standSeat of standSeats) {
      standSeatByKey.set(`${standSeat.playerId}:${standSeat.standIndex}`, standSeat);
    }

    for (const assignment of predealtTiles) {
      const standSeat = standSeatByKey.get(
        `${assignment.playerId}:${assignment.standIndex}`,
      );
      if (!standSeat) continue;
      standSeat.tiles.push(assignment.tile);
      standSeat.lastDealtTileId = assignment.tile.id;
    }
  }

  for (let i = 0; i < tiles.length; i++) {
    const standSeat = standSeats[i % standSeats.length];
    const tile = tiles[i];
    standSeat.tiles.push(tile);
    standSeat.lastDealtTileId = tile.id;
  }

  for (const standSeat of standSeats) {
    standSeat.tiles.sort((a, b) => a.sortValue - b.sortValue);
  }

  return standSeats;
}

function flattenStandSeatsToPlayers(players: Player[], standSeats: StandSeat[]): void {
  const standSeatsByPlayerId = new Map<string, StandSeat[]>();
  for (const standSeat of standSeats) {
    const existing = standSeatsByPlayerId.get(standSeat.playerId);
    if (existing) existing.push(standSeat);
    else standSeatsByPlayerId.set(standSeat.playerId, [standSeat]);
  }

  for (const player of players) {
    const playerStandSeats =
      standSeatsByPlayerId.get(player.id)?.sort((a, b) => a.standIndex - b.standIndex) ?? [];
    player.hand = playerStandSeats.flatMap((standSeat) => standSeat.tiles);
    player.standSizes = playerStandSeats.length
      ? playerStandSeats.map((standSeat) => standSeat.tiles.length)
      : [0];
    for (const tile of player.hand) {
      tile.originalOwnerId = player.id;
    }
  }
}

export function setupGame(
  players: Player[],
  mission: MissionId,
): { board: BoardState; players: Player[]; equipmentReserve: EquipmentCard[] } {
  tileIdCounter = 0;
  const playerCount = players.length;
  const config = PLAYER_COUNT_CONFIG[playerCount];

  if (!config) throw new Error(`Invalid player count: ${playerCount}`);

  const { setup } = resolveMissionSetup(mission, playerCount);

  for (const player of players) {
    player.hand = [];
    player.standSizes = [];
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

  // Mission 58: everyone uses Double Detector personal equipment.
  if (mission === 58) {
    for (const player of players) {
      player.character = "double_detector";
      player.characterUsed = false;
    }
  }

  const blueTiles = createBlueTiles(setup.blue.minValue, setup.blue.maxValue);

  const red = createRedTiles(setup.red);
  const yellow = createYellowTiles(setup.yellow);
  const allMarkers = [...red.markers, ...yellow.markers].sort(compareMarkerOrder);

  // Mission 13: red wires are pre-dealt clockwise from captain before normal deal.
  // Mission 48: yellow wires are pre-dealt clockwise from captain before normal deal.
  const mission13RedPredeals = mission === 13
    ? buildClockwiseCaptainPredeals(players, red.tiles)
    : [];
  const mission48YellowPredeals = mission === 48
    ? buildClockwiseCaptainPredeals(players, yellow.tiles)
    : [];
  const mission41YellowPredeals = mission === 41
    ? buildMission41TripwirePredeals(players, yellow.tiles)
    : [];
  const predealtTiles = [
    ...mission13RedPredeals,
    ...mission48YellowPredeals,
    ...mission41YellowPredeals,
  ];
  const allTiles = mission === 54
    ? blueTiles
    : mission === 48
      ? [...blueTiles, ...red.tiles]
      : mission === 13
        ? [...blueTiles, ...yellow.tiles]
        : mission === 41
          ? [...blueTiles, ...red.tiles]
      : [...blueTiles, ...red.tiles, ...yellow.tiles];
  const standSeats = distributeTilesAcrossStands(allTiles, players, predealtTiles);

  // Mission 20: the last dealt wire on each stand is moved unsorted to that
  // stand's far right and marked with X.
  if (mission === 20) {
    for (const standSeat of standSeats) {
      const markerTileId = standSeat.lastDealtTileId;
      if (!markerTileId) continue;
      const markerIndex = standSeat.tiles.findIndex((tile) => tile.id === markerTileId);
      if (markerIndex < 0) continue;
      const [markerTile] = standSeat.tiles.splice(markerIndex, 1);
      markerTile.isXMarked = true;
      standSeat.tiles.push(markerTile);
    }
  }
  flattenStandSeatsToPlayers(players, standSeats);

  const validationTrack: Record<number, number> = {};
  for (let i = 1; i <= 12; i++) {
    validationTrack[i] = 0;
  }

  const equipmentPool = resolveSetupEquipmentPool(
    mission,
    setup.equipment,
    setup.yellow,
  );
  const { dealt: equipment, reserve: equipmentReserve } = createEquipmentCards(
    config.equipmentCount,
    equipmentPool,
    setup.equipment.mode !== "fixed_pool",
    mission,
  );

  const board: BoardState = {
    detonatorPosition: config.detonatorStart,
    detonatorMax: config.detonatorMax,
    validationTrack,
    markers: allMarkers,
    equipment,
  };

  return { board, players, equipmentReserve };
}
