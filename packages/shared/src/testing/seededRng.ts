/**
 * Mulberry32 — a fast, deterministic 32-bit PRNG.
 * Returns a function that produces numbers in [0, 1).
 */
export function createSeededRng(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Creates a deterministic Fisher-Yates shuffle seeded with the given value.
 * Returns a *new* shuffled array — the input is never mutated.
 */
export function createSeededShuffle(seed: number): <T>(array: T[]) => T[] {
  const rng = createSeededRng(seed);
  return <T>(array: T[]): T[] => {
    const arr = [...array];
    for (let pass = 0; pass < 2; pass++) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
    }
    return arr;
  };
}

/**
 * Temporarily replaces `Math.random` with a seeded PRNG for the duration
 * of `fn`, then restores the original. Useful for exercising production
 * code paths (e.g. `shuffle()` in setup.ts) deterministically.
 */
export function withSeededRandom<T>(seed: number, fn: () => T): T {
  const rng = createSeededRng(seed);
  const original = Math.random;
  Math.random = rng;
  try {
    return fn();
  } finally {
    Math.random = original;
  }
}
