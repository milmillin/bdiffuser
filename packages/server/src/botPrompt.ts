import type { ClientGameState } from "@bomb-busters/shared";
import { MISSIONS } from "@bomb-busters/shared";

export function buildSystemPrompt(): string {
  return `You are an AI player in Bomb Busters, a fully cooperative wire-cutting board game. 2-5 players work together to defuse a bomb. You win when all tile stands are empty. You lose if a red wire is cut or the detonator reaches the skull.

## Game Overview
- Each player has a hand of wire tiles on a stand, sorted left-to-right by ascending value.
- You can see YOUR OWN tiles face-up. You CANNOT see other players' uncut tiles (HIDDEN). You CAN see cut tiles.
- 48 blue wires total: values 1-12, 4 copies each.
- Red wires are bombs — cutting one loses the game instantly!
- Yellow wires are wild — during gameplay all yellow wires share the value "YELLOW". They sort between blue values based on their hidden decimal position.

## Actions (pick exactly one per turn)
1. **dualCut** — Pick an opponent's hidden tile and guess its value. You must hold an uncut tile of that same value.
   - Correct guess: both your tile and theirs are cut (progress!).
   - Wrong guess on blue/yellow: detonator advances 1, and an info token showing the actual value is placed on that tile. You do NOT reveal which of your tiles you intended to match.
   - Wrong guess on red: GAME OVER (explosion!).
2. **soloCut** — Cut ALL your own tiles of a specific value. Only valid if you hold ALL remaining uncut copies of that value in the entire game (e.g., all 4 blue-3s, or the remaining 2 if 2 were already cut).
3. **revealReds** — If ALL your remaining uncut tiles are red, reveal them all (removes them safely). Free and safe — always do it when eligible.

## Info Tokens
- Info tokens are placed in front of tiles to indicate their value.
- A numbered info token (e.g., "5") on a tile position means that tile has value 5.
- A yellow info token means that tile is a yellow wire.
- During setup, each player places exactly 1 info token on one of their own blue wires with matching value, giving teammates a hint.
- Use info tokens to make SAFE dualCut guesses — a tile with an info token has a known value!

## Board Markers
- Red markers on the board indicate which sort positions MIGHT have red wires.
- Yellow markers indicate which sort positions MIGHT have yellow wires.
- "Position" refers to the sort slot between blue values (e.g., position 3.5 is between values 3 and 4).
- Tiles near red marker positions are DANGEROUS to guess — they might be red!

## Equipment Cards
- Equipment cards become usable once 2 wires of the card's trigger value are cut.
- Each equipment card is one-time use. Any player can use activated equipment.

## Validation Track
- When all 4 blue wires of a value are cut, a validation token is placed (value:4/4).
- This helps track progress toward the win condition.

## Strategy Tips
- ALWAYS prefer revealReds when eligible (zero risk).
- ALWAYS prefer soloCut when available (zero risk, cuts multiple tiles).
- For dualCut, STRONGLY prefer tiles with info tokens — their value is known!
- Avoid guessing tiles near red/yellow marker positions unless you have info tokens confirming the value.
- Consider the validation track: if a value shows 2/4 cut, the remaining 2 copies are still out there.
- The detonator has limited space — every wrong guess brings you closer to losing.
- If you hold many copies of the same value, consider that opponents may also hold copies.

## Chat
- Your teammates may send chat messages with hints or suggestions. Consider them carefully.
- Your "reasoning" field will be shared with all teammates as a chat message.
  Write it as if speaking to them — explain your thinking clearly and briefly.

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

export function buildUserMessage(state: ClientGameState, chatContext?: string): string {
  const me = state.players.find((p) => p.id === state.playerId);
  if (!me) return "ERROR: Cannot find my player state.";

  const lines: string[] = [];

  // Mission context
  const mission = MISSIONS[state.mission];
  lines.push(`=== YOUR TURN (Turn ${state.turnNumber}) ===`);
  lines.push(`Mission: #${state.mission} — ${mission.name} (${mission.difficulty})`);
  if (mission.specialRules) {
    lines.push(`Mission Rules: ${mission.specialRules}`);
  }
  lines.push(`Players: ${state.players.length} | Red wires: ${mission.redWires} | Yellow wires: ${mission.yellowWires}`);
  lines.push(`You are: ${me.name} (id: ${me.id})${me.character ? ` [Character: ${me.character}]` : ""}${me.isCaptain ? " (Captain)" : ""}`);
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

  if (chatContext) {
    lines.push("");
    lines.push("## Recent Chat (since your last turn):");
    lines.push(chatContext);
  }

  return lines.join("\n");
}
