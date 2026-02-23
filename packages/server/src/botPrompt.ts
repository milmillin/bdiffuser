import type { ClientGameState } from "@bomb-busters/shared";

export function buildSystemPrompt(): string {
  return `You are an AI player in Bomb Busters, a cooperative wire-cutting board game. You must work WITH your teammates to defuse a bomb by cutting wires.

## Game Rules
- Each player has a hand of wire tiles (blue, red, yellow) they can see face-up.
- You CANNOT see other players' uncut tiles (they are HIDDEN). You CAN see cut tiles.
- Blue wires have numeric values 1-12, with 4 copies of each value in the game.
- Red wires are bombs — cutting one loses the game instantly!
- Yellow wires are wild — they sort between blue values but show as "YELLOW".

## Actions (pick exactly one per turn)
1. **dualCut** — Pick an opponent's hidden tile and guess its value. You must hold an uncut tile of that value yourself.
   - If correct: both your tile and theirs are cut (progress!).
   - If wrong on a blue/yellow tile: detonator advances (bad!), and an info token showing the actual value is placed on that tile.
   - If wrong on a red tile: GAME OVER (explosion!).
2. **soloCut** — Cut ALL your own tiles of a specific value. Only valid if you hold ALL remaining uncut copies of that value in the game (e.g., you hold all 4 blue-3s, or 2 remaining blue-3s if 2 were already cut).
3. **revealReds** — If ALL your remaining uncut tiles are red, reveal them all (removes them safely). Only valid when every uncut tile in your hand is red.

## Info Tokens
- Info tokens are placed in front of tiles to indicate their value.
- A numbered info token (e.g., "5") on a tile position means that tile has value 5.
- A yellow info token means that tile is a yellow wire.
- Use info tokens to make informed guesses during dualCut!

## Board Markers
- Red markers on the board indicate which positions MIGHT have red wires.
- Yellow markers indicate which positions MIGHT have yellow wires.
- "Position" here refers to sort position between blue values.

## Strategy Tips
- Use info tokens on opponents' tiles to make safe dualCut guesses.
- Avoid guessing tiles near red marker positions — they might be red!
- Prefer tiles with info tokens (known values) for dualCut.
- If you can do a soloCut, that's the safest action (no risk).
- revealReds is free and safe — always do it when eligible.
- The detonator has limited space — minimize wrong guesses.

## Response Format
You MUST respond with a JSON object. Choose one of these formats:

For dualCut:
{"reasoning": "brief explanation", "action": "dualCut", "targetPlayerId": "player-id", "targetTileIndex": 0, "guessValue": 5}

For soloCut:
{"reasoning": "brief explanation", "action": "soloCut", "value": 5}

For revealReds:
{"reasoning": "brief explanation", "action": "revealReds"}

guessValue can be a number (1-12) or "YELLOW" for yellow wires.
soloCut value can be a number (1-12) or "YELLOW".`;
}

export function buildUserMessage(state: ClientGameState): string {
  const me = state.players.find((p) => p.id === state.playerId);
  if (!me) return "ERROR: Cannot find my player state.";

  const lines: string[] = [];

  lines.push(`=== YOUR TURN (Turn ${state.turnNumber}) ===`);
  lines.push(`You are: ${me.name} (id: ${me.id})`);
  lines.push("");

  // My hand
  lines.push("## Your Hand (you can see these):");
  for (let i = 0; i < me.hand.length; i++) {
    const tile = me.hand[i];
    const infoToken = me.infoTokens.find((t) => t.position === i);
    const infoStr = infoToken
      ? ` [Info Token: ${infoToken.isYellow ? "YELLOW" : infoToken.value}]`
      : "";
    if (tile.cut) {
      lines.push(`  [${i}] CUT - was ${tile.color} ${tile.gameValue}`);
    } else {
      lines.push(`  [${i}] ${tile.color} ${tile.gameValue}${infoStr}`);
    }
  }
  lines.push("");

  // Opponents
  for (const opp of state.players) {
    if (opp.id === state.playerId) continue;
    lines.push(`## ${opp.name}'s Hand (id: ${opp.id})${opp.isBot ? " [BOT]" : ""}:`);
    for (let i = 0; i < opp.hand.length; i++) {
      const tile = opp.hand[i];
      const infoToken = opp.infoTokens.find((t) => t.position === i);
      const infoStr = infoToken
        ? ` [Info Token: ${infoToken.isYellow ? "YELLOW" : infoToken.value}]`
        : "";
      if (tile.cut) {
        lines.push(`  [${i}] CUT - was ${tile.color} ${tile.gameValue}`);
      } else if (tile.color) {
        // Shouldn't happen for hidden tiles but handle it
        lines.push(`  [${i}] ${tile.color} ${tile.gameValue}${infoStr}`);
      } else {
        lines.push(`  [${i}] HIDDEN${infoStr}`);
      }
    }
    lines.push(`  (${opp.remainingTiles} uncut tiles remaining)`);
    lines.push("");
  }

  // Board state
  lines.push("## Board State:");
  lines.push(
    `  Detonator: ${state.board.detonatorPosition} / ${state.board.detonatorMax} (game over at max!)`,
  );

  const validated = Object.entries(state.board.validationTrack)
    .filter(([, count]) => count > 0)
    .map(([val, count]) => `${val}:${count}/4`)
    .join(", ");
  if (validated) {
    lines.push(`  Validation Track: ${validated}`);
  }

  if (state.board.markers.length > 0) {
    const redMarkers = state.board.markers
      .filter((m) => m.color === "red")
      .map((m) => m.value);
    const yellowMarkers = state.board.markers
      .filter((m) => m.color === "yellow")
      .map((m) => m.value);
    if (redMarkers.length > 0) {
      lines.push(`  Red markers (danger zones): positions ${redMarkers.join(", ")}`);
    }
    if (yellowMarkers.length > 0) {
      lines.push(`  Yellow markers: positions ${yellowMarkers.join(", ")}`);
    }
  }
  lines.push("");

  // Recent log
  const recentLog = state.log.slice(-10);
  if (recentLog.length > 0) {
    lines.push("## Recent Actions:");
    for (const entry of recentLog) {
      const playerName =
        state.players.find((p) => p.id === entry.playerId)?.name ??
        entry.playerId;
      lines.push(`  Turn ${entry.turn}: ${playerName} - ${entry.detail}`);
    }
  }

  return lines.join("\n");
}
