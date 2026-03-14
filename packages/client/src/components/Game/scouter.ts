import type { ClientGameState, ClientPlayer, VisibleTile, MissionId } from "@bomb-busters/shared";
import {
  resolveMissionSetup,
  BLUE_COPIES_PER_VALUE,
  RED_WIRE_SORT_VALUES,
  YELLOW_WIRE_SORT_VALUES,
} from "@bomb-busters/shared";

export interface TileProbability {
  /** value → probability (0-1). Only blue numeric values included. */
  blues: Map<number, number>;
  /** Probability this tile is red (0-1). */
  red: number;
  /** Probability this tile is yellow (0-1). */
  yellow: number;
}

export interface PositionBounds {
  lower: number; // exclusive lower bound for sortValue
  upper: number; // exclusive upper bound for sortValue
}

/**
 * Compute the sortValue bounds for a hidden tile at `index` on a stand.
 * Bounds come from the nearest visible tiles (those with known sortValues)
 * above and below, since tiles are sorted ascending by sortValue.
 */
export function getPositionBounds(hand: VisibleTile[], index: number): PositionBounds {
  let lower = -Infinity;
  let upper = Infinity;

  for (let j = index - 1; j >= 0; j--) {
    if (hand[j].sortValue != null) {
      lower = hand[j].sortValue!;
      break;
    }
  }

  for (let j = index + 1; j < hand.length; j++) {
    if (hand[j].sortValue != null) {
      upper = hand[j].sortValue!;
      break;
    }
  }

  return { lower, upper };
}

/**
 * Compute probability distributions for all hidden tiles on a given opponent's stand.
 *
 * Uses Bayesian reasoning from publicly visible information:
 * - The viewer's own tiles (fully visible)
 * - All cut tiles across all players (public, with sortValues)
 * - The mission's tile pool configuration
 * - Sort-order constraints: tiles are sorted ascending by sortValue on each stand,
 *   so hidden tiles are bounded by neighboring visible tiles' sortValues.
 *
 * Returns a Map from flat tile index → TileProbability (only for hidden/uncut tiles).
 */
export function computeOpponentProbabilities(
  gameState: ClientGameState,
  opponent: ClientPlayer,
): Map<number, TileProbability> {
  const result = new Map<number, TileProbability>();

  const pool = getTilePool(gameState.mission, gameState.players.length);
  if (!pool) return result;

  // Count all visible tiles (own hand + all cut tiles)
  // Also track observed red/yellow sortValues for candidate narrowing
  const visibleCounts = new Map<string, number>(); // key: "blue:3" or "red" or "yellow"
  const observedRedSortValues = new Set<number>();
  const observedYellowSortValues = new Set<number>();

  for (const player of gameState.players) {
    for (const tile of player.hand) {
      if (tile.color != null) {
        const key = tile.color === "blue" ? `blue:${tile.gameValue}` : tile.color;
        visibleCounts.set(key, (visibleCounts.get(key) ?? 0) + 1);
        if (tile.color === "red" && tile.sortValue != null) {
          observedRedSortValues.add(tile.sortValue);
        }
        if (tile.color === "yellow" && tile.sortValue != null) {
          observedYellowSortValues.add(tile.sortValue);
        }
      }
    }
  }

  // Build remaining pool counts
  const remaining = new Map<string, number>();

  for (const value of pool.blueValues) {
    const key = `blue:${value}`;
    const total = BLUE_COPIES_PER_VALUE;
    const seen = visibleCounts.get(key) ?? 0;
    const left = Math.max(0, total - seen);
    if (left > 0) remaining.set(key, left);
  }

  const remainingRed = (() => {
    if (pool.redCount <= 0) return 0;
    const seen = visibleCounts.get("red") ?? 0;
    const left = Math.max(0, pool.redCount - seen);
    if (left > 0) remaining.set("red", left);
    return left;
  })();

  const remainingYellow = (() => {
    if (pool.yellowCount <= 0) return 0;
    const seen = visibleCounts.get("yellow") ?? 0;
    const left = Math.max(0, pool.yellowCount - seen);
    if (left > 0) remaining.set("yellow", left);
    return left;
  })();

  // Unobserved candidate sortValues for red/yellow
  const unobservedRedCandidates = pool.redCandidates.filter(
    (v) => !observedRedSortValues.has(v),
  );
  const unobservedYellowCandidates = pool.yellowCandidates.filter(
    (v) => !observedYellowSortValues.has(v),
  );

  // For each hidden tile on the opponent's stand, compute sort-aware probabilities
  for (let i = 0; i < opponent.hand.length; i++) {
    const tile = opponent.hand[i];
    if (tile.cut || tile.color != null) continue; // visible or cut — skip

    const bounds = getPositionBounds(opponent.hand, i);

    const probs: TileProbability = {
      blues: new Map(),
      red: 0,
      yellow: 0,
    };
    let filteredTotal = 0;

    // Blue tiles: sortValue = gameValue (integer), directly check bounds
    for (const value of pool.blueValues) {
      if (value > bounds.lower && value < bounds.upper) {
        const count = remaining.get(`blue:${value}`) ?? 0;
        if (count > 0) {
          probs.blues.set(value, count);
          filteredTotal += count;
        }
      }
    }

    // Red tiles: weight by fraction of unobserved candidates whose sortValues
    // fall within this position's bounds
    if (remainingRed > 0 && unobservedRedCandidates.length > 0) {
      const eligible = unobservedRedCandidates.filter(
        (v) => v > bounds.lower && v < bounds.upper,
      );
      const weight =
        remainingRed * (eligible.length / unobservedRedCandidates.length);
      if (weight > 0) {
        probs.red = weight;
        filteredTotal += weight;
      }
    }

    // Yellow tiles: same approach as red
    if (remainingYellow > 0 && unobservedYellowCandidates.length > 0) {
      const eligible = unobservedYellowCandidates.filter(
        (v) => v > bounds.lower && v < bounds.upper,
      );
      const weight =
        remainingYellow *
        (eligible.length / unobservedYellowCandidates.length);
      if (weight > 0) {
        probs.yellow = weight;
        filteredTotal += weight;
      }
    }

    // Normalize to probabilities; skip if nothing is eligible
    if (filteredTotal > 0) {
      for (const [value, count] of probs.blues) {
        probs.blues.set(value, count / filteredTotal);
      }
      probs.red /= filteredTotal;
      probs.yellow /= filteredTotal;
      result.set(i, probs);
    }
  }

  return result;
}

interface TilePool {
  blueValues: number[];
  redCount: number;
  yellowCount: number;
  redCandidates: readonly number[];
  yellowCandidates: readonly number[];
}

function getTilePool(
  mission: MissionId,
  playerCount: number,
): TilePool | null {
  try {
    const { setup } = resolveMissionSetup(mission, playerCount);

    const blueValues: number[] = [];
    for (let v = setup.blue.minValue; v <= setup.blue.maxValue; v++) {
      blueValues.push(v);
    }

    let redCount = 0;
    let redCandidates: readonly number[] = [];
    if (setup.red.kind === "exact") {
      redCount = setup.red.count;
      redCandidates = setup.red.candidates ?? [...RED_WIRE_SORT_VALUES];
    } else if (setup.red.kind === "out_of") {
      redCount = setup.red.keep;
      redCandidates = setup.red.candidates ?? [...RED_WIRE_SORT_VALUES];
    } else if (setup.red.kind === "fixed") {
      redCount = setup.red.values.length;
      redCandidates = [...setup.red.values];
    } else if (setup.red.kind === "exact_same_value") {
      redCount = setup.red.count;
      redCandidates = setup.red.candidates ?? [...RED_WIRE_SORT_VALUES];
    }

    let yellowCount = 0;
    let yellowCandidates: readonly number[] = [];
    if (setup.yellow.kind === "exact") {
      yellowCount = setup.yellow.count;
      yellowCandidates = setup.yellow.candidates ?? [...YELLOW_WIRE_SORT_VALUES];
    } else if (setup.yellow.kind === "out_of") {
      yellowCount = setup.yellow.keep;
      yellowCandidates = setup.yellow.candidates ?? [...YELLOW_WIRE_SORT_VALUES];
    } else if (setup.yellow.kind === "fixed") {
      yellowCount = setup.yellow.values.length;
      yellowCandidates = [...setup.yellow.values];
    } else if (setup.yellow.kind === "exact_same_value") {
      yellowCount = setup.yellow.count;
      yellowCandidates = setup.yellow.candidates ?? [...YELLOW_WIRE_SORT_VALUES];
    }

    return { blueValues, redCount, yellowCount, redCandidates, yellowCandidates };
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
