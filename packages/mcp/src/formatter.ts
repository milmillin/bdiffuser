import type {
  ClientGameState,
  ClientPlayer,
  LobbyState,
  VisibleTile,
  InfoToken,
  EquipmentCard,
  BoardMarker,
  ForcedAction,
  GameLogEntry,
} from "@bomb-busters/shared";

export function formatLobbyState(state: LobbyState): string {
  const lines: string[] = [];
  lines.push(`=== LOBBY (Room: ${state.roomId}) ===`);
  lines.push(`Mission: ${state.mission}`);
  lines.push(`Captain Mode: ${state.captainMode}`);
  if (state.selectedCaptainId) {
    const captain = state.players.find((p) => p.id === state.selectedCaptainId);
    lines.push(`Selected Captain: ${captain?.name ?? state.selectedCaptainId}`);
  }
  lines.push("");
  lines.push("Players:");
  for (const p of state.players) {
    const tags: string[] = [];
    if (p.isHost) tags.push("HOST");
    if (p.isBot) tags.push("BOT");
    if (!p.connected) tags.push("DISCONNECTED");
    if (p.character) tags.push(`character: ${p.character}`);
    const tagStr = tags.length ? ` [${tags.join(", ")}]` : "";
    lines.push(`  - ${p.name} (${p.id})${tagStr}`);
  }
  return lines.join("\n");
}

export function formatGameState(state: ClientGameState): string {
  const lines: string[] = [];
  const me = state.players.find((p) => p.id === state.playerId);

  lines.push(`=== GAME STATE (Room: ${state.roomId}, Mission: ${state.mission}) ===`);
  lines.push(`Phase: ${state.phase} | Turn: ${state.turnNumber}`);
  if (state.result) lines.push(`Result: ${state.result}`);
  if (state.isSpectator) lines.push("(You are a spectator)");

  const currentPlayer = state.players[state.currentPlayerIndex];
  if (currentPlayer) {
    const isMyTurn = currentPlayer.id === state.playerId;
    lines.push(`Current Player: ${currentPlayer.name}${isMyTurn ? " (YOUR TURN)" : ""}`);
  }

  // Forced action
  if (state.pendingForcedAction) {
    lines.push("");
    lines.push(formatForcedAction(state.pendingForcedAction, state));
  }

  // Board
  lines.push("");
  lines.push("── Board ──");
  lines.push(`Detonator: ${state.board.detonatorPosition}/${state.board.detonatorMax}`);

  const validationEntries = Object.entries(state.board.validationTrack)
    .filter(([, count]) => count > 0)
    .sort(([a], [b]) => Number(a) - Number(b));
  if (validationEntries.length) {
    lines.push(
      `Validation Track: ${validationEntries.map(([v, c]) => `${v}:${c}/4`).join(" ")}`,
    );
  }

  if (state.board.markers.length) {
    lines.push(`Markers: ${formatMarkers(state.board.markers)}`);
  }

  // Equipment
  const equipment = state.board.equipment.filter((e) => !e.faceDown);
  if (equipment.length) {
    lines.push("");
    lines.push("── Equipment ──");
    for (const eq of equipment) {
      lines.push(formatEquipment(eq));
    }
  }

  // Players
  lines.push("");
  lines.push("── Players ──");
  for (const player of state.players) {
    lines.push(formatPlayer(player, player.id === state.playerId));
  }

  // Campaign state
  if (state.campaign) {
    lines.push("");
    lines.push("── Campaign ──");
    lines.push(formatCampaign(state.campaign));
  }

  // Recent log
  const recentLog = state.log.slice(-10);
  if (recentLog.length) {
    lines.push("");
    lines.push("── Recent Log ──");
    for (const entry of recentLog) {
      lines.push(formatLogEntry(entry, state));
    }
  }

  return lines.join("\n");
}

function formatPlayer(player: ClientPlayer, isMe: boolean): string {
  const lines: string[] = [];
  const tags: string[] = [];
  if (isMe) tags.push("YOU");
  if (player.isCaptain) tags.push("CAPTAIN");
  if (player.isBot) tags.push("BOT");
  if (!player.connected) tags.push("DISCONNECTED");
  if (player.character) tags.push(player.character);
  if (player.characterUsed) tags.push("ability used");
  const tagStr = tags.length ? ` [${tags.join(", ")}]` : "";
  lines.push(`  ${player.name} (${player.id})${tagStr} — ${player.remainingTiles} tiles remaining`);

  // Show tiles with stand grouping
  if (player.hand.length) {
    const stands = splitIntoStands(player.hand, player.standSizes);
    for (let i = 0; i < stands.length; i++) {
      const standLabel = stands.length > 1 ? ` (stand ${i + 1})` : "";
      const tileStrs = stands[i].map((t) => formatTile(t, isMe));
      lines.push(`    Tiles${standLabel}: ${tileStrs.join(" | ")}`);
    }
  }

  // Info tokens
  if (player.infoTokens.length) {
    const tokenStrs = player.infoTokens.map(formatInfoToken);
    lines.push(`    Info tokens: ${tokenStrs.join(", ")}`);
  }

  return lines.join("\n");
}

function splitIntoStands(hand: VisibleTile[], standSizes: number[]): VisibleTile[][] {
  const stands: VisibleTile[][] = [];
  let offset = 0;
  for (const size of standSizes) {
    stands.push(hand.slice(offset, offset + size));
    offset += size;
  }
  if (offset < hand.length) {
    stands.push(hand.slice(offset));
  }
  return stands;
}

function formatTile(tile: VisibleTile, isOwner: boolean): string {
  if (tile.cut) {
    // Cut tiles are always visible
    const val = tile.gameValue === "RED" ? "RED" : tile.gameValue === "YELLOW" ? "YEL" : String(tile.gameValue);
    const color = tile.color ?? "?";
    return `[${val} ${color} CUT]`;
  }
  if (isOwner && tile.color) {
    // Your own uncut tiles are visible to you
    const val = tile.gameValue === "RED" ? "RED" : tile.gameValue === "YELLOW" ? "YEL" : String(tile.gameValue);
    return `{${val} ${tile.color}}`;
  }
  // Hidden tile (other player's uncut tile)
  const xMark = tile.isXMarked ? " X" : "";
  return `[?${xMark}]`;
}

function formatInfoToken(token: InfoToken): string {
  const parts: string[] = [];
  if (token.isYellow) {
    parts.push(`YEL@pos${token.position}`);
  } else {
    parts.push(`${token.value}@pos${token.position}`);
  }
  if (token.parity) parts.push(token.parity);
  if (token.countHint) parts.push(`count:${token.countHint}`);
  if (token.relation) {
    parts.push(`${token.relation}@pos${token.positionB}`);
  }
  if (token.singleWire) parts.push("single");
  return parts.join(" ");
}

function formatEquipment(eq: EquipmentCard): string {
  const status = eq.used ? "USED" : eq.unlocked ? "UNLOCKED" : `locked (need ${eq.unlockValue})`;
  return `  ${eq.name} (${eq.id}) — ${status}: ${eq.description}`;
}

function formatMarkers(markers: BoardMarker[]): string {
  return markers
    .map((m) => {
      const prefix = m.possible ? "?" : m.confirmed ? "!" : "";
      return `${prefix}${m.value}${m.color === "red" ? "R" : "Y"}`;
    })
    .join(" ");
}

function formatForcedAction(fa: ForcedAction, state: ClientGameState): string {
  const nameOf = (id: string) => state.players.find((p) => p.id === id)?.name ?? id;

  switch (fa.kind) {
    case "chooseNextPlayer":
      return `FORCED ACTION: ${nameOf(fa.captainId)} must choose next player`;
    case "designateCutter":
      return `FORCED ACTION: ${nameOf(fa.designatorId)} must designate a cutter for value ${fa.value}`;
    case "mission51DesignateCutter":
      return `FORCED ACTION: ${nameOf(fa.sirId)} must choose who cuts visible Number ${fa.value}`;
    case "mission51PenaltyTokenChoice":
      return `FORCED ACTION: ${nameOf(fa.targetPlayerId)} must choose a Mission 51 penalty token for value ${fa.value}`;
    case "detectorTileChoice":
      return `FORCED ACTION: ${nameOf(fa.targetPlayerId)} must choose tile from indices [${fa.matchingTileIndices.join(",")}] for ${fa.source} guess ${fa.guessValue}`;
    case "talkiesWalkiesTileChoice":
      return `FORCED ACTION: ${nameOf(fa.targetPlayerId)} must choose a tile to swap (talkies-walkies)`;
    case "mission45VolunteerWindow":
      return `FORCED ACTION: Mission 45 volunteer window is open for captain ${nameOf(fa.captainId)}`;
    case "mission45CaptainChoice":
      return `FORCED ACTION: ${nameOf(fa.captainId)} must choose who cuts on Mission 45`;
    case "mission45PenaltyTokenChoice":
      return `FORCED ACTION: ${nameOf(fa.playerId)} must choose a stand-side info token (Mission 45)`;
    case "mission22TokenPass":
      return `FORCED ACTION: ${nameOf(fa.currentChooserId)} must choose a token to pass (mission 22)`;
    case "mission27TokenDraft":
      return `FORCED ACTION: ${nameOf(fa.currentChooserId)} must draft a token (mission 27)`;
    case "mission29HiddenNumberCard":
      return `FORCED ACTION: ${nameOf(fa.chooserId)} must choose a hidden number card for ${nameOf(fa.actorId)}`;
    case "mission65CardHandoff":
      return `FORCED ACTION: ${nameOf(fa.actorId)} must give one Number card to a teammate`;
    case "mission46SevensCut":
      return `FORCED ACTION: ${nameOf(fa.playerId)} must trigger simultaneous sevens cut`;
    case "mission32ConstraintDecision":
      return `FORCED ACTION: ${nameOf(fa.captainId)} must choose whether to keep or replace the visible constraint for ${nameOf(fa.actorId)}`;
    case "mission61ConstraintRotate":
      return `FORCED ACTION: ${nameOf(fa.captainId)} must choose constraint rotation direction`;
    case "mission66BunkerChoice":
      return `FORCED ACTION: ${nameOf(fa.actorId)} must resolve a bunker choice for cut value ${fa.cutValue}`;
    case "mission36SequencePosition":
      return `FORCED ACTION: ${nameOf(fa.captainId)} must choose sequence card side (${fa.reason})`;
  }
}

function formatCampaign(campaign: any): string {
  const lines: string[] = [];

  if (campaign.nanoTracker) {
    lines.push(`  Nano: ${campaign.nanoTracker.position}/${campaign.nanoTracker.max}`);
  }
  if (campaign.bunkerTracker) {
    lines.push(`  Bunker: ${campaign.bunkerTracker.position}/${campaign.bunkerTracker.max}`);
  }
  if (campaign.oxygen) {
    lines.push(`  Oxygen Pool: ${campaign.oxygen.pool}`);
    const playerOx = Object.entries(campaign.oxygen.playerOxygen as Record<string, number>)
      .map(([id, o]) => `${id}:${o}`)
      .join(" ");
    if (playerOx) lines.push(`  Player Oxygen: ${playerOx}`);
  }
  if (campaign.numberCards?.visible?.length) {
    const vals = campaign.numberCards.visible.map((c: any) => c.value).join(", ");
    lines.push(`  Visible Number Cards: ${vals}`);
  }
  if (campaign.constraints?.global?.length) {
    for (const c of campaign.constraints.global) {
      lines.push(`  Constraint: ${c.name} — ${c.description}${c.active ? "" : " (inactive)"}`);
    }
  }
  if (campaign.challenges?.active?.length) {
    for (const c of campaign.challenges.active) {
      lines.push(`  Challenge: ${c.name} — ${c.description}${c.completed ? " (DONE)" : ""}`);
    }
  }
  if (campaign.specialMarkers?.length) {
    lines.push(
      `  Special Markers: ${campaign.specialMarkers.map((m: any) => `${m.kind}:${m.value}`).join(" ")}`,
    );
  }

  return lines.length ? lines.join("\n") : "  (no campaign state)";
}

function formatLogEntry(entry: GameLogEntry, state: ClientGameState): string {
  const playerName = state.players.find((p) => p.id === entry.playerId)?.name ?? entry.playerId;
  const detail = entry.detail.type === "text" ? entry.detail.text : `[${entry.detail.template}]`;
  return `  T${entry.turn} ${playerName}: ${entry.action} — ${detail}`;
}
