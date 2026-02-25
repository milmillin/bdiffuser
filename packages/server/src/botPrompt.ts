import type { ClientGameState } from "@bomb-busters/shared";
import {
  MISSIONS,
  describeWirePoolSpec,
  renderLogDetail,
  resolveMissionSetup,
} from "@bomb-busters/shared";

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
4. **chooseNextPlayer** — Only when a forced action is pending for the captain: choose which player takes the next turn.
5. **simultaneousFourCut** — Cut all 4 copies of a specific value simultaneously across all stands. Only available when mission rules enable it.
6. **useEquipment** — Use an unlocked equipment card. Specify equipmentId and payload.
7. **dualCutDoubleDetector** — Pick 2 tiles on one opponent stand and guess one value. If either matches, success.

## Info Tokens
- Info tokens are placed in front of tiles to indicate their value.
- A numbered info token (e.g., "5") on a tile position means that tile has value 5.
- A yellow info token means that tile is a yellow wire.
- During setup, each player places exactly 1 info token on one of their own blue wires with matching value, giving teammates a hint.
- Some missions disable info tokens entirely (e.g., mission 58). In those missions there are no setup tokens, wrong guesses do not add info tokens, and token-placing equipment is unusable.
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
- For dualCut, STRONGLY prefer tiles with info tokens when the mission uses them.
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

For chooseNextPlayer:
{"reasoning": "brief explanation", "action": "chooseNextPlayer", "targetPlayerId": "player-id"}

For simultaneousFourCut:
{"reasoning": "brief explanation", "action": "simultaneousFourCut"}

For useEquipment:
{"reasoning": "brief explanation", "action": "useEquipment", "equipmentId": "rewinder", "payload": {}}

For dualCutDoubleDetector:
{"reasoning": "brief explanation", "action": "dualCutDoubleDetector", "targetPlayerId": "player-id", "tileIndex1": 0, "tileIndex2": 1, "guessValue": 5}

guessValue can be a number (1-12) or "YELLOW" for yellow wires.
soloCut value can be a number (1-12) or "YELLOW".`;
}

function formatInfoToken(token: {
  value: number;
  isYellow: boolean;
  parity?: "even" | "odd";
  countHint?: 1 | 2 | 3 | 4;
  relation?: "eq" | "neq";
}): string {
  if (token.relation === "eq") return "=";
  if (token.relation === "neq") return "!=";
  if (token.isYellow) return "YELLOW";
  if (token.countHint != null) return `x${token.countHint}`;
  if (token.parity === "even") return "EVEN";
  if (token.parity === "odd") return "ODD";
  return String(token.value);
}

export function buildUserMessage(state: ClientGameState, chatContext?: string): string {
  const me = state.players.find((p) => p.id === state.playerId);
  if (!me) return "ERROR: Cannot find my player state.";

  const lines: string[] = [];

  // Mission context
  const mission = MISSIONS[state.mission];
  const resolvedMission = resolveMissionSetup(state.mission, state.players.length);
  lines.push(`=== YOUR TURN (Turn ${state.turnNumber}) ===`);
  lines.push(`Mission: #${state.mission} — ${mission.name} (${mission.difficulty})`);
  if (mission.specialRules) {
    lines.push(`Mission Rules: ${mission.specialRules}`);
  }
  if (state.mission === 58) {
    lines.push(
      "Mission Token Rule: Info tokens are disabled (no setup tokens, no failure tokens, no token-placing equipment).",
    );
  }
  lines.push(
    `Players: ${state.players.length} | Red wires: ${describeWirePoolSpec(resolvedMission.setup.red)} | Yellow wires: ${describeWirePoolSpec(resolvedMission.setup.yellow)}`,
  );
  lines.push(`You are: ${me.name} (id: ${me.id})${me.character ? ` [Character: ${me.character}]` : ""}${me.isCaptain ? " (Captain)" : ""}`);
  lines.push("");

  // My hand
  lines.push("## Your Hand (you can see these):");
  for (let i = 0; i < me.hand.length; i++) {
    const tile = me.hand[i];
    const infoTokens = me.infoTokens.filter(
      (token) => token.position === i || token.positionB === i,
    );
    const infoStr = infoTokens.length > 0
      ? ` [Info Tokens: ${infoTokens.map((token) => formatInfoToken(token)).join(", ")}]`
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
      const infoTokens = opp.infoTokens.filter(
        (token) => token.position === i || token.positionB === i,
      );
      const infoStr = infoTokens.length > 0
        ? ` [Info Tokens: ${infoTokens.map((token) => formatInfoToken(token)).join(", ")}]`
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
  if (state.timerDeadline != null) {
    const remainingSeconds = Math.max(
      0,
      Math.floor((state.timerDeadline - Date.now()) / 1000),
    );
    lines.push(`  Mission timer: ${remainingSeconds}s remaining`);
  }

  const forcedAction = state.pendingForcedAction;
  if (forcedAction?.kind === "chooseNextPlayer") {
    const captain =
      state.players.find((p) => p.id === forcedAction.captainId)
        ?.name ?? forcedAction.captainId;
    lines.push(`  Forced action pending: Captain ${captain} must choose next player`);
  } else if (forcedAction?.kind === "designateCutter") {
    const designator =
      state.players.find((p) => p.id === forcedAction.designatorId)
        ?.name ?? forcedAction.designatorId;
    lines.push(`  Forced action pending: ${designator} must designate who cuts (number card: ${forcedAction.value})`);
  }

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

  const sequenceCards = state.campaign?.numberCards?.visible ?? [];
  const specialMarkers = state.campaign?.specialMarkers ?? [];
  const sequencePointer = specialMarkers.find(
    (marker) => marker.kind === "sequence_pointer",
  );
  const numberDeckCount = state.campaign?.numberCards?.deck.length ?? 0;
  const numberDiscardCount = state.campaign?.numberCards?.discard.length ?? 0;
  if (numberDeckCount > 0 || numberDiscardCount > 0) {
    lines.push(
      `  Number cards: deck ${numberDeckCount}, discard ${numberDiscardCount}`,
    );
  }
  if (sequenceCards.length > 0) {
    lines.push(
      `  Visible number cards: ${sequenceCards.map((card) => card.value).join(" -> ")}`,
    );
    if (sequencePointer) {
      lines.push(`  Sequence pointer index: ${sequencePointer.value}`);
    }
  }

  const constraints = state.campaign?.constraints;
  if (constraints) {
    const globalConstraints = constraints.global
      .filter((constraint) => constraint.active)
      .map((constraint) => constraint.name || constraint.id);
    if (globalConstraints.length > 0) {
      lines.push(`  Constraints (global): ${globalConstraints.join(", ")}`);
    }

    const perPlayerConstraints = Object.entries(constraints.perPlayer)
      .map(([playerId, cards]) => {
        const activeCards = cards
          .filter((constraint) => constraint.active)
          .map((constraint) => constraint.name || constraint.id);
        if (activeCards.length === 0) return null;
        const playerName =
          state.players.find((player) => player.id === playerId)?.name ??
          playerId;
        return `${playerName}: ${activeCards.join(", ")}`;
      })
      .filter((entry): entry is string => entry !== null);
    if (perPlayerConstraints.length > 0) {
      lines.push(`  Constraints (per-player): ${perPlayerConstraints.join(" | ")}`);
    }
  }

  const challenges = state.campaign?.challenges;
  if (challenges) {
    if (challenges.active.length > 0) {
      lines.push(
        `  Challenges active: ${challenges.active.map((challenge) => challenge.name || challenge.id).join(", ")}`,
      );
    }
    if (challenges.completed.length > 0) {
      lines.push(
        `  Challenges completed: ${challenges.completed.map((challenge) => challenge.name || challenge.id).join(", ")}`,
      );
    }
    if (challenges.deck.length > 0) {
      lines.push(`  Challenges deck remaining: ${challenges.deck.length}`);
    }
  }

  const oxygen = state.campaign?.oxygen;
  if (oxygen) {
    const oxygenByPlayer = state.players
      .map((player) => ({
        name: player.name,
        value: oxygen.playerOxygen[player.id] ?? 0,
      }))
      .filter((entry) => entry.value > 0)
      .map((entry) => `${entry.name}:${entry.value}`)
      .join(", ");
    lines.push(
      `  Oxygen: pool ${oxygen.pool}${oxygenByPlayer ? ` | ${oxygenByPlayer}` : ""}`,
    );
  }

  if (state.campaign?.nanoTracker) {
    lines.push(
      `  Nano tracker: ${state.campaign.nanoTracker.position}/${state.campaign.nanoTracker.max}`,
    );
  }

  if (state.campaign?.bunkerTracker) {
    lines.push(
      `  Bunker tracker: ${state.campaign.bunkerTracker.position}/${state.campaign.bunkerTracker.max}`,
    );
  }

  const visibleSpecialMarkers = specialMarkers.filter(
    (marker) =>
      marker.kind !== "sequence_pointer" || sequenceCards.length === 0,
  );
  if (visibleSpecialMarkers.length > 0) {
    lines.push(
      `  Special markers: ${visibleSpecialMarkers.map((marker) => `${marker.kind}:${marker.value}`).join(", ")}`,
    );
  }

  const equipmentLocks = state.board.equipment
    .filter(
      (equipment) =>
        equipment.secondaryLockValue !== undefined &&
        !equipment.used,
    )
    .map((equipment) => {
      const value = equipment.secondaryLockValue as number;
      const required = equipment.secondaryLockCutsRequired ?? 2;
      let cutCount = 0;
      for (const player of state.players) {
        for (const tile of player.hand) {
          if (tile.cut && tile.gameValue === value) cutCount++;
        }
      }
      return `${equipment.name}: ${value} (${Math.min(cutCount, required)}/${required})`;
    });
  if (equipmentLocks.length > 0) {
    lines.push(`  Equipment secondary locks: ${equipmentLocks.join(" | ")}`);
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
      const detailText = renderLogDetail(
        entry.detail,
        (playerId) => state.players.find((p) => p.id === playerId)?.name ?? playerId,
      );
      lines.push(`  Turn ${entry.turn}: ${playerName} - ${detailText}`);
    }
  }

  if (chatContext) {
    lines.push("");
    lines.push("## Recent Chat (since your last turn):");
    lines.push(chatContext);
  }

  return lines.join("\n");
}
