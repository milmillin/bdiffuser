import type { ClientGameState, ClientPlayer, VisibleTile, MissionId } from "@bomb-busters/shared";
import {
  resolveMissionSetup,
  BLUE_COPIES_PER_VALUE,
} from "@bomb-busters/shared";

export interface TileProbability {
  /** value → probability (0-1). Only blue numeric values included. */
  blues: Map<number, number>;
  /** Probability this tile is red (0-1). */
  red: number;
  /** Probability this tile is yellow (0-1). */
  yellow: number;
}

/**
 * Compute probability distributions for all hidden tiles on a given opponent's stand.
 *
 * Uses Bayesian reasoning from publicly visible information:
 * - The viewer's own tiles (fully visible)
 * - All cut tiles across all players (public)
 * - The mission's tile pool configuration
 *
 * Returns a Map from flat tile index → TileProbability (only for hidden/uncut tiles).
 */
export function computeOpponentProbabilities(
  gameState: ClientGameState,
  opponent: ClientPlayer,
): Map<number, TileProbability> {
  const result = new Map<number, TileProbability>();

  // Determine the tile pool for this mission
  const pool = getTilePool(gameState.mission, gameState.players.length);
  if (!pool) return result;

  // Count all visible tiles (own hand + all cut tiles)
  const visibleCounts = new Map<string, number>(); // key: "blue:3" or "red" or "yellow"

  for (const player of gameState.players) {
    for (const tile of player.hand) {
      if (tile.color != null) {
        // Visible tile: either own hand or cut
        const key = tile.color === "blue" ? `blue:${tile.gameValue}` : tile.color;
        visibleCounts.set(key, (visibleCounts.get(key) ?? 0) + 1);
      }
    }
  }

  // Build remaining pool counts
  const remaining = new Map<string, number>();
  let totalRemaining = 0;

  // Blue tiles
  for (const value of pool.blueValues) {
    const key = `blue:${value}`;
    const total = BLUE_COPIES_PER_VALUE;
    const seen = visibleCounts.get(key) ?? 0;
    const left = Math.max(0, total - seen);
    if (left > 0) {
      remaining.set(key, left);
      totalRemaining += left;
    }
  }

  // Red tiles
  if (pool.redCount > 0) {
    const seen = visibleCounts.get("red") ?? 0;
    const left = Math.max(0, pool.redCount - seen);
    if (left > 0) {
      remaining.set("red", left);
      totalRemaining += left;
    }
  }

  // Yellow tiles
  if (pool.yellowCount > 0) {
    const seen = visibleCounts.get("yellow") ?? 0;
    const left = Math.max(0, pool.yellowCount - seen);
    if (left > 0) {
      remaining.set("yellow", left);
      totalRemaining += left;
    }
  }

  if (totalRemaining === 0) return result;

  // For each hidden tile on the opponent's stand, compute probabilities
  for (let i = 0; i < opponent.hand.length; i++) {
    const tile = opponent.hand[i];
    if (tile.cut || tile.color != null) continue; // visible or cut — skip

    const probs: TileProbability = {
      blues: new Map(),
      red: 0,
      yellow: 0,
    };

    for (const [key, count] of remaining) {
      const prob = count / totalRemaining;
      if (key === "red") {
        probs.red = prob;
      } else if (key === "yellow") {
        probs.yellow = prob;
      } else {
        const value = Number(key.split(":")[1]);
        probs.blues.set(value, prob);
      }
    }

    result.set(i, probs);
  }

  return result;
}

interface TilePool {
  blueValues: number[];
  redCount: number;
  yellowCount: number;
}

function getTilePool(mission: MissionId, playerCount: number): TilePool | null {
  try {
    const { setup } = resolveMissionSetup(mission, playerCount);

    const blueValues: number[] = [];
    for (let v = setup.blue.minValue; v <= setup.blue.maxValue; v++) {
      blueValues.push(v);
    }

    let redCount = 0;
    if (setup.red.kind === "exact") redCount = setup.red.count;
    else if (setup.red.kind === "out_of") redCount = setup.red.keep;
    else if (setup.red.kind === "fixed") redCount = setup.red.values.length;
    else if (setup.red.kind === "exact_same_value") redCount = setup.red.count;

    let yellowCount = 0;
    if (setup.yellow.kind === "exact") yellowCount = setup.yellow.count;
    else if (setup.yellow.kind === "out_of") yellowCount = setup.yellow.keep;
    else if (setup.yellow.kind === "fixed") yellowCount = setup.yellow.values.length;
    else if (setup.yellow.kind === "exact_same_value") yellowCount = setup.yellow.count;

    return { blueValues, redCount, yellowCount };
  } catch {
    return null;
  }
}

/**
 * Get the top N most probable values for a tile, formatted for display.
 * Returns entries sorted by probability descending.
 */
export function getTopProbabilities(
  prob: TileProbability,
  topN: number = 3,
): Array<{ label: string; pct: number; color: "blue" | "red" | "yellow" }> {
  const entries: Array<{ label: string; pct: number; color: "blue" | "red" | "yellow" }> = [];

  for (const [value, p] of prob.blues) {
    entries.push({ label: String(value), pct: Math.round(p * 100), color: "blue" });
  }
  if (prob.red > 0) {
    entries.push({ label: "R", pct: Math.round(prob.red * 100), color: "red" });
  }
  if (prob.yellow > 0) {
    entries.push({ label: "Y", pct: Math.round(prob.yellow * 100), color: "yellow" });
  }

  entries.sort((a, b) => b.pct - a.pct);
  return entries.slice(0, topN);
}
