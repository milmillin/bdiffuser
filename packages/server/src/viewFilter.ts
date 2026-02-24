import type {
  GameState,
  ClientGameState,
  ClientPlayer,
  VisibleTile,
  Player,
  WireTile,
  BoardState,
  EquipmentCard,
  LobbyState,
  GameLogEntry,
} from "@bomb-busters/shared";
import { filterCampaignState, isLogTextDetail, logText } from "@bomb-busters/shared";

/**
 * Filter game state for a specific player.
 * Players can see their own tile values but only backs of others' tiles (unless cut).
 */
export function filterStateForPlayer(
  state: GameState,
  playerId: string,
): ClientGameState {
  return {
    phase: state.phase,
    roomId: state.roomId,
    playerId,
    players: state.players.map((p) => filterPlayer(p, playerId)),
    board: filterBoard(state.board),
    currentPlayerIndex: state.currentPlayerIndex,
    turnNumber: state.turnNumber,
    mission: state.mission,
    result: state.result,
    log: filterLog(state.log),
    chat: state.chat,
    ...(state.campaign
      ? { campaign: filterCampaignState(state.campaign, playerId) }
      : {}),
    ...(state.pendingForcedAction
      ? {
          pendingForcedAction:
            state.pendingForcedAction.kind === "detectorTileChoice" &&
            state.pendingForcedAction.targetPlayerId !== playerId
              ? { ...state.pendingForcedAction, matchingTileIndices: [] }
              : state.pendingForcedAction,
        }
      : {}),
    ...(state.missionAudio
      ? { missionAudio: state.missionAudio }
      : {}),
    ...(state.timerDeadline != null
      ? { timerDeadline: state.timerDeadline }
      : {}),
  };
}

function filterBoard(board: BoardState): BoardState {
  return {
    ...board,
    equipment: board.equipment.map((equipment, idx) =>
      filterEquipmentCardForClient(equipment, idx),
    ),
  };
}

function filterEquipmentCardForClient(
  equipment: EquipmentCard,
  index: number,
): EquipmentCard {
  // Mission 15-style hidden cards: hide ID/ability details until revealed.
  if (equipment.faceDown && !equipment.unlocked) {
    return {
      ...equipment,
      id: `hidden_equipment_${index + 1}`,
      name: "Face-down Equipment",
      description: "Revealed by mission progression.",
      unlockValue: 0,
      image: "equipment_back.png",
    };
  }

  return equipment;
}

function filterLog(log: GameLogEntry[]): GameLogEntry[] {
  // Keep hidden card values server-side only.
  return log
    .filter(
      (entry) =>
        !(
          entry.action === "hookSetup"
          && isLogTextDetail(entry.detail)
          && entry.detail.text.startsWith("blue_as_red:")
        ),
    )
    .map((entry) => {
      if (!isLogTextDetail(entry.detail)) return entry;

      const text = redactHiddenCardNumbers(entry.action, entry.detail.text);
      if (text === entry.detail.text) return entry;

      return { ...entry, detail: logText(text) };
    });
}

function redactHiddenCardNumbers(action: string, detail: string): string {
  if (
    action === "hookSetup"
    && detail.startsWith("equipment_double_lock:number_cards:")
    && isNumericList(detail.slice("equipment_double_lock:number_cards:".length))
  ) {
    return "equipment_double_lock:number_cards:[redacted]";
  }

  if (
    action === "hookSetup"
    && detail.startsWith("m15:number_deck:init:")
    && isNumericList(detail.slice("m15:number_deck:init:".length))
  ) {
    return "m15:number_deck:init:[redacted]";
  }

  if (action === "hookEffect" && detail.startsWith("m15:number_complete:")) {
    const parts = detail.split("|");
    return parts.map((part) => redactMission15Part(part)).join("|");
  }

  return detail;
}

function redactMission15Part(part: string): string {
  if (part.startsWith("m15:number_complete:")) {
    const value = part.slice("m15:number_complete:".length);
    return isNumericList(value) ? "m15:number_complete:[redacted]" : part;
  }
  if (part.startsWith("next:")) {
    const value = part.slice("next:".length);
    return isNumericList(value) ? "next:[redacted]" : part;
  }
  if (part.startsWith("skipped:")) {
    const value = part.slice("skipped:".length);
    return isNumericList(value) ? "skipped:[redacted]" : part;
  }
  return part;
}

function isNumericList(value: string): boolean {
  return /^-?\d+(,-?\d+)*$/.test(value);
}

/**
 * Filter game state for a spectator (not a player).
 * Spectators see all tiles fully visible but cannot act.
 */
export function filterStateForSpectator(state: GameState): ClientGameState {
  return {
    phase: state.phase,
    roomId: state.roomId,
    playerId: "__spectator__",
    isSpectator: true,
    players: state.players.map(filterPlayerFullyVisible),
    board: filterBoard(state.board),
    currentPlayerIndex: state.currentPlayerIndex,
    turnNumber: state.turnNumber,
    mission: state.mission,
    result: state.result,
    log: filterLog(state.log),
    chat: state.chat,
    ...(state.campaign
      ? { campaign: filterCampaignState(state.campaign, "__spectator__") }
      : {}),
    ...(state.pendingForcedAction
      ? {
          pendingForcedAction:
            state.pendingForcedAction.kind === "detectorTileChoice"
              ? { ...state.pendingForcedAction, matchingTileIndices: [] }
              : state.pendingForcedAction,
        }
      : {}),
    ...(state.missionAudio
      ? { missionAudio: state.missionAudio }
      : {}),
    ...(state.timerDeadline != null
      ? { timerDeadline: state.timerDeadline }
      : {}),
  };
}

function filterPlayerFullyVisible(player: Player): ClientPlayer {
  const standSizes = getNormalizedStandSizes(player);
  return {
    id: player.id,
    name: player.name,
    character: player.character,
    isCaptain: player.isCaptain,
    standSizes,
    hand: player.hand.map((tile) => ({
      id: tile.id,
      cut: tile.cut,
      ...(tile.isXMarked ? { isXMarked: true } : {}),
      color: tile.color,
      gameValue: tile.gameValue,
      sortValue: tile.sortValue,
      image: tile.image,
    })),
    infoTokens: player.infoTokens,
    characterUsed: player.characterUsed,
    connected: player.connected,
    isBot: player.isBot,
    remainingTiles: player.hand.filter((t) => !t.cut).length,
  };
}

function filterPlayer(player: Player, viewerId: string): ClientPlayer {
  const isOwn = player.id === viewerId;
  const standSizes = getNormalizedStandSizes(player);
  return {
    id: player.id,
    name: player.name,
    character: player.character,
    isCaptain: player.isCaptain,
    standSizes,
    hand: player.hand.map((tile) => filterTile(tile, isOwn)),
    infoTokens: player.infoTokens,
    characterUsed: player.characterUsed,
    connected: player.connected,
    isBot: player.isBot,
    remainingTiles: player.hand.filter((t) => !t.cut).length,
  };
}

function getNormalizedStandSizes(player: Player): number[] {
  const maybeStandSizes = (player as Player & { standSizes?: number[] }).standSizes;
  if (Array.isArray(maybeStandSizes) && maybeStandSizes.length > 0) {
    return [...maybeStandSizes];
  }
  return [player.hand.length];
}

function filterTile(tile: WireTile, isOwn: boolean): VisibleTile {
  const upsideDown = (tile as WireTile & { upsideDown?: boolean }).upsideDown === true;

  // Cut wires are public.
  if (tile.cut) {
    return {
      id: tile.id,
      cut: tile.cut,
      ...(tile.isXMarked ? { isXMarked: true } : {}),
      color: tile.color,
      gameValue: tile.gameValue,
      sortValue: tile.sortValue,
      image: tile.image,
    };
  }

  // Missions 38/56/64: upside-down wires are hidden from the owner and
  // visible to teammates.
  if (upsideDown) {
    if (isOwn) {
      return {
        id: tile.id,
        cut: false,
        ...(tile.isXMarked ? { isXMarked: true } : {}),
      };
    }

    return {
      id: tile.id,
      cut: false,
      ...(tile.isXMarked ? { isXMarked: true } : {}),
      color: tile.color,
      gameValue: tile.gameValue,
      sortValue: tile.sortValue,
      image: tile.image,
    };
  }

  // Standard visibility: own tiles are visible; opponents are hidden.
  if (isOwn) {
    return {
      id: tile.id,
      cut: tile.cut,
      ...(tile.isXMarked ? { isXMarked: true } : {}),
      color: tile.color,
      gameValue: tile.gameValue,
      sortValue: tile.sortValue,
      image: tile.image,
    };
  }

  return {
    id: tile.id,
    cut: false,
    ...(tile.isXMarked ? { isXMarked: true } : {}),
  };
}

export function createLobbyState(
  roomId: string,
  players: Player[],
  mission: number,
  hostId: string,
): LobbyState {
  return {
    roomId,
    players: players.map((p) => ({
      id: p.id,
      name: p.name,
      character: p.character,
      isHost: p.id === hostId,
      connected: p.connected,
      isBot: p.isBot,
    })),
    mission: mission as any,
    hostId,
  };
}
