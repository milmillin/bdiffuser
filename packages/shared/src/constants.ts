// ── Wire Tile Counts ────────────────────────────────────────

/** Blue wires: values 1-12, 4 copies each = 48 total */
export const BLUE_WIRE_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
export const BLUE_COPIES_PER_VALUE = 4;
export const BLUE_WIRE_COUNT = 48;

/** Red wires: sort values 1.5, 2.5, ... 11.5 = 11 total */
export const RED_WIRE_SORT_VALUES = [1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5, 8.5, 9.5, 10.5, 11.5] as const;
export const RED_WIRE_COUNT = 11;

/** Yellow wires: sort values 1.1, 2.1, ... 11.1 = 11 total */
export const YELLOW_WIRE_SORT_VALUES = [1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1, 10.1, 11.1] as const;
export const YELLOW_WIRE_COUNT = 11;

// ── Player Count Configuration ──────────────────────────────

export interface PlayerCountConfig {
  equipmentCount: number;
  detonatorStart: number; // starting position on the dial
  detonatorMax: number;   // skull position
}

export const PLAYER_COUNT_CONFIG: Record<number, PlayerCountConfig> = {
  2: { equipmentCount: 2, detonatorStart: 0, detonatorMax: 2 },
  3: { equipmentCount: 3, detonatorStart: 0, detonatorMax: 3 },
  4: { equipmentCount: 4, detonatorStart: 0, detonatorMax: 4 },
  5: { equipmentCount: 5, detonatorStart: 0, detonatorMax: 5 },
};

// ── Validation Track ────────────────────────────────────────

/** Values 1-12 on the validation track */
export const VALIDATION_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

// ── Info Tokens ─────────────────────────────────────────────

export const INFO_TOKEN_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
export const TOTAL_INFO_TOKENS = 26; // 24 regular + 2 yellow
export const YELLOW_INFO_TOKENS = 2;

// ── Setup Info Token Mission Rules ──────────────────────────

/** Missions where no player places a setup info token. */
export const NO_SETUP_TOKEN_MISSIONS = new Set<number>([18, 58]);

/** Missions where the 2-player captain skips setup info token placement. */
export const TWO_PLAYER_CAPTAIN_SKIP_MISSIONS = new Set<number>([11, 13, 27, 29, 46]);
