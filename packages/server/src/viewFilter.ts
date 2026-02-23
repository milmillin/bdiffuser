import type {
  GameState,
  ClientGameState,
  ClientPlayer,
  VisibleTile,
  Player,
  WireTile,
  LobbyState,
  GameLogEntry,
} from "@bomb-busters/shared";
import { filterCampaignState } from "@bomb-busters/shared";

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
    board: state.board,
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
      ? { pendingForcedAction: state.pendingForcedAction }
      : {}),
    ...(state.timerDeadline != null
      ? { timerDeadline: state.timerDeadline }
      : {}),
  };
}

function filterLog(log: GameLogEntry[]): GameLogEntry[] {
  // Keep mission-11 hidden blue-as-red setup value server-side only.
  return log.filter(
    (entry) => !(entry.action === "hookSetup" && entry.detail.startsWith("blue_as_red:")),
  );
}

function filterPlayer(player: Player, viewerId: string): ClientPlayer {
  const isOwn = player.id === viewerId;
  return {
    id: player.id,
    name: player.name,
    character: player.character,
    isCaptain: player.isCaptain,
    hand: player.hand.map((tile) => filterTile(tile, isOwn)),
    infoTokens: player.infoTokens,
    characterUsed: player.characterUsed,
    connected: player.connected,
    isBot: player.isBot,
    remainingTiles: player.hand.filter((t) => !t.cut).length,
  };
}

function filterTile(tile: WireTile, isOwn: boolean): VisibleTile {
  // Show full info if tile belongs to viewer or has been cut
  if (isOwn || tile.cut) {
    return {
      id: tile.id,
      cut: tile.cut,
      color: tile.color,
      gameValue: tile.gameValue,
      sortValue: tile.sortValue,
      image: tile.image,
    };
  }

  // Hidden tile — only show ID and cut status
  return {
    id: tile.id,
    cut: false,
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
